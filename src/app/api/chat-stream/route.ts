import { NextRequest } from 'next/server';

export const runtime = 'edge';

// OpenRouter API configuration
const API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { messages, model, temperature = 0.7, max_tokens = 500 } = await req.json();

    if (!API_KEY) {
      return new Response('OpenRouter API key not configured', { status: 500 });
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

        // Send message start event
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({
            type: 'message-start',
            data: { messageId, model }
          })}\n\n`)
        );

        // Make request to OpenRouter
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
            'HTTP-Referer': 'https://consensusai.app',
            'X-Title': 'ConsensusAI',
          },
          body: JSON.stringify({
            model,
            messages,
            stream: true,
            temperature,
            max_tokens,
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
                  // Send final message complete event
                  await writer.write(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'message-complete',
                      data: { 
                        messageId, 
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
                        data: { messageId, chunk: contentChunk }
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
        
        // Send error event
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            data: { 
              message: error instanceof Error ? error.message : 'Unknown streaming error',
              messageId,
              timestamp: new Date().toISOString()
            }
          })}\n\n`)
        );
      } finally {
        await writer.close();
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