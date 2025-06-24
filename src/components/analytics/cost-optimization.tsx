'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Lightbulb,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Zap,
  Target,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  RefreshCw,
  Star,
  Crown,
  Shield,
} from 'lucide-react';

import { SubscriptionTier, SUBSCRIPTION_TIERS } from '@/lib/subscription-tiers';
import { costCalculator } from '@/lib/cost-calculator';
import { usageTracker } from '@/lib/usage-tracker';

// Helper function for effort badges
const getEffortBadge = (effort: string) => {
  switch (effort) {
    case 'easy': return <Badge variant="default">Easy</Badge>;
    case 'moderate': return <Badge variant="secondary">Moderate</Badge>;
    case 'complex': return <Badge variant="outline">Complex</Badge>;
    default: return <Badge variant="outline">Unknown</Badge>;
  }
};

interface CostOptimizationProps {
  userId: string;
  currentTier: SubscriptionTier;
  onOptimizationApplied?: (optimization: any) => void;
}

interface OptimizationSuggestion {
  id: string;
  type: 'model_switch' | 'tier_upgrade' | 'usage_pattern' | 'debate_optimization' | 'timing_optimization';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'moderate' | 'complex';
  potentialSavings: number;
  currentCost: number;
  optimizedCost: number;
  timeframe: 'immediate' | 'weekly' | 'monthly';
  actionable: boolean;
  recommendation: string;
  pros: string[];
  cons: string[];
  implementationSteps?: string[];
}

export function CostOptimization({ userId, currentTier, onOptimizationApplied }: CostOptimizationProps) {
  const [optimizations, setOptimizations] = useState<OptimizationSuggestion[]>([]);
  const [selectedOptimization, setSelectedOptimization] = useState<string | null>(null);
  const [appliedOptimizations, setAppliedOptimizations] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [totalPotentialSavings, setTotalPotentialSavings] = useState(0);

  useEffect(() => {
    generateOptimizations();
  }, [userId, currentTier]);

  const generateOptimizations = async () => {
    setLoading(true);
    try {
      const usage = usageTracker.getUserUsage(userId, currentTier);
      const monthlyStats = costCalculator.getUsageStats(userId, currentTier, 'monthly');
      const suggestions: OptimizationSuggestion[] = [];

      // Model optimization suggestions
      const modelOptimizations = generateModelOptimizations(monthlyStats, usage);
      suggestions.push(...modelOptimizations);

      // Tier optimization suggestions
      const tierOptimizations = generateTierOptimizations(currentTier, usage, monthlyStats);
      suggestions.push(...tierOptimizations);

      // Usage pattern optimizations
      const usageOptimizations = generateUsagePatternOptimizations(usage, monthlyStats);
      suggestions.push(...usageOptimizations);

      // Debate-specific optimizations
      const debateOptimizations = generateDebateOptimizations(usage, monthlyStats);
      suggestions.push(...debateOptimizations);

      // Timing optimizations
      const timingOptimizations = generateTimingOptimizations(usage, monthlyStats);
      suggestions.push(...timingOptimizations);

      setOptimizations(suggestions);
      setTotalPotentialSavings(suggestions.reduce((sum, opt) => sum + opt.potentialSavings, 0));

    } catch (error) {
      console.error('Error generating optimizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateModelOptimizations = (monthlyStats: any, usage: any): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Analyze model usage patterns
    const modelBreakdown = monthlyStats.modelBreakdown;
    const sortedModels = Object.entries(modelBreakdown)
      .sort(([,a], [,b]) => (b as any).cost - (a as any).cost);

    if (sortedModels.length > 0) {
      const topModel = sortedModels[0];
      const [modelName, modelData] = topModel as [string, any];

      // Suggest switching from expensive models
      if (modelName === 'gpt-4' && modelData.cost > 10) {
        suggestions.push({
          id: 'switch-to-claude-sonnet',
          type: 'model_switch',
          title: 'Switch to Claude 3 Sonnet for routine tasks',
          description: `You're spending $${modelData.cost.toFixed(2)} on GPT-4. Claude 3 Sonnet offers similar quality at 70% lower cost.`,
          impact: 'high',
          effort: 'easy',
          potentialSavings: modelData.cost * 0.7,
          currentCost: modelData.cost,
          optimizedCost: modelData.cost * 0.3,
          timeframe: 'immediate',
          actionable: true,
          recommendation: 'Use Claude 3 Sonnet for most debates, reserve GPT-4 for complex strategic decisions',
          pros: [
            '70% cost reduction',
            'Similar quality for most tasks',
            'Faster response times',
            'Better for long conversations'
          ],
          cons: [
            'Slightly different response style',
            'May need to adjust prompts'
          ],
          implementationSteps: [
            'Test Claude 3 Sonnet with a few debates',
            'Compare response quality',
            'Gradually switch default model',
            'Keep GPT-4 for premium use cases'
          ]
        });
      }

      // Suggest using budget models for simple tasks
      if (modelData.messages > 50 && !usage.patterns.favoriteModels.includes('mixtral-8x7b')) {
        suggestions.push({
          id: 'use-budget-models',
          type: 'model_switch',
          title: 'Use budget models for simple queries',
          description: 'For quick consultations and simple questions, budget models can provide 90% of the value at 80% lower cost.',
          impact: 'medium',
          effort: 'easy',
          potentialSavings: modelData.cost * 0.3,
          currentCost: modelData.cost,
          optimizedCost: modelData.cost * 0.7,
          timeframe: 'immediate',
          actionable: true,
          recommendation: 'Use Mixtral 8x7B for quick consults, premium models for complex debates',
          pros: [
            'Significant cost savings',
            'Fast responses',
            'Good for exploratory questions'
          ],
          cons: [
            'Lower quality for complex reasoning',
            'May need follow-up with premium models'
          ]
        });
      }
    }

    return suggestions;
  };

  const generateTierOptimizations = (tier: SubscriptionTier, usage: any, monthlyStats: any): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
    const tierConfig = SUBSCRIPTION_TIERS[tier];

    // Suggest upgrade if consistently over limits
    if (tier === SubscriptionTier.STARTER && usage.monthlyUsage.messages > 80) {
      suggestions.push({
        id: 'upgrade-to-professional',
        type: 'tier_upgrade',
        title: 'Upgrade to Professional for better value',
        description: `You're using ${usage.monthlyUsage.messages} messages. Professional tier offers unlimited messages and better model pricing.`,
        impact: 'high',
        effort: 'easy',
        potentialSavings: monthlyStats.totalCost * 0.4, // Estimated savings from better pricing
        currentCost: monthlyStats.totalCost,
        optimizedCost: 29, // Professional tier price
        timeframe: 'immediate',
        actionable: true,
        recommendation: 'Upgrade to Professional tier for unlimited usage and premium features',
        pros: [
          'Unlimited messages',
          'Access to all AI models',
          'Better pricing per message',
          'Advanced features like exports and analytics'
        ],
        cons: [
          'Monthly subscription fee',
          'May be overkill for light usage'
        ]
      });
    }

    // Suggest downgrade if significantly under-utilizing
    if (tier === SubscriptionTier.BOARDROOM && usage.monthlyUsage.messages < 500 && usage.monthlyUsage.cost < 20) {
      suggestions.push({
        id: 'downgrade-to-professional',
        type: 'tier_upgrade',
        title: 'Consider downgrading to Professional',
        description: `Your usage (${usage.monthlyUsage.messages} messages, $${usage.monthlyUsage.cost.toFixed(2)}) suggests Professional tier would be sufficient.`,
        impact: 'high',
        effort: 'easy',
        potentialSavings: 70, // Difference between Boardroom and Professional
        currentCost: 99,
        optimizedCost: 29,
        timeframe: 'immediate',
        actionable: true,
        recommendation: 'Downgrade to Professional tier and monitor usage',
        pros: [
          '$70/month savings',
          'Still includes all essential features',
          'Can upgrade again if needed'
        ],
        cons: [
          'Lower API rate limits',
          'Fewer concurrent debates',
          'Less storage'
        ]
      });
    }

    return suggestions;
  };

  const generateUsagePatternOptimizations = (usage: any, monthlyStats: any): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];

    // Analyze peak usage hours
    if (usage.patterns.peakUsageHours.length > 0) {
      const hasOffPeakOpportunity = usage.patterns.peakUsageHours.some((hour: number) => hour >= 9 && hour <= 17);
      
      if (hasOffPeakOpportunity) {
        suggestions.push({
          id: 'optimize-timing',
          type: 'timing_optimization',
          title: 'Shift usage to off-peak hours',
          description: 'Consider scheduling non-urgent debates outside business hours when model costs are typically lower.',
          impact: 'low',
          effort: 'moderate',
          potentialSavings: monthlyStats.totalCost * 0.15,
          currentCost: monthlyStats.totalCost,
          optimizedCost: monthlyStats.totalCost * 0.85,
          timeframe: 'weekly',
          actionable: true,
          recommendation: 'Schedule routine debates during off-peak hours (evenings/weekends)',
          pros: [
            '10-20% cost savings',
            'Better model availability',
            'Faster response times'
          ],
          cons: [
            'Less flexible timing',
            'May not suit urgent decisions'
          ]
        });
      }
    }

    return suggestions;
  };

  const generateDebateOptimizations = (usage: any, monthlyStats: any): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];

    // Analyze debate complexity
    if (usage.patterns.averageDebateLength > 3) {
      suggestions.push({
        id: 'optimize-debate-length',
        type: 'debate_optimization',
        title: 'Reduce debate rounds for routine decisions',
        description: `Your average debate has ${usage.patterns.averageDebateLength.toFixed(1)} rounds. Consider 2-round debates for simpler topics.`,
        impact: 'medium',
        effort: 'easy',
        potentialSavings: monthlyStats.totalCost * 0.25,
        currentCost: monthlyStats.totalCost,
        optimizedCost: monthlyStats.totalCost * 0.75,
        timeframe: 'immediate',
        actionable: true,
        recommendation: 'Use 2 rounds for routine decisions, 3+ rounds for strategic choices',
        pros: [
          '25% cost reduction',
          'Faster decision-making',
          'Less cognitive overload'
        ],
        cons: [
          'Less thorough analysis',
          'May miss nuanced perspectives'
        ]
      });
    }

    if (usage.patterns.averagePersonasPerDebate > 4) {
      suggestions.push({
        id: 'optimize-persona-count',
        type: 'debate_optimization',
        title: 'Use fewer personas for simple topics',
        description: `You average ${usage.patterns.averagePersonasPerDebate.toFixed(1)} personas per debate. Expert Panel mode (2-3 personas) is often sufficient.`,
        impact: 'medium',
        effort: 'easy',
        potentialSavings: monthlyStats.totalCost * 0.3,
        currentCost: monthlyStats.totalCost,
        optimizedCost: monthlyStats.totalCost * 0.7,
        timeframe: 'immediate',
        actionable: true,
        recommendation: 'Use Expert Panel for routine topics, Full Boardroom for strategic decisions',
        pros: [
          '30% cost reduction',
          'More focused discussions',
            'Easier to follow conversations'
        ],
        cons: [
          'Less diverse perspectives',
          'May miss specialized insights'
        ]
      });
    }

    return suggestions;
  };

  const generateTimingOptimizations = (usage: any, monthlyStats: any): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];

    // Suggest batching smaller requests
    if (monthlyStats.totalMessages > 100 && usage.monthlyUsage.messages / usage.monthlyUsage.debates > 15) {
      suggestions.push({
        id: 'batch-requests',
        type: 'usage_pattern',
        title: 'Batch related questions together',
        description: 'You have many short conversations. Batching related questions into single debates can reduce overhead costs.',
        impact: 'low',
        effort: 'moderate',
        potentialSavings: monthlyStats.totalCost * 0.1,
        currentCost: monthlyStats.totalCost,
        optimizedCost: monthlyStats.totalCost * 0.9,
        timeframe: 'weekly',
        actionable: true,
        recommendation: 'Prepare multiple related questions for single debate sessions',
        pros: [
          '10% cost reduction',
          'Better context continuity',
          'More comprehensive analysis'
        ],
        cons: [
          'Requires more planning',
          'Less spontaneous usage'
        ]
      });
    }

    return suggestions;
  };

  const applyOptimization = (optimizationId: string) => {
    const optimization = optimizations.find(opt => opt.id === optimizationId);
    if (!optimization) return;

    setAppliedOptimizations(prev => new Set([...prev, optimizationId]));
    onOptimizationApplied?.(optimization);

    // In a real app, this would apply the optimization
    console.log('Applied optimization:', optimization);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Analyzing your usage patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Cost Optimization Opportunities
          </CardTitle>
          <CardDescription>
            AI-powered recommendations to optimize your spending
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-green-600">
                ${totalPotentialSavings.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Potential Monthly Savings</div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold">
                {optimizations.length}
              </div>
              <div className="text-sm text-muted-foreground">Optimization Opportunities</div>
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold">
                {optimizations.filter(opt => opt.impact === 'high').length}
              </div>
              <div className="text-sm text-muted-foreground">High Impact Changes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimizations */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({optimizations.length})</TabsTrigger>
          <TabsTrigger value="high">High Impact ({optimizations.filter(opt => opt.impact === 'high').length})</TabsTrigger>
          <TabsTrigger value="easy">Easy Wins ({optimizations.filter(opt => opt.effort === 'easy').length})</TabsTrigger>
          <TabsTrigger value="applied">Applied ({appliedOptimizations.size})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <OptimizationList 
            optimizations={optimizations}
            appliedOptimizations={appliedOptimizations}
            onApply={applyOptimization}
            selectedOptimization={selectedOptimization}
            onSelect={setSelectedOptimization}
          />
        </TabsContent>

        <TabsContent value="high" className="space-y-4">
          <OptimizationList 
            optimizations={optimizations.filter(opt => opt.impact === 'high')}
            appliedOptimizations={appliedOptimizations}
            onApply={applyOptimization}
            selectedOptimization={selectedOptimization}
            onSelect={setSelectedOptimization}
          />
        </TabsContent>

        <TabsContent value="easy" className="space-y-4">
          <OptimizationList 
            optimizations={optimizations.filter(opt => opt.effort === 'easy')}
            appliedOptimizations={appliedOptimizations}
            onApply={applyOptimization}
            selectedOptimization={selectedOptimization}
            onSelect={setSelectedOptimization}
          />
        </TabsContent>

        <TabsContent value="applied" className="space-y-4">
          <OptimizationList 
            optimizations={optimizations.filter(opt => appliedOptimizations.has(opt.id))}
            appliedOptimizations={appliedOptimizations}
            onApply={applyOptimization}
            selectedOptimization={selectedOptimization}
            onSelect={setSelectedOptimization}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={() => generateOptimizations()}
              className="h-auto p-4 justify-start"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              <div className="text-left">
                <div className="font-medium">Refresh Recommendations</div>
                <div className="text-xs text-muted-foreground">Re-analyze your usage patterns</div>
              </div>
            </Button>

            <Button 
              className="h-auto p-4 justify-start"
              variant="outline"
              onClick={() => {
                const highImpactOpts = optimizations.filter(opt => opt.impact === 'high' && opt.effort === 'easy');
                highImpactOpts.forEach(opt => applyOptimization(opt.id));
              }}
              disabled={optimizations.filter(opt => opt.impact === 'high' && opt.effort === 'easy').length === 0}
            >
              <Star className="h-4 w-4 mr-2" />
              <div className="text-left">
                <div className="font-medium">Apply All Easy Wins</div>
                <div className="text-xs text-muted-foreground">Automatically apply low-effort optimizations</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Optimization List Component
interface OptimizationListProps {
  optimizations: OptimizationSuggestion[];
  appliedOptimizations: Set<string>;
  onApply: (id: string) => void;
  selectedOptimization: string | null;
  onSelect: (id: string | null) => void;
}

function OptimizationList({ 
  optimizations, 
  appliedOptimizations, 
  onApply, 
  selectedOptimization, 
  onSelect 
}: OptimizationListProps) {
  if (optimizations.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Great job!</h3>
          <p className="text-muted-foreground">
            Your usage is already well-optimized. Keep up the efficient AI usage!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {optimizations.map((optimization) => {
        const isApplied = appliedOptimizations.has(optimization.id);
        const isSelected = selectedOptimization === optimization.id;

        return (
          <Card 
            key={optimization.id}
            className={`cursor-pointer transition-all ${
              isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'
            } ${isApplied ? 'opacity-75 bg-muted/50' : ''}`}
            onClick={() => onSelect(isSelected ? null : optimization.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {isApplied && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {optimization.title}
                    <Badge variant={
                      optimization.impact === 'high' ? 'default' :
                      optimization.impact === 'medium' ? 'secondary' :
                      'outline'
                    }>
                      {optimization.impact} impact
                    </Badge>
                    {getEffortBadge(optimization.effort)}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {optimization.description}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    ${optimization.potentialSavings.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">potential savings</div>
                </div>
              </div>
            </CardHeader>
            
            {isSelected && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Cost Impact</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Current:</span>
                          <span>${optimization.currentCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Optimized:</span>
                          <span className="text-green-600">${optimization.optimizedCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span>Savings:</span>
                          <span className="text-green-600">${optimization.potentialSavings.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Pros & Cons</h4>
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <span className="text-xs font-medium text-green-600">PROS:</span>
                          <ul className="text-xs space-y-1 mt-1">
                            {optimization.pros.map((pro, index) => (
                              <li key={index} className="flex items-start gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                {pro}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-orange-600">CONS:</span>
                          <ul className="text-xs space-y-1 mt-1">
                            {optimization.cons.map((con, index) => (
                              <li key={index} className="flex items-start gap-1">
                                <AlertTriangle className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                                {con}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Recommendation</h4>
                      <p className="text-sm text-muted-foreground">
                        {optimization.recommendation}
                      </p>
                    </div>

                    {optimization.implementationSteps && (
                      <div>
                        <h4 className="font-medium mb-2">Implementation Steps</h4>
                        <ol className="text-sm space-y-1">
                          {optimization.implementationSteps.map((step, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-xs bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onApply(optimization.id);
                        }}
                        disabled={isApplied || !optimization.actionable}
                        className="w-full"
                      >
                        {isApplied ? 'Applied' : 'Apply Optimization'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}