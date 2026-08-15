"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Trash2, DollarSign, Users, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PageTransition } from "@/components/page-transition";
import { Employee, EmployeeCost } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

function estimatedMonthly(e: Employee) {
  if (e.pay_type === "salary") return e.pay_rate;
  if (e.pay_type === "hourly") return e.pay_rate * (e.hours_per_week ?? 40) * 4.33;
  return 0;
}

function PayTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    hourly: "bg-[#5A8A6E]/10 text-[#5A8A6E]",
    salary: "bg-[#D4A853]/10 text-[#D4A853]",
    contractor: "bg-[#8A9A8E]/10 text-[#8A9A8E]",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[type] ?? ""}`}>
      {type}
    </span>
  );
}

type PayType = "hourly" | "salary" | "contractor";

const emptyForm = {
  name: "", role: "", pay_type: "hourly" as PayType,
  pay_rate: "", hours_per_week: "40", notes: "", is_active: true,
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  // Add / edit employee dialog
  const [empDialog, setEmpDialog] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Log payment dialog
  const [logDialog, setLogDialog] = useState<Employee | null>(null);
  const [logForm, setLogForm] = useState({ amount: "", paid_on: format(new Date(), "yyyy-MM-dd"), notes: "" });
  const [loggingCost, setLoggingCost] = useState(false);

  // Expanded employee (to show cost history)
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [costHistory, setCostHistory] = useState<Record<number, EmployeeCost[]>>({});

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/employees");
    setEmployees(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  async function fetchCostHistory(empId: number) {
    const res = await fetch(`/api/employees/${empId}`);
    const data = await res.json();
    setCostHistory((prev) => ({ ...prev, [empId]: data.costs || [] }));
  }

  function toggleExpand(id: number) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!costHistory[id]) fetchCostHistory(id);
    }
  }

  function openAdd() {
    setEditEmp(null);
    setForm(emptyForm);
    setEmpDialog(true);
  }

  function openEdit(e: Employee) {
    setEditEmp(e);
    setForm({
      name: e.name,
      role: e.role || "",
      pay_type: e.pay_type,
      pay_rate: String(e.pay_rate),
      hours_per_week: String(e.hours_per_week ?? 40),
      notes: e.notes || "",
      is_active: e.is_active,
    });
    setEmpDialog(true);
  }

  async function saveEmployee() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const url = editEmp ? `/api/employees/${editEmp.id}` : "/api/employees";
      const res = await fetch(url, {
        method: editEmp ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pay_rate: parseFloat(form.pay_rate) || 0,
          hours_per_week: parseFloat(form.hours_per_week) || 40,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(editEmp ? "Employee updated" : "Employee added");
      setEmpDialog(false);
      fetchEmployees();
    } catch {
      toast.error("Failed to save employee");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmployee(id: number) {
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    toast.success("Employee removed");
    setDeleteId(null);
    fetchEmployees();
  }

  async function logPayment() {
    if (!logDialog || !logForm.amount) { toast.error("Amount is required"); return; }
    setLoggingCost(true);
    try {
      const res = await fetch("/api/employee-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: logDialog.id,
          amount: parseFloat(logForm.amount),
          paid_on: logForm.paid_on,
          notes: logForm.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Payment logged");
      setLogDialog(null);
      setLogForm({ amount: "", paid_on: format(new Date(), "yyyy-MM-dd"), notes: "" });
      // Refresh employee list + cost history
      fetchEmployees();
      if (expandedId === logDialog.id) fetchCostHistory(logDialog.id);
    } catch {
      toast.error("Failed to log payment");
    } finally {
      setLoggingCost(false);
    }
  }

  async function deleteCost(costId: number, empId: number) {
    await fetch(`/api/employee-costs/${costId}`, { method: "DELETE" });
    toast.success("Entry removed");
    fetchCostHistory(empId);
    fetchEmployees();
  }

  const visible = showInactive ? employees : employees.filter((e) => e.is_active);
  const totalMonthlyEstimate = visible.filter((e) => e.is_active).reduce((s, e) => s + estimatedMonthly(e), 0);
  const totalPaid = visible.filter((e) => e.is_active).reduce((s, e) => s + Number(e.total_paid ?? 0), 0);

  return (
    <PageTransition className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2D3B35] tracking-tight">Employees</h1>
          <p className="text-sm text-[#8A9A8E] mt-1">{visible.filter((e) => e.is_active).length} active</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#E8EDE9] p-5">
          <p className="text-xs text-[#8A9A8E] font-medium">Active Employees</p>
          <p className="text-2xl font-semibold text-[#2D3B35] mt-1">{visible.filter((e) => e.is_active).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E8EDE9] p-5">
          <p className="text-xs text-[#8A9A8E] font-medium">Est. Monthly Labor</p>
          <p className="text-2xl font-semibold text-[#2D3B35] mt-1">{formatCurrency(totalMonthlyEstimate)}</p>
          <p className="text-xs text-[#8A9A8E] mt-0.5">based on pay rates</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E8EDE9] p-5">
          <p className="text-xs text-[#8A9A8E] font-medium">Total Logged Payments</p>
          <p className="text-2xl font-semibold text-[#5A8A6E] mt-1">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-[#8A9A8E] mt-0.5">all time</p>
        </div>
      </div>

      {/* Show inactive toggle */}
      <div className="flex items-center gap-2">
        <Switch checked={showInactive} onCheckedChange={setShowInactive} />
        <span className="text-sm text-[#8A9A8E]">Show inactive employees</span>
      </div>

      {/* Employee list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E8EDE9] py-20 text-center">
            <Users className="h-10 w-10 text-[#E8EDE9] mx-auto mb-3" />
            <p className="text-sm text-[#8A9A8E]">No employees yet.</p>
            <button onClick={openAdd} className="text-sm text-[#5A8A6E] hover:underline mt-1 inline-block">
              Add the first one →
            </button>
          </div>
        ) : (
          visible.map((emp) => (
            <div key={emp.id} className={`bg-white rounded-xl border border-[#E8EDE9] overflow-hidden transition-opacity ${!emp.is_active ? "opacity-60" : ""}`}>
              {/* Employee row */}
              <div className="flex items-center gap-4 px-6 py-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[#5A8A6E]/10 flex items-center justify-center text-sm font-semibold text-[#5A8A6E] shrink-0">
                  {emp.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[#2D3B35]">{emp.name}</span>
                    {emp.role && <span className="text-sm text-[#8A9A8E]">· {emp.role}</span>}
                    <PayTypeBadge type={emp.pay_type} />
                    {!emp.is_active && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-[#E8EDE9] text-[#8A9A8E]">Inactive</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-[#8A9A8E] flex-wrap">
                    {emp.pay_type === "hourly" && (
                      <span>{formatCurrency(emp.pay_rate)}/hr · {emp.hours_per_week}h/wk ≈ {formatCurrency(estimatedMonthly(emp))}/mo</span>
                    )}
                    {emp.pay_type === "salary" && (
                      <span>{formatCurrency(emp.pay_rate)}/mo salary</span>
                    )}
                    {emp.pay_type === "contractor" && emp.pay_rate > 0 && (
                      <span>{formatCurrency(emp.pay_rate)}/hr contract</span>
                    )}
                    <span className="text-[#5A8A6E] font-medium">
                      {formatCurrency(Number(emp.total_paid ?? 0))} paid
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setLogDialog(emp); setLogForm({ amount: "", paid_on: format(new Date(), "yyyy-MM-dd"), notes: "" }); }}
                    className="text-xs h-8"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    Log Pay
                  </Button>
                  <button
                    onClick={() => openEdit(emp)}
                    className="p-2 rounded-lg text-[#8A9A8E] hover:text-[#5A8A6E] hover:bg-[#5A8A6E]/10 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(emp.id)}
                    className="p-2 rounded-lg text-[#8A9A8E] hover:text-[#D97B6C] hover:bg-[#D97B6C]/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleExpand(emp.id)}
                    className="p-2 rounded-lg text-[#8A9A8E] hover:bg-[#F0F4F1] transition-colors"
                  >
                    {expandedId === emp.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Cost history */}
              {expandedId === emp.id && (
                <div className="border-t border-[#E8EDE9] bg-[#FAFAF8] px-6 py-4">
                  <p className="text-xs font-medium text-[#8A9A8E] mb-3">Payment History</p>
                  {!costHistory[emp.id] ? (
                    <Skeleton className="h-8 w-full" />
                  ) : costHistory[emp.id].length === 0 ? (
                    <p className="text-sm text-[#8A9A8E]">No payments logged yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {costHistory[emp.id].map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-3">
                            <span className="text-[#8A9A8E] text-xs w-24 shrink-0">
                              {format(new Date(c.paid_on), "MMM d, yyyy")}
                            </span>
                            <span className="font-medium text-[#2D3B35]">{formatCurrency(Number(c.amount))}</span>
                            {c.notes && <span className="text-[#8A9A8E]">· {c.notes}</span>}
                          </div>
                          <button
                            onClick={() => deleteCost(c.id, emp.id)}
                            className="p-1 rounded text-[#8A9A8E] hover:text-[#D97B6C] transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Employee Dialog */}
      <Dialog open={empDialog} onOpenChange={setEmpDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editEmp ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role / Title</Label>
              <Input
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="e.g. Massage Therapist"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pay Type</Label>
                <Select value={form.pay_type} onValueChange={(v) => setForm((f) => ({ ...f, pay_type: v as PayType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="salary">Monthly Salary</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{form.pay_type === "salary" ? "Monthly Rate ($)" : "Rate ($/hr)"}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.pay_rate}
                  onChange={(e) => setForm((f) => ({ ...f, pay_rate: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            {form.pay_type !== "salary" && (
              <div className="space-y-1.5">
                <Label>Estimated Hours / Week</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.hours_per_week}
                  onChange={(e) => setForm((f) => ({ ...f, hours_per_week: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any notes..."
                rows={2}
              />
            </div>
            {editEmp && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                />
                <Label>Active</Label>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-1 border-t border-[#E8EDE9]">
              <Button variant="outline" onClick={() => setEmpDialog(false)}>Cancel</Button>
              <Button onClick={saveEmployee} disabled={saving}>
                {saving && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editEmp ? "Update" : "Add Employee"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Payment Dialog */}
      <Dialog open={!!logDialog} onOpenChange={(o) => !o && setLogDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Payment — {logDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A9A8E] text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={logForm.amount}
                  onChange={(e) => setLogForm((f) => ({ ...f, amount: e.target.value }))}
                  className="pl-7"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={logForm.paid_on}
                onChange={(e) => setLogForm((f) => ({ ...f, paid_on: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={logForm.notes}
                onChange={(e) => setLogForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Week of Aug 5"
              />
            </div>
            <div className="flex gap-2 justify-end border-t border-[#E8EDE9] pt-3">
              <Button variant="outline" onClick={() => setLogDialog(null)}>Cancel</Button>
              <Button onClick={logPayment} disabled={loggingCost}>
                {loggingCost && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <DollarSign className="h-4 w-4" />
                Log Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove Employee</DialogTitle></DialogHeader>
          <p className="text-sm text-[#8A9A8E]">This will delete the employee and all their payment history.</p>
          <div className="flex gap-2 justify-end mt-3">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteEmployee(deleteId)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
