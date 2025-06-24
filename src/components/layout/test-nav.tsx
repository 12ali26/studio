'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MessageSquare, 
  DollarSign, 
  Users, 
  TestTube,
  ArrowRight 
} from 'lucide-react';

export function TestNavigation() {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            <span className="font-medium">Testing Mode</span>
          </div>
          
          <div className="flex gap-2">
            <Link href="/boardroom">
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Main Boardroom
              </Button>
            </Link>
            
            <Link href="/test-debate">
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Test Debates
              </Button>
            </Link>
            
            <Link href="/test-cost-management">
              <Button variant="outline" size="sm">
                <DollarSign className="h-4 w-4 mr-2" />
                Test Cost Management
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="mt-3 text-sm text-muted-foreground">
          Authentication is disabled for testing. Use the buttons above to test different features.
        </div>
      </CardContent>
    </Card>
  );
}