"use client";

import { useEffect, useState, useCallback } from "react";
import { ShoppingBag, Package, RefreshCw, Trash2, PlusCircle, PencilLine, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition } from "@/components/page-transition";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

interface ActivityLog {
  id: number;
  actor: "admin" | "staff";
  action: string;
  entity_type: string;
  entity_id: number | null;
  entity_label: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

function actionIcon(action: string) {
  if (action.includes("deleted")) return Trash2;
  if (action.includes("created")) return PlusCircle;
  if (action.includes("status_changed")) return RefreshCw;
  if (action.includes("order")) return ShoppingBag;
  if (action.includes("product")) return Package;
  return PencilLine;
}

function actionColor(action: string): string {
  if (action.includes("deleted")) return "bg-[#D97B6C]/10 text-[#D97B6C]";
  if (action.includes("created")) return "bg-[#5A8A6E]/10 text-[#5A8A6E]";
  if (action.includes("status_changed")) return "bg-[#D4A853]/10 text-[#D4A853]";
  return "bg-[#5B8DD9]/10 text-[#5B8DD9]";
}

function formatDescription(log: ActivityLog): string {
  const label = log.entity_label ? `${log.entity_label}` : `#${log.entity_id}`;
  const d = log.details as Record<string, unknown> | null;
  switch (log.action) {
    case "order_created":
      return `Created order ${label}${d?.status ? ` · ${d.status}` : ""}${d?.total ? ` · $${Number(d.total).toFixed(2)}` : ""}`;
    case "order_updated":
      return `Updated order ${label}`;
    case "order_deleted":
      return `Deleted order ${label}${d?.was_status ? ` (was ${d.was_status})` : ""}`;
    case "order_status_changed":
      return d?.old_status && d?.new_status
        ? `Changed ${label}: ${d.old_status} → ${d.new_status}`
        : `Updated status on ${label}`;
    case "product_created":
      return d?.auto_created
        ? `Auto-added "${label}" to inventory${d.via_order ? ` via order ${d.via_order}` : ""}`
        : `Created product "${label}"`;
    case "product_updated":
      if (d?.stock_before !== undefined && d?.stock_after !== undefined) {
        const diff = Number(d.stock_after) - Number(d.stock_before);
        return `Updated "${label}" · stock ${diff >= 0 ? "+" : ""}${diff} (${d.stock_before} → ${d.stock_after})`;
      }
      return `Updated product "${label}"`;
    case "product_deleted":
      return `Deleted product "${label}"`;
    default:
      return `${log.action.replace(/_/g, " ")} ${label}`;
  }
}

function formatTime(ts: string): string {
  const date = new Date(ts);
  const ago = formatDistanceToNow(date, { addSuffix: true });
  if (isToday(date)) return ago;
  if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
  return format(date, "MMM d, h:mm a");
}

function groupByDate(logs: ActivityLog[]): { label: string; logs: ActivityLog[] }[] {
  const groups: Record<string, ActivityLog[]> = {};
  for (const log of logs) {
    const date = new Date(log.created_at);
    const key = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "MMMM d, yyyy");
    (groups[key] ??= []).push(log);
  }
  return Object.entries(groups).map(([label, logs]) => ({ label, logs }));
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorFilter, setActorFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [limit, setLimit] = useState(150);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (actorFilter !== "all") params.set("actor", actorFilter);
    if (typeFilter !== "all") params.set("entity_type", typeFilter);
    params.set("limit", String(limit));
    const res = await fetch(`/api/activity?${params}`);
    setLogs(await res.json());
    setLoading(false);
  }, [actorFilter, typeFilter, limit]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const groups = groupByDate(logs);

  return (
    <PageTransition className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2D3B35] tracking-tight">Activity Log</h1>
          <p className="text-sm text-[#8A9A8E] mt-1">{logs.length} entries</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={actorFilter} onValueChange={setActorFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All actors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actors</SelectItem>
            <SelectItem value="admin">Admin only</SelectItem>
            <SelectItem value="staff">Staff only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="order">Orders</SelectItem>
            <SelectItem value="product">Products</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 py-3">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E8EDE9] py-16 text-center">
          <RefreshCw className="h-10 w-10 text-[#E8EDE9] mx-auto mb-3" />
          <p className="text-sm text-[#8A9A8E]">No activity yet.</p>
          <p className="text-xs text-[#8A9A8E] mt-1">Actions by admin and staff will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ label, logs: groupLogs }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-[#8A9A8E] uppercase tracking-wider mb-3 px-1">{label}</p>
              <div className="bg-white rounded-xl border border-[#E8EDE9] divide-y divide-[#E8EDE9] overflow-hidden">
                {groupLogs.map((log) => {
                  const Icon = actionIcon(log.action);
                  const color = actionColor(log.action);
                  return (
                    <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-[#FAFAF8] transition-colors">
                      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5", color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              "text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full",
                              log.actor === "staff"
                                ? "bg-[#7B6ED9]/10 text-[#7B6ED9]"
                                : "bg-[#5A8A6E]/10 text-[#5A8A6E]"
                            )}
                          >
                            {log.actor}
                          </span>
                          <p className="text-sm text-[#2D3B35] font-medium">{formatDescription(log)}</p>
                        </div>
                        <p className="text-xs text-[#8A9A8E] mt-0.5">{formatTime(log.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {logs.length >= limit && (
            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLimit((l) => l + 150)}
                className="gap-1.5"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </PageTransition>
  );
}
