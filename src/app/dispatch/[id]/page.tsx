"use client"

import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useRouter, useParams } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { 
  Loader2, 
  MapPin, 
  Calendar, 
  Trash2, 
  ArrowLeft,
  Package,
  User,
  Activity,
  AlertCircle,
  Clock,
  ExternalLink
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export default function DispatchDetailPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  // Fetch Dispatch Record
  const dispatchRef = useMemoFirebase(() => {
    if (!firestore || !id) return null
    return doc(firestore, "inventoryDispatches", id)
  }, [firestore, id])
  const { data: dispatch, isLoading } = useDoc(dispatchRef)

  // Fetch Related Inventory Item
  const itemRef = useMemoFirebase(() => {
    if (!firestore || !dispatch?.inventoryItemId) return null
    return doc(firestore, "inventoryItems", dispatch.inventoryItemId)
  }, [firestore, dispatch?.inventoryItemId])
  const { data: inventoryItem } = useDoc(itemRef)

  // Fetch Related Staff Member
  const staffRef = useMemoFirebase(() => {
    if (!firestore || !dispatch?.assignedToStaffMemberId) return null
    return doc(firestore, "staffMembers", dispatch.assignedToStaffMemberId)
  }, [firestore, dispatch?.assignedToStaffMemberId])
  const { data: staffMember } = useDoc(staffRef)

  const handleDelete = () => {
    if (!firestore || !id) return
    if (window.confirm("PERMANENT REMOVAL: Delete this dispatch record? This action does not reverse inventory depletion and is for audit correction only.")) {
      deleteDocumentNonBlocking(doc(firestore, "inventoryDispatches", id))
      toast({ variant: "destructive", title: "Record Deleted" })
      router.push("/dispatch")
    }
  }

  if (isUserLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Retrieving Transaction Data...</p>
      </div>
    )
  }

  if (!dispatch) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="h-16 w-16 mx-auto opacity-20" />
        <h2 className="text-2xl font-black uppercase mt-4">Record Not Found</h2>
        <Button asChild variant="link" className="mt-4 font-black uppercase"><Link href="/dispatch">Return to Dispatch Log</Link></Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild className="border-2 border-black rounded-none font-black h-10 px-4">
          <Link href="/dispatch"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Log</Link>
        </Button>
        <Button onClick={handleDelete} variant="destructive" className="rounded-none font-black h-10 uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all">
          <Trash2 className="mr-2 h-4 w-4" /> Terminate Record
        </Button>
      </div>

      <div className="space-y-6">
        <Card className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
          <CardHeader className="bg-black text-white py-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                <Package className="h-6 w-6" /> Material Dispatch
              </CardTitle>
              <Badge className="bg-white text-black font-black uppercase rounded-none border-2 border-black text-xs px-3">
                ID: {id.slice(-6).toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between gap-6 pb-6 border-b-4 border-black border-dashed">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Material Item</Label>
                <h3 className="text-2xl font-black uppercase">{inventoryItem?.name || "Unknown Item"}</h3>
              </div>
              <div className="space-y-1 text-left md:text-right">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Quantity Dispatched</Label>
                <h3 className="text-4xl font-black uppercase">x {dispatch.quantity}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> Assigned Technician
                  </Label>
                  <p className="font-black text-lg uppercase leading-tight">
                    {staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : "Unassigned / Deleted Staff"}
                  </p>
                  {staffMember && <p className="text-[10px] font-bold text-muted-foreground uppercase">{staffMember.officialRole}</p>}
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Job Phase
                  </Label>
                  <Badge variant="outline" className="text-lg font-black border-2 border-black rounded-none uppercase px-4 py-1">
                    {dispatch.purpose || "GENERAL"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Delivery Destination
                  </Label>
                  <p className="font-black text-lg uppercase leading-tight">{dispatch.deliveryAddress || "Not specified"}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Dispatch Timestamp
                  </Label>
                  <p className="font-bold text-sm uppercase">
                    {new Date(dispatch.dispatchDateTime).toLocaleString(undefined, { 
                      dateStyle: 'full', 
                      timeStyle: 'medium' 
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t-2 border-black/5 bg-muted/10 p-4 border-2 border-black border-dashed">
              <p className="text-[9px] font-black uppercase text-muted-foreground text-center">
                This transaction was authorized by ADMIN at {new Date(dispatch.createdAt?.seconds * 1000).toLocaleString()}. 
                Synchronized with Telegram notification bridge.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
