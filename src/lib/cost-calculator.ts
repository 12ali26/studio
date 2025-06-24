import { z } from 'zod';
import { SubscriptionTier, calculateMessageCost, estimateDebateCost } from './subscription-tiers';

// Cost tracking schemas
const CostEventSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(['message', 'debate', 'export', 'api_call']),
  timestamp: z.string(),
  model: z.string(),
  tokensUsed: z.number(),
  actualCost: z.number(),
  estimatedCost: z.number(),
  metadata: z.record(z.any()).optional(),
});

const UsageStatsSchema = z.object({
  userId: z.string(),
  tier: z.nativeEnum(SubscriptionTier),
  period: z.enum(['daily', 'monthly', 'yearly']),
  startDate: z.string(),
  endDate: z.string(),
  totalMessages: z.number(),
  totalDebates: z.number(),
  totalTokens: z.number(),
  totalCost: z.number(),
  modelBreakdown: z.record(z.object({
    messages: z.number(),
    tokens: z.number(),
    cost: z.number(),
  })),
  dailyBreakdown: z.array(z.object({
    date: z.string(),
    messages: z.number(),
    tokens: z.number(),
    cost: z.number(),
  })),
});

const BudgetAlertSchema = z.object({
  userId: z.string(),
  alertType: z.enum(['usage_limit', 'cost_threshold', 'tier_upgrade']),
  threshold: z.number(),
  currentValue: z.number(),
  percentage: z.number(),
  severity: z.enum(['info', 'warning', 'critical']),
  message: z.string(),
  timestamp: z.string(),
  actionRequired: z.boolean(),
});

export type CostEvent = z.infer<typeof CostEventSchema>;
export type UsageStats = z.infer<typeof UsageStatsSchema>;
export type BudgetAlert = z.infer<typeof BudgetAlertSchema>;

// Real-time cost calculator class
export class CostCalculator {
  private events: CostEvent[] = [];
  private usageCache = new Map<string, UsageStats>();

  constructor() {
    // In a real app, this would connect to a database
    this.loadFromStorage();
  }

  // Record a cost event
  recordEvent(event: Omit<CostEvent, 'id' | 'timestamp'>): CostEvent {
    const costEvent: CostEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
    };

    this.events.push(costEvent);
    this.invalidateCache(event.userId);
    this.saveToStorage();
    
    return costEvent;
  }

  // Calculate real-time cost for a message
  calculateMessageCost(
    userId: string,
    tier: SubscriptionTier,
    model: string,
    inputTokens: number,
    outputTokens: number,
    metadata?: Record<string, any>
  ): CostEvent {
    const totalTokens = inputTokens + outputTokens;
    const actualCost = calculateMessageCost(tier, model, totalTokens);

    return this.recordEvent({
      userId,
      type: 'message',
      model,
      tokensUsed: totalTokens,
      actualCost,
      estimatedCost: actualCost, // Same for individual messages
      metadata: {
        inputTokens,
        outputTokens,
        ...metadata,
      },
    });
  }

  // Calculate cost for a debate session
  calculateDebateCost(
    userId: string,
    tier: SubscriptionTier,
    model: string,
    topic: string,
    rounds: number,
    personas: number,
    actualTokens?: number
  ): CostEvent {
    const estimate = estimateDebateCost(tier, model, topic, rounds, personas);
    const tokensUsed = actualTokens || estimate.estimatedTokens;
    const actualCost = calculateMessageCost(tier, model, tokensUsed);

    return this.recordEvent({
      userId,
      type: 'debate',
      model,
      tokensUsed,
      actualCost,
      estimatedCost: estimate.estimatedCost,
      metadata: {
        topic,
        rounds,
        personas,
        estimatedTokens: estimate.estimatedTokens,
      },
    });
  }

  // Get usage statistics for a user
  getUsageStats(
    userId: string,
    tier: SubscriptionTier,
    period: 'daily' | 'monthly' | 'yearly' = 'monthly'
  ): UsageStats {
    const cacheKey = `${userId}_${period}`;
    if (this.usageCache.has(cacheKey)) {
      return this.usageCache.get(cacheKey)!;
    }

    const now = new Date();
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const userEvents = this.events.filter(
      event => 
        event.userId === userId &&
        new Date(event.timestamp) >= startDate &&
        new Date(event.timestamp) <= endDate
    );

    const stats: UsageStats = {
      userId,
      tier,
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalMessages: userEvents.filter(e => e.type === 'message').length,
      totalDebates: userEvents.filter(e => e.type === 'debate').length,
      totalTokens: userEvents.reduce((sum, e) => sum + e.tokensUsed, 0),
      totalCost: userEvents.reduce((sum, e) => sum + e.actualCost, 0),
      modelBreakdown: this.calculateModelBreakdown(userEvents),
      dailyBreakdown: this.calculateDailyBreakdown(userEvents, startDate, endDate),
    };

    this.usageCache.set(cacheKey, stats);
    return stats;
  }

  // Get real-time cost for current session
  getCurrentSessionCost(userId: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.events
      .filter(event => 
        event.userId === userId &&
        new Date(event.timestamp) >= today
      )
      .reduce((sum, event) => sum + event.actualCost, 0);
  }

  // Check for budget alerts
  checkBudgetAlerts(
    userId: string,
    tier: SubscriptionTier,
    monthlyBudget?: number
  ): BudgetAlert[] {
    const alerts: BudgetAlert[] = [];
    const monthlyStats = this.getUsageStats(userId, tier, 'monthly');
    const tierConfig = require('./subscription-tiers').SUBSCRIPTION_TIERS[tier];

    // Check message limits
    if (tierConfig.limits.messagesPerMonth > 0) {
      const usagePercentage = (monthlyStats.totalMessages / tierConfig.limits.messagesPerMonth) * 100;
      
      if (usagePercentage >= 90) {
        alerts.push({
          userId,
          alertType: 'usage_limit',
          threshold: tierConfig.limits.messagesPerMonth,
          currentValue: monthlyStats.totalMessages,
          percentage: usagePercentage,
          severity: 'critical',
          message: `You've used ${usagePercentage.toFixed(1)}% of your monthly message limit`,
          timestamp: new Date().toISOString(),
          actionRequired: true,
        });
      } else if (usagePercentage >= 75) {
        alerts.push({
          userId,
          alertType: 'usage_limit',
          threshold: tierConfig.limits.messagesPerMonth,
          currentValue: monthlyStats.totalMessages,
          percentage: usagePercentage,
          severity: 'warning',
          message: `You've used ${usagePercentage.toFixed(1)}% of your monthly message limit`,
          timestamp: new Date().toISOString(),
          actionRequired: false,
        });
      }
    }

    // Check custom budget limits
    if (monthlyBudget && monthlyBudget > 0) {
      const budgetPercentage = (monthlyStats.totalCost / monthlyBudget) * 100;
      
      if (budgetPercentage >= 90) {
        alerts.push({
          userId,
          alertType: 'cost_threshold',
          threshold: monthlyBudget,
          currentValue: monthlyStats.totalCost,
          percentage: budgetPercentage,
          severity: 'critical',
          message: `You've spent ${budgetPercentage.toFixed(1)}% of your monthly budget ($${monthlyStats.totalCost.toFixed(2)}/$${monthlyBudget.toFixed(2)})`,
          timestamp: new Date().toISOString(),
          actionRequired: true,
        });
      } else if (budgetPercentage >= 75) {
        alerts.push({
          userId,
          alertType: 'cost_threshold',
          threshold: monthlyBudget,
          currentValue: monthlyStats.totalCost,
          percentage: budgetPercentage,
          severity: 'warning',
          message: `You've spent ${budgetPercentage.toFixed(1)}% of your monthly budget ($${monthlyStats.totalCost.toFixed(2)}/$${monthlyBudget.toFixed(2)})`,
          timestamp: new Date().toISOString(),
          actionRequired: false,
        });
      }
    }

    // Suggest tier upgrades based on usage patterns
    if (tier === SubscriptionTier.STARTER && monthlyStats.totalMessages > 50) {
      alerts.push({
        userId,
        alertType: 'tier_upgrade',
        threshold: 50,
        currentValue: monthlyStats.totalMessages,
        percentage: (monthlyStats.totalMessages / 50) * 100,
        severity: 'info',
        message: 'Consider upgrading to Professional for unlimited messages and advanced features',
        timestamp: new Date().toISOString(),
        actionRequired: false,
      });
    }

    return alerts;
  }

  // Estimate cost for upcoming operation
  estimateOperationCost(
    tier: SubscriptionTier,
    operation: {
      type: 'message' | 'debate';
      model: string;
      topic?: string;
      rounds?: number;
      personas?: number;
      estimatedTokens?: number;
    }
  ): { estimatedTokens: number; estimatedCost: number; breakdown: any } {
    if (operation.type === 'debate' && operation.topic) {
      const estimate = estimateDebateCost(
        tier,
        operation.model,
        operation.topic,
        operation.rounds || 2,
        operation.personas || 3
      );
      
      return {
        estimatedTokens: estimate.estimatedTokens,
        estimatedCost: estimate.estimatedCost,
        breakdown: {
          rounds: operation.rounds || 2,
          personas: operation.personas || 3,
          tokensPerPersona: Math.ceil(estimate.estimatedTokens / (operation.personas || 3)),
        },
      };
    } else {
      const tokens = operation.estimatedTokens || 200; // Default message size
      const cost = calculateMessageCost(tier, operation.model, tokens);
      
      return {
        estimatedTokens: tokens,
        estimatedCost: cost,
        breakdown: {
          tokensPerMessage: tokens,
        },
      };
    }
  }

  // Get cost optimization suggestions
  getCostOptimizationSuggestions(
    userId: string,
    tier: SubscriptionTier
  ): Array<{ type: string; suggestion: string; potentialSavings: number }> {
    const stats = this.getUsageStats(userId, tier, 'monthly');
    const suggestions: Array<{ type: string; suggestion: string; potentialSavings: number }> = [];

    // Analyze model usage patterns
    const modelUsage = Object.entries(stats.modelBreakdown)
      .sort(([,a], [,b]) => b.cost - a.cost);

    // Suggest cheaper models for high-volume usage
    if (modelUsage.length > 0) {
      const topModel = modelUsage[0];
      if (topModel[0] === 'gpt-4' && topModel[1].cost > 10) {
        const savings = topModel[1].cost * 0.6; // Estimated 60% savings with Claude Sonnet
        suggestions.push({
          type: 'model_optimization',
          suggestion: 'Consider using Claude 3 Sonnet for some debates to reduce costs by ~60%',
          potentialSavings: savings,
        });
      }
    }

    // Suggest tier optimization
    if (tier === SubscriptionTier.STARTER && stats.totalCost > 15) {
      suggestions.push({
        type: 'tier_upgrade',
        suggestion: 'Upgrade to Professional tier for better pricing and unlimited messages',
        potentialSavings: stats.totalCost * 0.3, // Estimated 30% savings on overage costs
      });
    }

    // Suggest debate optimization
    const avgDebateTokens = stats.totalTokens / Math.max(stats.totalDebates, 1);
    if (avgDebateTokens > 2000) {
      suggestions.push({
        type: 'debate_optimization',
        suggestion: 'Consider reducing debate rounds or personas for less complex topics',
        potentialSavings: stats.totalCost * 0.25,
      });
    }

    return suggestions;
  }

  // Private helper methods
  private generateEventId(): string {
    return `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getPeriodDates(period: 'daily' | 'monthly' | 'yearly'): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    return { startDate, endDate };
  }

  private calculateModelBreakdown(events: CostEvent[]): Record<string, { messages: number; tokens: number; cost: number }> {
    const breakdown: Record<string, { messages: number; tokens: number; cost: number }> = {};

    events.forEach(event => {
      if (!breakdown[event.model]) {
        breakdown[event.model] = { messages: 0, tokens: 0, cost: 0 };
      }

      breakdown[event.model].messages += 1;
      breakdown[event.model].tokens += event.tokensUsed;
      breakdown[event.model].cost += event.actualCost;
    });

    return breakdown;
  }

  private calculateDailyBreakdown(
    events: CostEvent[],
    startDate: Date,
    endDate: Date
  ): Array<{ date: string; messages: number; tokens: number; cost: number }> {
    const dailyData: Record<string, { messages: number; tokens: number; cost: number }> = {};

    // Initialize all days in the period
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyData[dateKey] = { messages: 0, tokens: 0, cost: 0 };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate events by day
    events.forEach(event => {
      const dateKey = event.timestamp.split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].messages += 1;
        dailyData[dateKey].tokens += event.tokensUsed;
        dailyData[dateKey].cost += event.actualCost;
      }
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private invalidateCache(userId: string): void {
    const keysToDelete = Array.from(this.usageCache.keys())
      .filter(key => key.startsWith(userId));
    
    keysToDelete.forEach(key => this.usageCache.delete(key));
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('cost_calculator_events');
        if (stored) {
          this.events = JSON.parse(stored);
        }
      } catch (error) {
        console.error('Error loading cost events from storage:', error);
      }
    }
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cost_calculator_events', JSON.stringify(this.events));
      } catch (error) {
        console.error('Error saving cost events to storage:', error);
      }
    }
  }
}

// Global cost calculator instance
export const costCalculator = new CostCalculator();