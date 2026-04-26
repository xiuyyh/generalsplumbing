"use client"

import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, orderBy, limit } from "firebase/firestore"
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
  const firestore = useFirestore()
  const router = useRouter()

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/auth")
    }
  }, [user, isUserLoading, router])

  // Fetch real data
  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "staffMembers")
  }, [firestore, user])
  const { data: staffMembers } = useCollection(staffQuery)

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "inventoryItems")
  }, [firestore, user])
  const { data: inventoryItems } = useCollection(inventoryQuery)

  const dispatchesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "inventoryDispatches")
  }, [firestore, user])
  const { data: dispatches } = useCollection(dispatchesQuery)

  const recentEntriesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "timeEntries"), orderBy("clockInTime", "desc"), limit(5))
  }, [firestore, user])
  const { data: timeEntries } = useCollection(recentEntriesQuery)

  const lowStock = inventoryItems?.filter(i => i.currentStock <= (i.reorderThreshold || 0)) || []

  const stats = [
    { title: "Staff Records", value: staffMembers?.length || "0", icon: Users, color: "text-black" },
    { title: "Low Stock Items", value: lowStock.length.toString(), icon: AlertTriangle, color: "text-black" },
    { title: "Total Dispatches", value: dispatches?.length || "0", icon: Truck, color: "text-black" },
    { title: "Inventory Items", value: inventoryItems?.length || "0", icon: Package, color: "text-black" },
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
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter">Admin Panel</h1>
          <p className="text-muted-foreground font-black uppercase text-[9px] tracking-[0.3em]">Status: Online</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="border-2 border-black font-black h-10 px-4 rounded-none">
            <Link href="/analytics"><History className="mr-2 h-4 w-4" /> Reports</Link>
          </Button>
          <Button size="sm" asChild className="bg-black text-white font-black h-10 px-4 rounded-none shadow-[1px_1px_0px_0px_rgba(255,255,255,0.2)]">
            <Link href="/dispatch"><Truck className="mr-2 h-4 w-4" /> Dispatch</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-none">
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
        <Card className="lg:col-span-2 border-2 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader className="border-b-2 border-black py-2 px-3 bg-muted/20">
            <CardTitle className="text-xl font-black uppercase">Recent Activity</CardTitle>
            <CardDescription className="font-bold uppercase text-[9px] tracking-widest text-muted-foreground">Latest System Events</CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-2">
              {timeEntries?.map((entry) => {
                const staff = staffMembers?.find(s => s.id === entry.staffMemberId)
                return (
                  <div key={entry.id} className="flex items-start gap-3 p-2 border-2 border-transparent hover:border-black hover:bg-muted/30 transition-all">
                    <div className="mt-1">
                      <div className="h-3 w-3 bg-black" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black uppercase">{staff ? `${staff.firstName} ${staff.lastName}` : "Unknown Staff"}</p>
                        <span className="text-[10px] font-black text-muted-foreground">{new Date(entry.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-black text-white text-[8px] px-1 py-0 h-4 font-black uppercase rounded-none">
                          {entry.clockOutTime ? "Shift Completed" : "Clocked In"}
                        </Badge>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{staff?.officialRole}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
              {(!timeEntries || timeEntries.length === 0) && (
                <div className="py-10 text-center text-[10px] font-black uppercase text-muted-foreground">No recent shift activity.</div>
              )}
            </div>
            <Button variant="ghost" className="w-full mt-2 text-black font-black h-10 uppercase text-xs tracking-widest border-2 border-black rounded-none hover:bg-black hover:text-white transition-colors" asChild>
              <Link href="/timesheets">View All Sheets <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader className="border-b-2 border-black py-2 px-3 bg-muted/20">
            <CardTitle className="text-xl font-black uppercase">Stock Alerts</CardTitle>
            <CardDescription className="font-bold uppercase text-[9px] tracking-widest text-muted-foreground">Critical Levels</CardDescription>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-4">
              {lowStock.length > 0 ? lowStock.slice(0, 5).map((item) => (
                <div key={item.id} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-tight">{item.name}</span>
                    <Badge variant="destructive" className="font-black rounded-none px-2 py-0 text-[10px]">{item.currentStock}</Badge>
                  </div>
                  <div className="w-full bg-muted h-3 border-2 border-black overflow-hidden p-0.5">
                    <div 
                      className="bg-black h-full" 
                      style={{ width: `${Math.min(100, (item.currentStock / (item.reorderThreshold || 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[8px] font-black text-muted-foreground uppercase">Min: {item.reorderThreshold}</p>
                    <p className="text-[8px] font-black text-black uppercase">{item.unitOfMeasure}</p>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center text-[10px] font-black uppercase text-muted-foreground">All stock levels optimal.</div>
              )}
            </div>
            <Button className="w-full mt-4 border-2 border-black font-black uppercase h-10 rounded-none text-black hover:bg-black hover:text-white transition-colors text-xs" variant="outline" asChild>
              <Link href="/inventory">Manage Catalog</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
