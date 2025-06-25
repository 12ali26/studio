import { NextRequest, NextResponse } from 'next/server';
import { MessageReactionQueries } from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reactions = await MessageReactionQueries.getMessageReactions(params.id);
    const reactionCounts = await MessageReactionQueries.getReactionCounts(params.id);

    return NextResponse.json({ 
      reactions, 
      counts: reactionCounts 
    });

  } catch (error) {
    console.error('Error fetching message reactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message reactions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { userId, emoji, isFavorite = false } = body;

    if (!userId || !emoji) {
      return NextResponse.json(
        { error: 'userId and emoji are required' },
        { status: 400 }
      );
    }

    const reaction = await MessageReactionQueries.addReaction({
      messageId: params.id,
      userId,
      emoji,
      isFavorite
    });

    return NextResponse.json({ reaction }, { status: 201 });

  } catch (error) {
    console.error('Error adding message reaction:', error);
    return NextResponse.json(
      { error: 'Failed to add message reaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const emoji = searchParams.get('emoji');

    if (!userId || !emoji) {
      return NextResponse.json(
        { error: 'userId and emoji are required' },
        { status: 400 }
      );
    }

    const success = await MessageReactionQueries.removeReaction(
      params.id,
      userId,
      emoji
    );

    if (!success) {
      return NextResponse.json({ error: 'Reaction not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error removing message reaction:', error);
    return NextResponse.json(
      { error: 'Failed to remove message reaction' },
      { status: 500 }
    );
  }
}