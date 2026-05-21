"use client"

import React, { useState, useEffect } from "react"
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
import { 
  ClipboardList, 
  Send, 
  Loader2, 
  MapPin, 
  History, 
  Trash2, 
  BellRing, 
  Plus, 
  Search, 
  Check, 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle2, 
  X,
  ChevronDown,
  ChevronRight,
  Layers,
  FileText,
  PackageCheck,
  PackageX,
  ThumbsUp,
  ThumbsDown,
  Info
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { notifyDispatch, notifyBatchDispatch } from "@/ai/flows/notify-dispatch-flow"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

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

  // Expanded batches state
  const [expandedBatches, setExpandedBatches] = useState<string[]>([])
  
  // Batch fulfillment state: Record<batchId, Record<requestId, { status: 'good' | 'bad', note: string }>>
  const [batchFulfillment, setBatchFulfillment] = useState<Record<string, Record<string, { isAvailable: boolean, note: string }>>>({})

  // Decline Dialog state for individual items
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false)
  const [rejectionRequestId, setRejectionRequestId] = useState<string | null>(null)
  const [rejectionNote, setRejectionNote] = useState("")

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
    return query(collection(firestore, "users"), where("status", "==", "approved"), orderBy("displayName", "asc"))
  }, [firestore, user])
  const { data: staffMembers } = useCollection(staffQuery)

  const recentDispatchesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "inventoryDispatches"), orderBy("dispatchDateTime", "desc"))
  }, [firestore, user])
  const { data: dispatches, isLoading: isDispLoading } = useCollection(recentDispatchesQuery)

  const pendingRequestsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "materialRequests"), where("status", "==", "pending"), orderBy("requestTime", "desc"))
  }, [firestore, user])
  const { data: pendingRequests, isLoading: isReqLoading } = useCollection(pendingRequestsQuery)

  // Group pending requests by batch (Worker + RequestTime)
  const groupedRequests = React.useMemo(() => {
    if (!pendingRequests) return [];
    const groups: Record<string, any> = {};
    
    pendingRequests.forEach(req => {
      const key = `${req.workerUid}_${req.requestTime}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          workerUid: req.workerUid,
          workerName: req.workerName,
          address: req.deliveryAddress,
          category: req.category,
          time: req.requestTime,
          items: []
        };
      }
      groups[key].items.push(req);
    });
    
    return Object.values(groups).sort((a: any, b: any) => 
      new Date(b.time).getTime() - new Date(a.time).getTime()
    );
  }, [pendingRequests]);

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

  const toggleBatch = (batchId: string) => {
    setExpandedBatches(prev => 
      prev.includes(batchId) ? prev.filter(id => id !== batchId) : [...prev, batchId]
    )
  }

  const updateItemFulfillment = (batchId: string, reqId: string, isAvailable: boolean, note: string = "") => {
    setBatchFulfillment(prev => ({
      ...prev,
      [batchId]: {
        ...(prev[batchId] || {}),
        [reqId]: { isAvailable, note }
      }
    }));
  }

  const handleProcessBatch = async (batch: any) => {
    if (!firestore || !user || isSubmitting) return;
    setIsSubmitting(true);

    const selections = batchFulfillment[batch.id] || {};
    const unselectedItems = batch.items.filter((item: any) => selections[item.id] === undefined);

    if (unselectedItems.length > 0) {
      toast({ variant: "destructive", title: "Incomplete Selection", description: "Please mark every item as Good or Bad before complete processing." });
      setIsSubmitting(false);
      return;
    }

    try {
      const fbBatch = writeBatch(firestore);
      const notificationItems: any[] = [];

      for (const req of batch.items) {
        const selection = selections[req.id];
        const reqRef = doc(firestore, "materialRequests", req.id);

        if (selection.isAvailable) {
          // Authorize/Dispatch
          const dispatchRef = doc(collection(firestore, "inventoryDispatches"));
          const itemRef = doc(firestore, "inventoryItems", req.itemId);
          const inventoryItem = inventoryItems?.find(i => i.id === req.itemId);

          fbBatch.set(dispatchRef, {
            inventoryItemId: req.itemId,
            quantity: Number(req.quantity),
            dispatchDateTime: new Date().toISOString(),
            dispatchedByStaffMemberId: user.uid,
            assignedToStaffMemberId: req.workerUid, 
            purpose: req.category,
            deliveryAddress: req.deliveryAddress,
            createdAt: serverTimestamp()
          });

          if (inventoryItem) {
            fbBatch.update(itemRef, {
              currentStock: (inventoryItem.currentStock || 0) - Number(req.quantity)
            });
          }

          fbBatch.update(reqRef, {
            status: "dispatched",
            dispatchedAt: new Date().toISOString()
          });

          notificationItems.push({
            name: req.itemName,
            quantity: req.quantity,
            isAvailable: true
          });
        } else {
          // Reject/Decline
          fbBatch.update(reqRef, {
            status: "rejected",
            rejectionNote: selection.note,
            rejectedAt: new Date().toISOString()
          });

          notificationItems.push({
            name: req.itemName,
            quantity: req.quantity,
            isAvailable: false,
            note: selection.note
          });
        }
      }

      await fbBatch.commit();
      toast({ title: "Batch Processed", description: "All requests finalized and synchronized." });

      if (telegramSettings?.chatId) {
        notifyBatchDispatch({
          workerName: batch.workerName,
          category: batch.category,
          address: batch.address,
          items: notificationItems,
          chatId: telegramSettings.chatId
        }).catch(console.error);
      }

      setExpandedBatches(prev => prev.filter(id => id !== batch.id));
    } catch (error) {
      console.error("Batch processing error:", error);
      toast({ variant: "destructive", title: "Processing Error", description: "Batch commit failed." });
    } finally {
      setIsSubmitting(false);
    }
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

  const handleDeclineRequest = () => {
    if (!firestore || !rejectionRequestId || isSubmitting) return
    
    updateDocumentNonBlocking(doc(firestore, "materialRequests", rejectionRequestId), {
      status: "rejected",
      rejectionNote: rejectionNote,
      rejectedAt: new Date().toISOString()
    })
    
    toast({ variant: "destructive", title: "Request Rejected", description: "Worker material request has been declined." })
    setIsDeclineDialogOpen(false)
    setRejectionRequestId(null)
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!firestore || !user || isSubmitting) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const assignedToStaffMemberId = formData.get("assignedTo") as string
    const purpose = formData.get("purpose") as string
    const deliveryAddress = formData.get("deliveryAddress") as string

    const assignedStaff = staffMembers?.find(s => s.uid === assignedToStaffMemberId || s.id === assignedToStaffMemberId);
    const staffName = assignedStaff ? assignedStaff.displayName : "Unknown";

    const selectedItems = items.filter(i => i.inventoryItemId)
    if (selectedItems.length === 0) {
      toast({ variant: "destructive", title: "Selection Error", description: "Please select at least one material to dispatch." })
      setIsSubmitting(false)
      return
    }

    try {
      const fbBatch = writeBatch(firestore)
      const dispatchDataForNotification: any[] = []

      for (const item of selectedItems) {
        const dispatchRef = doc(collection(firestore, "inventoryDispatches"))
        const itemRef = doc(firestore, "inventoryItems", item.inventoryItemId)
        const inventoryItem = inventoryItems?.find(i => i.id === item.inventoryItemId)

        fbBatch.set(dispatchRef, {
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
          fbBatch.update(itemRef, {
            currentStock: (inventoryItem.currentStock || 0) - Number(item.quantity)
          })
          dispatchDataForNotification.push({
            itemName: inventoryItem.name,
            quantity: Number(item.quantity),
            unit: inventoryItem.unitOfMeasure
          })
        }
      }
      
      await fbBatch.commit()
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
                  <TableHead className="text-white font-black uppercase text-[10px] w-12"></TableHead>
                  <TableHead className="text-white font-black uppercase text-[10px]">Worker</TableHead>
                  <TableHead className="text-white font-black uppercase text-[10px]">Material / Count</TableHead>
                  <TableHead className="text-white font-black uppercase text-[10px] hidden md:table-cell">Job Phase</TableHead>
                  <TableHead className="text-white font-black uppercase text-[10px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isReqLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                ) : (
                  groupedRequests.map((batch: any) => {
                    const isStacked = batch.items.length > 1;
                    const isExpanded = expandedBatches.includes(batch.id);

                    if (!isStacked) {
                      const req = batch.items[0];
                      return (
                        <TableRow key={req.id} className="border-b-2 border-black/10 hover:bg-muted/30">
                          <TableCell className="text-center"><FileText className="h-4 w-4 opacity-40 mx-auto" /></TableCell>
                          <TableCell>
                            <div className="font-black uppercase text-xs">{req.workerName}</div>
                            <div className="text-[9px] font-bold text-muted-foreground uppercase"><MapPin className="h-2 w-2 inline mr-1" />{req.deliveryAddress}</div>
                          </TableCell>
                          <TableCell className="font-black uppercase text-xs">{req.itemName} x{req.quantity}</TableCell>
                          <TableCell className="hidden md:table-cell font-bold uppercase text-[10px]">{req.category}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button onClick={() => handleAuthorizeRequest(req)} disabled={isSubmitting} className="h-8 bg-black text-white rounded-none text-[9px] font-black uppercase px-3">Authorize</Button>
                              <Button onClick={() => { setRejectionRequestId(req.id); setRejectionNote(""); setIsDeclineDialogOpen(true); }} disabled={isSubmitting} variant="outline" className="h-8 border-2 border-black rounded-none text-[9px] font-black uppercase px-3 hover:bg-black hover:text-white">Decline</Button>
                              <Button onClick={() => { if(window.confirm("Delete record?")) deleteDocumentNonBlocking(doc(firestore, "materialRequests", req.id))}} variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive hover:text-white rounded-none border-2 border-transparent hover:border-black"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return (
                      <React.Fragment key={batch.id}>
                        <TableRow 
                          className={cn(
                            "border-b-2 border-black/10 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors",
                            isExpanded && "bg-muted/50"
                          )}
                          onClick={() => toggleBatch(batch.id)}
                        >
                          <TableCell className="text-center">
                            {isExpanded ? <ChevronDown className="h-4 w-4 mx-auto" /> : <ChevronRight className="h-4 w-4 mx-auto" />}
                          </TableCell>
                          <TableCell>
                            <div className="font-black uppercase text-xs flex items-center gap-2">
                              {batch.workerName} 
                              <Badge className="bg-black text-white text-[8px] rounded-none px-1 h-4">STACKED</Badge>
                            </div>
                            <div className="text-[9px] font-bold text-muted-foreground uppercase"><MapPin className="h-2 w-2 inline mr-1" />{batch.address}</div>
                          </TableCell>
                          <TableCell className="font-black uppercase text-[10px] text-muted-foreground">
                            {batch.items.length} ITEMS IN BATCH
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-bold uppercase text-[10px]">{batch.category}</TableCell>
                          <TableCell className="text-right">
                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Expand for Bulk Action</p>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-white hover:bg-white border-b-2 border-black">
                            <TableCell colSpan={5} className="p-0">
                              <div className="p-4 space-y-4 bg-muted/5">
                                <div className="space-y-3">
                                  {batch.items.map((req: any) => {
                                    const selection = batchFulfillment[batch.id]?.[req.id] || { isAvailable: true, note: "" };
                                    return (
                                      <div key={req.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-b border-black/5 pb-3">
                                        <div className="md:col-span-5">
                                          <p className="font-black uppercase text-xs leading-tight">{req.itemName} x{req.quantity}</p>
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Request ID: {req.id.slice(-6)}</p>
                                        </div>
                                        <div className="md:col-span-3 flex items-center gap-1">
                                          <Button 
                                            size="sm"
                                            variant={selection.isAvailable ? "default" : "outline"}
                                            className={cn(
                                              "h-8 flex-1 rounded-none border-2 border-black font-black uppercase text-[9px] gap-1",
                                              selection.isAvailable ? "bg-green-600 hover:bg-green-700" : "bg-white text-muted-foreground"
                                            )}
                                            onClick={() => updateItemFulfillment(batch.id, req.id, true)}
                                          >
                                            <ThumbsUp className="h-3.5 w-3.5" /> Good
                                          </Button>
                                          <Button 
                                            size="sm"
                                            variant={!selection.isAvailable ? "destructive" : "outline"}
                                            className={cn(
                                              "h-8 flex-1 rounded-none border-2 border-black font-black uppercase text-[9px] gap-1",
                                              !selection.isAvailable ? "bg-red-600 hover:bg-red-700" : "bg-white text-muted-foreground"
                                            )}
                                            onClick={() => updateItemFulfillment(batch.id, req.id, false)}
                                          >
                                            <ThumbsDown className="h-3.5 w-3.5" /> Bad
                                          </Button>
                                        </div>
                                        <div className="md:col-span-4">
                                          {!selection.isAvailable && (
                                            <Input 
                                              placeholder="Reason (Optional)"
                                              value={selection.note}
                                              onChange={(e) => updateItemFulfillment(batch.id, req.id, false, e.target.value)}
                                              className="h-8 border-2 border-black rounded-none text-[10px] font-bold"
                                            />
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                                <div className="flex justify-end pt-2">
                                  <Button 
                                    onClick={() => handleProcessBatch(batch)}
                                    disabled={isSubmitting}
                                    className="bg-black text-white font-black rounded-none h-12 px-8 uppercase border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                                  >
                                    {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <PackageCheck className="mr-2 h-4 w-4" />}
                                    Complete Batch Fulfillment
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
                {groupedRequests.length === 0 && !isReqLoading && (
                  <TableRow><TableCell colSpan={5} className="py-12 text-center text-[10px] font-black uppercase text-muted-foreground">No pending requests for review.</TableCell></TableRow>
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
                      <SelectItem key={staff.uid || staff.id} value={staff.uid || staff.id} className="font-bold">
                        {staff.displayName}
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
                    <SelectItem value="UNDERSLAB" className="font-bold">UNDERSLAB</SelectItem>
                    <SelectItem value="FINAL" className="font-bold">FINAL</SelectItem>
                    <SelectItem value="EXTRA" className="font-bold">EXTRA</SelectItem>
                    <SelectItem value="WARRANTY" className="font-bold">WARRANTY</SelectItem>
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
                    const staff = staffMembers?.find(s => s.uid === dispatch.assignedToStaffMemberId || s.id === dispatch.assignedToStaffMemberId)
                    return (
                      <TableRow key={dispatch.id} className="border-b-2 border-black/10 hover:bg-muted/30">
                        <TableCell className="font-black uppercase text-xs">{item?.name} x{dispatch.quantity}</TableCell>
                        <TableCell className="font-bold uppercase text-[10px]">{staff ? staff.displayName : "Unknown"}</TableCell>
                        <TableCell className="hidden md:table-cell text-[10px] font-bold uppercase"><MapPin className="h-3 w-3 inline mr-1" />{dispatch.deliveryAddress || "Not set"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" asChild className="rounded-none border-2 border-transparent hover:border-black">
                              <Link href={`/dispatch/${dispatch.id}`}><ArrowRight className="h-4 w-4" /></Link>
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => { if(window.confirm("Delete log?")) deleteDocumentNonBlocking(doc(firestore, "inventoryDispatches", dispatch.id))}} className="rounded-none text-destructive hover:bg-destructive hover:text-white border-2 border-transparent hover:border-black"><Trash2 className="h-4 w-4" /></Button>
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

      <Dialog open={isDeclineDialogOpen} onOpenChange={setIsDeclineDialogOpen}>
        <DialogContent className="border-4 border-black rounded-none">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase">Decline Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="font-black uppercase text-[10px]">Rejection Reason / Note for Worker</Label>
              <Input 
                value={rejectionNote} 
                onChange={(e) => setRejectionNote(e.target.value)} 
                placeholder="e.g. Out of stock until next week." 
                className="h-12 border-2 border-black rounded-none font-bold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleDeclineRequest} 
              variant="destructive"
              className="w-full h-12 rounded-none font-black uppercase border-2 border-black"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
