"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Notification } from "@/lib/types"
import { Bell, Send, Search, Users, User, Loader2, CheckCheck, Mail, AlertTriangle } from "lucide-react"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [members, setMembers] = useState<{ id: string; full_name: string | null; email: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Send form
  const [sendMode, setSendMode] = useState<"single" | "bulk">("single")
  const [selectedMember, setSelectedMember] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [notifType, setNotifType] = useState("general")
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const supabase = createClient()
    const [notifRes, membersRes] = await Promise.all([
      supabase.from("notifications").select("*, users(full_name, email)").order("created_at", { ascending: false }).limit(50),
      supabase.from("users").select("id, full_name, email").eq("role", "member").order("full_name"),
    ])
    const mapped = (notifRes.data || []).map((n) => ({
      ...n,
      users: Array.isArray(n.users) ? n.users[0] || null : n.users,
    }))
    setNotifications(mapped)
    setMembers(membersRes.data || [])
    setLoading(false)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setSendResult(null)

    try {
      if (sendMode === "single") {
        const res = await fetch("/api/send-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: selectedMember, title, message, type: notifType }),
        })
        const data = await res.json()
        if (data.success) {
          setSendResult({ success: true, message: "Notification sent successfully!" })
          resetForm()
          fetchData()
        } else {
          setSendResult({ success: false, message: data.error || "Failed to send" })
        }
      } else {
        const ids = selectedMembers.length > 0 ? selectedMembers : members.map((m) => m.id)
        const res = await fetch("/api/bulk-reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberIds: ids, title, message }),
        })
        const data = await res.json()
        if (data.success) {
          setSendResult({ success: true, message: `Sent to ${data.sent} members!` })
          resetForm()
          fetchData()
        } else {
          setSendResult({ success: false, message: data.error || "Failed to send" })
        }
      }
    } catch {
      setSendResult({ success: false, message: "Network error" })
    } finally {
      setSending(false)
    }
  }

  function resetForm() {
    setTitle("")
    setMessage("")
    setSelectedMember("")
    setSelectedMembers([])
  }

  function toggleMemberSelection(id: string) {
    setSelectedMembers((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id])
  }

  const filteredNotifs = search
    ? notifications.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.message.toLowerCase().includes(search.toLowerCase()) ||
          n.users?.full_name?.toLowerCase().includes(search.toLowerCase())
      )
    : notifications

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Send Notification Form */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
        <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-red-500" /> Send Notification
        </h3>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSendMode("single")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              sendMode === "single" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-neutral-800 text-neutral-400"
            }`}
          >
            <User className="w-3.5 h-3.5" /> Single Member
          </button>
          <button
            onClick={() => setSendMode("bulk")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              sendMode === "bulk" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-neutral-800 text-neutral-400"
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Bulk Send
          </button>
        </div>

        <form onSubmit={handleSend} className="space-y-3">
          {sendMode === "single" ? (
            <select
              required
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50"
            >
              <option value="">Select member</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
              ))}
            </select>
          ) : (
            <div>
              <p className="text-neutral-400 text-xs mb-2">
                {selectedMembers.length === 0
                  ? "Sending to ALL members"
                  : `${selectedMembers.length} member(s) selected`}
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMemberSelection(m.id)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      selectedMembers.includes(m.id)
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                    }`}
                  >
                    {m.full_name || m.email}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              required
              placeholder="Notification title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50"
            />
            {sendMode === "single" && (
              <select
                value={notifType}
                onChange={(e) => setNotifType(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50"
              >
                <option value="general">General</option>
                <option value="reminder">Reminder</option>
                <option value="payment">Payment</option>
                <option value="alert">Alert</option>
              </select>
            )}
          </div>

          <textarea
            required
            placeholder="Notification message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50 resize-none"
          />

          {sendResult && (
            <div className={`p-3 rounded-lg text-sm ${sendResult.success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              {sendResult.message}
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Sending..." : "Send Notification"}
          </button>
        </form>
      </div>

      {/* Recent Notifications */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white text-sm font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4 text-red-500" /> Recent Notifications
          </h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-red-500/50"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredNotifs.map((notif) => (
            <div key={notif.id} className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    notif.type === "alert" ? "bg-red-500/10" :
                    notif.type === "payment" ? "bg-green-500/10" :
                    notif.type === "reminder" ? "bg-yellow-500/10" :
                    "bg-blue-500/10"
                  }`}>
                    {notif.type === "alert" ? <AlertTriangle className="w-4 h-4 text-red-400" /> :
                     notif.type === "payment" ? <Mail className="w-4 h-4 text-green-400" /> :
                     <Bell className="w-4 h-4 text-blue-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium">{notif.title}</p>
                    <p className="text-neutral-400 text-xs mt-0.5 line-clamp-2">{notif.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-neutral-500 text-xs">To: {notif.users?.full_name || "Unknown"}</span>
                      <span className="text-neutral-600 text-xs">&middot;</span>
                      <span className="text-neutral-600 text-xs">{new Date(notif.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    notif.type === "alert" ? "bg-red-500/10 text-red-400" :
                    notif.type === "payment" ? "bg-green-500/10 text-green-400" :
                    notif.type === "reminder" ? "bg-yellow-500/10 text-yellow-400" :
                    "bg-blue-500/10 text-blue-400"
                  }`}>{notif.type}</span>
                  {notif.read && <CheckCheck className="w-4 h-4 text-green-400" />}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredNotifs.length === 0 && (
          <div className="text-center py-12 text-neutral-500">No notifications yet</div>
        )}
      </div>
    </div>
  )
}
