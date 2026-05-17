
"use client"

import { useState, useEffect } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, query, orderBy, serverTimestamp } from "firebase/firestore"
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Package, 
  Plus, 
  Trash2, 
  Loader2, 
  ShieldAlert, 
  Boxes,
  Search,
  Check,
  X
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function BundleManagementPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [bundleName, setBundleName] = useState("")
  const [category, setCategory] = useState<string>("Rough")
  const [bundleItems, setBundleItems] = useState<{ itemId: string, itemName: string, quantity: number }[]>([])
  const [inventorySearch, setInventorySearch] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user])
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "inventoryItems"), orderBy("name", "asc"))
  }, [firestore, user])
  const { data: inventoryItems } = useCollection(inventoryQuery)

  const bundlesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "bundles"), orderBy("createdAt", "desc"))
  }, [firestore, user])
  const { data: bundles, isLoading: isBundlesLoading } = useCollection(bundlesQuery)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/auth")
    }
  }, [user, isUserLoading, router])

  if (isUserLoading || isProfileLoading || !user) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin" /></div>

  const isAdmin = profile?.role === "ADMIN"

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <ShieldAlert className="h-16 w-16 mx-auto text-black" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Access Denied</h2>
        <p className="text-muted-foreground font-bold">Only administrators can manage material bundles.</p>
      </div>
    )
  }

  const addItemToBundle = (item: any) => {
    if (bundleItems.find(i => i.itemId === item.id)) return
    setBundleItems([...bundleItems, { itemId: item.id, itemName: item.name, quantity: 1 }])
  }

  const removeItemFromBundle = (id: string) => {
    setBundleItems(bundleItems.filter(i => i.itemId !== id))
  }

  const updateQuantity = (id: string, qty: number) => {
    setBundleItems(bundleItems.map(i => i.itemId === id ? { ...i, quantity: qty } : i))
  }

  const handleCreateBundle = () => {
    if (!firestore || !bundleName || bundleItems.length === 0 || isSubmitting) return
    setIsSubmitting(true)

    const data = {
      name: bundleName,
      category,
      items: bundleItems,
      createdAt: new Date().toISOString()
    }

    addDocumentNonBlocking(collection(firestore, "bundles"), data)
    toast({ title: "Bundle Created", description: `${bundleName} added to ${category} phase.` })
    
    setBundleName("")
    setBundleItems([])
    setIsAddOpen(false)
    setIsSubmitting(false)
  }

  const handleDeleteBundle = (id: string) => {
    if (!firestore) return
    if (window.confirm("PERMANENT REMOVAL: Delete this pre-filled bundle?")) {
      deleteDocumentNonBlocking(doc(firestore, "bundles", id))
      toast({ variant: "destructive", title: "Bundle Deleted" })
    }
  }

  const filteredInventory = inventoryItems?.filter(i => 
    i.name.toLowerCase().includes(inventorySearch.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Bundle Terminal</h1>
          <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest">Pre-filled Phase Procurement Manager</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-black text-white font-black rounded-none h-12 px-8 border-2 border-black uppercase">
              <Plus className="mr-2 h-5 w-5" /> CREATE BUNDLE
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] border-4 border-black rounded-none max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-2xl font-black uppercase">Add Procurement Bundle</DialogTitle></DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="font-black uppercase text-[10px]">Bundle Name</Label>
                  <Input value={bundleName} onChange={(e) => setBundleName(e.target.value)} placeholder="e.g. Master Bath Rough-In Kit" className="border-2 border-black rounded-none" />
                </div>
                <div className="space-y-1">
                  <Label className="font-black uppercase text-[10px]">Assignment Phase</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="border-2 border-black rounded-none h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rough">ROUGH</SelectItem>
                      <SelectItem value="Underslab">UNDERSLAB</SelectItem>
                      <SelectItem value="Final">FINAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 pt-4">
                  <Label className="font-black uppercase text-[10px]">Select Items to Include</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search catalog..." 
                      className="pl-10 h-10 border-2 border-black rounded-none text-xs font-bold"
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                    />
                  </div>
                  <ScrollArea className="h-48 border-2 border-black rounded-none bg-muted/10 p-2">
                    <div className="space-y-1">
                      {filteredInventory.map(item => (
                        <Button 
                          key={item.id} 
                          variant="ghost" 
                          className="w-full justify-between text-xs font-bold h-8 px-2 hover:bg-black hover:text-white rounded-none"
                          onClick={() => addItemToBundle(item)}
                        >
                          <span className="truncate">{item.name}</span>
                          <Plus className="h-3 w-3" />
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              <div className="space-y-4 bg-muted/20 p-4 border-2 border-black border-dashed">
                <Label className="font-black uppercase text-[10px] flex items-center gap-2">
                  <Boxes className="h-4 w-4" /> Bundle Content Breakdown
                </Label>
                <ScrollArea className="h-[300px]">
                  {bundleItems.length === 0 ? (
                    <div className="text-center py-20 text-[10px] font-black uppercase text-muted-foreground">Empty Bundle</div>
                  ) : (
                    <div className="space-y-2">
                      {bundleItems.map(item => (
                        <div key={item.itemId} className="bg-white border-2 border-black p-2 flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-[10px] font-black uppercase truncate">{item.itemName}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number" 
                              min="1" 
                              value={item.quantity} 
                              onChange={(e) => updateQuantity(item.itemId, Number(e.target.value))}
                              className="w-16 h-8 border-2 border-black rounded-none text-center font-black"
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeItemFromBundle(item.itemId)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            <DialogFooter>
              <Button 
                onClick={handleCreateBundle} 
                disabled={isSubmitting || !bundleName || bundleItems.length === 0}
                className="w-full bg-black text-white font-black h-14 rounded-none text-lg uppercase"
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : "FINALIZE BUNDLE"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isBundlesLoading ? (
          <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto h-10 w-10" /></div>
        ) : (
          bundles?.map(bundle => (
            <Card key={bundle.id} className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
              <CardHeader className="bg-black text-white py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-black uppercase leading-tight">{bundle.name}</CardTitle>
                    <Badge className="bg-white text-black font-black uppercase text-[8px] rounded-none mt-2">
                      PHASE: {bundle.category.toUpperCase()}
                    </Badge>
                  </div>
                  <Button size="icon" variant="ghost" className="text-white hover:bg-destructive hover:text-white rounded-none" onClick={() => handleDeleteBundle(bundle.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Item Breakdown:</p>
                <div className="space-y-1">
                  {bundle.items.map((i: any) => (
                    <div key={i.itemId} className="flex justify-between text-[11px] font-bold uppercase border-b border-black/5 pb-1">
                      <span className="truncate flex-1">{i.itemName}</span>
                      <span className="font-black text-black shrink-0">x{i.quantity}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
        {bundles?.length === 0 && !isBundlesLoading && (
          <div className="col-span-full py-20 text-center border-4 border-black border-dashed bg-muted/20">
            <Package className="h-12 w-12 mx-auto opacity-20" />
            <p className="text-xs font-black uppercase mt-4 text-muted-foreground tracking-widest">No procurement bundles configured.</p>
          </div>
        )}
      </div>
    </div>
  )
}
