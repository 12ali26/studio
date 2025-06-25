import { NextRequest, NextResponse } from 'next/server';
import { ConversationQueries, MessageQueries } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const conversations = await ConversationQueries.getUserConversations(userId, {
      limit,
      offset,
      includeArchived,
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    });

    // Get latest message for each conversation
    const conversationsWithLatestMessage = await Promise.all(
      conversations.map(async (conversation) => {
        const latestMessage = await MessageQueries.getLatestMessage(conversation.id);
        const messageCount = await MessageQueries.getConversationMessageCount(conversation.id);
        
        return {
          ...conversation,
          latestMessage,
          messageCount
        };
      })
    );

    return NextResponse.json({
      conversations: conversationsWithLatestMessage,
      total: conversationsWithLatestMessage.length
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, config } = body;

    if (!userId || !title || !config) {
      return NextResponse.json(
        { error: 'userId, title, and config are required' },
        { status: 400 }
      );
    }

    const conversation = await ConversationQueries.createConversation({
      userId,
      title,
      config,
      isArchived: false
    });

    return NextResponse.json({ conversation }, { status: 201 });

  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}