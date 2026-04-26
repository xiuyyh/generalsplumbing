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
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 flex items-center px-6">
        <div className="flex items-center gap-2 font-headline font-bold text-xl text-primary">
          <span className="group-data-[collapsible=icon]:hidden">Generals Plumbing</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
