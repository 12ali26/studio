import { eq, and, desc, asc, like, or } from 'drizzle-orm';
import db from '../connection';
import { 
  conversations, 
  messages, 
  users,
  type Conversation, 
  type NewConversation,
  type Message 
} from '../schema';

export class ConversationQueries {
  // Create a new conversation
  static async createConversation(conversationData: NewConversation): Promise<Conversation> {
    const [conversation] = await db.insert(conversations).values(conversationData).returning();
    return conversation;
  }

  // Get conversation by ID
  static async getConversationById(id: string, userId?: string): Promise<Conversation | null> {
    let whereClause = eq(conversations.id, id);
    
    if (userId) {
      whereClause = and(eq(conversations.id, id), eq(conversations.userId, userId));
    }
    
    const [conversation] = await db.select().from(conversations).where(whereClause);
    return conversation || null;
  }

  // Get all conversations for a user
  static async getUserConversations(
    userId: string, 
    options: {
      limit?: number;
      offset?: number;
      includeArchived?: boolean;
      sortBy?: 'createdAt' | 'updatedAt';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<Conversation[]> {
    const {
      limit = 50,
      offset = 0,
      includeArchived = false,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = options;

    let whereClause;
    if (includeArchived) {
      whereClause = eq(conversations.userId, userId);
    } else {
      whereClause = and(
        eq(conversations.userId, userId),
        eq(conversations.isArchived, false)
      );
    }

    const orderByField = sortBy === 'createdAt' ? conversations.createdAt : conversations.updatedAt;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const result = await db
      .select()
      .from(conversations)
      .where(whereClause)
      .orderBy(orderFn(orderByField))
      .limit(limit)
      .offset(offset);

    return result;
  }

  // Get conversation with messages
  static async getConversationWithMessages(
    conversationId: string, 
    userId?: string
  ): Promise<(Conversation & { messages: Message[] }) | null> {
    let conversationQuery = db.select().from(conversations).where(eq(conversations.id, conversationId));
    
    if (userId) {
      conversationQuery = conversationQuery.where(and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      ));
    }

    const [conversation] = await conversationQuery;
    if (!conversation) return null;

    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));

    return {
      ...conversation,
      messages: conversationMessages,
    };
  }

  // Update conversation
  static async updateConversation(
    id: string, 
    userId: string, 
    updates: Partial<NewConversation>
  ): Promise<Conversation | null> {
    const [conversation] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning();
    
    return conversation || null;
  }

  // Delete conversation
  static async deleteConversation(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    
    return result.rowCount > 0;
  }

  // Archive/unarchive conversation
  static async archiveConversation(id: string, userId: string, archive: boolean = true): Promise<Conversation | null> {
    const [conversation] = await db
      .update(conversations)
      .set({ isArchived: archive, updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning();
    
    return conversation || null;
  }

  // Search conversations
  static async searchConversations(
    userId: string, 
    searchTerm: string,
    options: {
      limit?: number;
      offset?: number;
      includeArchived?: boolean;
    } = {}
  ): Promise<Conversation[]> {
    const { limit = 20, offset = 0, includeArchived = false } = options;

    let query = db
      .select({
        conversation: conversations,
      })
      .from(conversations)
      .where(and(
        eq(conversations.userId, userId),
        or(
          like(conversations.title, `%${searchTerm}%`),
        )
      ));

    if (!includeArchived) {
      query = query.where(and(
        eq(conversations.userId, userId),
        eq(conversations.isArchived, false),
        or(
          like(conversations.title, `%${searchTerm}%`),
        )
      ));
    }

    const result = await query
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset);

    return result.map(r => r.conversation);
  }

  // Get conversation count for user
  static async getUserConversationCount(userId: string, includeArchived: boolean = false): Promise<number> {
    let query = db.select({ count: conversations.id }).from(conversations).where(eq(conversations.userId, userId));
    
    if (!includeArchived) {
      query = query.where(and(
        eq(conversations.userId, userId),
        eq(conversations.isArchived, false)
      ));
    }

    const [result] = await query;
    return result?.count || 0;
  }

  // Get recent conversations
  static async getRecentConversations(userId: string, limit: number = 5): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.userId, userId),
        eq(conversations.isArchived, false)
      ))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit);
  }

  // Update conversation title
  static async updateConversationTitle(id: string, userId: string, title: string): Promise<Conversation | null> {
    const [conversation] = await db
      .update(conversations)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning();
    
    return conversation || null;
  }
}