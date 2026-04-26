
"use client"

import { useUser, useAuth } from "@/firebase"
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
  Loader2,
  ShieldAlert
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Dashboard() {
  const { user, isUserLoading } = useUser()

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
          <h1 className="text-6xl font-black tracking-tighter uppercase">Generals Plumbing</h1>
          <p className="text-muted-foreground font-black uppercase tracking-widest text-sm">Staff & Inventory Command Center</p>
        </div>
        <Card className="max-w-md w-full border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader className="text-left bg-black text-white">
            <CardTitle className="text-xl font-black uppercase flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="font-bold text-muted-foreground mb-6 uppercase text-xs tracking-tight">Authenticated administrative credentials are required to access fleet management and inventory control systems.</p>
            <Button 
              size="lg" 
              asChild
              className="w-full h-20 text-2xl font-black bg-black text-white hover:scale-[1.02] transition-transform rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]"
            >
              <Link href="/auth">
                <LogIn className="mr-3 h-8 w-8" /> ENTER SYSTEM
              </Link>
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
          <h1 className="text-5xl font-black text-foreground uppercase tracking-tighter">Command Center</h1>
          <p className="text-muted-foreground font-black uppercase text-xs tracking-[0.3em]">Operational Status: Online</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="border-4 border-black font-black h-12 px-6 rounded-none">
            <Link href="/analytics"><History className="mr-2 h-4 w-4" /> Reports</Link>
          </Button>
          <Button size="sm" asChild className="bg-black text-white font-black h-12 px-6 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
            <Link href="/dispatch"><Truck className="mr-2 h-4 w-4" /> Dispatch</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                  <h3 className="text-4xl font-black mt-1">{stat.value}</h3>
                </div>
                <div className={`p-3 border-2 border-black rounded-none ${stat.color}`}>
                  <stat.icon className="h-7 w-7" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader className="border-b-4 border-black">
            <CardTitle className="text-2xl font-black uppercase">Live Logs</CardTitle>
            <CardDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Real-time operational activity</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 border-2 border-transparent hover:border-black hover:bg-muted/30 transition-all">
                  <div className="mt-1">
                    <div className="h-4 w-4 bg-black" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-base font-black uppercase">{activity.user}</p>
                      <span className="text-xs font-black text-muted-foreground">{activity.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-black text-white text-[10px] px-2 py-0 h-6 font-black uppercase rounded-none">
                        {activity.action}
                      </Badge>
                      <p className="text-xs font-bold text-muted-foreground uppercase">{activity.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-6 text-black font-black h-12 uppercase tracking-widest border-2 border-black rounded-none hover:bg-black hover:text-white transition-colors" asChild>
              <Link href="/timesheets">Full Timesheet Archive <ArrowUpRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader className="border-b-4 border-black">
            <CardTitle className="text-2xl font-black uppercase">Stock Alerts</CardTitle>
            <CardDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Critial inventory status</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-8">
              {lowStock.map((item) => (
                <div key={item.name} className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black uppercase tracking-tight">{item.name}</span>
                    <Badge variant="destructive" className="font-black rounded-none px-4 py-1 text-sm">{item.stock}</Badge>
                  </div>
                  <div className="w-full bg-muted h-6 border-2 border-black overflow-hidden p-1">
                    <div 
                      className="bg-black h-full" 
                      style={{ width: `${(item.stock / item.min) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Threshold: {item.min}</p>
                    <p className="text-[10px] font-black text-black uppercase">{Math.round((item.stock/item.min)*100)}% Stock</p>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-10 border-4 border-black font-black uppercase h-14 rounded-none text-black hover:bg-black hover:text-white transition-colors" variant="outline" asChild>
              <Link href="/inventory">Audit Inventory</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
