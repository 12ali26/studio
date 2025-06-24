'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SubscriptionTier } from '@/lib/subscription-tiers';
import { CostAnalyticsDashboard } from '@/components/analytics/cost-analytics-dashboard';
import { BudgetManagement } from '@/components/billing/budget-management';
import { SubscriptionManagement } from '@/components/billing/subscription-management';
import { CostOptimization } from '@/components/analytics/cost-optimization';
import { costCalculator } from '@/lib/cost-calculator';
import { usageTracker } from '@/lib/usage-tracker';
import { billingEngine } from '@/lib/billing-engine';
import { TestNavigation } from '@/components/layout/test-nav';

export default function TestCostManagementPage() {
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>(SubscriptionTier.PROFESSIONAL);
  const userId = 'test-user-123';

  // Test functions to generate sample data
  const generateSampleData = () => {
    // Record some sample usage
    costCalculator.recordEvent({
      userId,
      type: 'message',
      model: 'gpt-4',
      tokensUsed: 1500,
      actualCost: 0.045,
      estimatedCost: 0.045,
      metadata: { inputTokens: 500, outputTokens: 1000 }
    });

    costCalculator.recordEvent({
      userId,
      type: 'debate',
      model: 'claude-3-sonnet',
      tokensUsed: 3000,
      actualCost: 0.009,
      estimatedCost: 0.009,
      metadata: { rounds: 2, personas: 3 }
    });

    // Record usage with tracker
    usageTracker.recordMessage(userId, currentTier, 'gpt-4', 1500, 0.045);
    usageTracker.recordDebate(userId, currentTier, 2, 3, 3000, 0.009, 'AI strategy implementation');

    alert('Sample data generated! Refresh the components to see the data.');
  };

  const clearData = () => {
    // Clear localStorage data
    localStorage.removeItem('cost_calculator_events');
    localStorage.removeItem('usage_tracker_data');
    localStorage.removeItem('billing_engine_data');
    alert('All test data cleared! Refresh the page to see the reset state.');
  };

  const createSubscription = () => {
    try {
      billingEngine.createSubscription(userId, currentTier, 'monthly', 14);
      alert(`Created ${currentTier} subscription with 14-day trial!`);
    } catch (error) {
      alert(`Error creating subscription: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        <TestNavigation />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cost Management Testing</h1>
            <p className="text-muted-foreground">
              Test all cost management and billing features
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={generateSampleData} variant="outline">
              Generate Sample Data
            </Button>
            <Button onClick={createSubscription} variant="outline">
              Create Test Subscription
            </Button>
            <Button onClick={clearData} variant="destructive">
              Clear All Data
            </Button>
          </div>
        </div>

        {/* Tier Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Current Test Tier</CardTitle>
            <CardDescription>
              Change tiers to test different subscription levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {Object.values(SubscriptionTier).map((tier) => (
                <Button
                  key={tier}
                  variant={currentTier === tier ? 'default' : 'outline'}
                  onClick={() => setCurrentTier(tier)}
                  className="capitalize"
                >
                  {tier.replace('-', ' ')}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Current tier: <strong className="capitalize">{currentTier.replace('-', ' ')}</strong>
            </p>
          </CardContent>
        </Card>

        {/* Testing Tabs */}
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analytics">Cost Analytics</TabsTrigger>
            <TabsTrigger value="budget">Budget Management</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-4">
            <CostAnalyticsDashboard 
              userId={userId} 
              currentTier={currentTier} 
            />
          </TabsContent>

          <TabsContent value="budget" className="space-y-4">
            <BudgetManagement 
              userId={userId} 
              currentTier={currentTier}
              onBudgetUpdate={(settings) => console.log('Budget updated:', settings)}
            />
          </TabsContent>

          <TabsContent value="subscription" className="space-y-4">
            <SubscriptionManagement 
              userId={userId} 
              currentTier={currentTier}
              onTierChange={(newTier) => {
                setCurrentTier(newTier);
                console.log('Tier changed to:', newTier);
              }}
            />
          </TabsContent>

          <TabsContent value="optimization" className="space-y-4">
            <CostOptimization 
              userId={userId} 
              currentTier={currentTier}
              onOptimizationApplied={(opt) => console.log('Applied optimization:', opt)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}