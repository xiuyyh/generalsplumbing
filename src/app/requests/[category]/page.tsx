
"use client"

import { useState, useEffect } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { useParams, useRouter } from "next/navigation"
import { collection, query, orderBy, doc, writeBatch, serverTimestamp, where } from "firebase/firestore"
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
import { 
  Hammer, 
  Send, 
  Loader2, 
  MapPin, 
  Search, 
  Clock, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  ShoppingBag,
  PackageCheck
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { notifyNewRequest } from "@/ai/flows/notify-request-flow"

interface BasketItem {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
}

export default function RequestCategoryPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const params = useParams()
  const router = useRouter()
  const categoryStr = (params.category as string) || ""
  const category = categoryStr.charAt(0).toUpperCase() + categoryStr.slice(1)
  
  const [basket, setBasket] = useState<BasketItem[]>([])
  const [address, setAddress] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inventorySearch, setInventorySearch] = useState("")
  const [openPicker, setOpenPicker] = useState(false)
  
  // Selection state for current item being added to basket
  const [selectedItemId, setSelectedItemId] = useState("")
  const [itemQuantity, setItemQuantity] = useState<number | "">(1)

  const userRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user])
  const { data: profile, isLoading: isProfileLoading } = useDoc(userRef)

  const telegramSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, "appSettings", "telegram")
  }, [firestore])
  const { data: telegramSettings } = useDoc(telegramSettingsRef)

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "inventoryItems"), orderBy("name", "asc"))
  }, [firestore, user])
  const { data: inventoryItems } = useCollection(inventoryQuery)

  const requestsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !category) return null
    return query(
      collection(firestore, "materialRequests"), 
      where("category", "==", category),
      orderBy("requestTime", "desc")
    )
  }, [firestore, user, category])
  const { data: requests, isLoading: isRequestsLoading } = useCollection(requestsQuery)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/auth")
    }
  }, [user, isUserLoading, router])

  if (isUserLoading || isProfileLoading || !user) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin" /></div>

  const role = profile?.role || "WORKER"
  const isAdmin = role === "ADMIN"
  const isApproved = profile?.status === "approved" || isAdmin
  const canAccess = isAdmin || role === "WORKER"

  if (!isApproved || !canAccess) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <ShieldAlert className="h-16 w-16 mx-auto text-black" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Access Denied</h2>
        <p className="text-muted-foreground font-bold">Your account is not authorized to access the material request portal.</p>
        <Button asChild variant="outline" className="border-2 border-black rounded-none uppercase font-black">
          <Link href="/">Return to Terminal</Link>
        </Button>
      </div>
    )
  }

  const addToBasket = () => {
    const qty = typeof itemQuantity === 'number' ? itemQuantity : 0
    if (!selectedItemId || qty <= 0) return

    const item = inventoryItems?.find(i => i.id === selectedItemId)
    if (!item) return

    const existingIndex = basket.findIndex(b => b.itemId === selectedItemId)
    if (existingIndex > -1) {
      const newBasket = [...basket]
      newBasket[existingIndex].quantity += qty
      setBasket(newBasket)
    } else {
      setBasket([...basket, {
        id: Math.random().toString(36).substr(2, 9),
        itemId: selectedItemId,
        itemName: item.name,
        quantity: qty
      }])
    }

    setSelectedItemId("")
    setItemQuantity(1)
  }

  const removeFromBasket = (id: string) => {
    setBasket(basket.filter(item => item.id !== id))
  }

  const handleFinalSubmit = async () => {
    if (!firestore || !user || isSubmitting || basket.length === 0 || !address) return
    setIsSubmitting(true)

    const workerName = profile?.displayName || user.email || "Unknown Worker"
    const batch = writeBatch(firestore)
    const requestTime = new Date().toISOString()

    try {
      basket.forEach(item => {
        const reqRef = doc(collection(firestore, "materialRequests"))
        batch.set(reqRef, {
          workerUid: user.uid,
          workerName: workerName,
          category,
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: item.quantity,
          deliveryAddress: address,
          requestTime: requestTime,
          status: "pending",
          createdAt: serverTimestamp()
        })
      })

      await batch.commit()

      if (telegramSettings?.chatId) {
        notifyNewRequest({
          workerName: workerName,
          items: basket.map(b => ({ name: b.itemName, quantity: b.quantity })),
          category: category,
          address: address,
          chatId: telegramSettings.chatId
        }).catch(console.error)
      }

      toast({ title: "Order Authorized", description: `${basket.length} items logged for ${category} phase.` })
      setBasket([])
      setAddress("")
    } catch (err) {
      toast({ variant: "destructive", title: "System Error", description: "Failed to finalize material request." })
    } finally {
      setIsSubmitting(false)
    }
  }

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
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
            <CardHeader className="bg-black text-white py-4">
              <CardTitle className="text-xl font-black uppercase flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" /> Build Request
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase opacity-60">Site Address (FOR ALL ITEMS)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="e.g. 123 Main St, Suite 101" 
                    className="h-12 border-2 border-black rounded-none font-bold pl-10" 
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t-4 border-black border-dashed">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase opacity-60">Select Material</Label>
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
                    <Input 
                      type="number" 
                      min="1" 
                      value={itemQuantity} 
                      onChange={(e) => setItemQuantity(e.target.value === "" ? "" : Number(e.target.value))} 
                      className="h-10 border-2 border-black rounded-none font-black" 
                    />
                  </div>
                  <div className="space-y-1 flex items-end">
                    <Button 
                      type="button" 
                      onClick={addToBasket} 
                      disabled={!selectedItemId || !itemQuantity}
                      className="w-full h-10 border-2 border-black rounded-none font-black text-xs uppercase hover:bg-black hover:text-white transition-all"
                    >
                      <Plus className="mr-1 h-3 w-3" /> ADD TO LIST
                    </Button>
                  </div>
                </div>
              </div>

              {basket.length > 0 && (
                <div className="space-y-4 pt-6">
                  <Label className="text-[10px] font-black uppercase flex items-center gap-2">
                    <PackageCheck className="h-4 w-4" /> Pending List Breakdown
                  </Label>
                  <div className="space-y-2">
                    {basket.map(item => (
                      <div key={item.id} className="flex items-center justify-between border-2 border-black p-2 bg-muted/5">
                        <div className="flex-1">
                          <p className="text-[11px] font-black uppercase truncate">{item.itemName}</p>
                          <p className="text-[10px] font-bold text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeFromBasket(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button 
                    onClick={handleFinalSubmit} 
                    disabled={isSubmitting || !address} 
                    className="w-full h-14 bg-black text-white font-black text-lg uppercase rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "FINALIZE REQUEST"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2"><Clock className="h-5 w-5" /><h2 className="text-2xl font-black uppercase">Active Requests</h2></div>
          <Card className="border-2 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-black">
                  <TableRow className="hover:bg-black">
                    <TableHead className="text-white font-black uppercase text-[10px]">Material</TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px] hidden md:table-cell">Status</TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px] text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isRequestsLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                  ) : (
                    requests?.map((req) => (
                      <TableRow key={req.id} className="border-b-2 border-black/10 hover:bg-muted/30">
                        <TableCell>
                          <div className="font-black uppercase text-xs">{req.itemName} x{req.quantity}</div>
                          <div className="text-[9px] font-bold text-muted-foreground uppercase">
                            <MapPin className="h-2 w-2 inline mr-1" />{req.deliveryAddress}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge className={cn(
                            "rounded-none font-black uppercase text-[8px] h-5",
                            req.status === 'dispatched' ? "bg-green-600" : req.status === 'rejected' ? "bg-red-600" : "bg-amber-500"
                          )}>
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-[9px]">
                          {new Date(req.requestTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {(!requests || requests.length === 0) && !isRequestsLoading && (
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
