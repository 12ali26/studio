import { eq, and, desc, asc, gte, lte, sql, between } from 'drizzle-orm';
import db from '../connection';
import { 
  usageTracking, 
  users,
  type UsageTracking, 
  type NewUsageTracking 
} from '../schema';

export class UsageTrackingQueries {
  // Record usage data
  static async recordUsage(usageData: NewUsageTracking): Promise<UsageTracking> {
    const [usage] = await db.insert(usageTracking).values(usageData).returning();
    return usage;
  }

  // Get usage by ID
  static async getUsageById(id: string): Promise<UsageTracking | null> {
    const [usage] = await db.select().from(usageTracking).where(eq(usageTracking.id, id));
    return usage || null;
  }

  // Get user's total usage for a period
  static async getUserUsage(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      model?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<UsageTracking[]> {
    const {
      startDate,
      endDate,
      model,
      limit = 100,
      offset = 0
    } = options;

    let query = db
      .select()
      .from(usageTracking)
      .where(eq(usageTracking.userId, userId));

    if (startDate && endDate) {
      query = query.where(and(
        eq(usageTracking.userId, userId),
        between(usageTracking.timestamp, startDate, endDate)
      ));
    } else if (startDate) {
      query = query.where(and(
        eq(usageTracking.userId, userId),
        gte(usageTracking.timestamp, startDate)
      ));
    } else if (endDate) {
      query = query.where(and(
        eq(usageTracking.userId, userId),
        lte(usageTracking.timestamp, endDate)
      ));
    }

    if (model) {
      query = query.where(and(
        eq(usageTracking.userId, userId),
        eq(usageTracking.model, model)
      ));
    }

    return await query
      .orderBy(desc(usageTracking.timestamp))
      .limit(limit)
      .offset(offset);
  }

  // Get usage statistics for a user
  static async getUserUsageStats(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalTokens: number;
    totalCost: number;
    totalRequests: number;
    avgTokensPerRequest: number;
    avgCostPerRequest: number;
    modelBreakdown: { model: string; tokens: number; cost: number; requests: number }[];
  }> {
    let query = db.select().from(usageTracking).where(eq(usageTracking.userId, userId));

    if (startDate && endDate) {
      query = query.where(and(
        eq(usageTracking.userId, userId),
        between(usageTracking.timestamp, startDate, endDate)
      ));
    } else if (startDate) {
      query = query.where(and(
        eq(usageTracking.userId, userId),
        gte(usageTracking.timestamp, startDate)
      ));
    } else if (endDate) {
      query = query.where(and(
        eq(usageTracking.userId, userId),
        lte(usageTracking.timestamp, endDate)
      ));
    }

    const usage = await query;

    const totalTokens = usage.reduce((sum, u) => sum + u.tokensUsed, 0);
    const totalCost = usage.reduce((sum, u) => sum + parseFloat(u.cost), 0);
    const totalRequests = usage.length;

    // Model breakdown
    const modelBreakdown = usage.reduce((acc, u) => {
      const model = u.model;
      if (!acc[model]) {
        acc[model] = { model, tokens: 0, cost: 0, requests: 0 };
      }
      acc[model].tokens += u.tokensUsed;
      acc[model].cost += parseFloat(u.cost);
      acc[model].requests += 1;
      return acc;
    }, {} as Record<string, { model: string; tokens: number; cost: number; requests: number }>);

    return {
      totalTokens,
      totalCost,
      totalRequests,
      avgTokensPerRequest: totalRequests > 0 ? totalTokens / totalRequests : 0,
      avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
      modelBreakdown: Object.values(modelBreakdown),
    };
  }

  // Get daily usage aggregation
  static async getDailyUsage(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ date: string; tokens: number; cost: number; requests: number }[]> {
    const result = await db
      .select({
        date: sql<string>`date_trunc('day', ${usageTracking.timestamp})::date`,
        tokens: sql<number>`sum(${usageTracking.tokensUsed})`,
        cost: sql<number>`sum(${usageTracking.cost})`,
        requests: sql<number>`count(*)`,
      })
      .from(usageTracking)
      .where(and(
        eq(usageTracking.userId, userId),
        between(usageTracking.timestamp, startDate, endDate)
      ))
      .groupBy(sql`date_trunc('day', ${usageTracking.timestamp})`)
      .orderBy(sql`date_trunc('day', ${usageTracking.timestamp})`);

    return result;
  }

  // Get monthly usage aggregation
  static async getMonthlyUsage(
    userId: string,
    year: number
  ): Promise<{ month: string; tokens: number; cost: number; requests: number }[]> {
    const result = await db
      .select({
        month: sql<string>`date_trunc('month', ${usageTracking.timestamp})::date`,
        tokens: sql<number>`sum(${usageTracking.tokensUsed})`,
        cost: sql<number>`sum(${usageTracking.cost})`,
        requests: sql<number>`count(*)`,
      })
      .from(usageTracking)
      .where(and(
        eq(usageTracking.userId, userId),
        sql`extract(year from ${usageTracking.timestamp}) = ${year}`
      ))
      .groupBy(sql`date_trunc('month', ${usageTracking.timestamp})`)
      .orderBy(sql`date_trunc('month', ${usageTracking.timestamp})`);

    return result;
  }

  // Get current month usage
  static async getCurrentMonthUsage(userId: string): Promise<{
    totalTokens: number;
    totalCost: number;
    totalRequests: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [result] = await db
      .select({
        totalTokens: sql<number>`coalesce(sum(${usageTracking.tokensUsed}), 0)`,
        totalCost: sql<number>`coalesce(sum(${usageTracking.cost}), 0)`,
        totalRequests: sql<number>`count(*)`,
      })
      .from(usageTracking)
      .where(and(
        eq(usageTracking.userId, userId),
        between(usageTracking.timestamp, startOfMonth, endOfMonth)
      ));

    return result || { totalTokens: 0, totalCost: 0, totalRequests: 0 };
  }

  // Get usage by model
  static async getUsageByModel(
    userId: string,
    model: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UsageTracking[]> {
    let query = db
      .select()
      .from(usageTracking)
      .where(and(
        eq(usageTracking.userId, userId),
        eq(usageTracking.model, model)
      ));

    if (startDate && endDate) {
      query = query.where(and(
        eq(usageTracking.userId, userId),
        eq(usageTracking.model, model),
        between(usageTracking.timestamp, startDate, endDate)
      ));
    }

    return await query.orderBy(desc(usageTracking.timestamp));
  }

  // Get top models by usage
  static async getTopModelsByUsage(
    userId: string,
    limit: number = 10,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ model: string; tokens: number; cost: number; requests: number }[]> {
    let query = db
      .select({
        model: usageTracking.model,
        tokens: sql<number>`sum(${usageTracking.tokensUsed})`,
        cost: sql<number>`sum(${usageTracking.cost})`,
        requests: sql<number>`count(*)`,
      })
      .from(usageTracking)
      .where(eq(usageTracking.userId, userId));

    if (startDate && endDate) {
      query = query.where(and(
        eq(usageTracking.userId, userId),
        between(usageTracking.timestamp, startDate, endDate)
      ));
    }

    return await query
      .groupBy(usageTracking.model)
      .orderBy(sql`sum(${usageTracking.tokensUsed}) desc`)
      .limit(limit);
  }

  // Delete old usage records (cleanup)
  static async deleteOldUsage(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await db
      .delete(usageTracking)
      .where(lte(usageTracking.timestamp, cutoffDate));

    return result.rowCount || 0;
  }

  // Get usage for message
  static async getMessageUsage(messageId: string): Promise<UsageTracking | null> {
    const [usage] = await db
      .select()
      .from(usageTracking)
      .where(eq(usageTracking.messageId, messageId));
    
    return usage || null;
  }
}