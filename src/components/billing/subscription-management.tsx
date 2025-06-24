'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CreditCard,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Star,
  Zap,
  Shield,
  Download,
  RefreshCw,
  X,
  Crown,
} from 'lucide-react';

import { SubscriptionTier, SUBSCRIPTION_TIERS, getAllSubscriptionTiers, calculateYearlySavings } from '@/lib/subscription-tiers';
import { billingEngine, type Subscription, type BillingCycle, type Invoice } from '@/lib/billing-engine';

interface SubscriptionManagementProps {
  userId: string;
  currentTier: SubscriptionTier;
  onTierChange?: (newTier: SubscriptionTier) => void;
}

export function SubscriptionManagement({ userId, currentTier, onTierChange }: SubscriptionManagementProps) {
  // State
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingHistory, setBillingHistory] = useState<{
    billingCycles: BillingCycle[];
    invoices: Invoice[];
  }>({ billingCycles: [], invoices: [] });
  const [currentUsage, setCurrentUsage] = useState<any>(null);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(currentTier);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load subscription data
  useEffect(() => {
    loadSubscriptionData();
  }, [userId]);

  const loadSubscriptionData = async () => {
    setLoading(true);
    try {
      // Get current subscription
      const currentSub = billingEngine.getUserSubscription(userId);
      setSubscription(currentSub);

      // Get billing history
      const history = billingEngine.getBillingHistory(userId);
      setBillingHistory({
        billingCycles: history.billingCycles,
        invoices: history.invoices,
      });

      // Get current usage and estimated bill
      if (currentSub) {
        const usageData = billingEngine.getCurrentUsageAndEstimatedBill(userId);
        setCurrentUsage(usageData);
        setBillingCycle(currentSub.billingCycle);
      }

    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle tier change
  const handleTierChange = async (newTier: SubscriptionTier) => {
    if (!subscription) {
      // Create new subscription
      const newSub = billingEngine.createSubscription(
        userId,
        newTier,
        billingCycle,
        SUBSCRIPTION_TIERS[newTier].pricing.freeTrialDays
      );
      setSubscription(newSub);
    } else {
      // Update existing subscription
      const updatedSub = billingEngine.updateSubscriptionTier(subscription.id, newTier);
      setSubscription(updatedSub);
    }

    onTierChange?.(newTier);
    setShowTierDialog(false);
    loadSubscriptionData();
  };

  // Handle billing cycle change
  const handleBillingCycleChange = (cycle: 'monthly' | 'yearly') => {
    setBillingCycle(cycle);
    // In a real app, this would update the subscription
  };

  // Handle cancellation
  const handleCancellation = (immediate: boolean = false) => {
    if (!subscription) return;

    const updatedSub = billingEngine.cancelSubscription(
      subscription.id,
      !immediate,
      'User requested cancellation'
    );
    setSubscription(updatedSub);
    setShowCancelDialog(false);
    loadSubscriptionData();
  };

  const allTiers = getAllSubscriptionTiers();
  const currentTierConfig = SUBSCRIPTION_TIERS[currentTier];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Current Plan: {currentTierConfig.name}
                {currentTierConfig.popular && (
                  <Badge variant="default">Popular</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {currentTierConfig.description}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                ${billingCycle === 'yearly' 
                  ? currentTierConfig.pricing.yearlyPrice 
                  : currentTierConfig.pricing.monthlyPrice}
              </div>
              <div className="text-sm text-muted-foreground">
                per {billingCycle === 'yearly' ? 'year' : 'month'}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subscription Status */}
          {subscription && (
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <Badge variant={
                  subscription.status === 'active' ? 'default' :
                  subscription.status === 'trialing' ? 'secondary' :
                  subscription.status === 'canceled' ? 'destructive' : 'outline'
                }>
                  {subscription.status.toUpperCase()}
                </Badge>
                <span className="text-sm">
                  {subscription.status === 'trialing' && subscription.trialEnd && (
                    `Trial ends ${new Date(subscription.trialEnd).toLocaleDateString()}`
                  )}
                  {subscription.status === 'active' && (
                    `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  )}
                  {subscription.cancelAtPeriodEnd && (
                    `Cancels ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  )}
                </span>
              </div>
              <div className="flex gap-2">
                <Dialog open={showTierDialog} onOpenChange={setShowTierDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Change Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Choose Your Plan</DialogTitle>
                      <DialogDescription>
                        Select the plan that best fits your needs. Changes take effect immediately.
                      </DialogDescription>
                    </DialogHeader>
                    
                    {/* Billing Cycle Toggle */}
                    <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-lg">
                      <Button
                        variant={billingCycle === 'monthly' ? 'default' : 'outline'}
                        onClick={() => handleBillingCycleChange('monthly')}
                      >
                        Monthly
                      </Button>
                      <Button
                        variant={billingCycle === 'yearly' ? 'default' : 'outline'}
                        onClick={() => handleBillingCycleChange('yearly')}
                      >
                        Yearly
                        <Badge variant="secondary" className="ml-2">
                          Save {Math.round((calculateYearlySavings(currentTierConfig) / (currentTierConfig.pricing.monthlyPrice * 12)) * 100)}%
                        </Badge>
                      </Button>
                    </div>

                    {/* Plan Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {allTiers.map((tier) => (
                        <Card 
                          key={tier.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedTier === tier.id ? 'ring-2 ring-primary' : ''
                          } ${tier.popular ? 'border-primary' : ''}`}
                          onClick={() => setSelectedTier(tier.id)}
                        >
                          <CardHeader className="text-center pb-2">
                            {tier.popular && (
                              <Badge className="mb-2 self-center">Most Popular</Badge>
                            )}
                            <CardTitle className="text-lg">{tier.name}</CardTitle>
                            <div className="text-3xl font-bold">
                              ${billingCycle === 'yearly' ? tier.pricing.yearlyPrice : tier.pricing.monthlyPrice}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              per {billingCycle === 'yearly' ? 'year' : 'month'}
                            </div>
                            {billingCycle === 'yearly' && tier.pricing.yearlyDiscount > 0 && (
                              <div className="text-xs text-green-600">
                                Save ${calculateYearlySavings(tier)}
                              </div>
                            )}
                          </CardHeader>
                          <CardContent className="pt-0">
                            <ul className="space-y-1 text-xs">
                              {tier.features.slice(0, 4).map((feature, index) => (
                                <li key={index} className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  {feature}
                                </li>
                              ))}
                              {tier.features.length > 4 && (
                                <li className="text-muted-foreground">
                                  +{tier.features.length - 4} more features
                                </li>
                              )}
                            </ul>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowTierDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => handleTierChange(selectedTier)}
                        disabled={selectedTier === currentTier}
                      >
                        {selectedTier === currentTier ? 'Current Plan' : 'Change Plan'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                  <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cancel Subscription</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to cancel your subscription?
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Your subscription will remain active until the end of your current billing period 
                            ({new Date(subscription.currentPeriodEnd).toLocaleDateString()}).
                          </AlertDescription>
                        </Alert>
                        
                        <div className="text-sm text-muted-foreground">
                          You'll lose access to:
                          <ul className="mt-2 space-y-1 list-disc list-inside">
                            <li>All premium AI models</li>
                            <li>Unlimited messages</li>
                            <li>Export capabilities</li>
                            <li>Analytics dashboard</li>
                          </ul>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                          Keep Subscription
                        </Button>
                        <Button variant="destructive" onClick={() => handleCancellation()}>
                          Cancel at Period End
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          )}

          {/* Current Usage */}
          {currentUsage && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Current Period Usage</div>
                <div className="text-2xl font-bold">${currentUsage.currentUsage.monthlyUsage.cost.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">
                  {currentUsage.currentUsage.monthlyUsage.messages} messages
                </div>
              </div>
              
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Estimated Bill</div>
                <div className="text-2xl font-bold">${currentUsage.estimatedBill.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">
                  Next billing in {currentUsage.daysUntilBilling} days
                </div>
              </div>
              
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">This Month</div>
                <div className="text-2xl font-bold">
                  {currentUsage.currentUsage.monthlyUsage.messages}
                </div>
                <div className="text-xs text-muted-foreground">
                  Messages sent
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing History */}
      <Tabs defaultValue="invoices" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="billing">Billing History</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Recent Invoices
              </CardTitle>
              <CardDescription>
                View and download your invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {billingHistory.invoices.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {billingHistory.invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">
                            Invoice #{invoice.id.split('_')[1]}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(invoice.createdAt).toLocaleDateString()} • 
                            ${invoice.total.toFixed(2)} • 
                            <Badge variant={
                              invoice.status === 'paid' ? 'default' :
                              invoice.status === 'sent' ? 'secondary' :
                              'outline'
                            }>
                              {invoice.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No invoices yet. Your first invoice will be generated at the end of your billing period.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Billing Cycles
              </CardTitle>
              <CardDescription>
                Track your billing periods and charges
              </CardDescription>
            </CardHeader>
            <CardContent>
              {billingHistory.billingCycles.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {billingHistory.billingCycles.map((cycle) => (
                      <div key={cycle.id} className="p-4 border rounded space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">
                            {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                          </div>
                          <Badge variant={
                            cycle.status === 'paid' ? 'default' :
                            cycle.status === 'pending' ? 'secondary' :
                            'outline'
                          }>
                            {cycle.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Subscription:</span>
                            <div className="font-medium">${cycle.subscriptionFee.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Usage:</span>
                            <div className="font-medium">${cycle.usageCharges.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <div className="font-medium">${cycle.totalAmount.toFixed(2)}</div>
                          </div>
                        </div>

                        {cycle.items.length > 0 && (
                          <div className="pt-2 border-t">
                            <details className="text-sm">
                              <summary className="cursor-pointer text-muted-foreground">
                                View breakdown ({cycle.items.length} items)
                              </summary>
                              <div className="mt-2 space-y-1">
                                {cycle.items.map((item, index) => (
                                  <div key={index} className="flex justify-between">
                                    <span>{item.description}</span>
                                    <span>${item.totalPrice.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No billing history yet. Your billing cycles will appear here once you have an active subscription.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}