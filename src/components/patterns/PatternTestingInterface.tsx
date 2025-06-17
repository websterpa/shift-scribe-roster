
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertCircle, Play, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from '@/hooks/use-toast';
import { validatePattern, validatePatternName } from '@/utils/patterns/patternValidation';
import { runAllUITests } from '@/utils/testing/uiIntegrationTests';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message: string;
  details?: string;
}

interface Pattern {
  id: string;
  name: string;
  pattern: string[];
  shift_type: '8h' | '12h';
  created_at: string;
}

export function PatternTestingInterface() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testPattern, setTestPattern] = useState<Pattern | null>(null);
  const { user, isAuthenticated } = useSupabaseAuth();

  const initializeTests = () => {
    console.log('🧪 PatternTesting: Initializing test suite...');
    const testSuite: TestResult[] = [
      {
        id: 'auth-check',
        name: 'Authentication Check',
        status: 'pending',
        message: 'Verify user is authenticated'
      },
      {
        id: 'create-pattern',
        name: 'Create Custom Pattern',
        status: 'pending',
        message: 'Test creating a new custom pattern'
      },
      {
        id: 'edit-pattern',
        name: 'Edit Pattern',
        status: 'pending',
        message: 'Test editing an existing pattern'
      },
      {
        id: 'duplicate-pattern',
        name: 'Duplicate Pattern',
        status: 'pending',
        message: 'Test duplicating a pattern'
      },
      {
        id: 'pattern-validation',
        name: 'Pattern Validation',
        status: 'pending',
        message: 'Test real pattern validation rules'
      },
      {
        id: 'ui-integration',
        name: 'UI Integration',
        status: 'pending',
        message: 'Test real UI component integration'
      },
      {
        id: 'cleanup',
        name: 'Cleanup Test Data',
        status: 'pending',
        message: 'Clean up test patterns'
      }
    ];
    setTests(testSuite);
  };

  useEffect(() => {
    initializeTests();
  }, []);

  const updateTestStatus = (testId: string, status: TestResult['status'], message: string, details?: string) => {
    setTests(prev => prev.map(test => 
      test.id === testId 
        ? { ...test, status, message, details }
        : test
    ));
  };

  const runAllTests = async () => {
    console.log('🏃 PatternTesting: Starting comprehensive test suite...');
    setIsRunning(true);
    
    try {
      // Test 1: Authentication Check
      updateTestStatus('auth-check', 'running', 'Checking authentication...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!isAuthenticated || !user) {
        updateTestStatus('auth-check', 'failed', 'User not authenticated');
        return;
      }
      updateTestStatus('auth-check', 'passed', 'User authenticated successfully');

      // Test 2: Create Custom Pattern
      updateTestStatus('create-pattern', 'running', 'Creating test pattern...');
      const testPatternData = {
        user_id: user.id,
        name: 'TEST_PATTERN_' + Date.now(),
        pattern: ['D', 'D', 'R', 'N', 'N', 'R', 'R'],
        shift_type: '8h' as const
      };

      const { data: createdPattern, error: createError } = await supabase
        .from('custom_patterns')
        .insert(testPatternData)
        .select()
        .single();

      if (createError) {
        updateTestStatus('create-pattern', 'failed', 'Failed to create pattern', createError.message);
        return;
      }
      
      const typedCreatedPattern: Pattern = {
        id: createdPattern.id,
        name: createdPattern.name,
        pattern: createdPattern.pattern,
        shift_type: createdPattern.shift_type as '8h' | '12h',
        created_at: createdPattern.created_at
      };
      
      setTestPattern(typedCreatedPattern);
      updateTestStatus('create-pattern', 'passed', 'Pattern created successfully', `ID: ${createdPattern.id}`);

      // Test 3: Edit Pattern
      updateTestStatus('edit-pattern', 'running', 'Testing pattern editing...');
      const { error: editError } = await supabase
        .from('custom_patterns')
        .update({ 
          name: testPatternData.name + '_EDITED',
          pattern: ['E', 'E', 'R', 'L', 'L', 'R', 'R']
        })
        .eq('id', createdPattern.id);

      if (editError) {
        updateTestStatus('edit-pattern', 'failed', 'Failed to edit pattern', editError.message);
        return;
      }
      updateTestStatus('edit-pattern', 'passed', 'Pattern edited successfully');

      // Test 4: Duplicate Pattern
      updateTestStatus('duplicate-pattern', 'running', 'Testing pattern duplication...');
      const duplicateData = {
        ...testPatternData,
        name: testPatternData.name + '_DUPLICATE'
      };

      const { data: duplicatedPattern, error: duplicateError } = await supabase
        .from('custom_patterns')
        .insert(duplicateData)
        .select()
        .single();

      if (duplicateError) {
        updateTestStatus('duplicate-pattern', 'failed', 'Failed to duplicate pattern', duplicateError.message);
        return;
      }
      updateTestStatus('duplicate-pattern', 'passed', 'Pattern duplicated successfully');

      // Test 5: Real Pattern Validation
      updateTestStatus('pattern-validation', 'running', 'Testing real pattern validation...');
      
      const validationTests = [
        { pattern: ['D', 'D', 'R'], shiftType: '8h' as const, expectedValid: true },
        { pattern: [], shiftType: '8h' as const, expectedValid: false },
        { pattern: ['X', 'Y', 'Z'], shiftType: '8h' as const, expectedValid: false },
        { pattern: ['L', 'E', 'R'], shiftType: '8h' as const, expectedValid: false }, // Late before Early
        { pattern: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'], shiftType: '8h' as const, expectedValid: false } // Too many consecutive
      ];

      let validationPassed = true;
      let validationDetails = '';
      
      for (const test of validationTests) {
        const result = validatePattern(test.pattern, test.shiftType);
        const actualValid = result.isValid;
        
        if (actualValid !== test.expectedValid) {
          validationPassed = false;
          validationDetails += `Pattern ${test.pattern.join('')}: expected ${test.expectedValid ? 'valid' : 'invalid'}, got ${actualValid ? 'valid' : 'invalid'}. `;
        }
      }
      
      if (validationPassed) {
        updateTestStatus('pattern-validation', 'passed', 'All pattern validation tests passed');
      } else {
        updateTestStatus('pattern-validation', 'failed', 'Pattern validation tests failed', validationDetails);
        return;
      }

      // Test 6: Real UI Integration
      updateTestStatus('ui-integration', 'running', 'Testing real UI integration...');
      
      try {
        const uiTestResults = await runAllUITests();
        const failedUITests = uiTestResults.filter(result => !result.passed);
        
        if (failedUITests.length === 0) {
          updateTestStatus('ui-integration', 'passed', `All ${uiTestResults.length} UI tests passed`);
        } else {
          const failureDetails = failedUITests.map(test => `${test.testName}: ${test.message}`).join('; ');
          updateTestStatus('ui-integration', 'failed', `${failedUITests.length}/${uiTestResults.length} UI tests failed`, failureDetails);
          return;
        }
      } catch (error: any) {
        updateTestStatus('ui-integration', 'failed', 'UI integration test threw exception', error.message);
        return;
      }

      // Test 7: Cleanup
      updateTestStatus('cleanup', 'running', 'Cleaning up test data...');
      
      const { error: deleteError1 } = await supabase
        .from('custom_patterns')
        .delete()
        .eq('id', createdPattern.id);

      const { error: deleteError2 } = await supabase
        .from('custom_patterns')
        .delete()
        .eq('id', duplicatedPattern.id);

      if (deleteError1 || deleteError2) {
        updateTestStatus('cleanup', 'failed', 'Failed to cleanup test data');
        return;
      }
      
      updateTestStatus('cleanup', 'passed', 'Test data cleaned up successfully');

      toast({
        title: "All tests passed! ✅",
        description: "Pattern editing feature is working correctly with real validation",
      });

    } catch (error: any) {
      console.error('❌ PatternTesting: Test suite failed:', error);
      toast({
        title: "Test suite failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'running': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pattern Feature Test Suite</span>
          <Button 
            onClick={runAllTests}
            disabled={isRunning || !isAuthenticated}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? 'Running Tests...' : 'Run Tests'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAuthenticated && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Please sign in to run the comprehensive test suite
            </p>
          </div>
        )}

        <div className="space-y-3">
          {tests.map((test, index) => (
            <div key={test.id}>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <div className="font-medium">{test.name}</div>
                    <div className={`text-sm ${getStatusColor(test.status)}`}>
                      {test.message}
                    </div>
                    {test.details && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {test.details}
                      </div>
                    )}
                  </div>
                </div>
                <Badge 
                  variant={
                    test.status === 'passed' ? 'default' :
                    test.status === 'failed' ? 'destructive' :
                    test.status === 'running' ? 'secondary' : 'outline'
                  }
                >
                  {test.status}
                </Badge>
              </div>
              {index < tests.length - 1 && <Separator className="my-2" />}
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Test Coverage</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Tests:</span>
              <span className="ml-2 font-medium">{tests.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Passed:</span>
              <span className="ml-2 font-medium text-green-600">
                {tests.filter(t => t.status === 'passed').length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Failed:</span>
              <span className="ml-2 font-medium text-red-600">
                {tests.filter(t => t.status === 'failed').length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Pending:</span>
              <span className="ml-2 font-medium text-gray-600">
                {tests.filter(t => t.status === 'pending').length}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
