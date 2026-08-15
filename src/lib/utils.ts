import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "MMM d, yyyy h:mm a");
}

export function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = format(now, "yyyyMMdd");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LL-${dateStr}-${random}`;
}

export function generateSKU(): string {
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `LL-${random}`;
}

export function calculateMargin(costPrice: number, salePrice: number): number {
  if (salePrice === 0) return 0;
  return ((salePrice - costPrice) / salePrice) * 100;
}

export function getMarginColor(margin: number): string {
  if (margin >= 40) return "text-primary";
  if (margin >= 20) return "text-warning";
  return "text-destructive";
}

export function getMarginBg(margin: number): string {
  if (margin >= 40) return "bg-primary/10 text-primary";
  if (margin >= 20) return "bg-warning/10 text-warning";
  return "bg-destructive/10 text-destructive";
}
