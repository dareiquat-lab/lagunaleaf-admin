"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2, Save, Tag, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition } from "@/components/page-transition";
import { Category } from "@/lib/types";
import { toast } from "sonner";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [catDialog, setCatDialog] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<number | null>(null);
  const [catForm, setCatForm] = useState({ name: "", icon: "", description: "" });
  const [saving, setSaving] = useState(false);

  async function fetchCategories() {
    setLoading(true);
    const res = await fetch("/api/categories");
    setCategories(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchCategories(); }, []);

  function openDialog(cat?: Category) {
    if (cat) {
      setEditCat(cat);
      setCatForm({ name: cat.name, icon: cat.icon || "", description: cat.description || "" });
    } else {
      setEditCat(null);
      setCatForm({ name: "", icon: "", description: "" });
    }
    setCatDialog(true);
  }

  async function save() {
    if (!catForm.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const url = editCat ? `/api/categories/${editCat.id}` : "/api/categories";
      const res = await fetch(url, {
        method: editCat ? "PUT" : "POST",
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
      setSaving(false);
    }
  }

  async function deleteCat(id: number) {
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    toast.success("Category deleted");
    setDeleteCatId(null);
    fetchCategories();
  }

  return (
    <PageTransition className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2D3B35] tracking-tight">Categories</h1>
          <p className="text-sm text-[#8A9A8E] mt-1">Organize your inventory with product categories</p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-[#E8EDE9] overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="py-20 text-center">
            <Tag className="h-10 w-10 text-[#E8EDE9] mx-auto mb-3" />
            <p className="text-sm text-[#8A9A8E]">No categories yet.</p>
            <button
              onClick={() => openDialog()}
              className="text-sm text-[#5A8A6E] hover:underline mt-1 inline-block"
            >
              Create the first one →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#E8EDE9]">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-[#FAFAF8] transition-colors group"
              >
                {/* Clickable left section → inventory filtered by category */}
                <Link
                  href={`/dashboard/inventory?category_id=${cat.id}`}
                  className="flex items-center gap-4 flex-1 min-w-0"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#5A8A6E]/10 flex items-center justify-center text-xl shrink-0">
                    {cat.icon || "📦"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[#2D3B35] text-sm group-hover:text-[#5A8A6E] transition-colors">
                      {cat.name}
                    </p>
                    {cat.description && (
                      <p className="text-xs text-[#8A9A8E] mt-0.5 truncate">{cat.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#5A8A6E]/10 text-[#5A8A6E]">
                      {cat.product_count ?? 0} {cat.product_count === 1 ? "item" : "items"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#8A9A8E] group-hover:text-[#5A8A6E] transition-colors" />
                  </div>
                </Link>

                {/* Edit / delete buttons */}
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <button
                    onClick={() => openDialog(cat)}
                    className="p-2 rounded-lg text-[#8A9A8E] hover:text-[#5A8A6E] hover:bg-[#5A8A6E]/10 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteCatId(cat.id)}
                    className="p-2 rounded-lg text-[#8A9A8E] hover:text-[#D97B6C] hover:bg-[#D97B6C]/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editCat ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
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
                  placeholder="e.g. Supplements"
                  onKeyDown={(e) => e.key === "Enter" && save()}
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
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setCatDialog(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving
                  ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Save className="h-4 w-4" />
                }
                {editCat ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteCatId !== null} onOpenChange={(o) => !o && setDeleteCatId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#8A9A8E]">
            Products in this category will have their category unset.
          </p>
          <div className="flex gap-2 justify-end mt-3">
            <Button variant="outline" onClick={() => setDeleteCatId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteCatId && deleteCat(deleteCatId)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
