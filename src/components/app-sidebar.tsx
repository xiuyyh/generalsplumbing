
"use client"

import * as React from "react"
import {
  Clock,
  LayoutDashboard,
  Package,
  Truck,
  FileText,
  History,
  Users,
  LogOut,
  Settings,
  ListChecks,
  ChevronRight,
  ChevronDown,
  Hammer,
  UserCog
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { signOut } from "firebase/auth"
import { doc } from "firebase/firestore"
import { cn } from "@/lib/utils"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const auth = useAuth()
  const firestore = useFirestore()
  
  const userRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user])
  const { data: profile } = useDoc(userRef)

  const role = profile?.role || "WORKER"
  const isApproved = profile?.status === "approved"

  if (!user || pathname === "/auth") {
    return null
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const isAdmin = role === "ADMIN"
  const canAccessInventory = isAdmin || role === "INVENTORY"
  const canAccessPunch = isAdmin || role === "PUNCH_LIST"
  const canAccessRequests = isApproved // All approved users can see requests

  return (
    <Sidebar collapsible="icon" className="border-r-4 border-black">
      <SidebarHeader className="h-12 flex items-center px-3 border-b-4 border-black bg-black text-white shrink-0 overflow-hidden transition-all">
        <div className="flex items-center gap-3 font-black text-lg uppercase tracking-tighter whitespace-nowrap">
          <div className="h-5 w-5 bg-white shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">Generals Plumbing</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="bg-white">
        {!isApproved && (
          <div className="p-4 m-2 bg-amber-50 border-2 border-amber-200 text-[10px] font-black uppercase text-amber-800 leading-tight">
            Account Pending Approval
          </div>
        )}

        <SidebarGroup className="p-1">
          <SidebarGroupLabel className="font-black uppercase text-[9px] tracking-widest text-muted-foreground mb-1 px-3 group-data-[collapsible=icon]:hidden">
            Terminal
          </SidebarGroupLabel>
          <SidebarMenu>
            {isAdmin && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"} className="h-10 rounded-none font-black uppercase text-[11px]">
                  <Link href="/"><LayoutDashboard /><span>Dashboard</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {canAccessRequests && (
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="h-10 rounded-none font-black uppercase text-[11px]">
                      <Hammer />
                      <span>Request Materials</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-4 border-l-2 border-black ml-4 mt-1 space-y-1">
                      {["Rough", "Underslab", "Final"].map((cat) => (
                        <SidebarMenuButton key={cat} asChild isActive={pathname === `/requests/${cat.toLowerCase()}`} className="h-8 rounded-none font-black uppercase text-[10px]">
                          <Link href={`/requests/${cat.toLowerCase()}`}>{cat}</Link>
                        </SidebarMenuButton>
                      ))}
                    </div>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )}

            {canAccessPunch && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/punch-list"} className="h-10 rounded-none font-black uppercase text-[11px]">
                  <Link href="/punch-list"><ListChecks /><span>Punch List</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {canAccessInventory && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/inventory"} className="h-10 rounded-none font-black uppercase text-[11px]">
                    <Link href="/inventory"><Package /><span>Inventory</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dispatch"} className="h-10 rounded-none font-black uppercase text-[11px]">
                    <Link href="/dispatch"><Truck /><span>Dispatch</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}

            {isAdmin && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/staff"} className="h-10 rounded-none font-black uppercase text-[11px]">
                    <Link href="/staff"><Users /><span>Staff</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/admin/users"} className="h-10 rounded-none font-black uppercase text-[11px]">
                    <Link href="/admin/users"><UserCog /><span>Users</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/settings"} className="h-10 rounded-none font-black uppercase text-[11px]">
                    <Link href="/settings"><Settings /><span>Settings</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 bg-white border-t-4 border-black shrink-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              className="w-full h-10 flex items-center justify-start gap-3 px-3 font-black uppercase text-[11px] tracking-wider text-destructive hover:bg-destructive hover:text-white transition-all rounded-none border-4 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">Terminate Session</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail className="bg-black" />
    </Sidebar>
  )
}
