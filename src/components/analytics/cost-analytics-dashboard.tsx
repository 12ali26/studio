'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Zap,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Download,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Lightbulb,
} from 'lucide-react';

import { SubscriptionTier, SUBSCRIPTION_TIERS } from '@/lib/subscription-tiers';
import { costCalculator, type UsageStats } from '@/lib/cost-calculator';
import { usageTracker } from '@/lib/usage-tracker';

interface CostAnalyticsDashboardProps {
  userId: string;
  currentTier: SubscriptionTier;
  className?: string;
}

export function CostAnalyticsDashboard({ 
  userId, 
  currentTier, 
  className 
}: CostAnalyticsDashboardProps) {
  // State
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [usageSummary, setUsageSummary] = useState<any>(null);
  const [budgetAlerts, setBudgetAlerts] = useState<any[]>([]);
  const [costOptimizations, setCostOptimizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    loadAnalyticsData();
  }, [userId, currentTier, selectedPeriod]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Get usage statistics
      const stats = costCalculator.getUsageStats(userId, currentTier, selectedPeriod);
      setUsageStats(stats);

      // Get usage summary
      const summary = usageTracker.getUsageSummary(userId, currentTier);
      setUsageSummary(summary);

      // Get budget alerts
      const alerts = costCalculator.checkBudgetAlerts(userId, currentTier);
      setBudgetAlerts(alerts);

      // Get optimization suggestions
      const optimizations = costCalculator.getCostOptimizationSuggestions(userId, currentTier);
      setCostOptimizations(optimizations);

    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process data for charts
  const chartData = useMemo(() => {
    if (!usageStats) return null;

    // Daily breakdown chart data
    const dailyData = usageStats.dailyBreakdown.map(day => ({
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      messages: day.messages,
      cost: day.cost,
      tokens: day.tokens / 1000, // Convert to K tokens
    }));

    // Model breakdown for pie chart
    const modelData = Object.entries(usageStats.modelBreakdown).map(([model, data]) => ({
      name: model,
      value: data.cost,
      messages: data.messages,
      tokens: data.tokens,
    }));

    // Usage trends
    const trendData = dailyData.slice(-7).map((day, index) => ({
      ...day,
      trend: index,
    }));

    return {
      daily: dailyData,
      models: modelData,
      trends: trendData,
    };
  }, [usageStats]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    if (!usageStats || !usageSummary) return null;

    const tierLimits = SUBSCRIPTION_TIERS[currentTier].limits;
    const currentSessionCost = costCalculator.getCurrentSessionCost(userId);

    return {
      totalCost: usageStats.totalCost,
      totalMessages: usageStats.totalMessages,
      totalTokens: usageStats.totalTokens,
      averageCostPerMessage: usageStats.totalMessages > 0 ? usageStats.totalCost / usageStats.totalMessages : 0,
      currentSessionCost,
      messageUsagePercent: tierLimits.messagesPerMonth > 0 
        ? (usageSummary.monthly.messages / tierLimits.messagesPerMonth) * 100 
        : 0,
      dailyAverage: usageStats.dailyBreakdown.length > 0 
        ? usageStats.totalCost / usageStats.dailyBreakdown.length 
        : 0,
    };
  }, [usageStats, usageSummary, currentTier, userId]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!metrics || !chartData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No usage data available yet. Start using the platform to see your analytics.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cost Analytics</h2>
          <p className="text-muted-foreground">
            Track your usage, costs, and optimize your AI spending
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Tabs value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {budgetAlerts.length > 0 && (
        <div className="space-y-2">
          {budgetAlerts.map((alert, index) => (
            <Alert 
              key={index} 
              variant={alert.severity === 'critical' ? 'destructive' : 'default'}
            >
              {alert.severity === 'critical' ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalCost.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              ${metrics.dailyAverage.toFixed(4)} daily average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ${metrics.averageCostPerMessage.toFixed(4)} per message
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.totalTokens / 1000).toFixed(1)}K</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(metrics.totalTokens / metrics.totalMessages)} per message
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Session</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.currentSessionCost.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              Today's usage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Limits */}
      {usageSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Usage Limits ({SUBSCRIPTION_TIERS[currentTier].name} Tier)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Monthly Messages */}
              {usageSummary.limits.messagesPerMonth > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Monthly Messages</span>
                    <span>
                      {usageSummary.monthly.messages.toLocaleString()} / {usageSummary.limits.messagesPerMonth.toLocaleString()}
                    </span>
                  </div>
                  <Progress 
                    value={metrics.messageUsagePercent} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {(100 - metrics.messageUsagePercent).toFixed(1)}% remaining
                  </p>
                </div>
              )}

              {/* Daily Messages */}
              {usageSummary.limits.messagesPerDay > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Daily Messages</span>
                    <span>
                      {usageSummary.daily.messages} / {usageSummary.limits.messagesPerDay}
                    </span>
                  </div>
                  <Progress 
                    value={(usageSummary.daily.messages / usageSummary.limits.messagesPerDay) * 100} 
                    className="h-2"
                  />
                </div>
              )}
            </div>

            {/* Feature Availability */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Badge variant={usageSummary.limits.canExportDebates ? "default" : "secondary"}>
                  {usageSummary.limits.canExportDebates ? "Available" : "Locked"}
                </Badge>
                <span className="text-sm">Exports</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={usageSummary.limits.apiAccess ? "default" : "secondary"}>
                  {usageSummary.limits.apiAccess ? "Available" : "Locked"}
                </Badge>
                <span className="text-sm">API Access</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">
                  {usageSummary.limits.maxDebateRounds === -1 ? "∞" : usageSummary.limits.maxDebateRounds}
                </Badge>
                <span className="text-sm">Max Rounds</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">
                  {usageSummary.limits.maxPersonasPerDebate === -1 ? "∞" : usageSummary.limits.maxPersonasPerDebate}
                </Badge>
                <span className="text-sm">Max Personas</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <Tabs defaultValue="usage" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="usage">Usage Trends</TabsTrigger>
          <TabsTrigger value="models">Model Breakdown</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cost Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Cost Trend
                </CardTitle>
                <CardDescription>Daily cost over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData.daily}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        name === 'cost' ? `$${value.toFixed(4)}` : value,
                        name === 'cost' ? 'Cost' : 'Messages'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cost" 
                      stackId="1" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Message Volume */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Message Volume
                </CardTitle>
                <CardDescription>Daily message count</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.daily}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="messages" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Model Cost Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Cost by Model
                </CardTitle>
                <CardDescription>Distribution of costs across AI models</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.models}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.models.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `$${value.toFixed(4)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Model Usage Table */}
            <Card>
              <CardHeader>
                <CardTitle>Model Usage Details</CardTitle>
                <CardDescription>Detailed breakdown by model</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {chartData.models.map((model, index) => (
                      <div key={model.name} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium">{model.name}</span>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-medium">${model.value.toFixed(4)}</div>
                          <div className="text-muted-foreground">
                            {model.messages} messages
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Cost Optimization Suggestions
              </CardTitle>
              <CardDescription>
                AI-powered recommendations to reduce your costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {costOptimizations.length > 0 ? (
                <div className="space-y-4">
                  {costOptimizations.map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          ${suggestion.potentialSavings.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium mb-1">
                          {suggestion.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {suggestion.suggestion}
                        </p>
                        <Badge variant="outline">
                          Potential savings: ${suggestion.potentialSavings.toFixed(2)}/month
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Total Potential Savings</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      ${costOptimizations.reduce((sum, s) => sum + s.potentialSavings, 0).toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">per month</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Optimal Usage!</h3>
                  <p className="text-muted-foreground">
                    Your current usage patterns are already well-optimized. 
                    Keep up the efficient AI usage!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}