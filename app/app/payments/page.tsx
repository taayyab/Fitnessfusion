"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Payment } from "@/lib/types"
import { Search, CreditCard, CheckCircle, AlertCircle, Clock, DollarSign, X, RefreshCw, Settings, Loader2, ChevronDown } from "lucide-react"

const INPUT_CLASS = "w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50"

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [filtered, setFiltered] = useState<Payment[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  // Create single payment
  const [showCreate, setShowCreate] = useState(false)
  const [members, setMembers] = useState<{ id: string; full_name: string | null; email: string }[]>([])
  const [newPayment, setNewPayment] = useState({ user_id: "", amount: "", month: new Date().toISOString().slice(0, 7), due_date: "" })
  const [creating, setCreating] = useState(false)

  // Generate monthly payments
  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<{ created: number; skipped: number } | null>(null)

  // Fee settings
  const [showSettings, setShowSettings] = useState(false)
  const [defaultFee, setDefaultFee] = useState("")
  const [savingFee, setSavingFee] = useState(false)

  useEffect(() => {
    fetchPayments()
    fetchDefaultFee()
  }, [monthFilter])

  useEffect(() => {
    let result = payments
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((p) => p.users?.full_name?.toLowerCase().includes(q) || p.users?.email?.toLowerCase().includes(q))
    }
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter)
    }
    setFiltered(result)
  }, [search, statusFilter, payments])

  async function fetchPayments() {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("payments")
      .select("*, users!user_id(full_name, email, profile_picture)")
      .eq("month", monthFilter)
      .order("created_at", { ascending: false })
    if (error) {
      console.error("Failed to fetch payments:", error.message)
      setLoading(false)
      return
    }
    const mapped = (data || []).map((p) => ({
      ...p,
      users: Array.isArray(p.users) ? p.users[0] || null : p.users,
    }))
    setPayments(mapped)
    setFiltered(mapped)
    setLoading(false)
  }

  async function fetchDefaultFee() {
    try {
      const res = await fetch("/api/settings?key=default_monthly_fee")
      const data = await res.json()
      if (data.value) setDefaultFee(data.value)
    } catch {
      // Settings table may not exist yet
    }
  }

  async function updateStatus(paymentId: string, status: Payment["status"]) {
    setUpdating(paymentId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const updates: Record<string, unknown> = { status, updated_by: user?.id }
    if (status === "paid") updates.paid_date = new Date().toISOString().split("T")[0]
    else updates.paid_date = null
    await supabase.from("payments").update(updates).eq("id", paymentId)
    await fetchPayments()
    setUpdating(null)
  }

  async function openCreateModal() {
    setShowCreate(true)
    const supabase = createClient()
    const { data } = await supabase.from("users").select("id, full_name, email").eq("role", "member").order("full_name")
    setMembers(data || [])
    // Pre-fill amount with default fee
    if (defaultFee) setNewPayment((prev) => ({ ...prev, amount: defaultFee }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from("payments").insert({
        user_id: newPayment.user_id,
        amount: parseFloat(newPayment.amount),
        month: newPayment.month,
        due_date: newPayment.due_date || null,
        status: "pending",
        updated_by: user?.id,
      })
      if (error) {
        alert(error.message.includes("duplicate") ? "Payment already exists for this member and month" : error.message)
        setCreating(false)
        return
      }
      setShowCreate(false)
      setNewPayment({ user_id: "", amount: "", month: new Date().toISOString().slice(0, 7), due_date: "" })
      fetchPayments()
    } catch {
      alert("Failed to create payment")
    } finally {
      setCreating(false)
    }
  }

  async function handleGeneratePayments() {
    setGenerating(true)
    setGenerateResult(null)
    try {
      const res = await fetch("/api/generate-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: monthFilter,
          amount: defaultFee ? parseFloat(defaultFee) : null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setGenerateResult({ created: data.created, skipped: data.skipped })
        fetchPayments()
      } else {
        alert(data.error || "Failed to generate payments")
      }
    } catch {
      alert("Network error")
    } finally {
      setGenerating(false)
    }
  }

  async function handleSaveFee() {
    setSavingFee(true)
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "default_monthly_fee", value: defaultFee }),
      })
      setShowSettings(false)
    } catch {
      alert("Failed to save")
    } finally {
      setSavingFee(false)
    }
  }

  const paidTotal = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0)
  const pendingTotal = payments.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0)
  const overdueTotal = payments.filter((p) => p.status === "overdue").reduce((sum, p) => sum + p.amount, 0)
  const paidCount = payments.filter((p) => p.status === "paid").length
  const unpaidCount = payments.filter((p) => p.status !== "paid" && p.status !== "waived").length

  if (loading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-white text-lg font-semibold">Payments</h2>
          {defaultFee && <p className="text-neutral-500 text-xs">Monthly fee: Rs {parseInt(defaultFee).toLocaleString()}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-400 hover:text-white transition-colors"
            title="Fee Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={handleGeneratePayments}
            disabled={generating}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {generating ? "Generating..." : "Generate Monthly"}
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <CreditCard className="w-4 h-4" /> Add Single
          </button>
        </div>
      </div>

      {/* Generate Result */}
      {generateResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center justify-between">
          <p className="text-emerald-400 text-sm">
            Generated {generateResult.created} new payment{generateResult.created !== 1 ? "s" : ""}.
            {generateResult.skipped > 0 && ` ${generateResult.skipped} already existed.`}
          </p>
          <button onClick={() => setGenerateResult(null)} className="text-emerald-400/50 hover:text-emerald-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <CheckCircle className="w-5 h-5 text-green-400 mb-1" />
          <p className="text-green-400 text-xl font-bold">Rs {paidTotal.toLocaleString()}</p>
          <p className="text-neutral-400 text-xs">Collected ({paidCount})</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <Clock className="w-5 h-5 text-yellow-400 mb-1" />
          <p className="text-yellow-400 text-xl font-bold">Rs {pendingTotal.toLocaleString()}</p>
          <p className="text-neutral-400 text-xs">Pending</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-400 mb-1" />
          <p className="text-red-400 text-xl font-bold">Rs {overdueTotal.toLocaleString()}</p>
          <p className="text-neutral-400 text-xs">Overdue</p>
        </div>
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-4">
          <DollarSign className="w-5 h-5 text-neutral-400 mb-1" />
          <p className="text-white text-xl font-bold">{payments.length}</p>
          <p className="text-neutral-400 text-xs">Total ({paidCount} paid / {unpaidCount} unpaid)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by member name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-red-500/50"
          />
        </div>
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50 appearance-none cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="waived">Waived</option>
        </select>
      </div>

      {/* Payment Cards */}
      <div className="space-y-2">
        {filtered.map((payment) => (
          <div key={payment.id} className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-neutral-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">{payment.users?.full_name || "Unknown"}</p>
                <p className="text-neutral-500 text-xs">{payment.users?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-white text-sm font-bold">Rs {payment.amount.toLocaleString()}</p>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span>{payment.month}</span>
                  {payment.due_date && <span>Due: {new Date(payment.due_date).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="relative">
                {updating === payment.id ? (
                  <div className="animate-spin w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full" />
                ) : (
                  <div className="relative">
                    <select
                      value={payment.status}
                      onChange={(e) => updateStatus(payment.id, e.target.value as Payment["status"])}
                      className={`appearance-none cursor-pointer text-xs pl-2 pr-6 py-1 rounded-full border-0 focus:outline-none focus:ring-1 focus:ring-red-500/50 ${
                        payment.status === "paid" ? "bg-green-500/10 text-green-400" :
                        payment.status === "overdue" ? "bg-red-500/10 text-red-400" :
                        payment.status === "waived" ? "bg-blue-500/10 text-blue-400" :
                        "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="waived">Waived</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-neutral-500" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-neutral-500 mb-3">No payments found for this period</p>
          <button
            onClick={handleGeneratePayments}
            disabled={generating}
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            {generating ? "Generating..." : "Generate payments for all active members"}
          </button>
        </div>
      )}

      {/* Fee Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white text-lg font-semibold">Payment Settings</h3>
                <button onClick={() => setShowSettings(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Default Monthly Fee (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    value={defaultFee}
                    onChange={(e) => setDefaultFee(e.target.value)}
                    placeholder="e.g. 3000"
                    className={INPUT_CLASS}
                  />
                  <p className="text-neutral-600 text-xs mt-1">This amount is used when generating monthly payments for all members.</p>
                </div>
                <button
                  onClick={handleSaveFee}
                  disabled={savingFee || !defaultFee}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {savingFee ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Payment Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white text-lg font-semibold">Add Payment</h3>
                <button onClick={() => setShowCreate(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Member</label>
                  <select
                    required
                    value={newPayment.user_id}
                    onChange={(e) => setNewPayment({ ...newPayment, user_id: e.target.value })}
                    className={INPUT_CLASS}
                  >
                    <option value="">Select member</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Amount (Rs)</label>
                  <input type="number" required min="0" value={newPayment.amount} onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Month</label>
                  <input type="month" required value={newPayment.month} onChange={(e) => setNewPayment({ ...newPayment, month: e.target.value })} className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Due Date</label>
                  <input type="date" value={newPayment.due_date} onChange={(e) => setNewPayment({ ...newPayment, due_date: e.target.value })} className={INPUT_CLASS} />
                </div>
                <button type="submit" disabled={creating} className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                  {creating ? "Creating..." : "Create Payment"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
