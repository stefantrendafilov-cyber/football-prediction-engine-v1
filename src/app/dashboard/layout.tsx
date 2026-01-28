import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/DashboardSidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-black">
        <DashboardSidebar />
        <SidebarInset className="bg-black">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
