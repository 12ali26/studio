import { eq, and } from 'drizzle-orm';
import db from '../connection';
import { users, userPreferences, type User, type NewUser, type NewUserPreferences } from '../schema';

export class UserQueries {
  // Create a new user
  static async createUser(userData: NewUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    
    // Create default preferences for the user
    await db.insert(userPreferences).values({
      userId: user.id,
      defaultModel: 'openai/gpt-3.5-turbo',
      defaultTemperature: '0.7',
      defaultMaxTokens: 500,
      theme: 'dark',
      language: 'en',
      notifications: {
        email: true,
        browser: true,
        usage: true,
        billing: true,
      },
    });
    
    return user;
  }

  // Get user by ID
  static async getUserById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || null;
  }

  // Update user
  static async updateUser(id: string, userData: Partial<NewUser>): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || null;
  }

  // Delete user
  static async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  // Get user with preferences
  static async getUserWithPreferences(id: string) {
    const result = await db
      .select({
        user: users,
        preferences: userPreferences,
      })
      .from(users)
      .leftJoin(userPreferences, eq(users.id, userPreferences.userId))
      .where(eq(users.id, id));
    
    return result[0] || null;
  }

  // Update user preferences
  static async updateUserPreferences(userId: string, preferences: Partial<NewUserPreferences>) {
    const [updated] = await db
      .update(userPreferences)
      .set({ ...preferences, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId))
      .returning();
    
    return updated;
  }

  // Verify user email
  static async verifyUserEmail(id: string): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || null;
  }

  // Check if user exists
  static async userExists(email: string): Promise<boolean> {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    return !!user;
  }

  // Get user count
  static async getUserCount(): Promise<number> {
    const [result] = await db.select({ count: users.id }).from(users);
    return result?.count || 0;
  }
}