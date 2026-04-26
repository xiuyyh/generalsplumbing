"use client"

import { useUser } from "@/firebase"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
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
  Loader2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Dashboard() {
  const { user, isUserLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/auth")
    }
  }, [user, isUserLoading, router])

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

  if (isUserLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">
          {isUserLoading ? "Verifying Access..." : "Redirecting to Terminal..."}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter">Command Center</h1>
          <p className="text-muted-foreground font-black uppercase text-[9px] tracking-[0.3em]">Status: Online</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="border-4 border-black font-black h-10 px-4 rounded-none">
            <Link href="/analytics"><History className="mr-2 h-4 w-4" /> Reports</Link>
          </Button>
          <Button size="sm" asChild className="bg-black text-white font-black h-10 px-4 rounded-none shadow-[1px_1px_0px_0px_rgba(255,255,255,0.2)]">
            <Link href="/dispatch"><Truck className="mr-2 h-4 w-4" /> Dispatch</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-4 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-none">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                  <h3 className="text-2xl font-black">{stat.value}</h3>
                </div>
                <div className={`p-2 border-2 border-black rounded-none ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-4 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader className="border-b-4 border-black py-2 px-3">
            <CardTitle className="text-xl font-black uppercase">Live Logs</CardTitle>
            <CardDescription className="font-bold uppercase text-[9px] tracking-widest text-muted-foreground">Activity Stream</CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-2">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-2 border-2 border-transparent hover:border-black hover:bg-muted/30 transition-all">
                  <div className="mt-1">
                    <div className="h-3 w-3 bg-black" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black uppercase">{activity.user}</p>
                      <span className="text-[10px] font-black text-muted-foreground">{activity.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-black text-white text-[8px] px-1 py-0 h-4 font-black uppercase rounded-none">
                        {activity.action}
                      </Badge>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">{activity.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-2 text-black font-black h-10 uppercase text-xs tracking-widest border-2 border-black rounded-none hover:bg-black hover:text-white transition-colors" asChild>
              <Link href="/timesheets">Full Archive <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-4 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader className="border-b-4 border-black py-2 px-3">
            <CardTitle className="text-xl font-black uppercase">Stock Alerts</CardTitle>
            <CardDescription className="font-bold uppercase text-[9px] tracking-widest text-muted-foreground">Critical Items</CardDescription>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-4">
              {lowStock.map((item) => (
                <div key={item.name} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-tight">{item.name}</span>
                    <Badge variant="destructive" className="font-black rounded-none px-2 py-0 text-[10px]">{item.stock}</Badge>
                  </div>
                  <div className="w-full bg-muted h-4 border-2 border-black overflow-hidden p-0.5">
                    <div 
                      className="bg-black h-full" 
                      style={{ width: `${(item.stock / item.min) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[8px] font-black text-muted-foreground uppercase">Threshold: {item.min}</p>
                    <p className="text-[8px] font-black text-black uppercase">{Math.round((item.stock/item.min)*100)}% Stock</p>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4 border-4 border-black font-black uppercase h-10 rounded-none text-black hover:bg-black hover:text-white transition-colors text-xs" variant="outline" asChild>
              <Link href="/inventory">Audit Inventory</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
