"use client"

import { useUser, useAuth } from "@/firebase"
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card"
import { 
  Clock, 
  Package, 
  Truck, 
  Users, 
  ArrowUpRight, 
  AlertTriangle,
  History,
  LogIn,
  Loader2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Dashboard() {
  const { user, isUserLoading } = useUser()
  const auth = useAuth()

  const stats = [
    { title: "Staff Clocked In", value: "12", icon: Users, color: "text-black" },
    { title: "Low Stock Items", value: "5", icon: AlertTriangle, color: "text-black" },
    { title: "Dispatches Today", value: "28", icon: Truck, color: "text-black" },
    { title: "Total Parts Used", value: "142", icon: Package, color: "text-black" },
  ]

  const recentActivity = [
    { id: 1, user: "John Doe", action: "Clocked In", time: "08:00 AM", detail: "Shift: Residential" },
    { id: 2, user: "Sarah Smith", action: "Dispatch Created", time: "08:45 AM", detail: "Job #4421 - PVC Fittings" },
    { id: 3, user: "Mike Jones", action: "Clocked Out", time: "09:15 AM", detail: "Shift: Emergency Call-out" },
    { id: 4, user: "Warehouse", action: "Low Stock Alert", time: "10:00 AM", detail: "Copper Pipes (1/2\")" },
  ]

  const lowStock = [
    { name: "Copper Elbow 1/2\"", stock: 4, min: 10 },
    { name: "PVC Primer", stock: 2, min: 5 },
    { name: "PEX Tubing Blue", stock: 15, min: 50 },
  ]

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Initializing System...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-5xl font-black tracking-tighter uppercase">Generals Plumbing</h1>
          <p className="text-muted-foreground font-bold">Secure Staff & Inventory Management</p>
        </div>
        <Card className="max-w-md w-full border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader>
            <CardTitle className="text-xl font-black">ACCESS RESTRICTED</CardTitle>
            <CardDescription className="font-bold">Authentication is required to view operations.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              size="lg" 
              className="w-full h-16 text-lg font-black bg-black text-white hover:scale-[1.02] transition-transform"
              onClick={() => initiateAnonymousSignIn(auth)}
            >
              <LogIn className="mr-2 h-6 w-6" /> SIGN IN TO SYSTEM
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground uppercase tracking-tighter">Dashboard</h1>
          <p className="text-muted-foreground font-bold">System Status: Active</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="border-2 border-black font-black">
            <Link href="/analytics"><History className="mr-2 h-4 w-4" /> Usage History</Link>
          </Button>
          <Button size="sm" asChild className="bg-black text-white font-black">
            <Link href="/dispatch"><Truck className="mr-2 h-4 w-4" /> New Dispatch</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                  <h3 className="text-3xl font-black mt-1">{stat.value}</h3>
                </div>
                <div className={`p-3 border-2 border-black rounded-none ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-2 border-black">
          <CardHeader>
            <CardTitle className="text-2xl font-black uppercase">Recent Activity</CardTitle>
            <CardDescription className="font-bold">Live log of staff actions and inventory changes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 border-2 border-transparent hover:border-black transition-all">
                  <div className="mt-1">
                    <div className="h-3 w-3 bg-black" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black">{activity.user}</p>
                      <span className="text-xs font-bold text-muted-foreground">{activity.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-black text-white text-[10px] px-2 py-0 h-5 font-black uppercase">
                        {activity.action}
                      </Badge>
                      <p className="text-xs font-bold text-muted-foreground">{activity.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="link" className="w-full mt-6 text-black font-black h-8 uppercase tracking-widest" asChild>
              <Link href="/timesheets">View All Activity <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-2xl font-black uppercase">Low Stock Alerts</CardTitle>
            <CardDescription className="font-bold">Items below threshold.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {lowStock.map((item) => (
                <div key={item.name} className="flex flex-col gap-2 border-b-2 border-muted pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black uppercase tracking-tight">{item.name}</span>
                    <Badge variant="destructive" className="font-black rounded-none px-3">{item.stock}</Badge>
                  </div>
                  <div className="w-full bg-muted h-3 border border-black overflow-hidden">
                    <div 
                      className="bg-black h-full" 
                      style={{ width: `${(item.stock / item.min) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Min required: {item.min}</p>
                </div>
              ))}
            </div>
            <Button className="w-full mt-8 border-2 border-black font-black uppercase" variant="outline" asChild>
              <Link href="/inventory">Manage Inventory</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
