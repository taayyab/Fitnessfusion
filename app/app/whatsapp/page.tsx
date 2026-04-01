"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  MessageCircle,
  Send,
  Search,
  Users,
  User,
  Loader2,
  CheckCircle,
  Phone,
  X,
  Copy,
  ExternalLink,
  FileText,
} from "lucide-react"

const INPUT_CLASS =
  "w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/50"

interface Member {
  id: string
  full_name: string | null
  email: string
  whatsapp: string | null
}

const TEMPLATES = [
  {
    label: "Payment Reminder",
    message:
      "Hi {name}, this is a friendly reminder that your monthly gym fee is due. Please make the payment at your earliest convenience. Thank you!\n\n" +
      "\u202Bالسلام علیکم {name}، امید ہے آپ خیریت سے ہوں گے۔ یہ یاد دہانی ہے کہ آپ کی ماہانہ جم فیس بقایا ہے۔ براہ کرم سہولت کے مطابق جلد ادائیگی کر دیں۔ شکریہ۔\u202C",
  },
  {
    label: "Gym Closure Notice",
    message:
      "Hi {name}, please be informed that the gym will remain closed on {date}. We apologize for the inconvenience. See you soon!\n\n" +
      "\u202Bالسلام علیکم {name}، اطلاع دی جاتی ہے کہ جم {date} کو بند رہے گا۔ اس سے ہونے والی زحمت کے لیے ہم معذرت خواہ ہیں۔ آپ سے دوبارہ جلد ملاقات ہوگی۔\u202C",
  },
  {
    label: "Welcome Message",
    message:
      "Welcome to Fitness Fusion, {name}! We're excited to have you on board. Feel free to reach out if you have any questions. Let's crush those goals!\n\n" +
      "\u202Bفٹنس فیوژن میں خوش آمدید {name}! آپ کی شمولیت ہمارے لیے باعثِ خوشی ہے۔ اگر آپ کو کسی بھی رہنمائی کی ضرورت ہو تو بلاجھجھک رابطہ کریں۔ آئیے اپنے فٹنس اہداف مل کر حاصل کرتے ہیں۔\u202C",
  },
  {
    label: "Membership Expiry",
    message:
      "Hi {name}, your gym membership is about to expire. Please renew it to continue your fitness journey with us. Contact us for details!\n\n" +
      "\u202Bالسلام علیکم {name}، آپ کی جم ممبرشپ جلد ختم ہونے والی ہے۔ براہ کرم اپنی ممبرشپ کی تجدید کروا لیں تاکہ آپ اپنا فٹنس سفر بلا تعطل جاری رکھ سکیں۔ مزید معلومات کے لیے ہم سے رابطہ کریں۔\u202C",
  },
  {
    label: "Custom",
    message:
      "Hi {name}, [write your custom message here].\n\n" +
      "\u202Bالسلام علیکم {name}، [اپنا حسبِ ضرورت پیغام یہاں لکھیں]۔\u202C",
  },
]

function formatWhatsAppNumber(num: string): string {
  // Strip all non-digit characters
  let cleaned = num.replace(/[^0-9]/g, "")
  // If starts with 0, assume Pakistan and replace with 92
  if (cleaned.startsWith("0")) {
    cleaned = "92" + cleaned.slice(1)
  }
  // If no country code (10 digits or less), prepend 92
  if (cleaned.length <= 10) {
    cleaned = "92" + cleaned
  }
  return cleaned
}

function getWhatsAppUrl(phone: string, message: string): string {
  const number = formatWhatsAppNumber(phone)
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export default function WhatsAppPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  // Send mode
  const [sendMode, setSendMode] = useState<"single" | "broadcast">("single")
  const [selectedMember, setSelectedMember] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [message, setMessage] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES.length - 1) // Custom by default

  // Broadcast progress
  const [broadcasting, setBroadcasting] = useState(false)
  const [broadcastSent, setBroadcastSent] = useState<Set<string>>(new Set())
  const [broadcastIndex, setBroadcastIndex] = useState(0)
  const [showBroadcastModal, setShowBroadcastModal] = useState(false)
  const [broadcastTargets, setBroadcastTargets] = useState<Member[]>([])

  // Single send result
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    fetchMembers()
  }, [])

  async function fetchMembers() {
    setFetchError(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, email, whatsapp")
      .eq("role", "member")
      .order("full_name")
    if (error) {
      setFetchError("Failed to load members. Please refresh the page.")
      setLoading(false)
      return
    }
    setMembers(data || [])
    setLoading(false)
  }

  function applyTemplate(index: number) {
    setSelectedTemplate(index)
    setMessage(TEMPLATES[index].message)
  }

  function getPersonalizedMessage(member: Member): string {
    return message.replace(/\{name\}/g, member.full_name || "Member")
  }

  function handleSendSingle() {
    const member = members.find((m) => m.id === selectedMember)
    if (!member) return
    if (!member.whatsapp) {
      setSendResult({ success: false, message: `${member.full_name || member.email} has no WhatsApp number` })
      return
    }
    const url = getWhatsAppUrl(member.whatsapp, getPersonalizedMessage(member))
    window.open(url, "_blank")
    setSendResult({ success: true, message: `Opened WhatsApp for ${member.full_name || member.email}` })
  }

  function startBroadcast() {
    const targets =
      selectedMembers.length > 0
        ? members.filter((m) => selectedMembers.includes(m.id))
        : members
    const withWhatsApp = targets.filter((m) => m.whatsapp)
    if (withWhatsApp.length === 0) {
      setSendResult({ success: false, message: "No selected members have WhatsApp numbers" })
      return
    }
    setBroadcastTargets(withWhatsApp)
    setBroadcastIndex(0)
    setBroadcastSent(new Set())
    setBroadcasting(true)
    setShowBroadcastModal(true)
  }

  function sendNextBroadcast(member: Member) {
    const url = getWhatsAppUrl(member.whatsapp!, getPersonalizedMessage(member))
    window.open(url, "_blank")
    setBroadcastSent((prev) => new Set(prev).add(member.id))
    setBroadcastIndex((prev) => prev + 1)
  }

  function sendAllBroadcast() {
    const remaining = broadcastTargets.filter((m) => !broadcastSent.has(m.id))
    remaining.forEach((member, i) => {
      setTimeout(() => {
        const url = getWhatsAppUrl(member.whatsapp!, getPersonalizedMessage(member))
        window.open(url, "_blank")
        setBroadcastSent((prev) => new Set(prev).add(member.id))
        setBroadcastIndex((prev) => prev + 1)
      }, i * 600)
    })
  }

  function closeBroadcast() {
    setShowBroadcastModal(false)
    setBroadcasting(false)
    if (broadcastSent.size > 0) {
      setSendResult({
        success: true,
        message: `Broadcast completed: ${broadcastSent.size} of ${broadcastTargets.length} messages opened`,
      })
    }
  }

  function toggleMemberSelection(id: string) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  function selectAll() {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(members.map((m) => m.id))
    }
  }

  function copyMessage() {
    navigator.clipboard.writeText(message)
    setSendResult({ success: true, message: "Message copied to clipboard" })
    setTimeout(() => setSendResult(null), 2000)
  }

  const filteredMembers = search
    ? members.filter(
        (m) =>
          m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase()) ||
          m.whatsapp?.includes(search)
      )
    : members

  const membersWithWhatsApp = members.filter((m) => m.whatsapp)
  const membersWithoutWhatsApp = members.filter((m) => !m.whatsapp)

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
    <div className="p-4 md:p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <Phone className="w-5 h-5 text-green-400 mb-1" />
          <p className="text-green-400 text-xl font-bold">{membersWithWhatsApp.length}</p>
          <p className="text-neutral-400 text-xs">With WhatsApp</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <User className="w-5 h-5 text-yellow-400 mb-1" />
          <p className="text-yellow-400 text-xl font-bold">{membersWithoutWhatsApp.length}</p>
          <p className="text-neutral-400 text-xs">No WhatsApp</p>
        </div>
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-4">
          <Users className="w-5 h-5 text-neutral-400 mb-1" />
          <p className="text-white text-xl font-bold">{members.length}</p>
          <p className="text-neutral-400 text-xs">Total Members</p>
        </div>
      </div>

      {/* Compose Message */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
        <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-green-500" /> Compose WhatsApp Message
        </h3>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSendMode("single")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              sendMode === "single"
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-neutral-800 text-neutral-400"
            }`}
          >
            <User className="w-3.5 h-3.5" /> Single Member
          </button>
          <button
            onClick={() => setSendMode("broadcast")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              sendMode === "broadcast"
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-neutral-800 text-neutral-400"
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Broadcast
          </button>
        </div>

        {/* Recipient Selection */}
        {sendMode === "single" ? (
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className={`${INPUT_CLASS} mb-3`}
          >
            <option value="">Select member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id} disabled={!m.whatsapp}>
                {m.full_name || m.email} {m.whatsapp ? `(${m.whatsapp})` : "(no WhatsApp)"}
              </option>
            ))}
          </select>
        ) : (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-neutral-400 text-xs">
                {selectedMembers.length === 0
                  ? `Sending to ALL ${membersWithWhatsApp.length} members with WhatsApp`
                  : `${selectedMembers.filter((id) => members.find((m) => m.id === id)?.whatsapp).length} member(s) selected`}
              </p>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-green-400 hover:text-green-300 transition-colors"
              >
                {selectedMembers.length === members.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMemberSelection(m.id)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    selectedMembers.includes(m.id)
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                  } ${!m.whatsapp ? "opacity-40 line-through" : ""}`}
                  title={m.whatsapp ? m.whatsapp : "No WhatsApp number"}
                >
                  {m.full_name || m.email}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Template Selector */}
        <div className="mb-3">
          <label className="block text-sm text-neutral-400 mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> Message Template
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyTemplate(i)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedTemplate === i
                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                    : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <div className="relative mb-3">
          <textarea
            placeholder="Type your message... Use {name} for member's name"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              setSelectedTemplate(TEMPLATES.length - 1)
            }}
            rows={4}
            className={`${INPUT_CLASS} resize-none pr-10`}
          />
          {message && (
            <button
              type="button"
              onClick={copyMessage}
              className="absolute top-3 right-3 text-neutral-500 hover:text-white transition-colors"
              title="Copy message"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-neutral-600 text-xs mb-3">
          Use <span className="text-neutral-400">{"{name}"}</span> to insert the member&apos;s name automatically.
          Messages will open in WhatsApp Web/App.
        </p>

        {/* Result Message */}
        {sendResult && (
          <div
            className={`p-3 rounded-lg text-sm mb-3 flex items-center justify-between ${
              sendResult.success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
            }`}
          >
            <span>{sendResult.message}</span>
            <button onClick={() => setSendResult(null)} className="opacity-50 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Send Buttons */}
        <div className="flex gap-2">
          {sendMode === "single" ? (
            <button
              onClick={handleSendSingle}
              disabled={!selectedMember || !message}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/30 disabled:text-white/50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Send className="w-4 h-4" /> Send via WhatsApp
            </button>
          ) : (
            <button
              onClick={startBroadcast}
              disabled={!message || broadcasting}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/30 disabled:text-white/50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {broadcasting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {broadcasting ? "Broadcasting..." : "Start Broadcast"}
            </button>
          )}
        </div>
      </div>

      {/* Member Directory */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white text-sm font-semibold flex items-center gap-2">
            <Phone className="w-4 h-4 text-green-500" /> Member Directory
          </h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-red-500/50"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    member.whatsapp ? "bg-green-500/10" : "bg-neutral-800"
                  }`}
                >
                  {member.whatsapp ? (
                    <MessageCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <User className="w-4 h-4 text-neutral-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {member.full_name || "Unknown"}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-neutral-500 truncate">{member.email}</span>
                    {member.whatsapp && (
                      <>
                        <span className="text-neutral-700">&middot;</span>
                        <span className="text-green-400">{member.whatsapp}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {member.whatsapp ? (
                  <>
                    <button
                      onClick={() => {
                        const msg = message
                          ? getPersonalizedMessage(member)
                          : `Hi ${member.full_name || "there"}!`
                        window.open(getWhatsAppUrl(member.whatsapp!, msg), "_blank")
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs hover:bg-green-500/20 transition-colors"
                      title="Open WhatsApp chat"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Chat
                    </button>
                  </>
                ) : (
                  <span className="text-neutral-600 text-xs">No WhatsApp</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredMembers.length === 0 && (
          <div className="text-center py-12 text-neutral-500">No members found</div>
        )}
      </div>

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-neutral-800">
              <div className="flex items-center justify-between">
                <h3 className="text-white text-lg font-semibold flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-green-500" /> Broadcasting
                </h3>
                <button
                  onClick={closeBroadcast}
                  className="text-neutral-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-neutral-400 text-sm mt-1">
                {broadcastSent.size} of {broadcastTargets.length} messages sent
              </p>
              {/* Progress bar */}
              <div className="w-full bg-neutral-800 rounded-full h-1.5 mt-3">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{
                    width: `${(broadcastSent.size / broadcastTargets.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              {broadcastTargets.map((member, i) => {
                const isSent = broadcastSent.has(member.id)
                const isCurrent = i === broadcastIndex && !isSent

                return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isSent
                        ? "bg-green-500/5 border-green-500/20"
                        : isCurrent
                        ? "bg-neutral-800 border-green-500/30"
                        : "bg-neutral-900 border-neutral-800"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isSent ? (
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      ) : (
                        <MessageCircle
                          className={`w-4 h-4 flex-shrink-0 ${
                            isCurrent ? "text-green-400" : "text-neutral-600"
                          }`}
                        />
                      )}
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isSent ? "text-green-400" : "text-white"}`}>
                          {member.full_name || member.email}
                        </p>
                        <p className="text-neutral-500 text-xs">{member.whatsapp}</p>
                      </div>
                    </div>
                    {isCurrent && (
                      <button
                        onClick={() => sendNextBroadcast(member)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" /> Send
                      </button>
                    )}
                    {isSent && (
                      <span className="text-green-400 text-xs flex-shrink-0">Sent</span>
                    )}
                  </div>
                )
              })}

              {broadcastIndex >= broadcastTargets.length && (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 font-medium">Broadcast Complete!</p>
                  <p className="text-neutral-500 text-sm mt-1">
                    All {broadcastTargets.length} messages have been opened
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-neutral-800 flex items-center justify-between">
              <button
                onClick={closeBroadcast}
                className="px-4 py-2 bg-neutral-800 text-neutral-400 hover:text-white rounded-lg text-sm transition-colors"
              >
                {broadcastIndex >= broadcastTargets.length ? "Done" : "Cancel"}
              </button>
              {broadcastIndex < broadcastTargets.length && (
                <button
                  onClick={sendAllBroadcast}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Users className="w-4 h-4" /> Send to All ({broadcastTargets.length - broadcastSent.size} remaining)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
