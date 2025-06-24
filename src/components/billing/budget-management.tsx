'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Target,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Bell,
  Settings,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  Zap,
  Lock,
  Unlock,
} from 'lucide-react';

import { SubscriptionTier, SUBSCRIPTION_TIERS } from '@/lib/subscription-tiers';
import { costCalculator } from '@/lib/cost-calculator';
import { usageTracker } from '@/lib/usage-tracker';

interface BudgetSettings {
  monthlyBudget: number;
  alertThresholds: {
    warning: number;  // Percentage
    critical: number; // Percentage
  };
  spendingLimits: {
    dailyLimit: number;
    weeklyLimit: number;
    enableHardLimits: boolean;
  };
  notifications: {
    email: boolean;
    browser: boolean;
    slack: boolean;
  };
  autoActions: {
    pauseOnBudgetExceeded: boolean;
    downgradeModelsOnLimit: boolean;
    requireApprovalOverBudget: boolean;
  };
}

interface BudgetManagementProps {
  userId: string;
  currentTier: SubscriptionTier;
  onBudgetUpdate?: (settings: BudgetSettings) => void;
}

export function BudgetManagement({ userId, currentTier, onBudgetUpdate }: BudgetManagementProps) {
  // State
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings>({
    monthlyBudget: 50,
    alertThresholds: {
      warning: 75,
      critical: 90,
    },
    spendingLimits: {
      dailyLimit: 5,
      weeklyLimit: 20,
      enableHardLimits: false,
    },
    notifications: {
      email: true,
      browser: true,
      slack: false,
    },
    autoActions: {
      pauseOnBudgetExceeded: false,
      downgradeModelsOnLimit: true,
      requireApprovalOverBudget: true,
    },
  });

  const [currentUsage, setCurrentUsage] = useState({
    monthlySpent: 0,
    dailySpent: 0,
    weeklySpent: 0,
    projectedMonthly: 0,
  });

  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load current usage and budget data
  useEffect(() => {
    loadBudgetData();
  }, [userId, currentTier]);

  const loadBudgetData = async () => {
    try {
      // Load current usage
      const monthlyStats = costCalculator.getUsageStats(userId, currentTier, 'monthly');
      const dailySpent = costCalculator.getCurrentSessionCost(userId);
      
      // Calculate weekly spent (last 7 days)
      const weeklySpent = monthlyStats.dailyBreakdown
        .slice(-7)
        .reduce((sum, day) => sum + day.cost, 0);

      // Project monthly spending based on current rate
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const dayOfMonth = new Date().getDate();
      const projectedMonthly = (monthlyStats.totalCost / dayOfMonth) * daysInMonth;

      setCurrentUsage({
        monthlySpent: monthlyStats.totalCost,
        dailySpent,
        weeklySpent,
        projectedMonthly,
      });

      // Load budget alerts
      const budgetAlerts = costCalculator.checkBudgetAlerts(userId, currentTier, budgetSettings.monthlyBudget);
      setAlerts(budgetAlerts);

      // Load saved budget settings
      loadSavedBudgetSettings();

    } catch (error) {
      console.error('Error loading budget data:', error);
    }
  };

  const loadSavedBudgetSettings = () => {
    try {
      const saved = localStorage.getItem(`budget_settings_${userId}`);
      if (saved) {
        setBudgetSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved budget settings:', error);
    }
  };

  const saveBudgetSettings = (newSettings: BudgetSettings) => {
    try {
      setBudgetSettings(newSettings);
      localStorage.setItem(`budget_settings_${userId}`, JSON.stringify(newSettings));
      onBudgetUpdate?.(newSettings);
      
      // Reload data with new settings
      loadBudgetData();
    } catch (error) {
      console.error('Error saving budget settings:', error);
    }
  };

  // Calculate budget metrics
  const budgetMetrics = {
    monthlyUsagePercent: (currentUsage.monthlySpent / budgetSettings.monthlyBudget) * 100,
    dailyUsagePercent: (currentUsage.dailySpent / budgetSettings.spendingLimits.dailyLimit) * 100,
    weeklyUsagePercent: (currentUsage.weeklySpent / budgetSettings.spendingLimits.weeklyLimit) * 100,
    projectedOverage: Math.max(0, currentUsage.projectedMonthly - budgetSettings.monthlyBudget),
    isOnTrack: currentUsage.projectedMonthly <= budgetSettings.monthlyBudget,
    remainingBudget: Math.max(0, budgetSettings.monthlyBudget - currentUsage.monthlySpent),
  };

  // Get alert status
  const getAlertStatus = () => {
    if (budgetMetrics.monthlyUsagePercent >= budgetSettings.alertThresholds.critical) {
      return { level: 'critical', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' };
    } else if (budgetMetrics.monthlyUsagePercent >= budgetSettings.alertThresholds.warning) {
      return { level: 'warning', color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200' };
    } else {
      return { level: 'safe', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' };
    }
  };

  const alertStatus = getAlertStatus();

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <Card className={alertStatus.bgColor}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Budget Overview
            <Badge variant={alertStatus.level === 'critical' ? 'destructive' : alertStatus.level === 'warning' ? 'secondary' : 'default'}>
              {alertStatus.level.toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>
            Monthly budget: ${budgetSettings.monthlyBudget} • 
            Spent: ${currentUsage.monthlySpent.toFixed(2)} • 
            Projected: ${currentUsage.projectedMonthly.toFixed(2)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Monthly Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Monthly Budget Usage</span>
              <span className={alertStatus.color}>
                {budgetMetrics.monthlyUsagePercent.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={budgetMetrics.monthlyUsagePercent} 
              className="h-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>${currentUsage.monthlySpent.toFixed(2)} spent</span>
              <span>${budgetMetrics.remainingBudget.toFixed(2)} remaining</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold">${currentUsage.dailySpent.toFixed(3)}</div>
              <div className="text-xs text-muted-foreground">Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">${currentUsage.weeklySpent.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">This Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold flex items-center justify-center gap-1">
                {budgetMetrics.isOnTrack ? (
                  <TrendingDown className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-red-500" />
                )}
                ${currentUsage.projectedMonthly.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Projected</div>
            </div>
          </div>

          {/* Projection Alert */}
          {budgetMetrics.projectedOverage > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You're projected to exceed your budget by ${budgetMetrics.projectedOverage.toFixed(2)} this month.
                Consider adjusting your usage or increasing your budget.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Budget Settings */}
      <Tabs defaultValue="budget" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Budget Settings
              </CardTitle>
              <CardDescription>
                Set your monthly spending budget and limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Monthly Budget */}
              <div className="space-y-2">
                <Label htmlFor="monthlyBudget">Monthly Budget ($)</Label>
                <Input
                  id="monthlyBudget"
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  value={budgetSettings.monthlyBudget}
                  onChange={(e) => saveBudgetSettings({
                    ...budgetSettings,
                    monthlyBudget: Number(e.target.value)
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: $29 (Professional), $99 (Boardroom), $299 (Enterprise)
                </p>
              </div>

              {/* Daily Limit */}
              <div className="space-y-2">
                <Label>Daily Spending Limit: ${budgetSettings.spendingLimits.dailyLimit}</Label>
                <Slider
                  value={[budgetSettings.spendingLimits.dailyLimit]}
                  onValueChange={([value]) => saveBudgetSettings({
                    ...budgetSettings,
                    spendingLimits: {
                      ...budgetSettings.spendingLimits,
                      dailyLimit: value
                    }
                  })}
                  max={budgetSettings.monthlyBudget / 10}
                  min={0.1}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>$0.10</span>
                  <span>${(budgetSettings.monthlyBudget / 10).toFixed(2)}</span>
                </div>
              </div>

              {/* Weekly Limit */}
              <div className="space-y-2">
                <Label>Weekly Spending Limit: ${budgetSettings.spendingLimits.weeklyLimit}</Label>
                <Slider
                  value={[budgetSettings.spendingLimits.weeklyLimit]}
                  onValueChange={([value]) => saveBudgetSettings({
                    ...budgetSettings,
                    spendingLimits: {
                      ...budgetSettings.spendingLimits,
                      weeklyLimit: value
                    }
                  })}
                  max={budgetSettings.monthlyBudget / 2}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alert Settings
              </CardTitle>
              <CardDescription>
                Configure when and how you want to be notified about budget usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Alert Thresholds */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Warning Threshold: {budgetSettings.alertThresholds.warning}%</Label>
                  <Slider
                    value={[budgetSettings.alertThresholds.warning]}
                    onValueChange={([value]) => saveBudgetSettings({
                      ...budgetSettings,
                      alertThresholds: {
                        ...budgetSettings.alertThresholds,
                        warning: value
                      }
                    })}
                    max={100}
                    min={50}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Critical Threshold: {budgetSettings.alertThresholds.critical}%</Label>
                  <Slider
                    value={[budgetSettings.alertThresholds.critical]}
                    onValueChange={([value]) => saveBudgetSettings({
                      ...budgetSettings,
                      alertThresholds: {
                        ...budgetSettings.alertThresholds,
                        critical: value
                      }
                    })}
                    max={100}
                    min={budgetSettings.alertThresholds.warning + 5}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>

              <Separator />

              {/* Notification Channels */}
              <div className="space-y-4">
                <h4 className="font-medium">Notification Channels</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Receive budget alerts via email
                    </p>
                  </div>
                  <Switch
                    checked={budgetSettings.notifications.email}
                    onCheckedChange={(checked) => saveBudgetSettings({
                      ...budgetSettings,
                      notifications: {
                        ...budgetSettings.notifications,
                        email: checked
                      }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Browser Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Show desktop notifications
                    </p>
                  </div>
                  <Switch
                    checked={budgetSettings.notifications.browser}
                    onCheckedChange={(checked) => saveBudgetSettings({
                      ...budgetSettings,
                      notifications: {
                        ...budgetSettings.notifications,
                        browser: checked
                      }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Slack Integration</Label>
                    <p className="text-xs text-muted-foreground">
                      Send alerts to Slack channel
                    </p>
                  </div>
                  <Switch
                    checked={budgetSettings.notifications.slack}
                    onCheckedChange={(checked) => saveBudgetSettings({
                      ...budgetSettings,
                      notifications: {
                        ...budgetSettings.notifications,
                        slack: checked
                      }
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Spending Limits
              </CardTitle>
              <CardDescription>
                Set hard limits to prevent overspending
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Hard Limits</Label>
                  <p className="text-xs text-muted-foreground">
                    Block actions when limits are exceeded
                  </p>
                </div>
                <Switch
                  checked={budgetSettings.spendingLimits.enableHardLimits}
                  onCheckedChange={(checked) => saveBudgetSettings({
                    ...budgetSettings,
                    spendingLimits: {
                      ...budgetSettings.spendingLimits,
                      enableHardLimits: checked
                    }
                  })}
                />
              </div>

              {budgetSettings.spendingLimits.enableHardLimits && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Hard limits will block all AI operations when exceeded. Use with caution.
                  </AlertDescription>
                </Alert>
              )}

              {/* Current Status */}
              <div className="space-y-4">
                <h4 className="font-medium">Current Limit Status</h4>
                
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <span className="font-medium">Daily Limit</span>
                      <p className="text-sm text-muted-foreground">
                        ${currentUsage.dailySpent.toFixed(2)} / ${budgetSettings.spendingLimits.dailyLimit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {budgetMetrics.dailyUsagePercent >= 100 ? (
                        <Lock className="h-4 w-4 text-red-500" />
                      ) : (
                        <Unlock className="h-4 w-4 text-green-500" />
                      )}
                      <Badge variant={budgetMetrics.dailyUsagePercent >= 100 ? 'destructive' : 'default'}>
                        {budgetMetrics.dailyUsagePercent.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <span className="font-medium">Weekly Limit</span>
                      <p className="text-sm text-muted-foreground">
                        ${currentUsage.weeklySpent.toFixed(2)} / ${budgetSettings.spendingLimits.weeklyLimit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {budgetMetrics.weeklyUsagePercent >= 100 ? (
                        <Lock className="h-4 w-4 text-red-500" />
                      ) : (
                        <Unlock className="h-4 w-4 text-green-500" />
                      )}
                      <Badge variant={budgetMetrics.weeklyUsagePercent >= 100 ? 'destructive' : 'default'}>
                        {budgetMetrics.weeklyUsagePercent.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Automation Rules
              </CardTitle>
              <CardDescription>
                Set automatic actions when budget limits are reached
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Pause on Budget Exceeded</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically pause all AI operations when monthly budget is exceeded
                  </p>
                </div>
                <Switch
                  checked={budgetSettings.autoActions.pauseOnBudgetExceeded}
                  onCheckedChange={(checked) => saveBudgetSettings({
                    ...budgetSettings,
                    autoActions: {
                      ...budgetSettings.autoActions,
                      pauseOnBudgetExceeded: checked
                    }
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Downgrade Models on Limit</Label>
                  <p className="text-xs text-muted-foreground">
                    Switch to cheaper models when approaching limits
                  </p>
                </div>
                <Switch
                  checked={budgetSettings.autoActions.downgradeModelsOnLimit}
                  onCheckedChange={(checked) => saveBudgetSettings({
                    ...budgetSettings,
                    autoActions: {
                      ...budgetSettings.autoActions,
                      downgradeModelsOnLimit: checked
                    }
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Approval Over Budget</Label>
                  <p className="text-xs text-muted-foreground">
                    Ask for confirmation before spending over budget
                  </p>
                </div>
                <Switch
                  checked={budgetSettings.autoActions.requireApprovalOverBudget}
                  onCheckedChange={(checked) => saveBudgetSettings({
                    ...budgetSettings,
                    autoActions: {
                      ...budgetSettings.autoActions,
                      requireApprovalOverBudget: checked
                    }
                  })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}