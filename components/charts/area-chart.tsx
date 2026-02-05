'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface AreaChartComponentProps {
  data: any[];
  dataKey: string;
  nameKey?: string;
  title?: string;
  color?: string;
  height?: number;
}

export function AreaChartComponent({ 
  data, 
  dataKey, 
  nameKey = 'name', 
  title = 'Area Chart', 
  color = '#8b5cf6',
  height = 300
}: AreaChartComponentProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={nameKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stackId="1" 
              stroke={color} 
              fill={color} 
              fillOpacity={0.6} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}