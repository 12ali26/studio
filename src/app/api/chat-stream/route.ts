import { NextRequest } from 'next/server';
import { MessageQueries, ConversationQueries, UsageTrackingQueries } from '@/lib/db/queries';
import { getStackUser } from '@/lib/auth/stack-auth';

export const runtime = 'edge';

// OpenRouter API configuration
const API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(req: NextRequest) {
  try {
    // Validate environment variables
    if (!API_KEY) {
      console.error('OPENROUTER_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'OpenRouter API key not configured' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { messages, model, temperature = 0.7, max_tokens = 500, conversationId } = requestBody;
    
    // Get authenticated user from Stack Auth
    const stackUser = await getStackUser(req);
    if (!stackUser) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Get user ID from our database using Stack Auth email
    let userId = requestBody.userId;
    if (!userId && stackUser.primaryEmail) {
      try {
        const response = await fetch(`${req.headers.get('origin') || 'http://localhost:9002'}/api/users?email=${encodeURIComponent(stackUser.primaryEmail)}`);
        if (response.ok) {
          const userData = await response.json();
          userId = userData.user?.id;
        }
      } catch (error) {
        console.error('Error fetching user from database:', error);
      }
    }

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!model || typeof model !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Model is required' }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create user message in database first
    let userMessage = null;
    let aiMessage = null;
    
    if (conversationId && userId && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user') {
        try {
          userMessage = await MessageQueries.createMessage({
            conversationId,
            sender: 'user',
            content: lastMessage.content,
            status: 'completed'
          });
        } catch (dbError) {
          console.error('Failed to save user message:', dbError);
        }
      }
    }
    
    // Create a unique message ID for tracking
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create a TransformStream to process the OpenRouter response
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Start the streaming process asynchronously
    (async () => {
      try {
        // Send connection established event
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({
            type: 'connection-established',
            data: { status: 'connected', timestamp: new Date().toISOString() }
          })}\n\n`)
        );

        // Create AI message in database
        if (conversationId) {
          try {
            aiMessage = await MessageQueries.createMessage({
              conversationId,
              sender: 'ai',
              content: '',
              status: 'streaming',
              model
            });
          } catch (dbError) {
            console.error('Failed to create AI message:', dbError);
          }
        }

        // Send message start event
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({
            type: 'message-start',
            data: { messageId: aiMessage?.id || messageId, model }
          })}\n\n`)
        );

        // Make request to OpenRouter
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
            'HTTP-Referer': req.headers.get('origin') || 'http://localhost:9002',
            'X-Title': 'ConsensusAI Chat',
          },
          body: JSON.stringify({
            model,
            messages,
            stream: true,
            temperature: Number(temperature) || 0.7,
            max_tokens: Number(max_tokens) || 500,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenRouter error: ${response.status} ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('No response body from OpenRouter');
        }

        // Process the streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let tokenCount = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                if (data === '[DONE]') {
                  // Update AI message in database with final content
                  if (aiMessage && fullContent) {
                    try {
                      await MessageQueries.updateMessage(aiMessage.id, {
                        content: fullContent,
                        status: 'completed',
                        metadata: { tokensUsed: tokenCount, model }
                      });
                      
                      // Record usage tracking
                      if (userId && tokenCount > 0) {
                        await UsageTrackingQueries.recordUsage({
                          userId,
                          messageId: aiMessage.id,
                          model,
                          tokensUsed: tokenCount,
                          cost: (tokenCount * 0.0001).toString(), // Rough estimate
                          metadata: {
                            provider: 'openrouter',
                            requestType: 'chat_completion'
                          }
                        });
                      }
                    } catch (dbError) {
                      console.error('Failed to update AI message:', dbError);
                    }
                  }
                  
                  // Send final message complete event
                  await writer.write(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'message-complete',
                      data: { 
                        messageId: aiMessage?.id || messageId, 
                        content: fullContent,
                        metadata: { tokensUsed: tokenCount, model }
                      }
                    })}\n\n`)
                  );
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta;
                  
                  if (delta?.content) {
                    const contentChunk = delta.content;
                    fullContent += contentChunk;
                    tokenCount++;

                    // Send message chunk event
                    await writer.write(
                      encoder.encode(`data: ${JSON.stringify({
                        type: 'message-chunk',
                        data: { messageId: aiMessage?.id || messageId, chunk: contentChunk }
                      })}\n\n`)
                    );
                  }
                } catch (parseError) {
                  console.error('Error parsing OpenRouter chunk:', parseError);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        // Send stream complete event
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({
            type: 'stream-complete',
            data: { status: 'completed', timestamp: new Date().toISOString() }
          })}\n\n`)
        );

      } catch (error) {
        console.error('Streaming error:', error);
        
        try {
          // Send error event
          await writer.write(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              data: { 
                message: error instanceof Error ? error.message : 'Unknown streaming error',
                messageId: aiMessage?.id || messageId,
                timestamp: new Date().toISOString()
              }
            })}\n\n`)
          );
        } catch (writeError) {
          console.error('Failed to write error to stream:', writeError);
        }
      } finally {
        try {
          await writer.close();
        } catch (closeError) {
          console.error('Failed to close writer:', closeError);
        }
      }
    })();

    // Return the streaming response
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Chat stream error:', error);
    return new Response(
      `Error in chat stream: ${error instanceof Error ? error.message : 'Unknown error'}`, 
      { status: 500 }
    );
  }
}
