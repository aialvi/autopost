"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetchJSON } from "@/lib/utils/fetch-json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Expense = { id: string; name: string; amount: string; frequency: string; startDate: string; endDate: string | null };
const empty = { name: "", amount: "", frequency: "one_time", startDate: new Date().toISOString().slice(0, 10), endDate: "" };

export function ExpenseManager({ brandId, currency, canEdit, onChange }: { brandId: string; currency: string; canEdit: boolean; onChange: () => void }) {
  const url = `/api/brands/${brandId}/expenses`;
  const { data, error, mutate } = useSWR<{ expenses: Expense[]; note?: string }>(url, fetchJSON);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(method: string, id?: string) {
    setBusy(true); setMessage("");
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(method === "DELETE" ? { id } : { ...form, id, amount: Number(form.amount), endDate: form.endDate || null }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Could not save expense");
      setEditing(undefined); setForm(empty); await mutate(); onChange(); setMessage(method === "DELETE" ? "Expense removed." : "Expense saved. Profit report updated.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save expense"); }
    finally { setBusy(false); }
  }
  return <section className="space-y-4 rounded-xl border p-5" aria-labelledby="expenses-title">
    <h2 id="expenses-title" className="text-lg font-semibold">Expenses</h2>
    <p className="text-sm text-muted-foreground">Add shipping, software, rent, or other costs in {currency}. Weekly and monthly amounts are allocated across each day of the period, within your start and end dates.</p>
    {error && <p role="alert">Unable to load expenses.</p>}
    {!data && !error && <p role="status">Loading expenses…</p>}
    {data?.note && <p className="text-sm text-muted-foreground">{data.note}</p>}
    {!data?.note && data?.expenses.length === 0 && <p className="text-sm text-muted-foreground">No expenses added yet.</p>}
    <ul className="divide-y">{data?.expenses.map(expense => <li key={expense.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div><p className="font-medium">{expense.name} · {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(expense.amount))}</p><p className="text-sm text-muted-foreground">{expense.frequency.replace("_", " ")} · {expense.startDate}{expense.endDate ? ` to ${expense.endDate}` : ""}</p></div>
      {canEdit && <div className="flex gap-2"><Button disabled={busy} variant="outline" size="sm" onClick={() => { setEditing(expense.id); setForm({ ...expense, endDate: expense.endDate ?? "" }); }}>Edit<span className="sr-only"> {expense.name}</span></Button><Button disabled={busy} variant="outline" size="sm" onClick={() => { if (window.confirm(`Remove ${expense.name} from profit calculations?`)) void save("DELETE", expense.id); }}>Remove<span className="sr-only"> {expense.name}</span></Button></div>}
    </li>)}</ul>
    {canEdit ? <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={event => { event.preventDefault(); void save(editing ? "PUT" : "POST", editing); }}>
      <label className="text-sm">Name<Input required maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <label className="text-sm">Amount ({currency})<Input required type="number" min="0.01" max="99999999.99" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
      <div className="text-sm"><label htmlFor="expense-frequency">Frequency</label><select id="expense-frequency" className="mt-1 h-9 w-full rounded-md border bg-background px-3" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>{["one_time", "daily", "weekly", "monthly"].map(value => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</select></div>
      <label className="text-sm">Start date<Input required type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></label>
      <label className="text-sm">End date (optional)<Input type="date" min={form.startDate} value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></label>
      <div className="flex items-end gap-2"><Button disabled={busy}>{busy ? "Saving…" : editing ? "Save expense" : "Add expense"}</Button>{editing && <Button type="button" variant="outline" onClick={() => { setEditing(undefined); setForm(empty); }}>Cancel</Button>}</div>
    </form> : <p className="text-sm text-muted-foreground">Only brand owners and managers can change expenses.</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
