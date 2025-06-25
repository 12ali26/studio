import { eq, and, desc, asc, like, or, sql } from 'drizzle-orm';
import db from '../connection';
import { 
  messages, 
  conversations,
  messageReactions,
  type Message, 
  type NewMessage 
} from '../schema';

export class MessageQueries {
  // Create a new message
  static async createMessage(messageData: NewMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(messageData).returning();
    
    // Update conversation's updatedAt timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, messageData.conversationId));
    
    return message;
  }

  // Get message by ID
  static async getMessageById(id: string): Promise<Message | null> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || null;
  }

  // Get messages for a conversation
  static async getConversationMessages(
    conversationId: string,
    options: {
      limit?: number;
      offset?: number;
      sortOrder?: 'asc' | 'desc';
      includeReactions?: boolean;
    } = {}
  ): Promise<Message[]> {
    const {
      limit = 100,
      offset = 0,
      sortOrder = 'asc',
      includeReactions = false
    } = options;

    const orderFn = sortOrder === 'asc' ? asc : desc;

    let query = db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(orderFn(messages.createdAt))
      .limit(limit)
      .offset(offset);

    const result = await query;
    
    if (includeReactions) {
      // Add reactions to each message (in a real app, you might want to optimize this)
      for (const message of result) {
        const reactions = await db
          .select()
          .from(messageReactions)
          .where(eq(messageReactions.messageId, message.id));
        
        (message as any).reactions = reactions;
      }
    }

    return result;
  }

  // Update message
  static async updateMessage(
    id: string, 
    updates: Partial<NewMessage>
  ): Promise<Message | null> {
    const [message] = await db
      .update(messages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(messages.id, id))
      .returning();
    
    if (message) {
      // Update conversation's updatedAt timestamp
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, message.conversationId));
    }
    
    return message || null;
  }

  // Delete message
  static async deleteMessage(id: string): Promise<boolean> {
    const message = await this.getMessageById(id);
    if (!message) return false;

    const result = await db.delete(messages).where(eq(messages.id, id));
    
    if (result.rowCount > 0) {
      // Update conversation's updatedAt timestamp
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, message.conversationId));
    }
    
    return result.rowCount > 0;
  }

  // Search messages in conversation
  static async searchMessagesInConversation(
    conversationId: string,
    searchTerm: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Message[]> {
    const { limit = 20, offset = 0 } = options;

    return await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        like(messages.content, `%${searchTerm}%`)
      ))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);
  }

  // Search messages across all user conversations
  static async searchUserMessages(
    userId: string,
    searchTerm: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<(Message & { conversationTitle: string })[]> {
    const { limit = 20, offset = 0 } = options;

    const result = await db
      .select({
        message: messages,
        conversationTitle: conversations.title,
      })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(
        eq(conversations.userId, userId),
        like(messages.content, `%${searchTerm}%`)
      ))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    return result.map(r => ({
      ...r.message,
      conversationTitle: r.conversationTitle,
    }));
  }

  // Get message count for conversation
  static async getConversationMessageCount(conversationId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.conversationId, conversationId));
    
    return result?.count || 0;
  }

  // Get latest message in conversation
  static async getLatestMessage(conversationId: string): Promise<Message | null> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(1);
    
    return message || null;
  }

  // Bulk update message status
  static async updateMessageStatus(
    conversationId: string,
    status: 'pending' | 'streaming' | 'completed' | 'error'
  ): Promise<Message[]> {
    const result = await db
      .update(messages)
      .set({ status, updatedAt: new Date() })
      .where(eq(messages.conversationId, conversationId))
      .returning();
    
    return result;
  }

  // Get messages by sender
  static async getMessagesBySender(
    conversationId: string,
    sender: 'user' | 'ai' | 'system'
  ): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        eq(messages.sender, sender)
      ))
      .orderBy(asc(messages.createdAt));
  }

  // Get message with reactions
  static async getMessageWithReactions(id: string) {
    const message = await this.getMessageById(id);
    if (!message) return null;

    const reactions = await db
      .select()
      .from(messageReactions)
      .where(eq(messageReactions.messageId, id));

    return {
      ...message,
      reactions,
    };
  }
}