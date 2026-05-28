"use client"

import { useState, useMemo } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, query, where, orderBy } from "firebase/firestore"
import { useParams, useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
} from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { 
  Loader2, 
  ArrowLeft, 
  Calendar, 
  Filter, 
  Package, 
  MapPin, 
  Clock,
  ShieldCheck,
  FileText,
  ChevronRight,
  ClipboardList
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function WorkerDetailPage() {
  const { user: authUser, isUserLoading } = useUser()
  const firestore = useFirestore()
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null
    return doc(firestore, "users", authUser.uid)
  }, [firestore, authUser])
  const { data: adminProfile, isLoading: isProfileLoading } = useDoc(profileRef)

  const workerRef = useMemoFirebase(() => {
    if (!firestore || !id) return null
    return doc(firestore, "users", id)
  }, [firestore, id])
  const { data: worker, isLoading: isWorkerLoading } = useDoc(workerRef)

  const requestsQuery = useMemoFirebase(() => {
    if (!firestore || !id) return null
    // Composite index required: workerUid (Asc) + requestTime (Desc)
    return query(
      collection(firestore, "materialRequests"),
      where("workerUid", "==", id),
      where("status", "==", "dispatched"),
      orderBy("requestTime", "desc")
    )
  }, [firestore, id])
  const { data: requests, isLoading: isRequestsLoading } = useCollection(requestsQuery)

  // Aggregation Logic: Group dispatched items by itemId
  const itemSummary = useMemo(() => {
    if (!requests) return []
    
    const summary: Record<string, { 
      itemId: string, 
      itemName: string, 
      totalQuantity: number, 
      lastRequested: string,
      count: number 
    }> = {}

    requests.forEach(req => {
      // Apply date filters if any
      const reqDate = new Date(req.requestTime)
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0,0,0,0)
        if (reqDate < start) return
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23,59,59,999)
        if (reqDate > end) return
      }

      if (!summary[req.itemId]) {
        summary[req.itemId] = {
          itemId: req.itemId,
          itemName: req.itemName,
          totalQuantity: 0,
          lastRequested: req.requestTime,
          count: 0
        }
      }
      summary[req.itemId].totalQuantity += Number(req.quantity)
      summary[req.itemId].count += 1
      if (new Date(req.requestTime) > new Date(summary[req.itemId].lastRequested)) {
        summary[req.itemId].lastRequested = req.requestTime
      }
    })

    return Object.values(summary).sort((a, b) => b.totalQuantity - a.totalQuantity)
  }, [requests, startDate, endDate])

  if (isUserLoading || isProfileLoading || isWorkerLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Generating Acquisition Summary...</p>
      </div>
    )
  }

  const isAdmin = adminProfile?.role === "ADMIN"

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <h2 className="text-2xl font-black uppercase tracking-tighter">Admin Access Only</h2>
        <Button asChild variant="outline" className="border-2 border-black rounded-none uppercase font-black">
          <Link href="/">Return to Terminal</Link>
        </Button>
      </div>
    )
  }

  if (!worker) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-xl font-black uppercase">Worker Not Found</h2>
        <Button asChild variant="outline" className="border-2 border-black rounded-none uppercase font-black">
          <Link href="/admin/workers">Back to Directory</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild className="border-2 border-black rounded-none font-black h-10 px-4">
          <Link href="/admin/workers"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory</Link>
        </Button>
        <Badge className="bg-black text-white font-black rounded-none border-2 border-white px-3 h-7 uppercase text-[10px]">
          <ShieldCheck className="h-3 w-3 mr-1" /> Verified Acquisitions
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
            <CardHeader className="bg-black text-white py-4">
              <CardTitle className="text-xl font-black uppercase tracking-tighter">Personnel Info</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Full Name</Label>
                <p className="text-2xl font-black uppercase leading-none">{worker.displayName}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Email Identifier</Label>
                <p className="font-bold text-sm truncate">{worker.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-black border-dashed">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Dispatched Types</Label>
                  <p className="font-black text-xl">{itemSummary.length}</p>
                </div>
                <div className="space-y-1 text-right">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Total Units</Label>
                  <p className="font-black text-xl">{itemSummary.reduce((acc, curr) => acc + curr.totalQuantity, 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-4 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-muted/10">
            <CardHeader className="py-3 px-4 border-b-2 border-black">
              <CardTitle className="text-xs font-black uppercase flex items-center gap-2"><Filter className="h-3 w-3" /> Audit Window</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase">From</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border-2 border-black rounded-none h-10 font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase">To</Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border-2 border-black rounded-none h-10 font-bold"
                />
              </div>
              {(startDate || endDate) && (
                <Button 
                  onClick={() => { setStartDate(""); setEndDate(""); }}
                  variant="ghost" 
                  className="w-full h-8 text-[9px] font-black uppercase text-destructive hover:bg-destructive/10 rounded-none"
                >
                  Reset Audit Window
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            <h2 className="text-2xl font-black uppercase">Acquisition Summary</h2>
          </div>
          
          <Card className="border-4 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-black">
                  <TableRow className="hover:bg-black">
                    <TableHead className="text-white font-black uppercase text-[10px]">Material Item</TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px] text-center">Total Qty</TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px] hidden md:table-cell">Instances</TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px] text-right">Last Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isRequestsLoading ? (
                    <TableRow><TableCell colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                  ) : (
                    itemSummary.map((sum) => (
                      <TableRow 
                        key={sum.itemId} 
                        className="border-b-2 border-black/10 hover:bg-muted/30 cursor-pointer group"
                        onClick={() => router.push(`/admin/workers/${id}/item/${sum.itemId}`)}
                      >
                        <TableCell>
                          <div className="font-black uppercase text-xs flex items-center gap-2">
                            {sum.itemName}
                            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="text-[9px] font-bold text-muted-foreground uppercase">Inventory Code: {sum.itemId.slice(-6)}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-black text-white rounded-none font-black px-2 h-5">x {sum.totalQuantity}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center">
                          <span className="text-[10px] font-bold uppercase">{sum.count} Records</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-[10px] font-black uppercase">
                            {new Date(sum.lastRequested).toLocaleDateString([], { month: 'short', day: '2-digit' })}
                          </div>
                          <div className="text-[9px] font-bold text-muted-foreground uppercase">
                            {new Date(sum.lastRequested).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {(!itemSummary || itemSummary.length === 0) && !isRequestsLoading && (
                    <TableRow><TableCell colSpan={4} className="py-20 text-center text-[10px] font-black uppercase text-muted-foreground">No acquisition records found for this window.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <div className="bg-muted/10 p-4 border-2 border-black border-dashed flex gap-3 items-start">
            <Package className="h-5 w-5 shrink-0 opacity-20" />
            <p className="text-[9px] font-bold uppercase text-muted-foreground leading-relaxed">
              This summary reflects only "Dispatched" requests that have been verified by inventory staff. Click an individual material to view the historical delivery log for that item.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
