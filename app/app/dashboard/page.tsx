"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CreditCard, CalendarCheck, TrendingUp, UserPlus, AlertCircle } from "lucide-react"

interface DashboardStats {
  totalMembers: number
  activeMembers: number
  todayAttendance: number
  monthRevenue: number
  pendingPayments: number
  overduePayments: number
  newMembersThisMonth: number
  attendanceRate: number
}

interface RecentMember {
  id: string
  full_name: string | null
  email: string
  joining_date: string | null
  profile_picture: string | null
}

interface RecentPayment {
  id: string
  amount: number
  status: string
  month: string
  users: { full_name: string; email: string } | null
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    todayAttendance: 0,
    monthRevenue: 0,
    pendingPayments: 0,
    overduePayments: 0,
    newMembersThisMonth: 0,
    attendanceRate: 0,
  })
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([])
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    const supabase = createClient()
    const today = new Date().toISOString().split("T")[0]
    const currentMonth = new Date().toISOString().slice(0, 7)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    const [
      membersRes,
      activeMembersRes,
      todayAttendanceRes,
      paidPaymentsRes,
      pendingPaymentsRes,
      overduePaymentsRes,
      newMembersRes,
      recentMembersRes,
      recentPaymentsRes,
    ] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "member"),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "member").or("is_active.eq.true,is_active.is.null"),
      supabase.from("attendance").select("id", { count: "exact", head: true }).eq("date", today).in("status", ["present", "late"]),
      supabase.from("payments").select("amount").eq("month", currentMonth).eq("status", "paid"),
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "overdue"),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "member").gte("created_at", monthStart),
      supabase.from("users").select("id, full_name, email, joining_date, profile_picture").eq("role", "member").order("created_at", { ascending: false }).limit(5),
      supabase.from("payments").select("id, amount, status, month, users!user_id(full_name, email)").order("created_at", { ascending: false }).limit(5),
    ])

    const monthRevenue = paidPaymentsRes.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    const totalActive = activeMembersRes.count || 1
    const attendanceToday = todayAttendanceRes.count || 0
    const attendanceRate = Math.round((attendanceToday / totalActive) * 100)

    setStats({
      totalMembers: membersRes.count || 0,
      activeMembers: activeMembersRes.count || 0,
      todayAttendance: attendanceToday,
      monthRevenue,
      pendingPayments: pendingPaymentsRes.count || 0,
      overduePayments: overduePaymentsRes.count || 0,
      newMembersThisMonth: newMembersRes.count || 0,
      attendanceRate,
    })

    setRecentMembers(recentMembersRes.data || [])
    setRecentPayments(
      (recentPaymentsRes.data || []).map((p) => ({
        ...p,
        users: Array.isArray(p.users) ? p.users[0] || null : p.users,
      }))
    )
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const statCards = [
    { label: "Total Members", value: stats.totalMembers, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Active Members", value: stats.activeMembers, icon: UserPlus, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
    { label: "Today's Attendance", value: stats.todayAttendance, icon: CalendarCheck, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
    { label: "This Month Revenue", value: `Rs ${stats.monthRevenue.toLocaleString()}`, icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "Pending Payments", value: stats.pendingPayments, icon: TrendingUp, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
    { label: "Overdue Payments", value: stats.overduePayments, icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`${card.bg} border rounded-xl p-4`}
          >
            <card.icon className={`w-5 h-5 ${card.color} mb-2`} />
            <p className="text-white text-xl font-bold">{card.value}</p>
            <p className="text-neutral-400 text-xs mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
          <p className="text-neutral-400 text-xs mb-1">Attendance Rate Today</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-white">{stats.attendanceRate}%</p>
            <p className="text-neutral-500 text-xs mb-1">of active members</p>
          </div>
          <div className="mt-3 h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${stats.attendanceRate}%` }} />
          </div>
        </div>

        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
          <p className="text-neutral-400 text-xs mb-1">New Members This Month</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-white">{stats.newMembersThisMonth}</p>
            <p className="text-neutral-500 text-xs mb-1">joined</p>
          </div>
        </div>

        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
          <p className="text-neutral-400 text-xs mb-1">Payment Collection</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-white">Rs {stats.monthRevenue.toLocaleString()}</p>
          </div>
          <p className="text-neutral-500 text-xs mt-1">{stats.pendingPayments + stats.overduePayments} unpaid remaining</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Members */}
        <Card className="bg-neutral-900/50 border-neutral-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-neutral-300">Recent Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMembers.length === 0 ? (
                <p className="text-neutral-500 text-sm">No members yet</p>
              ) : (
                recentMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-2 bg-neutral-800/50 rounded-lg">
                    <div className="w-9 h-9 bg-neutral-700 rounded-full flex items-center justify-center text-white text-xs font-medium overflow-hidden">
                      {member.profile_picture ? (
                        <img src={member.profile_picture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (member.full_name || member.email)[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{member.full_name || "Unnamed"}</p>
                      <p className="text-neutral-500 text-xs truncate">{member.email}</p>
                    </div>
                    {member.joining_date && (
                      <span className="text-neutral-500 text-xs">{new Date(member.joining_date).toLocaleDateString()}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="bg-neutral-900/50 border-neutral-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-neutral-300">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPayments.length === 0 ? (
                <p className="text-neutral-500 text-sm">No payments yet</p>
              ) : (
                recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-2 bg-neutral-800/50 rounded-lg">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {payment.users?.full_name || "Unknown"}
                      </p>
                      <p className="text-neutral-500 text-xs">{payment.month}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-medium">Rs {payment.amount}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          payment.status === "paid"
                            ? "bg-green-500/10 text-green-400"
                            : payment.status === "overdue"
                              ? "bg-red-500/10 text-red-400"
                              : payment.status === "waived"
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-yellow-500/10 text-yellow-400"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
