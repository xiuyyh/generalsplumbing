
"use client"

import { useState, useEffect } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Plus, 
  Search, 
  Filter, 
  Package, 
  MoreHorizontal,
  Edit2,
  Loader2,
  TrendingUp,
  Trash2,
  AlertTriangle
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"

export default function InventoryPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [restockAmount, setRestockAmount] = useState<number>(0)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/auth")
    }
  }, [user, isUserLoading, router])

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "inventoryItems")
  }, [firestore, user])
  const { data: inventoryItems, isLoading } = useCollection(inventoryQuery)

  const filteredItems = inventoryItems?.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || []

  const handleCreateItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!firestore) return

    const formData = new FormData(e.currentTarget)
    const newItem = {
      name: formData.get("name") as string,
      sku: formData.get("sku") as string,
      currentStock: Number(formData.get("currentStock")),
      reorderThreshold: Number(formData.get("reorderThreshold")),
      description: formData.get("description") as string,
      pricePerUnit: Number(formData.get("pricePerUnit")) || 0,
    }

    addDocumentNonBlocking(collection(firestore, "inventoryItems"), newItem)
    
    setIsAddDialogOpen(false)
    toast({
      title: "Item Created",
      description: `${newItem.name} added to catalog.`,
    })
  }

  const handleUpdateItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!firestore || !selectedItem) return

    const formData = new FormData(e.currentTarget)
    const updatedData = {
      name: formData.get("name") as string,
      sku: formData.get("sku") as string,
      reorderThreshold: Number(formData.get("reorderThreshold")),
      description: formData.get("description") as string,
      pricePerUnit: Number(formData.get("pricePerUnit")) || 0,
    }

    const itemRef = doc(firestore, "inventoryItems", selectedItem.id)
    setIsEditDialogOpen(false)
    
    setTimeout(() => {
      updateDocumentNonBlocking(itemRef, updatedData)
      toast({
        title: "Item Updated",
        description: `${updatedData.name} record saved.`,
      })
      setSelectedItem(null)
    }, 300)
  }

  const handleRestock = () => {
    if (!firestore || !selectedItem || restockAmount <= 0) return

    const newStock = (selectedItem.currentStock || 0) + restockAmount
    const itemRef = doc(firestore, "inventoryItems", selectedItem.id)
    
    setIsRestockDialogOpen(false)

    setTimeout(() => {
      updateDocumentNonBlocking(itemRef, {
        currentStock: newStock
      })
      toast({
        title: "Stock Updated",
        description: `Added ${restockAmount} to ${selectedItem.name}.`,
      })
      setRestockAmount(0)
      setSelectedItem(null)
    }, 300)
  }

  const handleDelete = () => {
    if (!firestore || !selectedItem) return

    const itemRef = doc(firestore, "inventoryItems", selectedItem.id)
    const itemName = selectedItem.name
    
    setIsDeleteDialogOpen(false)

    setTimeout(() => {
      deleteDocumentNonBlocking(itemRef)
      toast({
        variant: "destructive",
        title: "Item Deleted",
        description: `${itemName} removed from catalog.`,
      })
      setSelectedItem(null)
    }, 300)
  }

  if (isUserLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Authorizing Access...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Inventory Catalog</h1>
          <p className="text-muted-foreground text-[10px] uppercase font-black tracking-widest">Master material list</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-black text-white rounded-none h-10 px-6 font-black uppercase text-xs border-2 border-black hover:bg-black/90">
              <Plus className="mr-2 h-4 w-4" /> Add New Item
            </Button>
          </DialogTrigger>
          <DialogContent className="border-4 border-black rounded-none sm:max-w-[500px]">
            <form onSubmit={handleCreateItem}>
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase">Create Inventory Item</DialogTitle>
                <DialogDescription className="font-bold text-xs uppercase text-muted-foreground">
                  Register a new part or supply in the system.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-black uppercase">Item Name</Label>
                  <Input id="name" name="name" required className="border-2 border-black rounded-none h-10 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku" className="text-xs font-black uppercase">SKU / Part #</Label>
                  <Input id="sku" name="sku" required className="border-2 border-black rounded-none h-10 font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentStock" className="text-xs font-black uppercase">Initial Stock</Label>
                    <Input id="currentStock" name="currentStock" type="number" defaultValue="0" required className="border-2 border-black rounded-none h-10 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorderThreshold" className="text-xs font-black uppercase">Low Stock Trigger</Label>
                    <Input id="reorderThreshold" name="reorderThreshold" type="number" defaultValue="5" required className="border-2 border-black rounded-none h-10 font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs font-black uppercase">Description</Label>
                  <Textarea id="description" name="description" required className="border-2 border-black rounded-none font-bold" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full bg-black text-white font-black h-12 rounded-none text-sm uppercase border-2 border-black">
                  REGISTER ITEM
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            placeholder="Search catalog by name or SKU..." 
            className="pl-10 h-10 w-full border-2 border-black rounded-none bg-white text-xs font-bold focus:outline-none focus:ring-0" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="border-2 border-black h-10 rounded-none text-xs font-black uppercase">
          <Filter className="mr-2 h-4 w-4" /> Filter
        </Button>
      </div>

      <Card className="border-4 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-black">
              <TableRow className="hover:bg-black border-none">
                <TableHead className="text-white font-black uppercase text-[10px]">SKU</TableHead>
                <TableHead className="text-white font-black uppercase text-[10px]">Item</TableHead>
                <TableHead className="text-white font-black uppercase text-[10px] text-center">In Stock</TableHead>
                <TableHead className="text-white font-black uppercase text-[10px]">Status</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id} className="border-b border-black/10 hover:bg-muted/30">
                    <TableCell className="font-mono text-[10px] text-muted-foreground uppercase">{item.sku}</TableCell>
                    <TableCell className="font-black text-xs uppercase">{item.name}</TableCell>
                    <TableCell className="text-center font-mono font-black text-xs">
                      {item.currentStock}
                    </TableCell>
                    <TableCell>
                      {item.currentStock <= (item.reorderThreshold || 0) ? (
                        <Badge variant="destructive" className="animate-pulse rounded-none text-[8px] px-1 py-0 font-black">LOW STOCK</Badge>
                      ) : (
                        <Badge variant="outline" className="text-black border-2 border-black bg-white rounded-none text-[8px] px-1 py-0 font-black">OPTIMAL</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-black hover:text-white rounded-none transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-none border-2 border-black bg-white p-1">
                          <DropdownMenuItem 
                            className="text-xs font-black uppercase focus:bg-black focus:text-white cursor-pointer"
                            onClick={() => {
                              setSelectedItem(item)
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Edit2 className="mr-2 h-3 w-3" /> Edit Item
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-xs font-black uppercase focus:bg-black focus:text-white cursor-pointer"
                            onClick={() => {
                              setSelectedItem(item)
                              setIsRestockDialogOpen(true)
                            }}
                          >
                            <TrendingUp className="mr-2 h-3 w-3" /> Re-stock
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-black/10" />
                          <DropdownMenuItem 
                            className="text-xs font-black uppercase text-destructive focus:bg-destructive focus:text-white cursor-pointer"
                            onClick={() => {
                              setSelectedItem(item)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="mr-2 h-3 w-3" /> Delete Item
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {!isLoading && filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Package className="h-8 w-8 opacity-20 mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">No matching items found in catalog.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsEditDialogOpen(false)
          setTimeout(() => setSelectedItem(null), 300)
        } else {
          setIsEditDialogOpen(true)
        }
      }}>
        <DialogContent className="border-4 border-black rounded-none sm:max-w-[500px]">
          <form onSubmit={handleUpdateItem}>
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase">Edit Inventory Item</DialogTitle>
              <DialogDescription className="font-bold text-xs uppercase text-muted-foreground">
                Update records for: {selectedItem?.name || "Target Item"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-xs font-black uppercase">Item Name</Label>
                <Input id="edit-name" name="name" defaultValue={selectedItem?.name} required className="border-2 border-black rounded-none h-10 font-bold" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sku" className="text-xs font-black uppercase">SKU / Part #</Label>
                <Input id="edit-sku" name="sku" defaultValue={selectedItem?.sku} required className="border-2 border-black rounded-none h-10 font-bold" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reorderThreshold" className="text-xs font-black uppercase">Low Stock Trigger</Label>
                <Input id="edit-reorderThreshold" name="reorderThreshold" type="number" defaultValue={selectedItem?.reorderThreshold} required className="border-2 border-black rounded-none h-10 font-bold" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-xs font-black uppercase">Description</Label>
                <Textarea id="edit-description" name="description" defaultValue={selectedItem?.description} required className="border-2 border-black rounded-none font-bold" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full bg-black text-white font-black h-12 rounded-none text-sm uppercase border-2 border-black">
                SAVE CHANGES
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isRestockDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsRestockDialogOpen(false)
          setTimeout(() => setSelectedItem(null), 300)
        } else {
          setIsRestockDialogOpen(true)
        }
      }}>
        <DialogContent className="border-4 border-black rounded-none sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase">Re-stock Material</DialogTitle>
            <DialogDescription className="font-bold text-xs uppercase text-muted-foreground">
              Update inventory for: <span className="text-black">{selectedItem?.name || "Target Item"}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-xs font-black uppercase">Quantity to Add</Label>
              <Input 
                id="amount" 
                type="number" 
                min="1"
                value={restockAmount}
                onChange={(e) => setRestockAmount(Number(e.target.value))}
                className="border-2 border-black rounded-none h-12 font-black text-lg text-center"
              />
              <p className="text-[9px] font-black uppercase text-muted-foreground text-center">
                New stock will be: { (selectedItem?.currentStock || 0) + restockAmount }
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleRestock}
              disabled={restockAmount <= 0}
              className="w-full bg-black text-white font-black h-12 rounded-none text-sm uppercase border-2 border-black disabled:opacity-30"
            >
              CONFIRM RE-STOCK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDeleteDialogOpen(false)
          setTimeout(() => setSelectedItem(null), 300)
        } else {
          setIsDeleteDialogOpen(true)
        }
      }}>
        <AlertDialogContent className="border-4 border-black rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" /> TERMINATE RECORD
            </AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-black uppercase text-xs">
              Are you sure you want to delete <span className="underline">{selectedItem?.name || "this item"}</span>? This action is permanent and will remove the item from all inventory tracking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-black rounded-none font-black uppercase text-xs">ABORT</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              className="bg-destructive text-white border-2 border-black rounded-none font-black uppercase text-xs hover:bg-destructive/90"
            >
              CONFIRM DELETE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
