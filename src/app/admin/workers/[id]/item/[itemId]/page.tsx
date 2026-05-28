"use client"

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
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { 
  Loader2, 
  ArrowLeft, 
  MapPin, 
  Clock,
  Package,
  User,
  History,
  Info
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function WorkerItemHistoryPage() {
  const { user: authUser, isUserLoading } = useUser()
  const firestore = useFirestore()
  const params = useParams()
  const workerId = params.id as string
  const itemId = params.itemId as string

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null
    return doc(firestore, "users", authUser.uid)
  }, [firestore, authUser])
  const { data: adminProfile, isLoading: isProfileLoading } = useDoc(profileRef)

  const workerRef = useMemoFirebase(() => {
    if (!firestore || !workerId) return null
    return doc(firestore, "users", workerId)
  }, [firestore, workerId])
  const { data: worker, isLoading: isWorkerLoading } = useDoc(workerRef)

  const historyQuery = useMemoFirebase(() => {
    if (!firestore || !workerId || !itemId) return null
    return query(
      collection(firestore, "materialRequests"),
      where("workerUid", "==", workerId),
      where("itemId", "==", itemId),
      where("status", "==", "dispatched"),
      orderBy("requestTime", "desc")
    )
  }, [firestore, workerId, itemId])
  const { data: history, isLoading: isHistoryLoading } = useCollection(historyQuery)

  if (isUserLoading || isProfileLoading || isWorkerLoading || isHistoryLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Accessing Historical Audit Trail...</p>
      </div>
    )
  }

  const isAdmin = adminProfile?.role === "ADMIN"
  if (!isAdmin) return null

  const itemName = history && history.length > 0 ? history[0].itemName : "Unknown Material"

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild className="border-2 border-black rounded-none font-black h-10 px-4">
          <Link href={`/admin/workers/${workerId}`}><ArrowLeft className="mr-2 h-4 w-4" /> Return to Summary</Link>
        </Button>
        <Badge className="bg-black text-white font-black rounded-none border-2 border-white h-7 uppercase text-[10px]">
          Deep Audit Mode
        </Badge>
      </div>

      <div className="space-y-6">
        <Card className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
          <CardHeader className="bg-black text-white py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Material Audit</p>
                <CardTitle className="text-3xl font-black uppercase tracking-tighter">{itemName}</CardTitle>
              </div>
              <div className="space-y-1 text-left md:text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Field Personnel</p>
                <p className="text-xl font-black uppercase">{worker?.displayName}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 p-0">
            <Table>
              <TableHeader className="bg-muted/50 border-b-2 border-black">
                <TableRow>
                  <TableHead className="text-black font-black uppercase text-[10px] h-12">Timestamp</TableHead>
                  <TableHead className="text-black font-black uppercase text-[10px] h-12">Site Location</TableHead>
                  <TableHead className="text-black font-black uppercase text-[10px] h-12">Job Phase</TableHead>
                  <TableHead className="text-black font-black uppercase text-[10px] h-12 text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history?.map((req) => (
                  <TableRow key={req.id} className="border-b-2 border-black/10 hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 opacity-40" />
                        <div>
                          <p className="text-[10px] font-black uppercase leading-none">
                            {new Date(req.requestTime).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
                          </p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">
                            {new Date(req.requestTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0 opacity-40 mt-0.5" />
                        <span className="text-[10px] font-bold uppercase max-w-[200px] leading-tight">
                          {req.deliveryAddress}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-2 border-black text-[9px] font-black uppercase rounded-none px-2 py-0 h-5">
                        {req.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-black text-lg">x {req.quantity}</span>
                    </TableCell>
                  </TableRow>
                ))}
                {(!history || history.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center">
                      <Info className="h-10 w-10 mx-auto opacity-10 mb-4" />
                      <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">No verified history for this item.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-2 border-black rounded-none bg-muted/10 p-4">
            <Label className="text-[9px] font-black uppercase opacity-60">Total Verified Acquisitions</Label>
            <p className="text-2xl font-black mt-1">{history?.reduce((acc, curr) => acc + Number(curr.quantity), 0)} Units</p>
          </Card>
          <Card className="border-2 border-black rounded-none bg-muted/10 p-4">
            <Label className="text-[9px] font-black uppercase opacity-60">Average Order Size</Label>
            <p className="text-2xl font-black mt-1">
              {history && history.length > 0 
                ? (history.reduce((acc, curr) => acc + Number(curr.quantity), 0) / history.length).toFixed(1) 
                : 0}
            </p>
          </Card>
          <Card className="border-2 border-black rounded-none bg-muted/10 p-4">
            <Label className="text-[9px] font-black uppercase opacity-60">Frequent Job Site</Label>
            <p className="text-[10px] font-black uppercase truncate mt-1">
              {history && history.length > 0 ? history[0].deliveryAddress : "N/A"}
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
