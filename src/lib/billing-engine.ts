import { z } from 'zod';
import { SubscriptionTier, SUBSCRIPTION_TIERS, type SubscriptionTierConfig } from './subscription-tiers';
import { costCalculator, type CostEvent } from './cost-calculator';
import { usageTracker } from './usage-tracker';

// Billing schemas
const BillingCycleSchema = z.object({
  id: z.string(),
  userId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  tier: z.nativeEnum(SubscriptionTier),
  subscriptionFee: z.number(),
  usageCharges: z.number(),
  totalAmount: z.number(),
  currency: z.string().default('USD'),
  status: z.enum(['pending', 'processing', 'paid', 'failed', 'refunded']),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    totalPrice: z.number(),
    type: z.enum(['subscription', 'overage', 'addon']),
  })),
  paymentMethod: z.string().optional(),
  paidAt: z.string().optional(),
  dueDate: z.string(),
});

const SubscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tier: z.nativeEnum(SubscriptionTier),
  status: z.enum(['active', 'past_due', 'canceled', 'unpaid', 'trialing']),
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  billingCycle: z.enum(['monthly', 'yearly']),
  trialEnd: z.string().optional(),
  cancelAtPeriodEnd: z.boolean().default(false),
  canceledAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: z.record(z.any()).optional(),
});

const InvoiceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  subscriptionId: z.string(),
  billingCycleId: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(['draft', 'sent', 'paid', 'void', 'uncollectible']),
  createdAt: z.string(),
  dueDate: z.string(),
  paidAt: z.string().optional(),
  items: z.array(z.object({
    description: z.string(),
    amount: z.number(),
    quantity: z.number(),
    unitPrice: z.number(),
  })),
  taxes: z.number().default(0),
  discounts: z.number().default(0),
  subtotal: z.number(),
  total: z.number(),
});

export type BillingCycle = z.infer<typeof BillingCycleSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;

// Billing engine class
export class BillingEngine {
  private subscriptions = new Map<string, Subscription>();
  private billingCycles = new Map<string, BillingCycle>();
  private invoices = new Map<string, Invoice>();

  constructor() {
    this.loadFromStorage();
  }

  // Create a new subscription
  createSubscription(
    userId: string,
    tier: SubscriptionTier,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
    trialDays?: number
  ): Subscription {
    const now = new Date();
    const tierConfig = SUBSCRIPTION_TIERS[tier];
    
    // Calculate trial end date
    let trialEnd: string | undefined;
    if (trialDays && trialDays > 0) {
      const trialEndDate = new Date(now);
      trialEndDate.setDate(trialEndDate.getDate() + trialDays);
      trialEnd = trialEndDate.toISOString();
    }

    // Calculate current period
    const periodStart = trialEnd ? new Date(trialEnd) : now;
    const periodEnd = new Date(periodStart);
    if (billingCycle === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    const subscription: Subscription = {
      id: this.generateId('sub'),
      userId,
      tier,
      status: trialEnd ? 'trialing' : 'active',
      currentPeriodStart: periodStart.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      billingCycle,
      trialEnd,
      cancelAtPeriodEnd: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.subscriptions.set(subscription.id, subscription);
    this.saveToStorage();

    // Create first billing cycle
    this.createBillingCycle(subscription);

    return subscription;
  }

  // Create billing cycle for a subscription period
  createBillingCycle(subscription: Subscription): BillingCycle {
    const tierConfig = SUBSCRIPTION_TIERS[subscription.tier];
    const isYearly = subscription.billingCycle === 'yearly';
    const subscriptionFee = isYearly ? tierConfig.pricing.yearlyPrice : tierConfig.pricing.monthlyPrice;

    // Calculate usage charges for the period
    const usageCharges = this.calculateUsageCharges(
      subscription.userId,
      subscription.tier,
      new Date(subscription.currentPeriodStart),
      new Date(subscription.currentPeriodEnd)
    );

    const billingCycle: BillingCycle = {
      id: this.generateId('cycle'),
      userId: subscription.userId,
      startDate: subscription.currentPeriodStart,
      endDate: subscription.currentPeriodEnd,
      tier: subscription.tier,
      subscriptionFee: subscription.status === 'trialing' ? 0 : subscriptionFee,
      usageCharges: usageCharges.total,
      totalAmount: (subscription.status === 'trialing' ? 0 : subscriptionFee) + usageCharges.total,
      currency: 'USD',
      status: 'pending',
      items: [
        {
          description: `${tierConfig.name} Plan (${subscription.billingCycle})`,
          quantity: 1,
          unitPrice: subscriptionFee,
          totalPrice: subscription.status === 'trialing' ? 0 : subscriptionFee,
          type: 'subscription',
        },
        ...usageCharges.items,
      ],
      dueDate: new Date(subscription.currentPeriodEnd).toISOString(),
    };

    this.billingCycles.set(billingCycle.id, billingCycle);
    this.saveToStorage();

    return billingCycle;
  }

  // Calculate usage charges for a period
  calculateUsageCharges(
    userId: string,
    tier: SubscriptionTier,
    startDate: Date,
    endDate: Date
  ): { total: number; items: any[] } {
    const tierConfig = SUBSCRIPTION_TIERS[tier];
    const usage = usageTracker.getUserUsage(userId, tier);
    const items: any[] = [];
    let total = 0;

    // Calculate message overage charges
    if (tierConfig.limits.messagesPerMonth > 0) {
      const monthlyMessages = usage.monthlyUsage.messages;
      const overage = Math.max(0, monthlyMessages - tierConfig.limits.messagesPerMonth);
      
      if (overage > 0) {
        const overageCharge = overage * tierConfig.pricing.pricePerExtraMessage;
        total += overageCharge;
        
        items.push({
          description: `Message overage (${overage} messages)`,
          quantity: overage,
          unitPrice: tierConfig.pricing.pricePerExtraMessage,
          totalPrice: overageCharge,
          type: 'overage',
        });
      }
    }

    // Additional usage-based charges could be added here
    // For example: storage overage, API calls, etc.

    return { total, items };
  }

  // Get subscription for user
  getUserSubscription(userId: string): Subscription | null {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.userId === userId && subscription.status === 'active') {
        return subscription;
      }
    }
    return null;
  }

  // Update subscription tier
  updateSubscriptionTier(
    subscriptionId: string,
    newTier: SubscriptionTier,
    effectiveDate?: Date
  ): Subscription {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const now = effectiveDate || new Date();
    
    // Calculate prorated amounts for tier change
    const oldTierConfig = SUBSCRIPTION_TIERS[subscription.tier];
    const newTierConfig = SUBSCRIPTION_TIERS[newTier];
    
    const periodStart = new Date(subscription.currentPeriodStart);
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const oldPrice = subscription.billingCycle === 'yearly' 
      ? oldTierConfig.pricing.yearlyPrice 
      : oldTierConfig.pricing.monthlyPrice;
    const newPrice = subscription.billingCycle === 'yearly' 
      ? newTierConfig.pricing.yearlyPrice 
      : newTierConfig.pricing.monthlyPrice;
    
    const proratedCredit = (oldPrice / totalDays) * remainingDays;
    const proratedCharge = (newPrice / totalDays) * remainingDays;
    const proratedDifference = proratedCharge - proratedCredit;

    // Update subscription
    subscription.tier = newTier;
    subscription.updatedAt = now.toISOString();
    subscription.metadata = {
      ...subscription.metadata,
      lastTierChange: now.toISOString(),
      proratedAmount: proratedDifference,
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.saveToStorage();

    // Create prorated billing cycle if there's a difference
    if (Math.abs(proratedDifference) > 0.01) {
      this.createProratedBillingCycle(subscription, proratedDifference, 'tier_change');
    }

    return subscription;
  }

  // Cancel subscription
  cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
    reason?: string
  ): Subscription {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const now = new Date();
    subscription.cancelAtPeriodEnd = cancelAtPeriodEnd;
    subscription.updatedAt = now.toISOString();
    
    if (!cancelAtPeriodEnd) {
      subscription.status = 'canceled';
      subscription.canceledAt = now.toISOString();
    }

    subscription.metadata = {
      ...subscription.metadata,
      cancelReason: reason,
      canceledAt: now.toISOString(),
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.saveToStorage();

    return subscription;
  }

  // Process billing for all active subscriptions
  processBilling(): { processed: number; failed: number; errors: string[] } {
    const now = new Date();
    const results = { processed: 0, failed: 0, errors: [] as string[] };

    for (const subscription of this.subscriptions.values()) {
      if (subscription.status !== 'active') continue;

      const periodEnd = new Date(subscription.currentPeriodEnd);
      if (now >= periodEnd) {
        try {
          this.processSubscriptionBilling(subscription);
          results.processed++;
        } catch (error) {
          results.failed++;
          results.errors.push(`${subscription.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return results;
  }

  // Process billing for a specific subscription
  private processSubscriptionBilling(subscription: Subscription): void {
    const now = new Date();
    
    // Create new billing cycle for next period
    const nextPeriodStart = new Date(subscription.currentPeriodEnd);
    const nextPeriodEnd = new Date(nextPeriodStart);
    
    if (subscription.billingCycle === 'monthly') {
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
    } else {
      nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
    }

    // Update subscription for next period
    subscription.currentPeriodStart = nextPeriodStart.toISOString();
    subscription.currentPeriodEnd = nextPeriodEnd.toISOString();
    subscription.updatedAt = now.toISOString();

    // Handle trial ending
    if (subscription.status === 'trialing' && subscription.trialEnd) {
      const trialEnd = new Date(subscription.trialEnd);
      if (now >= trialEnd) {
        subscription.status = 'active';
      }
    }

    // Handle cancellation
    if (subscription.cancelAtPeriodEnd) {
      subscription.status = 'canceled';
      subscription.canceledAt = now.toISOString();
    }

    this.subscriptions.set(subscription.id, subscription);
    
    // Create billing cycle for next period (if not canceled)
    if (subscription.status === 'active') {
      this.createBillingCycle(subscription);
    }

    this.saveToStorage();
  }

  // Create prorated billing cycle for mid-period changes
  private createProratedBillingCycle(
    subscription: Subscription,
    amount: number,
    reason: string
  ): BillingCycle {
    const billingCycle: BillingCycle = {
      id: this.generateId('cycle'),
      userId: subscription.userId,
      startDate: new Date().toISOString(),
      endDate: subscription.currentPeriodEnd,
      tier: subscription.tier,
      subscriptionFee: 0,
      usageCharges: amount,
      totalAmount: amount,
      currency: 'USD',
      status: 'pending',
      items: [
        {
          description: `Prorated charge (${reason})`,
          quantity: 1,
          unitPrice: amount,
          totalPrice: amount,
          type: 'addon',
        },
      ],
      dueDate: new Date().toISOString(),
    };

    this.billingCycles.set(billingCycle.id, billingCycle);
    this.saveToStorage();

    return billingCycle;
  }

  // Generate invoice from billing cycle
  generateInvoice(billingCycleId: string): Invoice {
    const billingCycle = this.billingCycles.get(billingCycleId);
    if (!billingCycle) {
      throw new Error('Billing cycle not found');
    }

    const subscription = this.getUserSubscription(billingCycle.userId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const subtotal = billingCycle.totalAmount;
    const taxes = subtotal * 0.08; // 8% tax rate (would be dynamic in real app)
    const total = subtotal + taxes;

    const invoice: Invoice = {
      id: this.generateId('inv'),
      userId: billingCycle.userId,
      subscriptionId: subscription.id,
      billingCycleId: billingCycleId,
      amount: total,
      currency: billingCycle.currency,
      status: 'draft',
      createdAt: new Date().toISOString(),
      dueDate: billingCycle.dueDate,
      items: billingCycle.items.map(item => ({
        description: item.description,
        amount: item.totalPrice,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      taxes,
      discounts: 0,
      subtotal,
      total,
    };

    this.invoices.set(invoice.id, invoice);
    this.saveToStorage();

    return invoice;
  }

  // Get billing history for user
  getBillingHistory(userId: string): {
    subscription: Subscription | null;
    billingCycles: BillingCycle[];
    invoices: Invoice[];
  } {
    const subscription = this.getUserSubscription(userId);
    const billingCycles = Array.from(this.billingCycles.values())
      .filter(cycle => cycle.userId === userId)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    const invoices = Array.from(this.invoices.values())
      .filter(invoice => invoice.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { subscription, billingCycles, invoices };
  }

  // Get current usage and estimated bill
  getCurrentUsageAndEstimatedBill(userId: string): {
    currentUsage: any;
    estimatedBill: number;
    nextBillingDate: string;
    daysUntilBilling: number;
  } {
    const subscription = this.getUserSubscription(userId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const usage = usageTracker.getUserUsage(userId, subscription.tier);
    const tierConfig = SUBSCRIPTION_TIERS[subscription.tier];
    
    // Calculate estimated bill
    const subscriptionFee = subscription.billingCycle === 'yearly' 
      ? tierConfig.pricing.yearlyPrice 
      : tierConfig.pricing.monthlyPrice;
    
    const usageCharges = this.calculateUsageCharges(
      userId,
      subscription.tier,
      new Date(subscription.currentPeriodStart),
      new Date(subscription.currentPeriodEnd)
    );

    const estimatedBill = subscriptionFee + usageCharges.total;
    const nextBillingDate = subscription.currentPeriodEnd;
    const daysUntilBilling = Math.ceil(
      (new Date(nextBillingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      currentUsage: usage,
      estimatedBill,
      nextBillingDate,
      daysUntilBilling,
    };
  }

  // Utility methods
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const billingData = localStorage.getItem('billing_engine_data');
        if (billingData) {
          const parsed = JSON.parse(billingData);
          if (parsed.subscriptions) {
            this.subscriptions = new Map(parsed.subscriptions);
          }
          if (parsed.billingCycles) {
            this.billingCycles = new Map(parsed.billingCycles);
          }
          if (parsed.invoices) {
            this.invoices = new Map(parsed.invoices);
          }
        }
      } catch (error) {
        console.error('Error loading billing data from storage:', error);
      }
    }
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const data = {
          subscriptions: Array.from(this.subscriptions.entries()),
          billingCycles: Array.from(this.billingCycles.entries()),
          invoices: Array.from(this.invoices.entries()),
        };
        localStorage.setItem('billing_engine_data', JSON.stringify(data));
      } catch (error) {
        console.error('Error saving billing data to storage:', error);
      }
    }
  }
}

// Global billing engine instance
export const billingEngine = new BillingEngine();