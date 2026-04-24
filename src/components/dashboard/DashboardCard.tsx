import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DashboardCardProps {
  title: string;
  value: string;
  trend?: string;
  color?: 'emerald' | 'blue' | 'purple' | 'orange' | 'gray';
}

export const DashboardCard = ({ title, value, trend, color = 'gray' }: DashboardCardProps) => {
  const colorClasses = {
    emerald: 'text-emerald-600 bg-emerald-100',
    blue: 'text-blue-600 bg-blue-100',
    purple: 'text-purple-600 bg-purple-100',
    orange: 'text-orange-600 bg-orange-100',
    gray: 'text-gray-600 bg-gray-100'
  } as Record<string, string>;

  return (
    <Card className="hover:shadow-xl transition-all overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-600 leading-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {trend && (
          <Badge className={`mt-1 text-xs font-medium ${colorClasses[color]}`}>
            {trend}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};

interface DashboardBoxProps {
  title: string;
  children: React.ReactNode;
}

export const DashboardBox = ({ title, children }: DashboardBoxProps) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle className="text-lg font-semibold">{title}</CardTitle>
    </CardHeader>
    <CardContent className="pt-4">
      {children}
    </CardContent>
  </Card>
);


