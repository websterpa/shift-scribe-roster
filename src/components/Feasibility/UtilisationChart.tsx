/**
 * Utilisation Chart Component
 * Displays workload distribution and staffing metrics
 */

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface UtilisationData {
  metric: string;
  value: number;
  color?: string;
  unit?: string;
}

interface UtilisationChartProps {
  data: UtilisationData[];
  title?: string;
  description?: string;
}

const COLORS = {
  active: '#3b82f6',
  rest: '#10b981',
  buffer: '#f59e0b',
  required: '#8b5cf6',
  current: '#06b6d4'
};

export function UtilisationChart({ data, title, description }: UtilisationChartProps) {
  const getColor = (metric: string): string => {
    const normalized = metric.toLowerCase();
    
    if (normalized.includes('active')) return COLORS.active;
    if (normalized.includes('rest')) return COLORS.rest;
    if (normalized.includes('buffer')) return COLORS.buffer;
    if (normalized.includes('required')) return COLORS.required;
    if (normalized.includes('current')) return COLORS.current;
    
    return COLORS.active;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || 'Workload Distribution'}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              dataKey="metric" 
              tick={{ fontSize: 12 }}
              angle={-15}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value: number, name: string, props: any) => {
                const unit = props.payload.unit || '';
                return [`${value.toFixed(1)}${unit}`, name];
              }}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '8px'
              }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.metric)} />
              ))}
              <LabelList 
                dataKey="value" 
                position="top" 
                formatter={(value: number) => value.toFixed(1)}
                style={{ fontSize: 11, fontWeight: 'bold' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.active }} />
            <span className="text-muted-foreground">Active Days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.rest }} />
            <span className="text-muted-foreground">Rest Days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.buffer }} />
            <span className="text-muted-foreground">Buffer</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
