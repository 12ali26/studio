import {NextRequest} from 'next/server';

export const runtime = 'edge';

// Note: For this to work, you need to set the OPENROUTER_API_KEY environment variable.
// You can get a key from https://openrouter.ai/keys
const API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const {messages, model} = await req.json();

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
        // Recommended headers
        'HTTP-Referer': `https://YOUR_SITE_URL`, // Replace with your site URL
        'X-Title': `ConsensusAI`, // Replace with your app name
      },
      body: JSON.stringify({
        model: model,
        messages,
        stream: true,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      // Use a new Response object to send back the error
      return new Response(`OpenRouter error: ${errorText}`, { status: response.status });
    }

    // Return the streaming response directly
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    // Use a new Response object to send back the error
    return new Response(`Error in generate route: ${error.message}`, { status: 500 });
  }
}
