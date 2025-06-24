import { z } from 'zod';

// Subscription tier enumeration
export enum SubscriptionTier {
  STARTER = 'starter',
  PROFESSIONAL = 'professional', 
  BOARDROOM = 'boardroom',
  ENTERPRISE = 'enterprise',
}

// Feature limits schema
const FeatureLimitsSchema = z.object({
  messagesPerDay: z.number(),
  messagesPerMonth: z.number(),
  maxDebateRounds: z.number(),
  maxPersonasPerDebate: z.number(),
  availableModels: z.array(z.string()),
  canUseCustomPersonas: z.boolean(),
  canExportDebates: z.boolean(),
  canAccessAnalytics: z.boolean(),
  canUseAdvancedFeatures: z.boolean(),
  apiAccess: z.boolean(),
  prioritySupport: z.boolean(),
  whiteLabel: z.boolean(),
  concurrentDebates: z.number(),
  storageGB: z.number(),
});

// Pricing schema
const PricingSchema = z.object({
  monthlyPrice: z.number(),
  yearlyPrice: z.number(),
  yearlyDiscount: z.number(),
  currency: z.string().default('USD'),
  pricePerExtraMessage: z.number(),
  freeTrialDays: z.number(),
});

// Complete subscription tier schema
const SubscriptionTierSchema = z.object({
  id: z.nativeEnum(SubscriptionTier),
  name: z.string(),
  description: z.string(),
  tagline: z.string(),
  popular: z.boolean().default(false),
  pricing: PricingSchema,
  limits: FeatureLimitsSchema,
  features: z.array(z.string()),
  restrictions: z.array(z.string()).optional(),
});

export type FeatureLimits = z.infer<typeof FeatureLimitsSchema>;
export type Pricing = z.infer<typeof PricingSchema>;
export type SubscriptionTierConfig = z.infer<typeof SubscriptionTierSchema>;

// Define the subscription tiers
export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, SubscriptionTierConfig> = {
  [SubscriptionTier.STARTER]: {
    id: SubscriptionTier.STARTER,
    name: 'Starter',
    description: 'Perfect for trying out AI-powered business decisions',
    tagline: 'Get started with AI advisory',
    popular: false,
    pricing: {
      monthlyPrice: 0,
      yearlyPrice: 0,
      yearlyDiscount: 0,
      currency: 'USD',
      pricePerExtraMessage: 0.05,
      freeTrialDays: 0,
    },
    limits: {
      messagesPerDay: 10,
      messagesPerMonth: 100,
      maxDebateRounds: 2,
      maxPersonasPerDebate: 2,
      availableModels: ['gemini-pro', 'mixtral-8x7b'],
      canUseCustomPersonas: false,
      canExportDebates: false,
      canAccessAnalytics: false,
      canUseAdvancedFeatures: false,
      apiAccess: false,
      prioritySupport: false,
      whiteLabel: false,
      concurrentDebates: 1,
      storageGB: 1,
    },
    features: [
      '10 messages per day',
      'Basic AI models (Gemini Pro, Mixtral)',
      'Single AI and Expert Panel modes',
      'Up to 2 debate rounds',
      'Basic conversation history',
      'Email support',
    ],
    restrictions: [
      'No custom personas',
      'No export capabilities',
      'No analytics dashboard',
      'Limited model selection',
    ],
  },

  [SubscriptionTier.PROFESSIONAL]: {
    id: SubscriptionTier.PROFESSIONAL,
    name: 'Professional',
    description: 'For professionals who need regular AI business advisory',
    tagline: 'Unlock the full potential',
    popular: true,
    pricing: {
      monthlyPrice: 29,
      yearlyPrice: 290,
      yearlyDiscount: 17, // ~$58 savings
      currency: 'USD',
      pricePerExtraMessage: 0.03,
      freeTrialDays: 14,
    },
    limits: {
      messagesPerDay: 500,
      messagesPerMonth: 10000,
      maxDebateRounds: 5,
      maxPersonasPerDebate: 5,
      availableModels: ['gpt-4', 'claude-3-sonnet', 'gemini-pro', 'mixtral-8x7b'],
      canUseCustomPersonas: true,
      canExportDebates: true,
      canAccessAnalytics: true,
      canUseAdvancedFeatures: true,
      apiAccess: false,
      prioritySupport: true,
      whiteLabel: false,
      concurrentDebates: 3,
      storageGB: 10,
    },
    features: [
      'Unlimited daily messages',
      'All AI models (GPT-4, Claude, Gemini)',
      'All debate modes including Boardroom',
      'Up to 5 debate rounds',
      'Custom persona creation',
      'Export to PDF, Word, Markdown',
      'Analytics dashboard',
      'Advanced debate controls',
      'Priority email support',
      '14-day free trial',
    ],
  },

  [SubscriptionTier.BOARDROOM]: {
    id: SubscriptionTier.BOARDROOM,
    name: 'Boardroom',
    description: 'For teams and organizations making critical decisions',
    tagline: 'Enterprise-grade AI advisory',
    popular: false,
    pricing: {
      monthlyPrice: 99,
      yearlyPrice: 990,
      yearlyDiscount: 17, // ~$198 savings
      currency: 'USD',
      pricePerExtraMessage: 0.02,
      freeTrialDays: 30,
    },
    limits: {
      messagesPerDay: 2000,
      messagesPerMonth: 50000,
      maxDebateRounds: 10,
      maxPersonasPerDebate: 10,
      availableModels: ['gpt-4', 'claude-3-sonnet', 'claude-3-opus', 'gemini-pro', 'mixtral-8x7b'],
      canUseCustomPersonas: true,
      canExportDebates: true,
      canAccessAnalytics: true,
      canUseAdvancedFeatures: true,
      apiAccess: true,
      prioritySupport: true,
      whiteLabel: false,
      concurrentDebates: 10,
      storageGB: 100,
    },
    features: [
      'High-volume message limits',
      'Premium AI models (GPT-4, Claude Opus)',
      'Extended debate rounds (up to 10)',
      'Custom personas with industry templates',
      'Team collaboration features',
      'Advanced analytics and insights',
      'API access for integrations',
      'Bulk export capabilities',
      'Business decision tracking',
      'Phone and email support',
      '30-day free trial',
    ],
  },

  [SubscriptionTier.ENTERPRISE]: {
    id: SubscriptionTier.ENTERPRISE,
    name: 'Enterprise',
    description: 'Custom solutions for large organizations',
    tagline: 'Tailored AI advisory platform',
    popular: false,
    pricing: {
      monthlyPrice: 299,
      yearlyPrice: 2990,
      yearlyDiscount: 17, // ~$598 savings
      currency: 'USD',
      pricePerExtraMessage: 0.01,
      freeTrialDays: 30,
    },
    limits: {
      messagesPerDay: -1, // Unlimited
      messagesPerMonth: -1, // Unlimited
      maxDebateRounds: -1, // Unlimited
      maxPersonasPerDebate: -1, // Unlimited
      availableModels: ['*'], // All models
      canUseCustomPersonas: true,
      canExportDebates: true,
      canAccessAnalytics: true,
      canUseAdvancedFeatures: true,
      apiAccess: true,
      prioritySupport: true,
      whiteLabel: true,
      concurrentDebates: -1, // Unlimited
      storageGB: -1, // Unlimited
    },
    features: [
      'Unlimited usage across all features',
      'All premium AI models',
      'White-label deployment options',
      'Custom persona development',
      'Dedicated account manager',
      'Custom integrations and API',
      'Advanced security and compliance',
      'Single Sign-On (SSO)',
      'Custom reporting and analytics',
      'On-premise deployment options',
      '24/7 phone and email support',
      'Custom contract terms',
    ],
  },
};

// Utility functions
export function getSubscriptionTier(tierId: string): SubscriptionTierConfig | null {
  return SUBSCRIPTION_TIERS[tierId as SubscriptionTier] || null;
}

export function getAllSubscriptionTiers(): SubscriptionTierConfig[] {
  return Object.values(SUBSCRIPTION_TIERS);
}

export function getPopularTier(): SubscriptionTierConfig {
  return SUBSCRIPTION_TIERS[SubscriptionTier.PROFESSIONAL];
}

export function calculateYearlySavings(tier: SubscriptionTierConfig): number {
  const monthlyTotal = tier.pricing.monthlyPrice * 12;
  return monthlyTotal - tier.pricing.yearlyPrice;
}

export function isFeatureAllowed(
  tier: SubscriptionTier, 
  feature: keyof FeatureLimits
): boolean {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const limit = tierConfig.limits[feature];
  
  if (typeof limit === 'boolean') {
    return limit;
  }
  
  if (typeof limit === 'number') {
    return limit > 0 || limit === -1; // -1 means unlimited
  }
  
  if (Array.isArray(limit)) {
    return limit.length > 0 || limit.includes('*');
  }
  
  return false;
}

export function checkUsageLimit(
  tier: SubscriptionTier,
  feature: keyof FeatureLimits,
  currentUsage: number
): { allowed: boolean; limit: number; remaining: number } {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const limit = tierConfig.limits[feature] as number;
  
  if (limit === -1) {
    return { allowed: true, limit: -1, remaining: -1 };
  }
  
  const remaining = Math.max(0, limit - currentUsage);
  return {
    allowed: currentUsage < limit,
    limit,
    remaining,
  };
}

export function getModelsByTier(tier: SubscriptionTier): string[] {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const models = tierConfig.limits.availableModels;
  
  if (models.includes('*')) {
    // Return all available models for enterprise
    return [
      'gpt-4', 
      'gpt-4-turbo',
      'claude-3-opus', 
      'claude-3-sonnet', 
      'claude-3-haiku',
      'gemini-pro', 
      'gemini-ultra',
      'mixtral-8x7b', 
      'llama-70b'
    ];
  }
  
  return models;
}

// Cost calculation utilities
export function calculateMessageCost(
  tier: SubscriptionTier,
  model: string,
  tokenCount: number
): number {
  // Model pricing per 1K tokens (in USD)
  const MODEL_PRICING = {
    'gpt-4': 0.03,
    'gpt-4-turbo': 0.01,
    'claude-3-opus': 0.015,
    'claude-3-sonnet': 0.003,
    'claude-3-haiku': 0.00025,
    'gemini-pro': 0.001,
    'gemini-ultra': 0.001,
    'mixtral-8x7b': 0.0005,
    'llama-70b': 0.0007,
  };
  
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const basePrice = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || 0.001;
  
  // Apply tier-based discounts
  let multiplier = 1;
  switch (tier) {
    case SubscriptionTier.PROFESSIONAL:
      multiplier = 0.9; // 10% discount
      break;
    case SubscriptionTier.BOARDROOM:
      multiplier = 0.8; // 20% discount
      break;
    case SubscriptionTier.ENTERPRISE:
      multiplier = 0.7; // 30% discount
      break;
  }
  
  return (tokenCount / 1000) * basePrice * multiplier;
}

export function estimateDebateCost(
  tier: SubscriptionTier,
  model: string,
  topic: string,
  rounds: number,
  personas: number
): { estimatedTokens: number; estimatedCost: number } {
  // Rough estimation based on topic length and debate complexity
  const topicTokens = Math.ceil(topic.length / 4); // ~4 chars per token
  const contextTokens = topicTokens * rounds * personas; // Context grows with each round
  const responseTokens = 150 * rounds * personas; // ~150 tokens per response
  const totalTokens = contextTokens + responseTokens;
  
  const cost = calculateMessageCost(tier, model, totalTokens);
  
  return {
    estimatedTokens: totalTokens,
    estimatedCost: cost,
  };
}