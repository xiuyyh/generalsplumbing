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
  FileText
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
      orderBy("requestTime", "desc")
    )
  }, [firestore, id])
  const { data: requests, isLoading: isRequestsLoading } = useCollection(requestsQuery)

  const filteredRequests = useMemo(() => {
    if (!requests) return []
    return requests.filter(req => {
      const reqDate = new Date(req.requestTime)
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0,0,0,0)
        if (reqDate < start) return false
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23,59,59,999)
        if (reqDate > end) return false
      }
      return true
    })
  }, [requests, startDate, endDate])

  if (isUserLoading || isProfileLoading || isWorkerLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Retrieving Historical Audit...</p>
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
        <div className="flex items-center gap-2">
          <Badge className="bg-green-600 text-white font-black rounded-none border-2 border-white px-3 h-7 uppercase text-[10px]">
            <ShieldCheck className="h-3 w-3 mr-1" /> Profile Verified
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
            <CardHeader className="bg-black text-white py-4">
              <CardTitle className="text-xl font-black uppercase tracking-tighter">Personnel Profile</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Full Name</Label>
                <p className="text-2xl font-black uppercase leading-none">{worker.displayName}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Email Identifier</Label>
                <p className="font-bold text-sm">{worker.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-black border-dashed">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">System Role</Label>
                  <p className="font-black text-xs uppercase">{worker.role}</p>
                </div>
                <div className="space-y-1 text-right">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Lifetime Requests</Label>
                  <p className="font-black text-xl">{requests?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-4 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-muted/10">
            <CardHeader className="py-3 px-4 border-b-2 border-black">
              <CardTitle className="text-xs font-black uppercase flex items-center gap-2"><Filter className="h-3 w-3" /> Audit Filters</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase">Start Date</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border-2 border-black rounded-none h-10 font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase">End Date</Label>
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
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center gap-2"><FileText className="h-5 w-5" /><h2 className="text-2xl font-black uppercase">Material Acquisition Log</h2></div>
          <Card className="border-4 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-black">
                  <TableRow className="hover:bg-black">
                    <TableHead className="text-white font-black uppercase text-[10px]">Material / Phase</TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px] hidden md:table-cell">Site Location</TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px]">Status</TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px] text-right">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isRequestsLoading ? (
                    <TableRow><TableCell colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                  ) : (
                    filteredRequests.map((req) => (
                      <TableRow key={req.id} className="border-b-2 border-black/10 hover:bg-muted/30">
                        <TableCell>
                          <div className="font-black uppercase text-xs">{req.itemName} x{req.quantity}</div>
                          <div className="text-[9px] font-bold text-muted-foreground uppercase">{req.category}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-[9px] font-bold uppercase flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5 shrink-0" /> {req.deliveryAddress}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "rounded-none font-black uppercase text-[8px] h-5",
                            req.status === 'dispatched' ? "bg-green-600" : req.status === 'rejected' ? "bg-red-600" : "bg-amber-500"
                          )}>
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-[10px] font-black uppercase tabular-nums">
                            {new Date(req.requestTime).toLocaleDateString([], { month: 'short', day: '2-digit' })}
                          </div>
                          <div className="text-[9px] font-bold text-muted-foreground tabular-nums">
                            {new Date(req.requestTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {(!filteredRequests || filteredRequests.length === 0) && !isRequestsLoading && (
                    <TableRow><TableCell colSpan={4} className="py-20 text-center text-[10px] font-black uppercase text-muted-foreground">No matching request records found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
