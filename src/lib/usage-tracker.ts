import { z } from 'zod';
import { SubscriptionTier, checkUsageLimit, SUBSCRIPTION_TIERS } from './subscription-tiers';
import { costCalculator, type CostEvent } from './cost-calculator';

// Usage tracking schemas
const UserUsageSchema = z.object({
  userId: z.string(),
  tier: z.nativeEnum(SubscriptionTier),
  lastUpdated: z.string(),
  
  // Daily usage
  dailyUsage: z.object({
    date: z.string(),
    messages: z.number(),
    debates: z.number(),
    tokens: z.number(),
    cost: z.number(),
    debateRounds: z.number(),
    maxPersonasUsed: z.number(),
    exportsGenerated: z.number(),
    apiCalls: z.number(),
  }),
  
  // Monthly usage
  monthlyUsage: z.object({
    month: z.string(), // YYYY-MM format
    messages: z.number(),
    debates: z.number(),
    tokens: z.number(),
    cost: z.number(),
    debateRounds: z.number(),
    maxPersonasUsed: z.number(),
    exportsGenerated: z.number(),
    apiCalls: z.number(),
  }),
  
  // Usage patterns
  patterns: z.object({
    peakUsageHours: z.array(z.number()),
    favoriteModels: z.array(z.string()),
    averageDebateLength: z.number(),
    averagePersonasPerDebate: z.number(),
    topicCategories: z.record(z.number()),
  }),
});

const UsageLimitCheckSchema = z.object({
  feature: z.string(),
  allowed: z.boolean(),
  limit: z.number(),
  current: z.number(),
  remaining: z.number(),
  resetTime: z.string().optional(),
  upgradeRequired: z.boolean(),
  message: z.string(),
});

const UsageViolationSchema = z.object({
  userId: z.string(),
  feature: z.string(),
  limit: z.number(),
  attempted: z.number(),
  timestamp: z.string(),
  action: z.enum(['blocked', 'warned', 'charged']),
  tier: z.nativeEnum(SubscriptionTier),
});

export type UserUsage = z.infer<typeof UserUsageSchema>;
export type UsageLimitCheck = z.infer<typeof UsageLimitCheckSchema>;
export type UsageViolation = z.infer<typeof UsageViolationSchema>;

// Usage tracker class
export class UsageTracker {
  private userUsageCache = new Map<string, UserUsage>();
  private violations: UsageViolation[] = [];

  constructor() {
    this.loadFromStorage();
  }

  // Initialize user usage tracking
  initializeUser(userId: string, tier: SubscriptionTier): UserUsage {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const initialUsage: UserUsage = {
      userId,
      tier,
      lastUpdated: now.toISOString(),
      dailyUsage: {
        date: today,
        messages: 0,
        debates: 0,
        tokens: 0,
        cost: 0,
        debateRounds: 0,
        maxPersonasUsed: 0,
        exportsGenerated: 0,
        apiCalls: 0,
      },
      monthlyUsage: {
        month: thisMonth,
        messages: 0,
        debates: 0,
        tokens: 0,
        cost: 0,
        debateRounds: 0,
        maxPersonasUsed: 0,
        exportsGenerated: 0,
        apiCalls: 0,
      },
      patterns: {
        peakUsageHours: [],
        favoriteModels: [],
        averageDebateLength: 0,
        averagePersonasPerDebate: 0,
        topicCategories: {},
      },
    };

    this.userUsageCache.set(userId, initialUsage);
    this.saveToStorage();
    return initialUsage;
  }

  // Get or create user usage
  getUserUsage(userId: string, tier: SubscriptionTier): UserUsage {
    if (!this.userUsageCache.has(userId)) {
      return this.initializeUser(userId, tier);
    }

    const usage = this.userUsageCache.get(userId)!;
    
    // Check if we need to reset daily/monthly counters
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let updated = false;
    
    // Reset daily usage if new day
    if (usage.dailyUsage.date !== today) {
      usage.dailyUsage = {
        date: today,
        messages: 0,
        debates: 0,
        tokens: 0,
        cost: 0,
        debateRounds: 0,
        maxPersonasUsed: 0,
        exportsGenerated: 0,
        apiCalls: 0,
      };
      updated = true;
    }
    
    // Reset monthly usage if new month
    if (usage.monthlyUsage.month !== thisMonth) {
      usage.monthlyUsage = {
        month: thisMonth,
        messages: 0,
        debates: 0,
        tokens: 0,
        cost: 0,
        debateRounds: 0,
        maxPersonasUsed: 0,
        exportsGenerated: 0,
        apiCalls: 0,
      };
      updated = true;
    }
    
    // Update tier if changed
    if (usage.tier !== tier) {
      usage.tier = tier;
      updated = true;
    }
    
    if (updated) {
      usage.lastUpdated = now.toISOString();
      this.userUsageCache.set(userId, usage);
      this.saveToStorage();
    }
    
    return usage;
  }

  // Record usage for various actions
  recordMessage(
    userId: string,
    tier: SubscriptionTier,
    model: string,
    tokens: number,
    cost: number
  ): void {
    const usage = this.getUserUsage(userId, tier);
    const now = new Date();
    
    // Update counters
    usage.dailyUsage.messages += 1;
    usage.dailyUsage.tokens += tokens;
    usage.dailyUsage.cost += cost;
    
    usage.monthlyUsage.messages += 1;
    usage.monthlyUsage.tokens += tokens;
    usage.monthlyUsage.cost += cost;
    
    // Update patterns
    const hour = now.getHours();
    if (!usage.patterns.peakUsageHours.includes(hour)) {
      usage.patterns.peakUsageHours.push(hour);
    }
    
    if (!usage.patterns.favoriteModels.includes(model)) {
      usage.patterns.favoriteModels.unshift(model);
      // Keep only top 5 models
      usage.patterns.favoriteModels = usage.patterns.favoriteModels.slice(0, 5);
    }
    
    usage.lastUpdated = now.toISOString();
    this.userUsageCache.set(userId, usage);
    this.saveToStorage();
  }

  recordDebate(
    userId: string,
    tier: SubscriptionTier,
    rounds: number,
    personas: number,
    tokens: number,
    cost: number,
    topic?: string
  ): void {
    const usage = this.getUserUsage(userId, tier);
    
    // Update counters
    usage.dailyUsage.debates += 1;
    usage.dailyUsage.debateRounds += rounds;
    usage.dailyUsage.maxPersonasUsed = Math.max(usage.dailyUsage.maxPersonasUsed, personas);
    usage.dailyUsage.tokens += tokens;
    usage.dailyUsage.cost += cost;
    
    usage.monthlyUsage.debates += 1;
    usage.monthlyUsage.debateRounds += rounds;
    usage.monthlyUsage.maxPersonasUsed = Math.max(usage.monthlyUsage.maxPersonasUsed, personas);
    usage.monthlyUsage.tokens += tokens;
    usage.monthlyUsage.cost += cost;
    
    // Update patterns
    const totalDebates = usage.monthlyUsage.debates;
    usage.patterns.averageDebateLength = 
      (usage.patterns.averageDebateLength * (totalDebates - 1) + rounds) / totalDebates;
    usage.patterns.averagePersonasPerDebate = 
      (usage.patterns.averagePersonasPerDebate * (totalDebates - 1) + personas) / totalDebates;
    
    // Categorize topic
    if (topic) {
      const category = this.categorizeDebateTopic(topic);
      usage.patterns.topicCategories[category] = (usage.patterns.topicCategories[category] || 0) + 1;
    }
    
    usage.lastUpdated = new Date().toISOString();
    this.userUsageCache.set(userId, usage);
    this.saveToStorage();
  }

  recordExport(userId: string, tier: SubscriptionTier): void {
    const usage = this.getUserUsage(userId, tier);
    
    usage.dailyUsage.exportsGenerated += 1;
    usage.monthlyUsage.exportsGenerated += 1;
    
    usage.lastUpdated = new Date().toISOString();
    this.userUsageCache.set(userId, usage);
    this.saveToStorage();
  }

  recordApiCall(userId: string, tier: SubscriptionTier): void {
    const usage = this.getUserUsage(userId, tier);
    
    usage.dailyUsage.apiCalls += 1;
    usage.monthlyUsage.apiCalls += 1;
    
    usage.lastUpdated = new Date().toISOString();
    this.userUsageCache.set(userId, usage);
    this.saveToStorage();
  }

  // Check if user can perform an action
  checkUsageLimit(
    userId: string,
    tier: SubscriptionTier,
    action: 'message' | 'debate' | 'export' | 'api_call',
    additionalParams?: {
      rounds?: number;
      personas?: number;
      concurrent?: boolean;
    }
  ): UsageLimitCheck {
    const usage = this.getUserUsage(userId, tier);
    const tierConfig = SUBSCRIPTION_TIERS[tier];
    const now = new Date();

    switch (action) {
      case 'message':
        const dailyMessageCheck = checkUsageLimit(tier, 'messagesPerDay', usage.dailyUsage.messages);
        const monthlyMessageCheck = checkUsageLimit(tier, 'messagesPerMonth', usage.monthlyUsage.messages);
        
        // Most restrictive limit applies
        const messageLimit = dailyMessageCheck.allowed && monthlyMessageCheck.allowed;
        
        return {
          feature: 'messages',
          allowed: messageLimit,
          limit: Math.min(
            dailyMessageCheck.limit === -1 ? Infinity : dailyMessageCheck.limit,
            monthlyMessageCheck.limit === -1 ? Infinity : monthlyMessageCheck.limit
          ),
          current: usage.dailyUsage.messages,
          remaining: Math.min(dailyMessageCheck.remaining, monthlyMessageCheck.remaining),
          resetTime: this.getNextResetTime('daily').toISOString(),
          upgradeRequired: !messageLimit && tier !== SubscriptionTier.ENTERPRISE,
          message: messageLimit 
            ? 'Message allowed' 
            : `Daily limit: ${dailyMessageCheck.remaining} remaining, Monthly limit: ${monthlyMessageCheck.remaining} remaining`,
        };

      case 'debate':
        const rounds = additionalParams?.rounds || 2;
        const personas = additionalParams?.personas || 3;
        
        // Check rounds limit
        const maxRounds = tierConfig.limits.maxDebateRounds;
        const roundsAllowed = maxRounds === -1 || rounds <= maxRounds;
        
        // Check personas limit
        const maxPersonas = tierConfig.limits.maxPersonasPerDebate;
        const personasAllowed = maxPersonas === -1 || personas <= maxPersonas;
        
        // Check message limits (debates consume messages)
        const messageCheck = this.checkUsageLimit(userId, tier, 'message');
        
        const debateAllowed = roundsAllowed && personasAllowed && messageCheck.allowed;
        
        return {
          feature: 'debate',
          allowed: debateAllowed,
          limit: maxRounds,
          current: rounds,
          remaining: maxRounds === -1 ? -1 : Math.max(0, maxRounds - rounds),
          upgradeRequired: !debateAllowed && tier !== SubscriptionTier.ENTERPRISE,
          message: debateAllowed 
            ? 'Debate allowed'
            : `Max ${maxRounds} rounds, ${maxPersonas} personas per debate. ${messageCheck.message}`,
        };

      case 'export':
        const canExport = tierConfig.limits.canExportDebates;
        
        return {
          feature: 'export',
          allowed: canExport,
          limit: canExport ? -1 : 0,
          current: usage.dailyUsage.exportsGenerated,
          remaining: canExport ? -1 : 0,
          upgradeRequired: !canExport,
          message: canExport ? 'Export allowed' : 'Export feature requires Professional tier or higher',
        };

      case 'api_call':
        const hasApiAccess = tierConfig.limits.apiAccess;
        
        return {
          feature: 'api_access',
          allowed: hasApiAccess,
          limit: hasApiAccess ? -1 : 0,
          current: usage.dailyUsage.apiCalls,
          remaining: hasApiAccess ? -1 : 0,
          upgradeRequired: !hasApiAccess,
          message: hasApiAccess ? 'API access allowed' : 'API access requires Boardroom tier or higher',
        };

      default:
        return {
          feature: action,
          allowed: false,
          limit: 0,
          current: 0,
          remaining: 0,
          upgradeRequired: true,
          message: 'Unknown action',
        };
    }
  }

  // Enforce usage limits (called before actions)
  enforceLimit(
    userId: string,
    tier: SubscriptionTier,
    action: 'message' | 'debate' | 'export' | 'api_call',
    additionalParams?: any
  ): { allowed: boolean; violation?: UsageViolation } {
    const limitCheck = this.checkUsageLimit(userId, tier, action, additionalParams);
    
    if (!limitCheck.allowed) {
      const violation: UsageViolation = {
        userId,
        feature: action,
        limit: limitCheck.limit,
        attempted: limitCheck.current + 1,
        timestamp: new Date().toISOString(),
        action: 'blocked',
        tier,
      };
      
      this.violations.push(violation);
      this.saveToStorage();
      
      return { allowed: false, violation };
    }
    
    return { allowed: true };
  }

  // Get user's usage summary
  getUsageSummary(userId: string, tier: SubscriptionTier): {
    daily: any;
    monthly: any;
    limits: any;
    patterns: any;
    alerts: any[];
  } {
    const usage = this.getUserUsage(userId, tier);
    const tierConfig = SUBSCRIPTION_TIERS[tier];
    
    return {
      daily: usage.dailyUsage,
      monthly: usage.monthlyUsage,
      limits: {
        messagesPerDay: tierConfig.limits.messagesPerDay,
        messagesPerMonth: tierConfig.limits.messagesPerMonth,
        maxDebateRounds: tierConfig.limits.maxDebateRounds,
        maxPersonasPerDebate: tierConfig.limits.maxPersonasPerDebate,
        canExportDebates: tierConfig.limits.canExportDebates,
        apiAccess: tierConfig.limits.apiAccess,
      },
      patterns: usage.patterns,
      alerts: costCalculator.checkBudgetAlerts(userId, tier),
    };
  }

  // Get usage violations for a user
  getViolations(userId: string): UsageViolation[] {
    return this.violations.filter(v => v.userId === userId);
  }

  // Helper methods
  private categorizeDebateTopic(topic: string): string {
    const categories = {
      'Technology': ['tech', 'software', 'ai', 'digital', 'innovation', 'platform'],
      'Finance': ['budget', 'cost', 'revenue', 'profit', 'investment', 'pricing'],
      'Marketing': ['marketing', 'brand', 'customer', 'campaign', 'promotion', 'advertising'],
      'Strategy': ['strategy', 'growth', 'expansion', 'competition', 'market', 'planning'],
      'Operations': ['operations', 'process', 'efficiency', 'workflow', 'logistics', 'supply'],
      'HR': ['hiring', 'employee', 'team', 'culture', 'talent', 'training'],
    };
    
    const topicLower = topic.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => topicLower.includes(keyword))) {
        return category;
      }
    }
    
    return 'General';
  }

  private getNextResetTime(period: 'daily' | 'monthly'): Date {
    const now = new Date();
    
    if (period === 'daily') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    } else {
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(0, 0, 0, 0);
      return nextMonth;
    }
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const usageData = localStorage.getItem('usage_tracker_data');
        if (usageData) {
          const parsed = JSON.parse(usageData);
          if (parsed.userUsage) {
            this.userUsageCache = new Map(parsed.userUsage);
          }
          if (parsed.violations) {
            this.violations = parsed.violations;
          }
        }
      } catch (error) {
        console.error('Error loading usage data from storage:', error);
      }
    }
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const data = {
          userUsage: Array.from(this.userUsageCache.entries()),
          violations: this.violations,
        };
        localStorage.setItem('usage_tracker_data', JSON.stringify(data));
      } catch (error) {
        console.error('Error saving usage data to storage:', error);
      }
    }
  }
}

// Global usage tracker instance
export const usageTracker = new UsageTracker();