
"use client"

import { useState, useEffect } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { useRouter } from "next/navigation"
import { collection, doc, writeBatch, serverTimestamp, orderBy, query, where } from "firebase/firestore"
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ClipboardList, Send, Loader2, MapPin, History, Trash2, BellRing, Plus, Search, Check, ArrowRight, ShieldAlert, CheckCircle2, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { notifyDispatch } from "@/ai/flows/notify-dispatch-flow"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function DispatchPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [items, setItems] = useState([
    { id: Date.now(), inventoryItemId: "", quantity: 1 }
  ])
  
  // Search state for searchable item picker
  const [inventorySearch, setInventorySearch] = useState("")
  const [openPickerId, setOpenPickerId] = useState<number | null>(null)

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user])
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/auth")
    }
  }, [user, isUserLoading, router])

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

  // Pending requests for review
  const pendingRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "materialRequests"), where("status", "==", "pending"), orderBy("requestTime", "desc"))
  }, [firestore, user])
  const { data: pendingRequests, isLoading: isReqLoading } = useCollection(pendingRequestsQuery)

  if (isUserLoading || isProfileLoading || !user) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin" /></div>

  const role = profile?.role || "WORKER"
  const isAdmin = role === "ADMIN"
  const isApproved = profile?.status === "approved" || isAdmin
  const canAccess = isAdmin || role === "INVENTORY"

  if (!isApproved || !canAccess) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <ShieldAlert className="h-16 w-16 mx-auto text-black" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Access Denied</h2>
        <p className="text-muted-foreground font-bold">Your account is not authorized to access the dispatch portal.</p>
        <Button asChild variant="outline" className="border-2 border-black rounded-none uppercase font-black">
          <Link href="/">Return to Terminal</Link>
        </Button>
      </div>
    )
  }

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

  const handleAuthorizeRequest = async (req: any) => {
    if (!firestore || !user || isSubmitting) return
    setIsSubmitting(true)

    try {
      const batch = writeBatch(firestore)
      const dispatchRef = doc(collection(firestore, "inventoryDispatches"))
      const itemRef = doc(firestore, "inventoryItems", req.itemId)
      const reqRef = doc(firestore, "materialRequests", req.id)
      const inventoryItem = inventoryItems?.find(i => i.id === req.itemId)

      batch.set(dispatchRef, {
        inventoryItemId: req.itemId,
        quantity: Number(req.quantity),
        dispatchDateTime: new Date().toISOString(),
        dispatchedByStaffMemberId: user.uid,
        assignedToStaffMemberId: req.workerUid, 
        purpose: req.category,
        deliveryAddress: req.deliveryAddress,
        createdAt: serverTimestamp()
      })

      if (inventoryItem) {
        batch.update(itemRef, {
          currentStock: (inventoryItem.currentStock || 0) - Number(req.quantity)
        })
      }

      batch.update(reqRef, {
        status: "dispatched",
        dispatchedAt: new Date().toISOString()
      })

      await batch.commit()
      toast({ title: "Request Authorized", description: "Material dispatched and inventory updated." })

      if (telegramSettings?.chatId && inventoryItem) {
        notifyDispatch({
          itemName: inventoryItem.name,
          quantity: Number(req.quantity),
          assignedTo: req.workerName,
          purpose: req.category,
          address: req.deliveryAddress,
          chatId: telegramSettings.chatId
        }).catch(console.error)
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Authorization failed." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeclineRequest = (reqId: string) => {
    if (!firestore || isSubmitting) return
    updateDocumentNonBlocking(doc(firestore, "materialRequests", reqId), {
      status: "rejected",
      rejectedAt: new Date().toISOString()
    })
    toast({ variant: "destructive", title: "Request Rejected", description: "Worker material request has been declined." })
  }

  const handleDeleteRequest = (reqId: string) => {
    if (!firestore) return
    if (window.confirm("PERMANENT REMOVAL: Delete this pending request? This cannot be undone.")) {
      deleteDocumentNonBlocking(doc(firestore, "materialRequests", reqId))
      toast({ variant: "destructive", title: "Request Deleted", description: "Record removed from system." })
    }
  }

  const handleDeleteDispatch = (dispatch: any) => {
    if (!firestore) return
    
    const confirmed = window.confirm(`TERMINATE LOG: Remove this dispatch record from history? This action is permanent and does not reverse inventory depletion.`)
    
    if (confirmed) {
      deleteDocumentNonBlocking(doc(firestore, "inventoryDispatches", dispatch.id))
      toast({ variant: "destructive", title: "Record Deleted", description: "Dispatch log removed from history." })
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!firestore || !user || isSubmitting) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const assignedToStaffMemberId = formData.get("assignedTo") as string
    const purpose = formData.get("purpose") as string
    const deliveryAddress = formData.get("deliveryAddress") as string

    const assignedStaff = staffMembers?.find(s => s.id === assignedToStaffMemberId);
    const staffName = assignedStaff ? `${assignedStaff.firstName} ${assignedStaff.lastName}` : "Unknown";

    const selectedItems = items.filter(i => i.inventoryItemId)
    if (selectedItems.length === 0) {
      toast({ variant: "destructive", title: "Selection Error", description: "Please select at least one material to dispatch." })
      setIsSubmitting(false)
      return
    }

    try {
      const batch = writeBatch(firestore)
      const dispatchDataForNotification: any[] = []

      for (const item of selectedItems) {
        const dispatchRef = doc(collection(firestore, "inventoryDispatches"))
        const itemRef = doc(firestore, "inventoryItems", item.inventoryItemId)
        const inventoryItem = inventoryItems?.find(i => i.id === item.inventoryItemId)

        batch.set(dispatchRef, {
          inventoryItemId: item.inventoryItemId,
          quantity: Number(item.quantity),
          dispatchDateTime: new Date().toISOString(),
          dispatchedByStaffMemberId: user.uid,
          assignedToStaffMemberId,
          purpose,
          deliveryAddress,
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
      
      if (telegramSettings?.chatId) {
        for (const data of dispatchDataForNotification) {
          notifyDispatch({
            ...data,
            assignedTo: staffName,
            purpose,
            address: deliveryAddress,
            chatId: telegramSettings.chatId
          }).catch(console.error)
        }
      }

      setItems([{ id: Date.now(), inventoryItemId: "", quantity: 1 }])
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to record dispatch." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredInventory = (search: string) => {
    if (!inventoryItems) return []
    return inventoryItems.filter(item => 
      item.name.toLowerCase().includes(search.toLowerCase())
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
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

      <div className="space-y-4">
        <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /><h2 className="text-2xl font-black uppercase">Pending Material Requests</h2></div>
        <Card className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-black">
                <TableRow className="hover:bg-black">
                  <TableHead className="text-white font-black uppercase text-[10px]">Worker</TableHead>
                  <TableHead className="text-white font-black uppercase text-[10px]">Material</TableHead>
                  <TableHead className="text-white font-black uppercase text-[10px] hidden md:table-cell">Job Phase</TableHead>
                  <TableHead className="text-white font-black uppercase text-[10px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isReqLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                ) : (
                  pendingRequests?.map((req) => (
                    <TableRow key={req.id} className="border-b-2 border-black/10 hover:bg-muted/30">
                      <TableCell>
                        <div className="font-black uppercase text-xs">{req.workerName}</div>
                        <div className="text-[9px] font-bold text-muted-foreground uppercase"><MapPin className="h-2 w-2 inline mr-1" />{req.deliveryAddress}</div>
                      </TableCell>
                      <TableCell className="font-black uppercase text-xs">{req.itemName} x{req.quantity}</TableCell>
                      <TableCell className="hidden md:table-cell font-bold uppercase text-[10px]">{req.category}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            onClick={() => handleAuthorizeRequest(req)}
                            disabled={isSubmitting}
                            className="h-8 bg-black text-white rounded-none text-[9px] font-black uppercase px-3"
                          >
                            Authorize
                          </Button>
                          <Button 
                            onClick={() => handleDeclineRequest(req.id)}
                            disabled={isSubmitting}
                            variant="outline"
                            className="h-8 border-2 border-black rounded-none text-[9px] font-black uppercase px-3 hover:bg-black hover:text-white"
                          >
                            Decline
                          </Button>
                          <Button 
                            onClick={() => handleDeleteRequest(req.id)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive hover:text-white rounded-none border-2 border-transparent hover:border-black"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {(!pendingRequests || pendingRequests.length === 0) && !isReqLoading && (
                  <TableRow><TableCell colSpan={4} className="py-12 text-center text-[10px] font-black uppercase text-muted-foreground">No pending requests for review.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2"><Plus className="h-5 w-5" /><h2 className="text-2xl font-black uppercase">Manual Dispatch Entry</h2></div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Card className="lg:col-span-7 border-2 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            <CardHeader className="bg-muted/20 border-b-2 border-black py-4">
              <CardTitle className="text-xl font-black uppercase flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Material List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {items.map((row) => (
                <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-8">
                    <Popover 
                      open={openPickerId === row.id} 
                      onOpenChange={(open) => {
                        if (open) {
                          setOpenPickerId(row.id)
                          setInventorySearch("")
                        } else {
                          setOpenPickerId(null)
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between h-10 border-2 border-black rounded-none font-bold text-left px-3",
                            !row.inventoryItemId && "text-muted-foreground"
                          )}
                        >
                          <span className="truncate">
                            {row.inventoryItemId
                              ? inventoryItems?.find((item) => item.id === row.inventoryItemId)?.name
                              : "Select item..."}
                          </span>
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] border-2 border-black rounded-none" align="start">
                        <div className="p-2 border-b-2 border-black bg-muted/10">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Search parts..."
                              className="pl-7 h-9 border-2 border-black rounded-none text-xs font-bold"
                              value={inventorySearch}
                              onChange={(e) => setInventorySearch(e.target.value)}
                            />
                          </div>
                        </div>
                        <ScrollArea className="h-40 md:h-60">
                          <div className="p-1">
                            {filteredInventory(inventorySearch).map((item) => (
                              <Button
                                key={item.id}
                                variant="ghost"
                                className={cn(
                                  "w-full justify-start text-xs font-bold rounded-none h-9 hover:bg-black hover:text-white transition-colors flex items-center gap-2",
                                  row.inventoryItemId === item.id && "bg-muted"
                                )}
                                onClick={() => {
                                  handleItemChange(row.id, "inventoryItemId", item.id)
                                  setOpenPickerId(null)
                                }}
                              >
                                <div className={cn("h-3 w-3 shrink-0 flex items-center justify-center", row.inventoryItemId === item.id ? "opacity-100" : "opacity-0")}>
                                  <Check className="h-3 w-3" />
                                </div>
                                <span className="truncate flex-1">{item.name}</span>
                                <span className="text-[9px] opacity-60 font-black uppercase whitespace-nowrap">{item.currentStock} left</span>
                              </Button>
                            ))}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="col-span-3">
                    <Input 
                      type="number" 
                      min="1" 
                      defaultValue="1" 
                      onChange={(e) => handleItemChange(row.id, "quantity", e.target.value)} 
                      className="h-10 border-2 border-black rounded-none font-black text-center" 
                    />
                  </div>
                  <div className="col-span-1">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeItemRow(row.id)} 
                      className="text-destructive hover:bg-destructive hover:text-white rounded-none border-2 border-transparent hover:border-black transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button 
                type="button" 
                variant="outline" 
                onClick={addItemRow} 
                className="w-full h-10 border-2 border-black border-dashed rounded-none font-black uppercase"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-5 border-2 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            <CardHeader className="bg-muted/20 border-b-2 border-black py-4">
              <CardTitle className="text-xl font-black uppercase">Dispatch Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1">
                <Label className="font-black uppercase text-[10px]">Assigned Technician</Label>
                <Select name="assignedTo" required>
                  <SelectTrigger className="h-10 border-2 border-black rounded-none font-bold">
                    <SelectValue placeholder="Choose personnel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers?.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id} className="font-bold">
                        {staff.firstName} {staff.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="font-black uppercase text-[10px]">Job Phase / Category</Label>
                <Select name="purpose" required>
                  <SelectTrigger className="h-10 border-2 border-black rounded-none font-bold">
                    <SelectValue placeholder="Select Phase..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROUGH" className="font-bold">ROUGH</SelectItem>
                    <SelectItem value="FINAL" className="font-bold">FINAL</SelectItem>
                    <SelectItem value="UNDERSLAB" className="font-bold">UNDERSLAB</SelectItem>
                    <SelectItem value="EXTRA (side job)" className="font-bold">EXTRA (side job)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="font-black uppercase text-[10px]">Delivery Address</Label>
                <Input name="deliveryAddress" required className="h-10 border-2 border-black rounded-none font-bold" />
              </div>
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full h-14 bg-black text-white rounded-none font-black text-lg uppercase mt-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="mr-2" />} AUTHORIZE DISPATCH
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>

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
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" asChild className="rounded-none border-2 border-transparent hover:border-black">
                              <Link href={`/dispatch/${dispatch.id}`}><ArrowRight className="h-4 w-4" /></Link>
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteDispatch(dispatch)} className="rounded-none text-destructive hover:bg-destructive hover:text-white border-2 border-transparent hover:border-black"><Trash2 className="h-4 w-4" /></Button>
                          </div>
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
    </div>
  )
}
