
"use client"

import { useState, useEffect } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { useParams, useRouter } from "next/navigation"
import { collection, query, orderBy, doc, addDoc, serverTimestamp, updateDoc } from "firebase/firestore"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Hammer, Send, Loader2, MapPin, Search, Check, Clock, CheckCircle2, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function RequestCategoryPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const params = useParams()
  const router = useRouter()
  const category = (params.category as string).charAt(0).toUpperCase() + (params.category as string).slice(1)
  
  const [selectedItemId, setSelectedItemId] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [address, setAddress] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inventorySearch, setInventorySearch] = useState("")
  const [openPicker, setOpenPicker] = useState(false)

  const userRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user])
  const { data: profile } = useDoc(userRef)

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "inventoryItems"), orderBy("name", "asc"))
  }, [firestore, user])
  const { data: inventoryItems } = useCollection(inventoryQuery)

  const requestsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "materialRequests"), orderBy("requestTime", "desc"))
  }, [firestore, user])
  const { data: requests, isLoading: isRequestsLoading } = useCollection(requestsQuery)

  const filteredRequests = requests?.filter(r => r.category === category) || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firestore || !user || isSubmitting || !selectedItemId || !address) return
    setIsSubmitting(true)

    const item = inventoryItems?.find(i => i.id === selectedItemId)

    try {
      await addDoc(collection(firestore, "materialRequests"), {
        workerUid: user.uid,
        workerName: profile?.displayName || user.email || "Unknown Worker",
        category,
        itemId: selectedItemId,
        itemName: item?.name || "Unknown Item",
        quantity: Number(quantity),
        deliveryAddress: address,
        requestTime: new Date().toISOString(),
        status: "pending",
        createdAt: serverTimestamp()
      })

      toast({ title: "Request Sent", description: `Your ${category} material request has been logged.` })
      setSelectedItemId("")
      setQuantity(1)
      setAddress("")
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to submit request." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkDelivered = async (requestId: string) => {
    if (!firestore) return
    try {
      await updateDoc(doc(firestore, "materialRequests", requestId), {
        status: "delivered",
        deliveryTime: new Date().toISOString()
      })
      toast({ title: "Status Updated", description: "Marked as delivered." })
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Update failed." })
    }
  }

  if (isUserLoading || !user) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin" /></div>

  const filteredInventory = inventoryItems?.filter(item => 
    item.name.toLowerCase().includes(inventorySearch.toLowerCase())
  ) || []

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
            <Hammer className="h-10 w-10" /> {category} Requests
          </h1>
          <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest">Worker Material Procurement Portal</p>
        </div>
        <Badge className="bg-black text-white rounded-none border-2 border-black font-black uppercase px-4 py-1">
          Worker: {profile?.displayName || "Loading..."}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-5 border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
          <CardHeader className="bg-black text-white py-4">
            <CardTitle className="text-xl font-black uppercase">Create Request</CardTitle>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase opacity-60">Technician Name (Automated)</Label>
                <Input value={profile?.displayName || ""} disabled className="h-10 border-2 border-black rounded-none font-bold bg-muted" />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase opacity-60">Material Item</Label>
                <Popover open={openPicker} onOpenChange={setOpenPicker}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-10 border-2 border-black rounded-none font-bold px-3">
                      <span className="truncate">
                        {selectedItemId ? inventoryItems?.find(i => i.id === selectedItemId)?.name : "Search parts..."}
                      </span>
                      <Search className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] border-2 border-black rounded-none">
                    <div className="p-2 border-b-2 border-black bg-muted/10">
                      <Input
                        placeholder="Type to filter..."
                        className="h-8 border-2 border-black rounded-none text-xs font-bold"
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-40">
                      <div className="p-1">
                        {filteredInventory.map((item) => (
                          <Button
                            key={item.id}
                            variant="ghost"
                            className={cn(
                              "w-full justify-start text-xs font-bold rounded-none h-8 hover:bg-black hover:text-white transition-colors",
                              selectedItemId === item.id && "bg-muted"
                            )}
                            onClick={() => {
                              setSelectedItemId(item.id)
                              setOpenPicker(false)
                            }}
                          >
                            <span className="truncate">{item.name}</span>
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase opacity-60">Quantity</Label>
                  <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="h-10 border-2 border-black rounded-none font-black" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase opacity-60">Job Category</Label>
                  <Input value={category} disabled className="h-10 border-2 border-black rounded-none font-black bg-muted" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase opacity-60">Delivery Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full site address" className="h-10 border-2 border-black rounded-none font-bold" />
              </div>

              <Button type="submit" disabled={isSubmitting || !selectedItemId || !address} className="w-full h-14 bg-black text-white font-black text-lg uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all rounded-none">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="mr-2" />} SUBMIT REQUEST
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2"><Clock className="h-5 w-5" /><h2 className="text-2xl font-black uppercase">Active Requests</h2></div>
          <Card className="border-2 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-black">
                  <TableRow className="hover:bg-black">
                    <TableHead className="text-white font-black uppercase text-[10px]">Material</TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px]">Worker</TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px] hidden md:table-cell">Status</TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isRequestsLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                  ) : (
                    filteredRequests.map((req) => (
                      <TableRow key={req.id} className="border-b-2 border-black/10 hover:bg-muted/30">
                        <TableCell>
                          <div className="font-black uppercase text-xs">{req.itemName} x{req.quantity}</div>
                          <div className="text-[9px] font-bold text-muted-foreground uppercase"><MapPin className="h-2 w-2 inline mr-1" />{req.deliveryAddress}</div>
                        </TableCell>
                        <TableCell className="font-bold uppercase text-[9px]">{req.workerName}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge className={cn(
                            "rounded-none font-black uppercase text-[8px] h-5",
                            req.status === 'delivered' ? "bg-green-600" : "bg-amber-500"
                          )}>
                            {req.status}
                          </Badge>
                          {req.deliveryTime && <div className="text-[8px] font-black mt-1 uppercase">{new Date(req.deliveryTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>}
                        </TableCell>
                        <TableCell className="text-right">
                          {req.status === 'pending' && (profile?.role === 'ADMIN' || profile?.role === 'INVENTORY') && (
                            <Button size="sm" variant="outline" className="h-8 border-2 border-black rounded-none font-black uppercase text-[9px]" onClick={() => handleMarkDelivered(req.id)}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> DELIVERED
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {filteredRequests.length === 0 && !isRequestsLoading && (
                    <TableRow><TableCell colSpan={4} className="py-10 text-center text-[10px] font-black uppercase text-muted-foreground">No active {category} requests.</TableCell></TableRow>
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
