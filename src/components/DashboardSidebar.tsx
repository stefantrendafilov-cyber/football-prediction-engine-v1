"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import type { User } from "@supabase/supabase-js"

interface Profile {
  id: string
  email: string
  role: 'admin' | 'paid' | 'trial'
  subscription_status: string
  trial_ends_at: string | null
  created_at: string
}

interface DashboardSidebarProps {
  user: User
  profile: Profile | null
}

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    enabled: true,
  },
  {
    title: "My Bets",
    href: "/dashboard/bets",
    icon: Receipt,
    enabled: false,
  },
  {
    title: "Bankroll",
    href: "/dashboard/bankroll",
    icon: Wallet,
    enabled: false,
  },
]

function CollapseButton() {
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <button
      onClick={toggleSidebar}
      className={cn(
        "flex items-center justify-center w-full h-10 rounded-lg transition-all",
        "hover:bg-white/10 text-zinc-400 hover:text-white"
      )}
    >
      {isCollapsed ? (
        <ChevronRight className="size-5" />
      ) : (
        <ChevronLeft className="size-5" />
      )}
    </button>
  )
}

export function DashboardSidebar({ user, profile }: DashboardSidebarProps) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const isAdmin = profile?.role === 'admin'

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-zinc-800/50"
    >
      <SidebarHeader className="p-4">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 text-white font-bold",
            isCollapsed ? "justify-center" : ""
          )}
        >
          <div className="flex-shrink-0 w-8 h-8">
            <Image
              src="/logo.png"
              alt="Prophet"
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
              priority
            />
          </div>
          {!isCollapsed && (
            <span className="text-lg tracking-tight">Prophet</span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                  className={cn(
                    "h-11 transition-all",
                    isActive
                      ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-400"
                      : "text-zinc-400 hover:text-white hover:bg-white/5",
                    !item.enabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {item.enabled ? (
                    <Link href={item.href}>
                      <item.icon className="size-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2">
                      <item.icon className="size-5" />
                      <span className="font-medium">{item.title}</span>
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>

          {isAdmin && (
            <>
              <SidebarSeparator className="my-4 bg-zinc-800/50" />
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/dashboard/admin'}
                    tooltip="Admin"
                    className={cn(
                      "h-11 transition-all",
                      pathname === '/dashboard/admin'
                        ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/20 hover:text-amber-400"
                        : "text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                    )}
                  >
                    <Link href="/dashboard/admin">
                      <Shield className="size-5" />
                      <span className="font-medium">Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </>
          )}
      </SidebarContent>

      <SidebarFooter className="p-2 space-y-2">
        <SidebarSeparator className="bg-zinc-800/50" />
        
        <div className={cn(
          "flex items-center gap-3 px-2 py-2 rounded-lg",
          isCollapsed ? "justify-center" : ""
        )}>
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <UserIcon className="size-4 text-zinc-400" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.email}
              </p>
              <p className="text-xs text-zinc-500 capitalize">
                {profile?.role || 'trial'}
                {profile?.subscription_status === 'trial' && profile.trial_ends_at && (
                  <span className="ml-1">
                    · {Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}d left
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className={cn(
              "flex items-center gap-2 w-full h-10 rounded-lg transition-all",
              "hover:bg-red-500/10 text-zinc-400 hover:text-red-400",
              isCollapsed ? "justify-center px-0" : "px-3"
            )}
          >
            <LogOut className="size-5" />
            {!isCollapsed && <span className="font-medium">Sign out</span>}
          </button>
        </form>

        <CollapseButton />
      </SidebarFooter>
    </Sidebar>
  )
}
