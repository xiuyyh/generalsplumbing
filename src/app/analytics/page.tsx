
"use client"

import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, query, where } from "firebase/firestore"
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
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts"
import { 
  History, 
  TrendingUp, 
  Users, 
  Package, 
  AlertCircle,
  Loader2,
  ShieldAlert
} from "lucide-react"
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const COLORS = ['#000000', '#444444', '#777777', '#AAAAAA']

const chartConfig = {
  usage: {
    label: "Inventory Dispatched",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export default function AnalyticsPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user])
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "inventoryItems")
  }, [firestore, user])
  const { data: inventoryItems, isLoading: isInvLoading } = useCollection(inventoryQuery)

  const dispatchQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "inventoryDispatches")
  }, [firestore, user])
  const { data: dispatches, isLoading: isDispLoading } = useCollection(dispatchQuery)

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    // Fetch all approved personnel from Users collection
    return query(collection(firestore, "users"), where("status", "==", "approved"))
  }, [firestore, user])
  const { data: staffMembers } = useCollection(staffQuery)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/auth")
    }
  }, [user, isUserLoading, router])

  if (isUserLoading || isProfileLoading || isInvLoading || isDispLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Aggregating System Intelligence...</p>
      </div>
    )
  }

  const isAdmin = profile?.role === "ADMIN"

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <ShieldAlert className="h-16 w-16 mx-auto text-black" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Access Denied</h2>
        <p className="text-muted-foreground font-bold">Administrative credentials are required to view system analytics.</p>
        <Button asChild variant="outline" className="border-2 border-black rounded-none uppercase font-black">
          <Link href="/">Return to Terminal</Link>
        </Button>
      </div>
    )
  }

  // Process data for charts
  const topPartsData = inventoryItems?.map(item => ({
    name: item.name,
    value: dispatches?.filter(d => d.inventoryItemId === item.id).length || 0
  })).sort((a, b) => b.value - a.value).slice(0, 5).filter(i => i.value > 0) || []

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().split('T')[0]
  }).reverse()

  const usageHistory = last7Days.map(date => ({
    name: new Date(date).toLocaleDateString([], { weekday: 'short' }),
    usage: dispatches?.filter(d => d.dispatchDateTime.startsWith(date)).length || 0
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter">Usage History & Analytics</h1>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Real-time operational trends from Firestore</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white">
          <CardHeader className="bg-muted/10 border-b-2 border-black">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black uppercase">Daily Dispatch Frequency</CardTitle>
                <CardDescription className="text-xs font-bold uppercase opacity-60">Material outflows recorded this week</CardDescription>
              </div>
              <div className="p-2 bg-black text-white rounded-none">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[300px] w-full">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageHistory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="usage" fill="#000000" radius={[0, 0, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white">
          <CardHeader className="bg-muted/10 border-b-2 border-black">
            <CardTitle className="text-lg font-black uppercase">Top Utilized Parts</CardTitle>
            <CardDescription className="text-xs font-bold uppercase opacity-60">Distribution of inventory demand</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topPartsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    {topPartsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {topPartsData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-[10px] font-black uppercase">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-muted-foreground truncate max-w-[120px]">{item.name}</span>
                  </div>
                  <span className="font-black">{item.value} dispatches</span>
                </div>
              ))}
              {topPartsData.length === 0 && (
                <p className="text-center text-[10px] font-black uppercase text-muted-foreground py-10">Insufficient dispatch data.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-2 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
              <Users className="h-4 w-4" /> Active Workforce
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{staffMembers?.length || 0}</div>
            <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-tighter">Total personnel</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
              <Package className="h-4 w-4" /> Material Catalog
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{inventoryItems?.length || 0}</div>
            <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-tighter">Unique parts in tracking</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-destructive/5 text-destructive border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Low Stock Warning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{inventoryItems?.filter(i => i.currentStock <= (i.reorderThreshold || 0)).length || 0}</div>
            <p className="text-[9px] font-bold uppercase tracking-tighter opacity-70">Items below threshold</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
