"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit2, Trash2, Mail, Phone, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { ClientForm } from "@/components/client-form";
import { PageTransition } from "@/components/page-transition";
import { Client, Order } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<(Client & { orders: Order[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function fetchClient() {
    setLoading(true);
    const res = await fetch(`/api/clients/${params.id}`);
    if (!res.ok) { router.push("/dashboard/clients"); return; }
    setClient(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchClient(); }, [params.id]);

  async function handleDelete() {
    await fetch(`/api/clients/${params.id}`, { method: "DELETE" });
    toast.success("Client deleted");
    router.push("/dashboard/clients");
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <div className="lg:col-span-2"><Skeleton className="h-96" /></div>
        </div>
      </div>
    );
  }

  if (!client) return null;

  return (
    <PageTransition className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/clients">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-[#2D3B35] tracking-tight">
              {client.first_name} {client.last_name}
            </h1>
            <p className="text-sm text-[#8A9A8E] mt-0.5">Client since {formatDate(client.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#5A8A6E]/10 flex items-center justify-center text-2xl font-semibold text-[#5A8A6E]">
                  {client.first_name[0]}{client.last_name[0]}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                {client.email && (
                  <div className="flex items-start gap-2.5">
                    <Mail className="h-4 w-4 text-[#8A9A8E] mt-0.5 shrink-0" />
                    <span className="text-[#2D3B35]">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-start gap-2.5">
                    <Phone className="h-4 w-4 text-[#8A9A8E] mt-0.5 shrink-0" />
                    <span className="text-[#2D3B35]">{client.phone}</span>
                  </div>
                )}
                {(client.address || client.city || client.state) && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-[#8A9A8E] mt-0.5 shrink-0" />
                    <div className="text-[#2D3B35]">
                      {client.address && <p>{client.address}</p>}
                      <p>{[client.city, client.state, client.zip].filter(Boolean).join(", ")}</p>
                    </div>
                  </div>
                )}
              </div>

              {client.notes && (
                <div className="pt-3 border-t border-[#E8EDE9]">
                  <p className="text-xs text-[#8A9A8E] mb-1">Notes</p>
                  <p className="text-sm text-[#2D3B35]">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-xs text-[#8A9A8E]">Total Orders</p>
                <p className="text-2xl font-semibold text-[#2D3B35]">{client.total_orders ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-[#8A9A8E]">Total Spent</p>
                <p className="text-2xl font-semibold text-[#5A8A6E]">
                  {formatCurrency(Number(client.total_spent ?? 0))}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {client.orders.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-[#8A9A8E]">No orders yet from this client.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#FAFAF8] border-b border-[#E8EDE9]">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-medium text-[#8A9A8E]">Order #</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-[#8A9A8E]">Date</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-[#8A9A8E]">Items</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-[#8A9A8E]">Total</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-[#8A9A8E]">Status</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-[#8A9A8E]">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8EDE9]">
                      {client.orders.map((order) => (
                        <tr key={order.id} className="hover:bg-[#FAFAF8] transition-colors">
                          <td className="px-6 py-3">
                            <Link
                              href={`/dashboard/orders/${order.id}`}
                              className="font-medium text-[#5A8A6E] hover:underline"
                            >
                              {order.order_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-[#8A9A8E]">{formatDateTime(order.ordered_at)}</td>
                          <td className="px-4 py-3 text-center text-[#2D3B35]">{order.items_count ?? 0}</td>
                          <td className="px-4 py-3 text-right font-medium text-[#2D3B35]">
                            {formatCurrency(Number(order.total))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge type="order_status" value={order.status} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge type="payment_status" value={order.payment_status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <ClientForm
            client={client}
            onSuccess={() => { setEditOpen(false); fetchClient(); }}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#8A9A8E]">
            Are you sure you want to delete {client.first_name} {client.last_name}?
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
