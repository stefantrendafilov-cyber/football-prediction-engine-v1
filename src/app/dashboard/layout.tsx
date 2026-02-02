import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/DashboardSidebar"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const isTrialExpired = profile?.subscription_status === 'trial' && 
    new Date(profile.trial_ends_at) < new Date()
  
  const isExpired = profile?.subscription_status === 'expired' || isTrialExpired

  if (isExpired) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white font-sans">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-600/20 blur-[120px] rounded-full" />
        
        <div className="w-full max-w-md px-8 text-center">
          <h1 className="text-3xl font-black tracking-tight mb-2">Trial Expired</h1>
            <p className="text-zinc-500 mb-8">
              Your 7-day free trial has ended. Contact an administrator to continue using Winlytics.AI.
            </p>
          
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full h-12 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-medium hover:bg-zinc-800 transition-colors"
            >
              Sign out
            </button>
          </form>
          
          <Link href="/" className="block mt-6 text-zinc-600 text-sm hover:text-zinc-400">
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-black">
        <DashboardSidebar user={user} profile={profile} />
        <SidebarInset className="bg-black">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
