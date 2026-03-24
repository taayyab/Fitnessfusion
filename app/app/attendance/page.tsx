"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Attendance } from "@/lib/types"

interface MemberInfo {
  id: string
  full_name: string | null
  email: string
  profile_picture: string | null
  is_active: boolean
}
import { CalendarCheck, Search, ChevronLeft, ChevronRight, Clock, UserCheck, UserX, AlertTriangle } from "lucide-react"

export default function AttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [records, setRecords] = useState<Attendance[]>([])
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [date])

  async function fetchData() {
    setLoading(true)
    const supabase = createClient()
    const [attendanceRes, membersRes] = await Promise.all([
      supabase.from("attendance").select("*, users(full_name, email, profile_picture)").eq("date", date),
      supabase.from("users").select("id, full_name, email, profile_picture, is_active").eq("role", "member").eq("is_active", true).order("full_name"),
    ])
    setRecords(attendanceRes.data || [])
    setMembers(membersRes.data || [])
    setLoading(false)
  }

  async function markAttendance(userId: string, status: "present" | "late" | "absent") {
    setMarking(userId)
    const supabase = createClient()
    const existing = records.find((r) => r.user_id === userId)

    if (existing) {
      await supabase.from("attendance").update({ status, check_in_time: status !== "absent" ? new Date().toISOString() : null }).eq("id", existing.id)
    } else {
      await supabase.from("attendance").insert({
        user_id: userId,
        date,
        status,
        check_in_time: status !== "absent" ? new Date().toISOString() : null,
      })
    }
    await fetchData()
    setMarking(null)
  }

  function changeDate(delta: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    setDate(d.toISOString().split("T")[0])
  }

  const getStatus = (userId: string) => records.find((r) => r.user_id === userId)?.status
  const presentCount = records.filter((r) => r.status === "present").length
  const lateCount = records.filter((r) => r.status === "late").length
  const absentCount = members.length - presentCount - lateCount

  const filteredMembers = search
    ? members.filter(
        (m) => m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())
      )
    : members

  if (loading && members.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Date Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => changeDate(-1)} className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors">
            <ChevronLeft className="w-4 h-4 text-neutral-400" />
          </button>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-red-500" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/50"
            />
          </div>
          <button onClick={() => changeDate(1)} className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors">
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>
          <button
            onClick={() => setDate(new Date().toISOString().split("T")[0])}
            className="text-xs text-red-400 hover:text-red-300 px-3 py-2 bg-red-500/5 border border-red-500/10 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
          <UserCheck className="w-5 h-5 text-green-400 mx-auto mb-1" />
          <p className="text-green-400 text-2xl font-bold">{presentCount}</p>
          <p className="text-neutral-400 text-xs">Present</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
          <Clock className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-yellow-400 text-2xl font-bold">{lateCount}</p>
          <p className="text-neutral-400 text-xs">Late</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <UserX className="w-5 h-5 text-red-400 mx-auto mb-1" />
          <p className="text-red-400 text-2xl font-bold">{absentCount}</p>
          <p className="text-neutral-400 text-xs">Absent / Unmarked</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-red-500/50"
        />
      </div>

      {/* Members List */}
      <div className="space-y-2">
        {filteredMembers.map((member) => {
          const status = getStatus(member.id)
          const isMarking = marking === member.id
          return (
            <div
              key={member.id}
              className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden">
                  {member.profile_picture ? (
                    <img src={member.profile_picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (member.full_name || member.email)[0]?.toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{member.full_name || "Unnamed"}</p>
                  <p className="text-neutral-500 text-xs">{member.email}</p>
                </div>
                {status && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    status === "present" ? "bg-green-500/10 text-green-400" :
                    status === "late" ? "bg-yellow-500/10 text-yellow-400" :
                    "bg-red-500/10 text-red-400"
                  }`}>{status}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isMarking ? (
                  <div className="animate-spin w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full" />
                ) : (
                  <>
                    <button
                      onClick={() => markAttendance(member.id, "present")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        status === "present" ? "bg-green-500 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-green-500/20 hover:text-green-400"
                      }`}
                    >
                      Present
                    </button>
                    <button
                      onClick={() => markAttendance(member.id, "late")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        status === "late" ? "bg-yellow-500 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-yellow-500/20 hover:text-yellow-400"
                      }`}
                    >
                      Late
                    </button>
                    <button
                      onClick={() => markAttendance(member.id, "absent")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        status === "absent" ? "bg-red-500 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-red-500/20 hover:text-red-400"
                      }`}
                    >
                      Absent
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
          <p className="text-neutral-500">No active members found</p>
        </div>
      )}
    </div>
  )
}
