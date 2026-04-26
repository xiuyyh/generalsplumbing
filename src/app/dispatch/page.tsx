"use client"

import { useState, useEffect } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { useRouter } from "next/navigation"
import { collection, doc, writeBatch, serverTimestamp, orderBy, query } from "firebase/firestore"
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Truck, Plus, Trash2, ClipboardList, Send, Loader2, MapPin, History, AlertTriangle, BellRing } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { notifyDispatch } from "@/ai/flows/notify-dispatch-flow"

export default function DispatchPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDispatch, setSelectedDispatch] = useState<any>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [items, setItems] = useState([
    { id: Date.now(), inventoryItemId: "", quantity: 1 }
  ])

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/auth")
    }
  }, [user, isUserLoading, router])

  // Fetch Telegram Settings
  const settingsRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, "appSettings", "telegram")
  }, [firestore])
  const { data: telegramSettings } = useDoc(settingsRef)

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "inventoryItems")
  }, [firestore, user])
  const { data: inventoryItems } = useCollection(inventoryQuery)

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "staffMembers")
  }, [firestore, user])
  const { data: staffMembers } = useCollection(staffQuery)

  const recentDispatchesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "inventoryDispatches"), orderBy("dispatchDateTime", "desc"))
  }, [firestore, user])
  const { data: dispatches, isLoading: isDispLoading } = useCollection(recentDispatchesQuery)

  const addItemRow = () => {
    setItems([...items, { id: Date.now(), inventoryItemId: "", quantity: 1 }])
  }

  const removeItemRow = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const handleItemChange = (id: number, field: string, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const handleDeleteDispatch = () => {
    if (!firestore || !selectedDispatch) return
    deleteDocumentNonBlocking(doc(firestore, "inventoryDispatches", selectedDispatch.id))
    toast({ variant: "destructive", title: "Record Deleted", description: "Dispatch log removed from history." })
    setIsDeleteDialogOpen(false)
    setSelectedDispatch(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!firestore || !user || isSubmitting) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const assignedToStaffMemberId = formData.get("assignedTo") as string
    const purpose = formData.get("purpose") as string
    const deliveryAddress = formData.get("deliveryAddress") as string
    const notes = formData.get("notes") as string

    const assignedStaff = staffMembers?.find(s => s.id === assignedToStaffMemberId);
    const staffName = assignedStaff ? `${assignedStaff.firstName} ${assignedStaff.lastName}` : "Unknown";

    try {
      const batch = writeBatch(firestore)
      const dispatchDataForNotification: any[] = []

      for (const item of items) {
        if (!item.inventoryItemId) continue
        const dispatchRef = doc(collection(firestore, "inventoryDispatches"))
        const itemRef = doc(firestore, "inventoryItems", item.inventoryItemId)
        const inventoryItem = inventoryItems?.find(i => i.id === item.inventoryItemId)

        batch.set(dispatchRef, {
          inventoryItemId: item.inventoryItemId,
          quantity: Number(item.quantity),
          dispatchDateTime: new Date().toISOString(),
          dispatchedByStaffMemberId: "ADMIN",
          assignedToStaffMemberId,
          purpose,
          deliveryAddress,
          notes,
          createdAt: serverTimestamp()
        })

        if (inventoryItem) {
          batch.update(itemRef, {
            currentStock: (inventoryItem.currentStock || 0) - Number(item.quantity)
          })
          dispatchDataForNotification.push({
            itemName: inventoryItem.name,
            quantity: Number(item.quantity),
            unit: inventoryItem.unitOfMeasure
          })
        }
      }
      
      await batch.commit()
      toast({ title: "Dispatch Recorded", description: "Inventory updated." })
      
      // Send Telegram Notifications
      if (telegramSettings?.chatId) {
        for (const data of dispatchDataForNotification) {
          notifyDispatch({
            ...data,
            assignedTo: staffName,
            purpose,
            address: deliveryAddress,
            notes,
            chatId: telegramSettings.chatId
          }).catch(err => {
            console.error("Notification Flow Error:", err);
            toast({
              variant: "destructive",
              title: "Notification Failed",
              description: "The alert could not be sent. Check logs or API settings."
            });
          });
        }
      }

      setItems([{ id: Date.now(), inventoryItemId: "", quantity: 1 }])
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to record dispatch." })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isUserLoading || !user) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin" /></div>

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Inventory Dispatch</h1>
          <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Administrative Material Outflow Log</p>
        </div>
        {telegramSettings?.chatId && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 border-2 border-green-200">
            <BellRing className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase">Telegram Alerts Active</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-7 border-2 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader className="bg-muted/20 border-b-2 border-black py-4">
            <CardTitle className="text-xl font-black uppercase flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Material List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {items.map((row) => (
              <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-8">
                  <Select required onValueChange={(val) => handleItemChange(row.id, "inventoryItemId", val)}>
                    <SelectTrigger className="h-10 border-2 border-black rounded-none font-bold"><SelectValue placeholder="Select item..." /></SelectTrigger>
                    <SelectContent>
                      {inventoryItems?.map((item) => (
                        <SelectItem key={item.id} value={item.id} className="font-bold">{item.name} ({item.currentStock} {item.unitOfMeasure} left)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3"><Input type="number" min="1" defaultValue="1" onChange={(e) => handleItemChange(row.id, "quantity", e.target.value)} className="h-10 border-2 border-black rounded-none font-black text-center" /></div>
                <div className="col-span-1"><Button type="button" variant="ghost" size="icon" onClick={() => removeItemRow(row.id)} className="text-destructive hover:bg-destructive hover:text-white rounded-none border-2 border-transparent hover:border-black transition-all"><Trash2 className="h-4 w-4" /></Button></div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addItemRow} className="w-full h-10 border-2 border-black border-dashed rounded-none font-black uppercase"><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 border-2 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader className="bg-muted/20 border-b-2 border-black py-4"><CardTitle className="text-xl font-black uppercase">Dispatch Context</CardTitle></CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1"><Label className="font-black uppercase text-[10px]">Assigned Technician</Label><Select name="assignedTo" required><SelectTrigger className="h-10 border-2 border-black rounded-none font-bold"><SelectValue placeholder="Choose personnel..." /></SelectTrigger><SelectContent>{staffMembers?.map((staff) => (<SelectItem key={staff.id} value={staff.id} className="font-bold">{staff.firstName} {staff.lastName}</SelectItem>))}</SelectContent></Select></div>
            <div className="space-y-1"><Label className="font-black uppercase text-[10px]">Reference / Job #</Label><Input name="purpose" required className="h-10 border-2 border-black rounded-none font-bold" /></div>
            <div className="space-y-1"><Label className="font-black uppercase text-[10px]">Delivery Address</Label><Input name="deliveryAddress" required className="h-10 border-2 border-black rounded-none font-bold" /></div>
            <div className="space-y-1"><Label className="font-black uppercase text-[10px]">Internal Notes</Label><Input name="notes" className="h-10 border-2 border-black rounded-none font-bold" /></div>
            <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-black text-white rounded-none font-black text-lg uppercase mt-2">{isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="mr-2" />} AUTHORIZE DISPATCH</Button>
          </CardContent>
        </Card>
      </form>

      <div className="space-y-4">
        <div className="flex items-center gap-2"><History className="h-5 w-5" /><h2 className="text-2xl font-black uppercase">Recent Activity</h2></div>
        <Card className="border-2 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-black">
                <TableRow className="hover:bg-black">
                  <TableHead className="text-white font-black uppercase text-xs">Item</TableHead>
                  <TableHead className="text-white font-black uppercase text-xs">Technician</TableHead>
                  <TableHead className="text-white font-black uppercase text-xs hidden md:table-cell">Address</TableHead>
                  <TableHead className="text-white font-black uppercase text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isDispLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                ) : (
                  dispatches?.map((dispatch) => {
                    const item = inventoryItems?.find(i => i.id === dispatch.inventoryItemId)
                    const staff = staffMembers?.find(s => s.id === dispatch.assignedToStaffMemberId)
                    return (
                      <TableRow key={dispatch.id} className="border-b-2 border-black/10 hover:bg-muted/30">
                        <TableCell className="font-black uppercase text-xs">{item?.name} x{dispatch.quantity}</TableCell>
                        <TableCell className="font-bold uppercase text-[10px]">{staff ? `${staff.firstName} ${staff.lastName}` : "Unknown"}</TableCell>
                        <TableCell className="hidden md:table-cell text-[10px] font-bold uppercase"><MapPin className="h-3 w-3 inline mr-1" />{dispatch.deliveryAddress || "Not set"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => { setSelectedDispatch(dispatch); setIsDeleteDialogOpen(true); }} className="rounded-none text-destructive hover:bg-destructive hover:text-white border-2 border-transparent hover:border-black"><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="border-4 border-black rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-destructive" /> TERMINATE LOG</AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-black uppercase text-[11px]">Remove this dispatch record from history? This action is permanent and does not reverse inventory depletion.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-black rounded-none font-black text-xs">ABORT</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDispatch} className="bg-destructive text-white border-2 border-black rounded-none font-black text-xs">CONFIRM DELETE</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
