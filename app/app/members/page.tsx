"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User, Payment } from "@/lib/types"
import { Search, X, UserPlus, Filter, Edit2, Save, Camera, MessageCircle } from "lucide-react"

const INPUT_CLASS = "w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50"
const LABEL_CLASS = "block text-sm text-neutral-400 mb-1"
const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const
const getTodayDateString = () => new Date().toISOString().split("T")[0]
const getCurrentMonth = () => new Date().toISOString().slice(0, 7)
const addDaysToDateString = (dateString: string, days: number) => {
  const date = new Date(`${dateString}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().split("T")[0]
}

export default function MembersPage() {
  const [members, setMembers] = useState<User[]>([])
  const [filtered, setFiltered] = useState<User[]>([])
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<User | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, string | number | boolean | null>>({})
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newMember, setNewMember] = useState({ full_name: "", whatsapp: "", cnic: "", gender: "", blood_group: "", profession: "", fee_date: getTodayDateString() })
  const [newMemberImage, setNewMemberImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [editMemberImage, setEditMemberImage] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
  const [removeEditImage, setRemoveEditImage] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newMemberPaid, setNewMemberPaid] = useState(true)
  const [payments, setPayments] = useState<Record<string, Payment>>({})
  const [togglingPayment, setTogglingPayment] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [viewingImage, setViewingImage] = useState<User | null>(null)

  function isMemberPaid(member: User): boolean {
    if (!member.is_active) return false
    if (!member.membership_expiry) return false
    return member.membership_expiry >= getTodayDateString()
  }

  function revokeBlobPreview(url: string | null) {
    if (url?.startsWith("blob:")) {
      URL.revokeObjectURL(url)
    }
  }

  function resetEditImageState(nextPreview: string | null = null) {
    revokeBlobPreview(editImagePreview)
    setEditMemberImage(null)
    setEditImagePreview(nextPreview)
    setRemoveEditImage(false)
  }

  function closeMemberModal() {
    setSelected(null)
    setEditing(false)
    resetEditImageState()
  }

  function closeAddModal() {
    setShowAdd(false)
    revokeBlobPreview(imagePreview)
    setImagePreview(null)
    setNewMemberImage(null)
  }


  useEffect(() => { fetchMembers() }, [])

  useEffect(() => {
    let result = members
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (m) =>
          m.full_name?.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.whatsapp?.includes(q) ||
          m.cnic?.includes(q)
      )
    }
    if (roleFilter !== "all") {
      result = result.filter((m) => m.role === roleFilter)
    }
    setFiltered(result)
  }, [search, roleFilter, members])

  async function fetchMembers() {
    const supabase = createClient()
    const today = getTodayDateString()
    const month = getCurrentMonth()
    setFetchError(null)

    const [membersRes, paymentsRes] = await Promise.all([
      supabase.from("users").select("*").order("created_at", { ascending: false }),
      supabase.from("payments").select("*").eq("month", month),
    ])

    if (membersRes.error) {
      setFetchError("Failed to load members. Please refresh the page.")
      setLoading(false)
      return
    }

    let nextMembers = (membersRes.data || []) as User[]
    const paymentsList = (paymentsRes.data || []) as Payment[]

    // Index payments by user_id for quick lookup
    const paymentsMap: Record<string, Payment> = {}
    for (const p of paymentsList) {
      paymentsMap[p.user_id] = p
    }
    setPayments(paymentsMap)

    // Auto-deactivate members whose 30-day membership has expired
    const expiredMemberIds = nextMembers
      .filter((m) => m.role === "member" && m.is_active && m.membership_expiry && m.membership_expiry < today)
      .map((m) => m.id)

    if (expiredMemberIds.length > 0) {
      await supabase
        .from("users")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in("id", expiredMemberIds)

      const expiredSet = new Set(expiredMemberIds)
      nextMembers = nextMembers.map((m) =>
        expiredSet.has(m.id) ? { ...m, is_active: false } : m
      )
    }

    setMembers(nextMembers)
    setFiltered(nextMembers)
    setLoading(false)
  }

  async function setPaymentStatus(member: User, status: "paid" | "unpaid") {
    setActionError(null)
    const supabase = createClient()
    const today = getTodayDateString()
    const month = getCurrentMonth()
    const { data: { user } } = await supabase.auth.getUser()

    // Update users table
    const userUpdates =
      status === "paid"
        ? {
            is_active: true,
            joining_date: today,
            membership_expiry: addDaysToDateString(today, 30),
            updated_at: new Date().toISOString(),
          }
        : {
            is_active: false,
            updated_at: new Date().toISOString(),
          }

    const { error: updateError } = await supabase.from("users").update(userUpdates).eq("id", member.id)
    if (updateError) {
      setActionError("Failed to update payment status. Please try again.")
      return
    }

    // Update or create payment record in payments table
    const existingPayment = payments[member.id]
    if (existingPayment) {
      const paymentUpdates: Record<string, unknown> = {
        status: status === "paid" ? "paid" : "pending",
        updated_by: user?.id,
      }
      if (status === "paid") paymentUpdates.paid_date = today
      else paymentUpdates.paid_date = null

      await supabase.from("payments").update(paymentUpdates).eq("id", existingPayment.id)
    } else if (status === "paid") {
      // No payment record exists yet — create one as paid
      await supabase.from("payments").insert({
        user_id: member.id,
        amount: 0,
        month,
        status: "paid",
        paid_date: today,
        due_date: `${month}-07`,
        updated_by: user?.id,
      })
    }

    // Refresh data
    const updated = { ...member, ...userUpdates }
    setMembers((prev) => prev.map((m) => (m.id === member.id ? updated : m)))
    setSelected((prev) => (prev?.id === member.id ? ({ ...prev, ...userUpdates } as User) : prev))
    // Re-fetch payments to stay in sync
    const { data: freshPayments } = await supabase.from("payments").select("*").eq("month", month)
    const paymentsMap: Record<string, Payment> = {}
    for (const p of (freshPayments || []) as Payment[]) {
      paymentsMap[p.user_id] = p
    }
    setPayments(paymentsMap)
  }

  function openEdit(member: User) {
    resetEditImageState(member.profile_picture || null)
    setEditForm({
      full_name: member.full_name || "",
      gender: member.gender || "",
      age: member.age ?? "",
      height: member.height ?? "",
      weight: member.weight ?? "",
      goal: member.goal || "",
      whatsapp: member.whatsapp || "",
      cnic: member.cnic || "",
      blood_group: member.blood_group || "",
      profession: member.profession || "",
      daily_calories: member.daily_calories ?? "",
      fee_date: member.joining_date || getTodayDateString(),
      role: member.role,
      is_active: isMemberPaid(member),
    })
    setEditing(true)
  }

  function calcBmi(h: number, w: number) {
    if (!h || !w) return { bmi: null, bmi_category: null }
    const bmi = parseFloat((w / ((h / 100) ** 2)).toFixed(1))
    const bmi_category = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese"
    return { bmi, bmi_category }
  }

  async function handleSaveEdit() {
    if (!selected) return
    setSaving(true)
    setActionError(null)
    const supabase = createClient()
    try {
      const height = editForm.height ? parseFloat(String(editForm.height)) : null
      const weight = editForm.weight ? parseFloat(String(editForm.weight)) : null
      const feeDate = editForm.fee_date ? String(editForm.fee_date) : null
      const membershipExpiry = feeDate ? addDaysToDateString(feeDate, 30) : null
      const paidFromForm = Boolean(editForm.is_active)
      const isActive = membershipExpiry ? paidFromForm && membershipExpiry >= getTodayDateString() : paidFromForm
      const { bmi, bmi_category } = calcBmi(height || 0, weight || 0)
      let profilePicture = removeEditImage ? null : selected.profile_picture

      if (editMemberImage) {
        const ext = editMemberImage.name.split(".").pop() || "jpg"
        const filePath = `profiles/${selected.id}_${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, editMemberImage, {
            contentType: editMemberImage.type,
            upsert: true,
          })

        if (uploadError) throw new Error(uploadError.message)

        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath)
        profilePicture = urlData.publicUrl
      }

      const updates = {
        full_name: editForm.full_name || null,
        gender: editForm.gender || null,
        age: editForm.age ? parseInt(String(editForm.age)) : null,
        height,
        weight,
        bmi,
        bmi_category,
        goal: editForm.goal || null,
        whatsapp: editForm.whatsapp || null,
        cnic: editForm.cnic || null,
        blood_group: editForm.blood_group || null,
        profession: editForm.profession || null,
        daily_calories: editForm.daily_calories ? parseInt(String(editForm.daily_calories)) : null,
        joining_date: feeDate,
        membership_expiry: membershipExpiry,
        role: editForm.role as User["role"],
        is_active: isActive,
        profile_picture: profilePicture,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase.from("users").update(updates).eq("id", selected.id)
      if (updateError) throw new Error(updateError.message)

      // Sync payment status in payments table
      const wasPaid = isMemberPaid(selected)
      if (paidFromForm !== wasPaid) {
        await setPaymentStatus(selected, paidFromForm ? "paid" : "unpaid")
      }

      setEditing(false)
      resetEditImageState()
      await fetchMembers()
      // Refresh selected
      const { data } = await supabase.from("users").select("*").eq("id", selected.id).single()
      if (data) setSelected(data)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update member")
    } finally {
      setSaving(false)
    }
  }

  function handleNewMemberImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      revokeBlobPreview(imagePreview)
      setNewMemberImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  function handleEditImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    revokeBlobPreview(editImagePreview)
    setEditMemberImage(file)
    setEditImagePreview(URL.createObjectURL(file))
    setRemoveEditImage(false)
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setActionError(null)
    try {
      const formData = new FormData()
      Object.entries(newMember).forEach(([key, value]) => {
        if (value) formData.append(key, value)
      })
      formData.append("is_paid", newMemberPaid ? "true" : "false")
      if (newMemberImage) {
        formData.append("image", newMemberImage)
      }

      const res = await fetch("/api/create-member", {
        method: "POST",
        body: formData,
      })
      const result = await res.json()
      if (!res.ok) {
        setActionError(result.error || "Failed to create member")
        return
      }

      closeAddModal()
      setNewMember({ full_name: "", whatsapp: "", cnic: "", gender: "", blood_group: "", profession: "", fee_date: getTodayDateString() })
      setNewMemberPaid(true)
      setTimeout(fetchMembers, 500)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-red-400 text-sm">{fetchError}</p>
        <button onClick={() => { setLoading(true); fetchMembers() }} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Action Error Toast */}
      {actionError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center justify-between">
          <p className="text-red-400 text-sm">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-red-400/50 hover:text-red-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-white text-lg font-semibold">Members ({filtered.length})</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by name, email, phone, CNIC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-red-500/50"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-8 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50 appearance-none cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="member">Members</option>
            <option value="trainer">Trainers</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
        {/* List Header */}
        <div className="hidden md:grid grid-cols-[3fr_2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b border-neutral-800 text-xs text-neutral-500 uppercase tracking-wider">
          <span>Member</span>
          <span>Phone</span>
          <span>CNIC</span>
          <span>Blood Type</span>
          <span>Role</span>
          <span className="text-right">Fee Status</span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">No members found</div>
        ) : (
          <div className="divide-y divide-neutral-800/50">
            {filtered.map((member) => (
              <div
                key={member.id}
                onClick={() => { setSelected(member); setEditing(false) }}
                className="grid grid-cols-[1fr] md:grid-cols-[3fr_2fr_1fr_1fr_1fr_1fr] gap-4 items-center px-4 py-3 cursor-pointer hover:bg-neutral-800/30 transition-colors"
              >
                {/* Avatar + Name + Email */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    onClick={(e) => { if (member.profile_picture) { e.stopPropagation(); setViewingImage(member) } }}
                    className={`w-9 h-9 bg-neutral-800 rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden flex-shrink-0 ${member.profile_picture ? "cursor-zoom-in ring-1 ring-neutral-700 hover:ring-red-500/40 transition-all" : ""}`}
                  >
                    {member.profile_picture ? (
                      <img src={member.profile_picture} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} />
                    ) : (
                      (member.full_name || member.email || "?")[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{member.full_name || "Unnamed"}</p>
                  </div>
                  {/* Mobile-only status badge */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (togglingPayment) return
                      setTogglingPayment(member.id)
                      setPaymentStatus(member, isMemberPaid(member) ? "unpaid" : "paid").finally(() => setTogglingPayment(null))
                    }}
                    disabled={togglingPayment === member.id}
                    className={`md:hidden text-xs px-2 py-0.5 rounded-full flex-shrink-0 transition-colors ${
                      togglingPayment === member.id ? "opacity-50" :
                      isMemberPaid(member) ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    }`}
                  >
                    {togglingPayment === member.id ? "..." : isMemberPaid(member) ? "Paid" : "Unpaid"}
                  </button>
                </div>

                {/* Phone */}
                <p className="hidden md:block text-neutral-400 text-sm truncate">{member.whatsapp || "—"}</p>

                {/* CNIC */}
                <p className="hidden md:block text-neutral-400 text-sm truncate">{member.cnic || "—"}</p>

                {/* Blood Type */}
                <span className="hidden md:block text-neutral-400 text-sm">{member.blood_group || "—"}</span>

                {/* Role */}
                <div className="hidden md:block">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    member.role === "admin" ? "bg-purple-500/10 text-purple-400" :
                    member.role === "trainer" ? "bg-blue-500/10 text-blue-400" :
                    "bg-neutral-800 text-neutral-400"
                  }`}>{member.role}</span>
                </div>

                {/* Status */}
                <div className="hidden md:block text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (togglingPayment) return
                      setTogglingPayment(member.id)
                      setPaymentStatus(member, isMemberPaid(member) ? "unpaid" : "paid").finally(() => setTogglingPayment(null))
                    }}
                    disabled={togglingPayment === member.id}
                    className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                      togglingPayment === member.id ? "opacity-50" :
                      isMemberPaid(member) ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    }`}
                  >
                    {togglingPayment === member.id ? "..." : isMemberPaid(member) ? "Paid" : "Unpaid"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Member Detail / Edit Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={closeMemberModal}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-white text-base sm:text-lg font-semibold">{editing ? "Edit Member" : "Member Details"}</h3>
                <div className="flex items-center gap-2">
                  {!editing && (
                    <button onClick={() => openEdit(selected)} className="text-neutral-400 hover:text-white p-1">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={closeMemberModal} className="text-neutral-500 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {editing ? (
                /* Edit Form */
                <div className="space-y-3">
                  <div className="flex justify-center mb-2">
                    <div className="flex flex-col items-center gap-1.5">
                      <label className="cursor-pointer group">
                        <input type="file" accept="image/*" onChange={handleEditImageSelect} className="hidden" />
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-neutral-800 border-2 border-dashed border-neutral-600 group-hover:border-red-500/50 flex items-center justify-center overflow-hidden transition-colors">
                          {removeEditImage ? (
                            <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-500 group-hover:text-red-400 transition-colors" />
                          ) : (editImagePreview || selected.profile_picture) ? (
                            <img src={editImagePreview || selected.profile_picture || ""} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-500 group-hover:text-red-400 transition-colors" />
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 text-center mt-1">{editMemberImage ? "New Photo Selected" : "Change Photo"}</p>
                      </label>
                      {(selected.profile_picture || editMemberImage || removeEditImage) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (removeEditImage) {
                              setRemoveEditImage(false)
                              return
                            }
                            if (editMemberImage) {
                              resetEditImageState(selected.profile_picture || null)
                              return
                            }
                            if (selected.profile_picture) {
                              resetEditImageState()
                              setRemoveEditImage(true)
                            }
                          }}
                          className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                        >
                          {removeEditImage ? "Keep Current Photo" : editMemberImage ? "Discard New Photo" : "Remove Current Photo"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLASS}>Full Name</label>
                      <input value={String(editForm.full_name || "")} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Gender</label>
                      <select value={String(editForm.gender || "")} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })} className={INPUT_CLASS}>
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Age</label>
                      <input type="number" value={String(editForm.age ?? "")} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Height (cm)</label>
                      <input type="number" value={String(editForm.height ?? "")} onChange={(e) => setEditForm({ ...editForm, height: e.target.value })} className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Weight (kg)</label>
                      <input type="number" value={String(editForm.weight ?? "")} onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })} className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Goal</label>
                      <input value={String(editForm.goal || "")} onChange={(e) => setEditForm({ ...editForm, goal: e.target.value })} placeholder="e.g. Fat Loss" className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Daily Calories</label>
                      <input type="number" value={String(editForm.daily_calories ?? "")} onChange={(e) => setEditForm({ ...editForm, daily_calories: e.target.value })} className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>WhatsApp</label>
                      <input value={String(editForm.whatsapp || "")} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>CNIC</label>
                      <input value={String(editForm.cnic || "")} onChange={(e) => setEditForm({ ...editForm, cnic: e.target.value })} className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Blood Group</label>
                      <input value={String(editForm.blood_group || "")} onChange={(e) => setEditForm({ ...editForm, blood_group: e.target.value })} placeholder="e.g. O+" className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Profession</label>
                      <input value={String(editForm.profession || "")} onChange={(e) => setEditForm({ ...editForm, profession: e.target.value })} className={INPUT_CLASS} />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Role</label>
                      <select value={String(editForm.role)} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className={INPUT_CLASS}>
                        <option value="member">Member</option>
                        <option value="trainer">Trainer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Fee Status</label>
                      <select value={editForm.is_active ? "paid" : "unpaid"} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === "paid" })} className={INPUT_CLASS}>
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                      </select>
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Fee Date</label>
                      <input type="date" value={String(editForm.fee_date || "")} onChange={(e) => setEditForm({ ...editForm, fee_date: e.target.value })} className={INPUT_CLASS} />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false)
                        resetEditImageState()
                      }}
                      className="px-4 py-2.5 bg-neutral-800 text-neutral-400 hover:text-white rounded-lg text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View Details */
                <>
                  <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div
                      onClick={() => { if (selected.profile_picture) setViewingImage(selected) }}
                      className={`w-12 h-12 sm:w-16 sm:h-16 bg-neutral-800 rounded-full flex items-center justify-center text-white text-lg sm:text-xl font-medium overflow-hidden flex-shrink-0 ${selected.profile_picture ? "cursor-zoom-in ring-1 ring-neutral-700 hover:ring-red-500/40 transition-all" : ""}`}
                    >
                      {selected.profile_picture ? (
                        <img src={selected.profile_picture} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} />
                      ) : (
                        (selected.full_name || selected.email || "?")[0]?.toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-white text-base sm:text-lg font-semibold truncate">{selected.full_name || "Unnamed"}</p>
                      <p className="text-neutral-500 text-sm">{selected.email}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                        selected.role === "admin" ? "bg-purple-500/10 text-purple-400" :
                        selected.role === "trainer" ? "bg-blue-500/10 text-blue-400" :
                        "bg-neutral-800 text-neutral-400"
                      }`}>{selected.role}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
                    {[
                      { label: "Gender", value: selected.gender },
                      { label: "Age", value: selected.age },
                      { label: "Height", value: selected.height ? `${selected.height} cm` : null },
                      { label: "Weight", value: selected.weight ? `${selected.weight} kg` : null },
                      { label: "BMI", value: selected.bmi?.toFixed(1) },
                      { label: "BMI Category", value: selected.bmi_category },
                      { label: "Daily Calories", value: selected.daily_calories },
                      { label: "Goal", value: selected.goal },
                      { label: "WhatsApp", value: selected.whatsapp },
                      { label: "CNIC", value: selected.cnic },
                      { label: "Blood Group", value: selected.blood_group },
                      { label: "Profession", value: selected.profession },
                      { label: "Fee Date", value: selected.joining_date ? new Date(selected.joining_date).toLocaleDateString() : null },
                      { label: "Membership Expiry", value: selected.membership_expiry ? new Date(selected.membership_expiry).toLocaleDateString() : null },
                      { label: "Fee Status", value: isMemberPaid(selected) ? "Paid" : "Unpaid" },
                    ].filter((item) => item.value != null && item.value !== "" && item.value !== 0).map((item) => (
                      <div key={item.label} className="bg-neutral-800/50 rounded-lg p-2 sm:p-3">
                        <p className="text-neutral-500 text-xs">{item.label}</p>
                        <p className="text-white capitalize">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 sm:mt-6 flex flex-col gap-2 sm:gap-3">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button
                        onClick={() => openEdit(selected)}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Edit2 className="w-4 h-4" /> Edit Profile
                      </button>
                      <button
                        onClick={() => setPaymentStatus(selected, isMemberPaid(selected) ? "unpaid" : "paid")}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isMemberPaid(selected)
                            ? "bg-neutral-800 text-neutral-400 hover:text-red-400 border border-neutral-700"
                            : "bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
                        }`}
                      >
                        {isMemberPaid(selected) ? "Mark as Unpaid" : "Mark as Paid (30 Days)"}
                      </button>
                    </div>
                    {selected.whatsapp && (
                      <button
                        onClick={() => {
                          const name = selected.full_name || "Member"
                          const expiry = selected.membership_expiry ? new Date(selected.membership_expiry).toLocaleDateString() : "N/A"
                          const message = `Assalam-o-Alaikum ${name},\n\nThis is a reminder from *Fitness Fusion Gym* 🏋️\nYour membership is expiring on *${expiry}*.\nPlease renew your membership to continue your fitness journey with us.\n\nیہ *فٹنس فیوژن جم* کی طرف سے یاد دہانی ہے 🏋️\nآپ کی رکنیت *${expiry}* کو ختم ہو رہی ہے۔\nبراہ کرم اپنی رکنیت کی تجدید کریں تاکہ آپ ہمارے ساتھ اپنا فٹنس سفر جاری رکھ سکیں۔\n\nThank you / شکریہ\nFitness Fusion Gym`
                          const phone = (selected.whatsapp || "").replace(/[^0-9]/g, "")
                          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank")
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-green-600/10 text-green-400 hover:bg-green-600/20 border border-green-500/20 py-2.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" /> Message on WhatsApp
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={closeAddModal}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-white text-base sm:text-lg font-semibold">Add New Member</h3>
                <button onClick={closeAddModal} className="text-neutral-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddMember} className="space-y-3">
                {/* Profile Image */}
                <div className="flex justify-center mb-2">
                  <label className="cursor-pointer group">
                    <input type="file" accept="image/*" onChange={handleNewMemberImageSelect} className="hidden" />
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-neutral-800 border-2 border-dashed border-neutral-600 group-hover:border-red-500/50 flex items-center justify-center overflow-hidden transition-colors">
                      {imagePreview ? (
                        <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-500 group-hover:text-red-400 transition-colors" />
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 text-center mt-1">Add Photo</p>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className={LABEL_CLASS}>Full Name</label>
                    <input value={newMember.full_name} onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })} className={INPUT_CLASS} />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Gender</label>
                    <select value={newMember.gender} onChange={(e) => setNewMember({ ...newMember, gender: e.target.value })} className={INPUT_CLASS}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Fee Date</label>
                    <input type="date" value={newMember.fee_date} onChange={(e) => setNewMember({ ...newMember, fee_date: e.target.value })} className={INPUT_CLASS} required />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>WhatsApp</label>
                    <input value={newMember.whatsapp} onChange={(e) => setNewMember({ ...newMember, whatsapp: e.target.value })} placeholder="+92..." className={INPUT_CLASS} />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>CNIC</label>
                    <input value={newMember.cnic} onChange={(e) => setNewMember({ ...newMember, cnic: e.target.value })} placeholder="xxxxx-xxxxxxx-x" className={INPUT_CLASS} />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Blood Group</label>
                    <select value={newMember.blood_group} onChange={(e) => setNewMember({ ...newMember, blood_group: e.target.value })} className={INPUT_CLASS}>
                      <option value="">Select</option>
                      {BLOOD_GROUP_OPTIONS.map((group) => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Profession</label>
                    <input value={newMember.profession} onChange={(e) => setNewMember({ ...newMember, profession: e.target.value })} className={INPUT_CLASS} />
                  </div>
                </div>
                {/* Paid / Unpaid toggle */}
                <div className="flex items-center justify-between bg-neutral-800/50 rounded-lg px-4 py-3 mt-1">
                  <span className="text-sm text-neutral-300">Fee Status</span>
                  <button
                    type="button"
                    onClick={() => setNewMemberPaid(!newMemberPaid)}
                    className={`relative w-20 h-8 rounded-full transition-colors ${newMemberPaid ? "bg-green-500" : "bg-neutral-600"}`}
                  >
                    <span className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${newMemberPaid ? "left-[calc(100%-28px)]" : "left-1"}`} />
                    <span className={`absolute inset-0 flex items-center text-xs font-medium ${newMemberPaid ? "justify-start pl-2 text-white" : "justify-end pr-2 text-neutral-300"}`}>
                      {newMemberPaid ? "Paid" : "Unpaid"}
                    </span>
                  </button>
                </div>

                {actionError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{actionError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors mt-2"
                >
                  {creating ? "Creating..." : "Create Member"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Popup */}
      {viewingImage && viewingImage.profile_picture && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
          <div className="relative max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewingImage(null)}
              className="absolute -top-10 right-0 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={viewingImage.profile_picture}
              alt={viewingImage.full_name || "Member"}
              className="w-full rounded-2xl object-contain max-h-[70vh]"
              onError={(e) => { e.currentTarget.style.display = "none" }}
            />
            <p className="text-center text-white text-sm font-medium mt-3">{viewingImage.full_name || "Unnamed"}</p>
          </div>
        </div>
      )}
    </div>
  )
}
