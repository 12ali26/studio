import { NextRequest, NextResponse } from 'next/server';
import { UserQueries } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, avatarUrl } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await UserQueries.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ user: existingUser });
    }

    // Create new user
    const user = await UserQueries.createUser({
      email,
      name,
      avatarUrl,
      subscriptionTier: 'starter',
      isActive: true,
      emailVerified: false,
    });

    return NextResponse.json({ user }, { status: 201 });

  } catch (error) {
    console.error('Error creating/getting user:', error);
    return NextResponse.json(
      { error: 'Failed to create/get user' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const id = searchParams.get('id');

    if (!email && !id) {
      return NextResponse.json(
        { error: 'Email or ID is required' },
        { status: 400 }
      );
    }

    let user = null;
    if (id) {
      user = await UserQueries.getUserById(id);
    } else if (email) {
      user = await UserQueries.getUserByEmail(email);
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user with preferences
    const userWithPreferences = await UserQueries.getUserWithPreferences(user.id);

    return NextResponse.json({ user: userWithPreferences });

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}