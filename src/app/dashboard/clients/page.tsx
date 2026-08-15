"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Edit2, Trash2, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientForm } from "@/components/client-form";
import { PageTransition } from "@/components/page-transition";
import { Client } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/clients?${params}`);
    setClients(await res.json());
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  async function handleDelete(id: number) {
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    toast.success("Client deleted");
    setDeleteId(null);
    fetchClients();
  }

  return (
    <PageTransition className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2D3B35] tracking-tight">Clients</h1>
          <p className="text-sm text-[#8A9A8E] mt-1">{clients.length} clients total</p>
        </div>
        <Button onClick={() => { setEditClient(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

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
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-[#FAFAF8] transition-colors">
                    <td className="px-6 py-3">
                      <Link
                        href={`/dashboard/clients/${client.id}`}
                        className="font-medium text-[#2D3B35] hover:text-[#5A8A6E] flex items-center gap-1.5"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#5A8A6E]/10 flex items-center justify-center text-xs font-semibold text-[#5A8A6E]">
                          {client.first_name[0]}{client.last_name[0]}
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
                ))
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
