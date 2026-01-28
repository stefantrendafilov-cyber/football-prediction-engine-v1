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

export function DashboardSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const isAdmin = true

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
                  tooltip="Admin"
                  className={cn(
                    "h-11 transition-all",
                    "text-amber-500 hover:text-amber-400 hover:bg-amber-500/10",
                    "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Shield className="size-5" />
                  <span className="font-medium">Admin</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <CollapseButton />
      </SidebarFooter>
    </Sidebar>
  )
}
