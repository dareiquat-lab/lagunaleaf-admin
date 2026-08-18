"use client";

import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  variant?: "default" | "warning" | "destructive" | "success";
  className?: string;
}

export function DashboardCard({
  title,
  value,
  icon: Icon,
  subtitle,
  variant = "default",
  className,
}: DashboardCardProps) {
  const iconColors = {
    default: "bg-[#5A8A6E]/10 text-[#5A8A6E]",
    warning: "bg-[#D4A853]/10 text-[#D4A853]",
    destructive: "bg-[#D97B6C]/10 text-[#D97B6C]",
    success: "bg-[#5A8A6E]/10 text-[#5A8A6E]",
  };

  const valueColors = {
    default: "text-[#2D3B35]",
    warning: "text-[#D4A853]",
    destructive: "text-[#D97B6C]",
    success: "text-[#5A8A6E]",
  };

  return (
    <Card className={cn("overflow-hidden transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 cursor-pointer", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#8A9A8E]">{title}</p>
            <p className={cn("text-2xl font-semibold tracking-tight", valueColors[variant])}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-[#8A9A8E]">{subtitle}</p>
            )}
          </div>
          <div className={cn("p-2.5 rounded-xl", iconColors[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
