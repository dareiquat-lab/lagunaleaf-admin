"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Edit2, Trash2, Users, ExternalLink, GitMerge, Phone, ChevronDown, ChevronUp, ExternalLink as OrderLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientForm } from "@/components/client-form";
import { PageTransition } from "@/components/page-transition";
import { Client } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface DupOrder {
  id: number;
  order_number: string;
  total: number;
  ordered_at: string;
  status: string;
}

interface DupClient {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  created_at: string;
  total_orders: number;
  total_spent: number;
  orders: DupOrder[];
}

function getDefaultKeep(group: DupClient[]): number {
  return group.reduce((best, c) =>
    Number(c.total_orders) > Number(best.total_orders) ? c : best
  ).id;
}

function DuplicatesPanel({
  groups: initialGroups,
  onMerged,
}: {
  groups: DupClient[][];
  onMerged: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [groups, setGroups] = useState(initialGroups);
  const [keepIds, setKeepIds] = useState<Record<number, number>>(() => {
    const d: Record<number, number> = {};
    initialGroups.forEach((g, i) => { d[i] = getDefaultKeep(g); });
    return d;
  });
  const [merging, setMerging] = useState<number | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);

  // keep local groups in sync when parent refetches
  useEffect(() => {
    setGroups(initialGroups);
    setKeepIds((prev) => {
      const d: Record<number, number> = {};
      initialGroups.forEach((g, i) => {
        d[i] = prev[i] && g.some((c) => c.id === prev[i]) ? prev[i] : getDefaultKeep(g);
      });
      return d;
    });
  }, [initialGroups]);

  async function handleMerge(idx: number) {
    const group = groups[idx];
    const keepId = keepIds[idx];
    const mergeIds = group.filter((c) => c.id !== keepId).map((c) => c.id);
    setMerging(idx);
    try {
      const res = await fetch("/api/clients/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keep_id: keepId, merge_ids: mergeIds }),
      });
      if (!res.ok) throw new Error();
      toast.success("Clients merged");
      onMerged();
    } catch {
      toast.error("Failed to merge");
    } finally {
      setMerging(null);
    }
  }

  async function handleDeleteOrder(orderId: number, groupIdx: number, clientId: number) {
    setDeletingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Order deleted");
      // Optimistic update: remove order from local state
      setGroups((prev) =>
        prev.map((group, gi) =>
          gi !== groupIdx
            ? group
            : group.map((c) =>
                c.id !== clientId
                  ? c
                  : {
                      ...c,
                      orders: c.orders.filter((o) => o.id !== orderId),
                      total_orders: c.total_orders - 1,
                      total_spent: c.total_spent - (c.orders.find((o) => o.id === orderId)?.total ?? 0),
                    }
              )
        )
      );
    } catch {
      toast.error("Failed to delete order");
    } finally {
      setDeletingOrderId(null);
    }
  }

  return (
    <div className="rounded-xl border border-[#D4A853]/40 bg-[#D4A853]/8 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#D4A853]/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#D4A853]/20">
            <GitMerge className="h-4 w-4 text-[#D4A853]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#2D3B35]">
              {groups.length} duplicate {groups.length === 1 ? "group" : "groups"} found
            </p>
            <p className="text-xs text-[#8A9A8E]">Same phone number — review orders, then merge if they&apos;re the same person</p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-[#8A9A8E]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[#8A9A8E]" />
        )}
      </button>

      {open && (
        <div className="border-t border-[#D4A853]/30 divide-y divide-[#D4A853]/20">
          {groups.map((group, idx) => (
            <div key={idx} className="px-5 py-4 space-y-3">
              {/* Phone label */}
              <div className="flex items-center gap-2 text-xs text-[#8A9A8E]">
                <Phone className="h-3.5 w-3.5" />
                <span>{group[0].phone}</span>
              </div>

              {/* Client cards stacked vertically */}
              <div className="space-y-2">
                {group.map((client) => {
                  const isKeep = keepIds[idx] === client.id;
                  return (
                    <div
                      key={client.id}
                      className={`rounded-lg border-2 overflow-hidden transition-all ${
                        isKeep ? "border-[#5A8A6E]" : "border-[#E8EDE9] bg-white"
                      }`}
                    >
                      {/* Client header — click to select as Keep */}
                      <button
                        onClick={() => setKeepIds((k) => ({ ...k, [idx]: client.id }))}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                          isKeep ? "bg-[#5A8A6E]/5 hover:bg-[#5A8A6E]/8" : "bg-white hover:bg-[#FAFAF8]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                            isKeep ? "bg-[#5A8A6E]/15 text-[#5A8A6E]" : "bg-[#F0F4F1] text-[#8A9A8E]"
                          }`}>
                            {client.first_name[0]}{client.last_name?.[0] ?? ""}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-[#2D3B35]">
                              {client.first_name} {client.last_name}
                            </p>
                            {client.email && (
                              <p className="text-xs text-[#8A9A8E]">{client.email}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-[#8A9A8E]">
                            {Number(client.total_orders)} order{Number(client.total_orders) !== 1 ? "s" : ""} · {formatCurrency(Number(client.total_spent))}
                          </span>
                          {isKeep && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#5A8A6E] text-white">
                              Keep
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Orders list */}
                      {client.orders.length > 0 ? (
                        <div className="border-t border-[#E8EDE9]">
                          <table className="w-full text-xs">
                            <thead className="bg-[#FAFAF8]">
                              <tr>
                                <th className="text-left px-4 py-2 font-medium text-[#8A9A8E]">Order</th>
                                <th className="text-left px-3 py-2 font-medium text-[#8A9A8E]">Date</th>
                                <th className="text-right px-3 py-2 font-medium text-[#8A9A8E]">Total</th>
                                <th className="text-right px-3 py-2 font-medium text-[#8A9A8E]">Delete</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E8EDE9]">
                              {client.orders.map((order) => (
                                <tr key={order.id} className="hover:bg-[#FAFAF8] transition-colors group">
                                  <td className="px-4 py-2">
                                    <Link
                                      href={`/dashboard/orders/${order.id}`}
                                      className="flex items-center gap-1 font-medium text-[#5A8A6E] hover:underline"
                                    >
                                      {order.order_number}
                                      <OrderLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                  </td>
                                  <td className="px-3 py-2 text-[#8A9A8E]">
                                    {formatDate(order.ordered_at)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium text-[#2D3B35]">
                                    {formatCurrency(Number(order.total))}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <button
                                      onClick={() => handleDeleteOrder(order.id, idx, client.id)}
                                      disabled={deletingOrderId === order.id}
                                      className="px-2 py-0.5 rounded text-[10px] font-medium text-[#D97B6C] border border-[#D97B6C]/30 hover:bg-[#D97B6C]/10 transition-colors disabled:opacity-40"
                                    >
                                      {deletingOrderId === order.id ? "…" : "Delete"}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="border-t border-[#E8EDE9] px-4 py-2">
                          <p className="text-xs text-[#8A9A8E] italic">No orders</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Merge action */}
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => handleMerge(idx)}
                  disabled={merging === idx}
                  className="gap-1.5"
                >
                  <GitMerge className="h-3.5 w-3.5" />
                  {merging === idx
                    ? "Merging…"
                    : `Merge into ${groups[idx]?.find((c) => c.id === keepIds[idx])?.first_name ?? "selected"}`}
                </Button>
                <p className="text-xs text-[#8A9A8E]">
                  Click a card to choose which record to keep
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [dupGroups, setDupGroups] = useState<DupClient[][]>([]);
  const [dupLoading, setDupLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/clients?${params}`);
    setClients(await res.json());
    setLoading(false);
  }, [search]);

  const fetchDuplicates = useCallback(async () => {
    setDupLoading(true);
    const res = await fetch("/api/clients/duplicates");
    setDupGroups(await res.json());
    setDupLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);
  useEffect(() => { fetchDuplicates(); }, [fetchDuplicates]);

  async function handleDelete(id: number) {
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    toast.success("Client deleted");
    setDeleteId(null);
    fetchClients();
  }

  function handleMerged() {
    fetchClients();
    fetchDuplicates();
  }

  return (
    <PageTransition className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2D3B35] tracking-tight">Clients</h1>
          <p className="text-sm text-[#8A9A8E] mt-1">
            {clients.length} clients total
            {dupGroups.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#D4A853]/20 text-[#D4A853]">
                {dupGroups.length} duplicate{dupGroups.length > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => { setEditClient(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Duplicates panel */}
      {!dupLoading && dupGroups.length > 0 && (
        <DuplicatesPanel groups={dupGroups} onMerged={handleMerged} />
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A9A8E]" />
        <Input
          className="pl-9"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E8EDE9] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAF8] border-b border-[#E8EDE9]">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#8A9A8E]">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#8A9A8E]">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#8A9A8E]">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#8A9A8E]">City</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-[#8A9A8E]">Orders</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#8A9A8E]">Total Spent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#8A9A8E]">Date Added</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#8A9A8E]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDE9]">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Users className="h-10 w-10 text-[#E8EDE9] mx-auto mb-3" />
                    <p className="text-sm text-[#8A9A8E]">No clients found.</p>
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const isDup = dupGroups.some((g) => g.some((c) => c.id === client.id));
                  return (
                    <tr key={client.id} className="hover:bg-[#FAFAF8] transition-colors">
                      <td className="px-6 py-3">
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          className="font-medium text-[#2D3B35] hover:text-[#5A8A6E] flex items-center gap-1.5"
                        >
                          <div className="relative">
                            <div className="w-7 h-7 rounded-full bg-[#5A8A6E]/10 flex items-center justify-center text-xs font-semibold text-[#5A8A6E]">
                              {client.first_name[0]}{client.last_name[0]}
                            </div>
                            {isDup && (
                              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#D4A853] border-2 border-white" />
                            )}
                          </div>
                          {client.first_name} {client.last_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#8A9A8E]">{client.email || "—"}</td>
                      <td className="px-4 py-3 text-[#8A9A8E]">{client.phone || "—"}</td>
                      <td className="px-4 py-3 text-[#8A9A8E]">{client.city || "—"}</td>
                      <td className="px-4 py-3 text-center text-[#2D3B35] font-medium">{client.total_orders ?? 0}</td>
                      <td className="px-4 py-3 text-right font-medium text-[#2D3B35]">
                        {formatCurrency(Number(client.total_spent ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-[#8A9A8E]">{formatDate(client.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/dashboard/clients/${client.id}`}>
                            <button className="p-1.5 rounded-md text-[#8A9A8E] hover:text-[#5A8A6E] hover:bg-[#5A8A6E]/10 transition-colors">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          </Link>
                          <button
                            onClick={() => { setEditClient(client); setDialogOpen(true); }}
                            className="p-1.5 rounded-md text-[#8A9A8E] hover:text-[#5A8A6E] hover:bg-[#5A8A6E]/10 transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(client.id)}
                            className="p-1.5 rounded-md text-[#8A9A8E] hover:text-[#D97B6C] hover:bg-[#D97B6C]/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editClient ? "Edit Client" : "Add Client"}</DialogTitle>
          </DialogHeader>
          <ClientForm
            client={editClient}
            onSuccess={() => { setDialogOpen(false); fetchClients(); }}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#8A9A8E]">
            Are you sure you want to delete this client? Their order history will be preserved.
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
