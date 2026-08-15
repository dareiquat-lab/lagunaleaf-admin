"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition } from "@/components/page-transition";
import { Category } from "@/lib/types";
import { toast } from "sonner";

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [catDialog, setCatDialog] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<number | null>(null);
  const [catForm, setCatForm] = useState({ name: "", icon: "", description: "" });
  const [savingCat, setSavingCat] = useState(false);

  async function fetchCategories() {
    setLoading(true);
    const res = await fetch("/api/categories");
    setCategories(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchCategories(); }, []);

  function openCatDialog(cat?: Category) {
    if (cat) {
      setEditCat(cat);
      setCatForm({ name: cat.name, icon: cat.icon || "", description: cat.description || "" });
    } else {
      setEditCat(null);
      setCatForm({ name: "", icon: "", description: "" });
    }
    setCatDialog(true);
  }

  async function saveCat() {
    if (!catForm.name.trim()) { toast.error("Category name is required"); return; }
    setSavingCat(true);
    try {
      const url = editCat ? `/api/categories/${editCat.id}` : "/api/categories";
      const method = editCat ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catForm),
      });
      if (!res.ok) throw new Error();
      toast.success(editCat ? "Category updated" : "Category created");
      setCatDialog(false);
      fetchCategories();
    } catch {
      toast.error("Failed to save category");
    } finally {
      setSavingCat(false);
    }
  }

  async function deleteCat(id: number) {
    try {
      await fetch(`/api/categories/${id}`, { method: "DELETE" });
      toast.success("Category deleted");
      setDeleteCatId(null);
      fetchCategories();
    } catch {
      toast.error("Failed to delete category");
    }
  }

  return (
    <PageTransition className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#2D3B35] tracking-tight">Settings</h1>
        <p className="text-sm text-[#8A9A8E] mt-1">Manage your application settings</p>
      </div>

      {/* Categories */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Product Categories</CardTitle>
              <CardDescription>Manage the categories used to organize your inventory.</CardDescription>
            </div>
            <Button size="sm" onClick={() => openCatDialog()}>
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="space-y-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-[#FAFAF8] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl w-8 text-center">{cat.icon || "📦"}</span>
                    <div>
                      <p className="font-medium text-[#2D3B35] text-sm">{cat.name}</p>
                      {cat.description && (
                        <p className="text-xs text-[#8A9A8E]">{cat.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openCatDialog(cat)}
                      className="p-1.5 rounded-md text-[#8A9A8E] hover:text-[#5A8A6E] hover:bg-[#5A8A6E]/10 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteCatId(cat.id)}
                      className="p-1.5 rounded-md text-[#8A9A8E] hover:text-[#D97B6C] hover:bg-[#D97B6C]/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admin Account</CardTitle>
          <CardDescription>
            Admin credentials are configured via environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-[#5A8A6E]/5 border border-[#5A8A6E]/20 rounded-xl">
            <Info className="h-5 w-5 text-[#5A8A6E] mt-0.5 shrink-0" />
            <div className="text-sm text-[#2D3B35]">
              <p className="font-medium mb-1">Updating credentials requires a redeployment.</p>
              <p className="text-[#8A9A8E]">
                Set <code className="bg-[#E8EDE9] px-1 rounded text-xs">ADMIN_EMAIL</code> and{" "}
                <code className="bg-[#E8EDE9] px-1 rounded text-xs">ADMIN_PASSWORD_HASH</code>{" "}
                in your environment variables, then redeploy the application.
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Generate Password Hash</Label>
            <p className="text-xs text-[#8A9A8E]">
              Run this command to generate a bcrypt hash for your new password:
            </p>
            <code className="block text-xs bg-[#2D3B35] text-[#A8C5B2] p-3 rounded-xl font-mono">
              node -e &quot;const b=require(&apos;bcryptjs&apos;);console.log(b.hashSync(&apos;yourpassword&apos;,12))&quot;
            </code>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-[#E8EDE9]">
            <span className="text-[#8A9A8E]">Application</span>
            <span className="font-medium text-[#2D3B35]">Laguna Leaf Admin Portal</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#E8EDE9]">
            <span className="text-[#8A9A8E]">Version</span>
            <span className="font-medium text-[#2D3B35]">1.0.0</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#E8EDE9]">
            <span className="text-[#8A9A8E]">Framework</span>
            <span className="font-medium text-[#2D3B35]">Next.js 15 (App Router)</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[#8A9A8E]">Database</span>
            <span className="font-medium text-[#2D3B35]">Neon PostgreSQL</span>
          </div>
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editCat ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label>Icon</Label>
                <Input
                  value={catForm.icon}
                  onChange={(e) => setCatForm((f) => ({ ...f, icon: e.target.value }))}
                  placeholder="🌿"
                  className="text-center text-xl"
                  maxLength={2}
                />
              </div>
              <div className="space-y-1.5 col-span-3">
                <Label>Name *</Label>
                <Input
                  value={catForm.name}
                  onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Category name"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={catForm.description}
                onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCatDialog(false)}>Cancel</Button>
              <Button onClick={saveCat} disabled={savingCat}>
                {savingCat && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <Save className="h-4 w-4" />
                {editCat ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={deleteCatId !== null} onOpenChange={(o) => !o && setDeleteCatId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#8A9A8E]">
            Are you sure? Products in this category will have their category unset.
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setDeleteCatId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteCatId && deleteCat(deleteCatId)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
