"use client"

import { useState, useEffect } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, query, orderBy } from "firebase/firestore"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
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
  Loader2,
  ShieldAlert,
  ArrowRight
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export default function InventoryPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user])
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/auth")
    }
  }, [user, isUserLoading, router])

  const inventoryQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "inventoryItems"), orderBy("name", "asc"))
  }, [firestore, user])
  const { data: inventoryItems, isLoading } = useCollection(inventoryQuery)

  if (isUserLoading || isProfileLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Authorizing Access...</p>
      </div>
    )
  }

  const role = profile?.role || "WORKER"
  const isAdmin = role === "ADMIN"
  const isApproved = profile?.status === "approved" || isAdmin
  const canAccess = isAdmin || role === "INVENTORY"

  if (!isApproved || !canAccess) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <ShieldAlert className="h-16 w-16 mx-auto text-black" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Access Denied</h2>
        <p className="text-muted-foreground font-bold">Your account is not authorized to access the inventory catalog.</p>
        <Button asChild variant="outline" className="border-2 border-black rounded-none uppercase font-black">
          <Link href="/">Return to Terminal</Link>
        </Button>
      </div>
    )
  }

  const filteredItems = inventoryItems?.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const handleCreateItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!firestore) return

    const formData = new FormData(e.currentTarget)
    const newItem = {
      name: formData.get("name") as string,
      currentStock: Number(formData.get("currentStock")),
      reorderThreshold: Number(formData.get("reorderThreshold")),
    }

    addDocumentNonBlocking(collection(firestore, "inventoryItems"), newItem)
    
    setIsAddDialogOpen(false)
    toast({
      title: "Item Created",
      description: `${newItem.name} added to catalog.`,
    })
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
            placeholder="Search catalog by name..." 
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
                <TableHead className="text-white font-black uppercase text-[10px]">Item</TableHead>
                <TableHead className="text-white font-black uppercase text-[10px] text-center">In Stock</TableHead>
                <TableHead className="text-white font-black uppercase text-[10px]">Status</TableHead>
                <TableHead className="text-white font-black uppercase text-[10px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id} className="border-b border-black/10 hover:bg-muted/30">
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
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm" className="h-8 border-2 border-transparent hover:border-black rounded-none text-[10px] font-black uppercase">
                        <Link href={`/inventory/${item.id}`}>Manage <ArrowRight className="ml-1 h-3 w-3" /></Link>
                      </Button>
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
    </div>
  )
}
