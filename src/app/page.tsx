
"use client"

import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, orderBy, limit, doc, where } from "firebase/firestore"
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
  Loader2,
  ListChecks,
  ShieldAlert,
  Clock8,
  Hammer
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Dashboard() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const [localTimeZone, setLocalTimeZone] = useState<string>("")

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user])
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/auth")
    }
    setLocalTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [user, isUserLoading, router])

  const role = profile?.role || "WORKER"
  const isAdmin = role === "ADMIN"
  const isApproved = profile?.status === "approved" || isAdmin

  // GUARDED QUERIES: Only fire if user is approved AND has the right role
  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !user || !isAdmin) return null
    return query(collection(firestore, "users"), where("status", "==", "approved"))
  }, [firestore, user, isAdmin])
  const { data: staffMembers } = useCollection(staffQuery)

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "inventoryItems")
  }, [firestore, user])
  const { data: inventoryItems } = useCollection(inventoryQuery)

  const punchListQuery = useMemoFirebase(() => {
    if (!firestore || !user || !isApproved) return null
    // Only fetch for admins or those with punch list access to avoid rule errors
    if (!isAdmin && role !== "PUNCH_LIST") return null
    return collection(firestore, "punchLists")
  }, [firestore, user, isApproved, isAdmin, role])
  const { data: punchLists } = useCollection(punchListQuery)

  const recentEntriesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !isApproved) return null
    // Non-admins should only see their own recent entries
    if (isAdmin) {
      return query(collection(firestore, "timeEntries"), orderBy("clockInTime", "desc"), limit(5))
    } else {
      return query(
        collection(firestore, "timeEntries"), 
        where("userId", "==", user.uid),
        orderBy("clockInTime", "desc"), 
        limit(5)
      )
    }
  }, [firestore, user, isApproved, isAdmin])
  const { data: timeEntries } = useCollection(recentEntriesQuery)

  const formatTime = (isoString: string) => {
    if (!isoString) return "--:--"
    try {
      return new Date(isoString).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch (e) {
      return "--:--"
    }
  }

  if (isUserLoading || isProfileLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Verifying Terminal Access...</p>
      </div>
    )
  }

  if (!isApproved) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-6">
        <div className="relative inline-block">
          <Clock8 className="h-24 w-24 mx-auto text-black animate-pulse" />
          <ShieldAlert className="h-8 w-8 text-black absolute -bottom-2 -right-2 bg-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-black uppercase tracking-tighter">Awaiting Approval</h1>
          <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest">Generals Plumbing Security Terminal</p>
        </div>
        <Card className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white p-6">
          <p className="font-bold text-sm leading-relaxed">
            Your account request has been received. To maintain system integrity, an administrator must verify your identity and assign your operational role before you can access the management suite.
          </p>
          <div className="mt-6 pt-6 border-t-2 border-black border-dashed">
            <p className="text-[10px] font-black uppercase text-muted-foreground">
              Current Status: <span className="text-black">{profile?.status?.toUpperCase() || "PENDING"}</span>
            </p>
          </div>
        </Card>
      </div>
    )
  }

  // WORKER VIEW
  if (role === "WORKER" && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto mt-12 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black uppercase tracking-tighter">Welcome, {profile?.displayName}</h1>
          <p className="font-bold text-muted-foreground uppercase text-xs tracking-widest flex items-center justify-center gap-2">
            <Hammer className="h-4 w-4" /> Material Procurement Terminal
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button asChild className="bg-black text-white font-black rounded-none h-20 text-lg uppercase border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
            <Link href="/requests/rough">Rough Requests</Link>
          </Button>
          <Button asChild className="bg-black text-white font-black rounded-none h-20 text-lg uppercase border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
            <Link href="/requests/underslab">Underslab Requests</Link>
          </Button>
          <Button asChild className="bg-black text-white font-black rounded-none h-20 text-lg uppercase border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
            <Link href="/requests/final">Final Requests</Link>
          </Button>
          <Button asChild className="bg-black text-white font-black rounded-none h-20 text-lg uppercase border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
            <Link href="/requests/extra">Extra Requests</Link>
          </Button>
          <Button asChild className="bg-black text-white font-black rounded-none h-20 text-lg uppercase border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all md:col-span-2">
            <Link href="/requests/warranty">Warranty Requests</Link>
          </Button>
        </div>

        {timeEntries && timeEntries.length > 0 && (
          <Card className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-8">
            <CardHeader className="bg-muted/10 border-b-2 border-black py-3">
              <CardTitle className="text-sm font-black uppercase">My Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {timeEntries.map(entry => (
                <div key={entry.id} className="p-3 border-b border-black/5 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-black" />
                    <span className="text-xs font-bold uppercase">{formatTime(entry.clockInTime)}</span>
                  </div>
                  <Badge className="bg-black text-white text-[8px] rounded-none px-1 uppercase">{entry.clockOutTime ? 'Shift Done' : 'On Site'}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // ADMIN / MANAGEMENT VIEW
  const lowStock = inventoryItems?.filter(i => i.currentStock <= (i.reorderThreshold || 0)) || []
  const activePunchTasks = punchLists?.filter(p => p.status !== 'completed') || []

  const stats = [
    { title: "Personnel", value: staffMembers?.length || "0", icon: Users, color: "text-black" },
    { title: "Low Stock Items", value: lowStock.length.toString(), icon: AlertTriangle, color: "text-black" },
    { title: "Punch Tasks", value: activePunchTasks.length.toString(), icon: ListChecks, color: "text-black" },
    { title: "Inventory Items", value: inventoryItems?.length || "0", icon: Package, color: "text-black" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter">Admin Panel</h1>
          <p className="text-muted-foreground font-black uppercase text-[9px] tracking-[0.3em]">Zone: {localTimeZone || "Detecting..."}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" asChild className="border-2 border-black font-black h-10 px-4 rounded-none">
              <Link href="/analytics"><History className="mr-2 h-4 w-4" /> Reports</Link>
            </Button>
          )}
          {(isAdmin || role === "INVENTORY") && (
            <Button size="sm" asChild className="bg-black text-white font-black h-10 px-4 rounded-none shadow-[1px_1px_0px_0px_rgba(255,255,255,0.2)]">
              <Link href="/dispatch"><Truck className="mr-2 h-4 w-4" /> Dispatch</Link>
            </Button>
          )}
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
            <CardDescription className="font-bold uppercase text-[9px] tracking-widest text-muted-foreground">Latest Events (Local Time)</CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-2">
              {timeEntries?.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 p-2 border-2 border-transparent hover:border-black hover:bg-muted/30 transition-all">
                  <div className="mt-1"><div className="h-3 w-3 bg-black" /></div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black uppercase">{entry.displayName || "Unknown Staff"}</p>
                      <span className="text-[10px] font-black text-muted-foreground">{localTimeZone ? formatTime(entry.clockInTime) : "..."}</span>
                    </div>
                    <Badge className="bg-black text-white text-[8px] px-1 py-0 h-4 font-black uppercase rounded-none">
                      {entry.clockOutTime ? "Shift Completed" : "Clocked In"}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!timeEntries || timeEntries.length === 0) && (
                <div className="py-10 text-center text-[10px] font-black uppercase text-muted-foreground">No recent shift activity.</div>
              )}
            </div>
            {isAdmin && (
              <Button variant="ghost" className="w-full mt-2 text-black font-black h-10 uppercase text-xs tracking-widest border-2 border-black rounded-none hover:bg-black hover:text-white transition-colors" asChild>
                <Link href="/timesheets">View All Sheets <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            )}
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
                    <div className="bg-black h-full" style={{ width: `${Math.min(100, (item.currentStock / (item.reorderThreshold || 1)) * 100)}%` }} />
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center text-[10px] font-black uppercase text-muted-foreground">All stock levels optimal.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
