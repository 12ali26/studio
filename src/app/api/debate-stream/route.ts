import { NextRequest } from 'next/server';
import { streamMultiAiDebate, generateDebateSummary, type DebateConfig } from '@/ai/flows/multi-ai-debate-orchestrator';
import { z } from 'zod';

export const runtime = 'edge';

// Schema for the request body
const DebateRequestSchema = z.object({
  topic: z.string().min(10, 'Topic must be at least 10 characters'),
  debateMode: z.enum(['boardroom', 'expert-panel', 'quick-consult', 'custom']).default('expert-panel'),
  selectedPersonas: z.array(z.string()).optional(),
  maxRounds: z.number().min(1).max(5).default(2),
  includeModeration: z.boolean().default(true),
  includeSummary: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const validatedInput = DebateRequestSchema.parse(body);

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Send initial connection confirmation
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'connection-established',
            data: { status: 'connected', timestamp: new Date().toISOString() }
          })}\n\n`)
        );

        try {
          // Initialize the debate configuration
          const debateConfig: DebateConfig = {
            topic: validatedInput.topic,
            debateMode: validatedInput.debateMode,
            selectedPersonas: validatedInput.selectedPersonas,
            maxRounds: validatedInput.maxRounds,
            includeModeration: validatedInput.includeModeration,
          };

          // Stream the multi-AI debate
          for await (const event of streamMultiAiDebate(debateConfig)) {
            // Send each debate event as SSE
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );

            // Add a small delay to prevent overwhelming the client
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Generate and send debate summary if requested
          if (validatedInput.includeSummary) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'generating-summary',
                data: { status: 'Generating debate summary...' }
              })}\n\n`)
            );

            // For summary, we need the final debate state
            // This is a simplified approach - in production, you'd store the state
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'summary-ready',
                data: { 
                  message: 'Debate completed successfully. Summary generation would be implemented with full debate state.' 
                }
              })}\n\n`)
            );
          }

          // Send completion event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'stream-complete',
              data: { 
                status: 'completed', 
                timestamp: new Date().toISOString(),
                totalEvents: 'multiple'
              }
            })}\n\n`)
          );

        } catch (error) {
          // Send error event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              data: { 
                message: error instanceof Error ? error.message : 'Unknown error occurred',
                timestamp: new Date().toISOString()
              }
            })}\n\n`)
          );
        } finally {
          // Close the stream
          controller.close();
        }
      }
    });

    // Return the stream with proper SSE headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Debate stream error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request format',
          details: error.errors,
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle other errors
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle preflight CORS requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Alternative implementation for concurrent AI responses (advanced mode)
export async function streamConcurrentDebate(config: DebateConfig) {
  // This would implement true parallel processing of AI responses
  // where multiple AI models respond simultaneously rather than sequentially
  
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      try {
        // Implementation would involve:
        // 1. Parallel Promise.allSettled() calls to multiple AI models
        // 2. Real-time streaming of responses as they come in
        // 3. Intelligent ordering and context management
        // 4. Cross-AI response integration
        
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'concurrent-mode-placeholder',
            data: { message: 'Concurrent debate mode would be implemented here' }
          })}\n\n`)
        );
        
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            data: { message: error instanceof Error ? error.message : 'Error in concurrent mode' }
          })}\n\n`)
        );
      } finally {
        controller.close();
      }
    }
  });
}

// Utility function to validate debate participants
function validateDebateParticipants(selectedPersonas?: string[]) {
  const validPersonas = ['Alex (CEO)', 'Sam (CTO)', 'Jordan (CMO)', 'Taylor (CFO)', 'Casey (Advisor)'];
  
  if (!selectedPersonas) return true;
  
  return selectedPersonas.every(persona => 
    validPersonas.some(valid => valid.includes(persona.split(' ')[0]))
  );
}

// Rate limiting helper (would be enhanced with Redis in production)
const rateLimitMap = new Map();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10; // Max 10 debates per minute
  
  const clientRequests = rateLimitMap.get(clientId) || [];
  const recentRequests = clientRequests.filter((time: number) => now - time < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(clientId, recentRequests);
  return true;
}