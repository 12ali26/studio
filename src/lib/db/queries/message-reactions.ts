import { eq, and, desc, sql } from 'drizzle-orm';
import db from '../connection';
import { 
  messageReactions, 
  type MessageReaction, 
  type NewMessageReaction 
} from '../schema';

export class MessageReactionQueries {
  // Add a reaction to a message
  static async addReaction(reactionData: NewMessageReaction): Promise<MessageReaction> {
    // Check if user already reacted with this emoji
    const existingReaction = await db
      .select()
      .from(messageReactions)
      .where(and(
        eq(messageReactions.messageId, reactionData.messageId),
        eq(messageReactions.userId, reactionData.userId),
        eq(messageReactions.emoji, reactionData.emoji)
      ));

    if (existingReaction.length > 0) {
      // Update existing reaction
      const [reaction] = await db
        .update(messageReactions)
        .set({ isFavorite: reactionData.isFavorite || false })
        .where(eq(messageReactions.id, existingReaction[0].id))
        .returning();
      return reaction;
    } else {
      // Create new reaction
      const [reaction] = await db.insert(messageReactions).values(reactionData).returning();
      return reaction;
    }
  }

  // Remove a reaction from a message
  static async removeReaction(messageId: string, userId: string, emoji: string): Promise<boolean> {
    const result = await db
      .delete(messageReactions)
      .where(and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, userId),
        eq(messageReactions.emoji, emoji)
      ));
    
    return result.rowCount > 0;
  }

  // Get all reactions for a message
  static async getMessageReactions(messageId: string): Promise<MessageReaction[]> {
    return await db
      .select()
      .from(messageReactions)
      .where(eq(messageReactions.messageId, messageId))
      .orderBy(desc(messageReactions.createdAt));
  }

  // Get user's reactions for a message
  static async getUserMessageReactions(messageId: string, userId: string): Promise<MessageReaction[]> {
    return await db
      .select()
      .from(messageReactions)
      .where(and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, userId)
      ));
  }

  // Toggle favorite status of a reaction
  static async toggleFavorite(messageId: string, userId: string, emoji: string): Promise<MessageReaction | null> {
    const [existing] = await db
      .select()
      .from(messageReactions)
      .where(and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, userId),
        eq(messageReactions.emoji, emoji)
      ));

    if (!existing) return null;

    const [reaction] = await db
      .update(messageReactions)
      .set({ isFavorite: !existing.isFavorite })
      .where(eq(messageReactions.id, existing.id))
      .returning();

    return reaction;
  }

  // Get all favorite reactions for a user
  static async getUserFavoriteReactions(userId: string): Promise<MessageReaction[]> {
    return await db
      .select()
      .from(messageReactions)
      .where(and(
        eq(messageReactions.userId, userId),
        eq(messageReactions.isFavorite, true)
      ))
      .orderBy(desc(messageReactions.createdAt));
  }

  // Get reaction counts for a message
  static async getReactionCounts(messageId: string): Promise<{ emoji: string; count: number }[]> {
    const result = await db
      .select({
        emoji: messageReactions.emoji,
        count: sql<number>`count(*)`,
      })
      .from(messageReactions)
      .where(eq(messageReactions.messageId, messageId))
      .groupBy(messageReactions.emoji);

    return result;
  }

  // Check if user has reacted to a message
  static async hasUserReacted(messageId: string, userId: string, emoji?: string): Promise<boolean> {
    let query = db
      .select({ id: messageReactions.id })
      .from(messageReactions)
      .where(and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, userId)
      ));

    if (emoji) {
      query = query.where(and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, userId),
        eq(messageReactions.emoji, emoji)
      ));
    }

    const [reaction] = await query;
    return !!reaction;
  }

  // Remove all reactions for a message (cleanup)
  static async removeAllMessageReactions(messageId: string): Promise<boolean> {
    const result = await db
      .delete(messageReactions)
      .where(eq(messageReactions.messageId, messageId));
    
    return result.rowCount > 0;
  }

  // Get most used emojis by user
  static async getUserTopEmojis(userId: string, limit: number = 10): Promise<{ emoji: string; count: number }[]> {
    const result = await db
      .select({
        emoji: messageReactions.emoji,
        count: sql<number>`count(*)`,
      })
      .from(messageReactions)
      .where(eq(messageReactions.userId, userId))
      .groupBy(messageReactions.emoji)
      .orderBy(sql`count(*) desc`)
      .limit(limit);

    return result;
  }
}