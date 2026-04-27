
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
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser, useAuth } from "@/firebase"
import { signOut } from "firebase/auth"

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

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Attendance",
    url: "/clock",
    icon: Clock,
  },
  {
    title: "Staff Management",
    url: "/staff",
    icon: Users,
  },
  {
    title: "Punch List",
    url: "/punch-list",
    icon: ListChecks,
  },
  {
    title: "Timesheets",
    url: "/timesheets",
    icon: FileText,
  },
  {
    title: "Inventory Catalog",
    url: "/inventory",
    icon: Package,
  },
  {
    title: "Dispatch Log",
    url: "/dispatch",
    icon: Truck,
  },
  {
    title: "Usage Analytics",
    url: "/analytics",
    icon: History,
  },
  {
    title: "System Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const auth = useAuth()

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

  return (
    <Sidebar collapsible="icon" className="border-r-4 border-black">
      <SidebarHeader className="h-12 flex items-center px-3 border-b-4 border-black bg-black text-white shrink-0 overflow-hidden transition-all">
        <div className="flex items-center gap-3 font-black text-lg uppercase tracking-tighter whitespace-nowrap">
          <div className="h-5 w-5 bg-white shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">Generals Plumbing</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="bg-white">
        <SidebarGroup className="p-1">
          <SidebarGroupLabel className="font-black uppercase text-[9px] tracking-widest text-muted-foreground mb-1 px-3 group-data-[collapsible=icon]:hidden">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className="h-10 px-3 rounded-none font-black uppercase text-[11px] tracking-wider data-[active=true]:bg-black data-[active=true]:text-white transition-all hover:bg-muted/80"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 bg-white border-t-4 border-black shrink-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              tooltip="Terminate Session"
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
