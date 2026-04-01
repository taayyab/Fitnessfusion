"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import {
  ChevronRight,
  Users,
  Dumbbell,
  MessageCircle,
  LogOut,
  Menu,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" />
  </div>
)

const MembersPage = dynamic(() => import("./members/page"), { loading: PageLoader })
const WhatsAppPage = dynamic(() => import("./whatsapp/page"), { loading: PageLoader })

const NAV_ITEMS = [
  { id: "members", icon: Users, label: "Members" },
  { id: "whatsapp", icon: MessageCircle, label: "WhatsApp" },
]

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("members")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [adminName, setAdminName] = useState("")
  const [adminRole, setAdminRole] = useState("")
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from("users").select("full_name, role").eq("id", user.id).single()
        if (data) {
          setAdminName(data.full_name || user.email || "Admin")
          setAdminRole(data.role)
        }
      }
    }
    fetchProfile()
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  function handleNavClick(id: string) {
    setActiveSection(id)
    setMobileOpen(false)
  }

  const activeLabel = NAV_ITEMS.find((n) => n.id === activeSection)?.label || "Dashboard"

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarCollapsed ? "w-16" : "w-64"
        } bg-neutral-950 border-r border-neutral-800 transition-all duration-300 hidden md:flex flex-col flex-shrink-0`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-neutral-800">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h1 className="text-white font-bold text-sm">Fitness Fusion</h1>
                  <p className="text-neutral-600 text-[10px]">Admin Panel</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-neutral-500 hover:text-white hover:bg-neutral-800 h-8 w-8"
            >
              <ChevronRight
                className={`w-4 h-4 transition-transform ${sidebarCollapsed ? "" : "rotate-180"}`}
              />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                activeSection === item.id
                  ? "bg-red-500/10 text-red-500 border border-red-500/20"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User info + Logout */}
        <div className="p-3 border-t border-neutral-800">
          {!sidebarCollapsed && adminName && (
            <div className="mb-3 px-2">
              <p className="text-white text-sm font-medium truncate">{adminName}</p>
              <p className="text-neutral-500 text-xs capitalize">{adminRole}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/5 transition-colors"
            title={sidebarCollapsed ? "Logout" : undefined}
          >
            {loggingOut ? (
              <Loader2 className="w-[18px] h-[18px] flex-shrink-0 animate-spin" />
            ) : (
              <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            )}
            {!sidebarCollapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-neutral-950 border-r border-neutral-800 z-50 md:hidden flex flex-col">
            <div className="p-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h1 className="text-white font-bold text-sm">Fitness Fusion</h1>
                  <p className="text-neutral-600 text-[10px]">Admin Panel</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    activeSection === item.id
                      ? "bg-red-500/10 text-red-500 border border-red-500/20"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                  }`}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="p-3 border-t border-neutral-800">
              {adminName && (
                <div className="mb-3 px-2">
                  <p className="text-white text-sm font-medium truncate">{adminName}</p>
                  <p className="text-neutral-500 text-xs capitalize">{adminRole}</p>
                </div>
              )}
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/5 transition-colors"
              >
                {loggingOut ? (
                  <Loader2 className="w-[18px] h-[18px] animate-spin" />
                ) : (
                  <LogOut className="w-[18px] h-[18px]" />
                )}
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 bg-neutral-950/80 backdrop-blur-sm border-b border-neutral-800 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-neutral-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-white font-medium text-sm">{activeLabel}</h2>
          </div>
          <div className="text-xs text-neutral-500">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-neutral-950">
          {activeSection === "members" && <MembersPage />}
          {activeSection === "whatsapp" && <WhatsAppPage />}
        </main>
      </div>
    </div>
  )
}
