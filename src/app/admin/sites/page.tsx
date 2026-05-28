
"use client"

import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, query, orderBy } from "firebase/firestore"
import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Loader2, 
  ShieldAlert, 
  ArrowRight, 
  MapPin,
  Package,
  Activity
} from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default function SiteAuditDirectoryPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user])
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  const dispatchesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "inventoryDispatches"), orderBy("dispatchDateTime", "desc"))
  }, [firestore, user])
  const { data: dispatches, isLoading: isDispatchesLoading } = useCollection(dispatchesQuery)

  // Aggregate unique site locations
  const sites = useMemo(() => {
    if (!dispatches) return []
    const siteMap: Record<string, { address: string, totalDispatches: number, lastActivity: string }> = {}
    
    dispatches.forEach(d => {
      const addr = d.deliveryAddress || "Unspecified Location"
      if (!siteMap[addr]) {
        siteMap[addr] = {
          address: addr,
          totalDispatches: 0,
          lastActivity: d.dispatchDateTime
        }
      }
      siteMap[addr].totalDispatches += 1
      if (new Date(d.dispatchDateTime) > new Date(siteMap[addr].lastActivity)) {
        siteMap[addr].lastActivity = d.dispatchDateTime
      }
    })

    return Object.values(siteMap).sort((a, b) => b.totalDispatches - a.totalDispatches)
  }, [dispatches])

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/auth")
    }
  }, [user, isUserLoading, router])

  if (isUserLoading || isProfileLoading || isDispatchesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Mapping Project Locations...</p>
      </div>
    )
  }

  const isAdmin = profile?.role === "ADMIN"

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <ShieldAlert className="h-16 w-16 mx-auto text-black" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Access Denied</h2>
        <p className="text-muted-foreground font-bold">Only administrators can access site location audits.</p>
        <Button asChild variant="outline" className="border-2 border-black rounded-none uppercase font-black">
          <Link href="/">Return to Terminal</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
          <MapPin className="h-10 w-10" /> Site Audit
        </h1>
        <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest">Auditing Material Inflow by Project Location</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sites.map((site) => (
          <Card key={site.address} className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer overflow-hidden group">
            <Link href={`/admin/sites/${encodeURIComponent(site.address)}`}>
              <CardHeader className="bg-black text-white py-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-black uppercase truncate">{site.address}</CardTitle>
                <MapPin className="h-4 w-4" />
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Total Transfers</p>
                    <p className="text-2xl font-black">{site.totalDispatches}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Last Arrival</p>
                    <p className="text-xs font-bold uppercase">{new Date(site.lastActivity).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="pt-4 border-t-2 border-black border-dashed flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase group-hover:underline">View Site Ledger</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
        {sites.length === 0 && (
          <div className="col-span-full py-20 text-center border-4 border-black border-dashed bg-muted/20">
             <Activity className="h-12 w-12 mx-auto opacity-20 mb-4" />
             <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">No verified job site data available.</p>
          </div>
        )}
      </div>
    </div>
  )
}
