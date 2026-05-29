
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
  Filter, 
  Package, 
  MapPin, 
  Clock,
  ChevronRight,
  ClipboardList,
  User,
  History
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function SiteDetailPage() {
  const { user: authUser, isUserLoading } = useUser()
  const firestore = useFirestore()
  const params = useParams()
  const router = useRouter()
  const address = decodeURIComponent(params.address as string)

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null
    return doc(firestore, "users", authUser.uid)
  }, [firestore, authUser])
  const { data: adminProfile, isLoading: isProfileLoading } = useDoc(profileRef)

  // Fetch all dispatches for this site
  const dispatchesQuery = useMemoFirebase(() => {
    if (!firestore || !address) return null
    // COMPOSITE INDEX REQUIRED: deliveryAddress (Ascending) + dispatchDateTime (Descending)
    return query(
      collection(firestore, "inventoryDispatches"),
      where("deliveryAddress", "==", address),
      orderBy("dispatchDateTime", "desc")
    )
  }, [firestore, address])
  const { data: dispatches, isLoading: isDispatchesLoading } = useCollection(dispatchesQuery)

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null
    return collection(firestore, "inventoryItems")
  }, [firestore, authUser])
  const { data: inventoryItems } = useCollection(inventoryQuery)

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !authUser) return null
    return collection(firestore, "users")
  }, [firestore, authUser])
  const { data: users } = useCollection(usersQuery)

  const itemSummary = useMemo(() => {
    if (!dispatches) return []
    
    const summary: Record<string, { 
      itemId: string, 
      itemName: string, 
      totalQuantity: number, 
      lastDispatch: string,
      count: number 
    }> = {}

    dispatches.forEach(d => {
      const dDate = new Date(d.dispatchDateTime)
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0,0,0,0)
        if (dDate < start) return
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23,59,59,999)
        if (dDate > end) return
      }

      const item = inventoryItems?.find(i => i.id === d.inventoryItemId)
      const itemName = item?.name || "Unknown Material"

      if (!summary[d.inventoryItemId]) {
        summary[d.inventoryItemId] = {
          itemId: d.inventoryItemId,
          itemName: itemName,
          totalQuantity: 0,
          lastDispatch: d.dispatchDateTime,
          count: 0
        }
      }
      summary[d.inventoryItemId].totalQuantity += Number(d.quantity)
      summary[d.inventoryItemId].count += 1
      if (new Date(d.dispatchDateTime) > new Date(summary[d.inventoryItemId].lastDispatch)) {
        summary[d.inventoryItemId].lastDispatch = d.dispatchDateTime
      }
    })

    return Object.values(summary).sort((a, b) => b.totalQuantity - a.totalQuantity)
  }, [dispatches, inventoryItems, startDate, endDate])

  if (isUserLoading || isProfileLoading || isDispatchesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Aggregating Site Ledger...</p>
      </div>
    )
  }

  const isAdmin = adminProfile?.role === "ADMIN"
  if (!isAdmin) return null

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild className="border-2 border-black rounded-none font-black h-10 px-4">
          <Link href="/admin/sites"><ArrowLeft className="mr-2 h-4 w-4" /> Return to Directory</Link>
        </Button>
        <Badge className="bg-black text-white font-black rounded-none border-2 border-white px-3 h-7 uppercase text-[10px]">
          Site Audit Mode
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
            <CardHeader className="bg-black text-white py-4">
              <CardTitle className="text-xl font-black uppercase tracking-tighter">Location Identity</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Delivery Address</Label>
                <p className="text-2xl font-black uppercase leading-tight">{address}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-black border-dashed">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Unique Items</Label>
                  <p className="font-black text-xl">{itemSummary.length}</p>
                </div>
                <div className="space-y-1 text-right">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Total Load</Label>
                  <p className="font-black text-xl">{itemSummary.reduce((acc, curr) => acc + curr.totalQuantity, 0)} Units</p>
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
            <h2 className="text-2xl font-black uppercase">Site Procurement Summary</h2>
          </div>
          
          <Card className="border-4 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-black">
                  <TableRow className="hover:bg-black">
                    <TableHead className="text-white font-black uppercase text-[10px]">Material Item</TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px] text-center">Total Qty</TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px] hidden md:table-cell text-right">Last Delivery</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemSummary.map((sum) => (
                    <TableRow key={sum.itemId} className="border-b-2 border-black/10 hover:bg-muted/30">
                      <TableCell>
                        <div className="font-black uppercase text-xs">{sum.itemName}</div>
                        <div className="text-[9px] font-bold text-muted-foreground uppercase">Item Ref: {sum.itemId.slice(-6)}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-black text-white rounded-none font-black px-2 h-5">x {sum.totalQuantity}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right">
                        <div className="text-[10px] font-black uppercase">
                          {new Date(sum.lastDispatch).toLocaleDateString([], { month: 'short', day: '2-digit' })}
                        </div>
                        <div className="text-[9px] font-bold text-muted-foreground uppercase">
                          {new Date(sum.lastDispatch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {itemSummary.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="py-20 text-center text-[10px] font-black uppercase text-muted-foreground">No material flows recorded for this window.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <div className="space-y-4">
             <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <h2 className="text-2xl font-black uppercase">Transactional History</h2>
            </div>
            <Card className="border-4 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
               <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50 border-b-2 border-black">
                    <TableRow>
                      <TableHead className="text-black font-black uppercase text-[10px]">Date</TableHead>
                      <TableHead className="text-black font-black uppercase text-[10px]">Material</TableHead>
                      <TableHead className="text-black font-black uppercase text-[10px]">Quantity</TableHead>
                      <TableHead className="text-black font-black uppercase text-[10px] text-right">Technician</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispatches?.filter(d => {
                      const dDate = new Date(d.dispatchDateTime)
                      if (startDate && dDate < new Date(startDate)) return false
                      if (endDate && dDate > new Date(endDate)) return false
                      return true
                    }).slice(0, 20).map((d) => {
                      const item = inventoryItems?.find(i => i.id === d.inventoryItemId)
                      const tech = users?.find(u => u.uid === d.assignedToStaffMemberId)
                      return (
                        <TableRow key={d.id} className="border-b-2 border-black/10 hover:bg-muted/20">
                          <TableCell className="text-[9px] font-bold uppercase">{new Date(d.dispatchDateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                          <TableCell className="text-10px font-black uppercase">{item?.name || "Unknown"}</TableCell>
                          <TableCell className="font-black text-xs">x {d.quantity}</TableCell>
                          <TableCell className="text-right">
                             <div className="flex flex-col items-end">
                               <span className="text-[10px] font-black uppercase">{tech?.displayName || "N/A"}</span>
                               <span className="text-[8px] font-bold text-muted-foreground uppercase">{tech?.role}</span>
                             </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
               </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
