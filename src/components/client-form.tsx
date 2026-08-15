"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Client } from "@/lib/types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ClientFormProps {
  client?: Client | null;
  onSuccess: (client: Client) => void;
  onCancel: () => void;
}

export function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: client?.first_name || "",
    last_name: client?.last_name || "",
    email: client?.email || "",
    phone: client?.phone || "",
    address: client?.address || "",
    city: client?.city || "",
    state: client?.state || "",
    zip: client?.zip || "",
    notes: client?.notes || "",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("First and last name are required");
      return;
    }

    setLoading(true);
    try {
      const url = client ? `/api/clients/${client.id}` : "/api/clients";
      const method = client ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save client");
      const saved = await res.json();
      toast.success(client ? "Client updated" : "Client created");
      onSuccess(saved);
    } catch {
      toast.error("Failed to save client");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="first_name">First Name *</Label>
          <Input id="first_name" value={form.first_name} onChange={set("first_name")} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name">Last Name *</Label>
          <Input id="last_name" value={form.last_name} onChange={set("last_name")} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={set("email")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={form.phone} onChange={set("phone")} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <Input id="address" value={form.address} onChange={set("address")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" value={form.city} onChange={set("city")} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="state">State</Label>
            <Input id="state" value={form.state} onChange={set("state")} maxLength={2} placeholder="CA" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zip">ZIP</Label>
            <Input id="zip" value={form.zip} onChange={set("zip")} />
          </div>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={form.notes} onChange={set("notes")} rows={2} />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-[#E8EDE9]">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {client ? "Update Client" : "Create Client"}
        </Button>
      </div>
    </form>
  );
}
