import { NextRequest, NextResponse } from 'next/server';
import { MessageQueries, UsageTrackingQueries } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeReactions = searchParams.get('includeReactions') === 'true';

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const messages = await MessageQueries.getConversationMessages(conversationId, {
      limit,
      offset,
      sortOrder: 'asc',
      includeReactions
    });

    return NextResponse.json({ messages });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, sender, content, model, metadata } = body;

    if (!conversationId || !sender || !content) {
      return NextResponse.json(
        { error: 'conversationId, sender, and content are required' },
        { status: 400 }
      );
    }

    const message = await MessageQueries.createMessage({
      conversationId,
      sender,
      content,
      status: 'completed',
      model,
      metadata
    });

    // Record usage tracking if metadata includes cost/token info
    if (metadata?.tokensUsed && metadata?.cost && sender === 'ai') {
      // Note: We'll need userId from the conversation or pass it separately
      // For now, we'll skip usage tracking until we have proper auth
    }

    return NextResponse.json({ message }, { status: 201 });

  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}