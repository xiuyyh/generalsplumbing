"use client"

import { useState, useEffect } from "react"
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useRouter, useParams } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { 
  Loader2, 
  ArrowLeft, 
  Save, 
  TrendingUp, 
  Trash2, 
  Package, 
  AlertCircle,
  ShieldCheck,
  History
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export default function InventoryItemDetailsPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  
  const [restockAmount, setRestockAmount] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const itemRef = useMemoFirebase(() => {
    if (!firestore || !id) return null
    return doc(firestore, "inventoryItems", id)
  }, [firestore, id])
  const { data: item, isLoading } = useDoc(itemRef)

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

  if (isUserLoading || isProfileLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Retrieving Material Data...</p>
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
        <AlertCircle className="h-16 w-16 mx-auto text-black" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Access Restricted</h2>
        <p className="text-muted-foreground font-bold">Unauthorized to modify master inventory records.</p>
        <Button asChild variant="outline" className="border-2 border-black rounded-none uppercase font-black">
          <Link href="/inventory">Return to Catalog</Link>
        </Button>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <AlertCircle className="h-16 w-16 mx-auto text-black" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Record Not Found</h2>
        <p className="text-muted-foreground font-bold">This item may have been removed or the ID is invalid.</p>
        <Button asChild variant="outline" className="border-2 border-black rounded-none uppercase font-black">
          <Link href="/inventory">Return to Catalog</Link>
        </Button>
      </div>
    )
  }

  const handleUpdateDetails = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!firestore || !id) return
    setIsProcessing(true)

    const formData = new FormData(e.currentTarget)
    const updatedData = {
      name: formData.get("name") as string,
      reorderThreshold: Number(formData.get("reorderThreshold")),
    }

    updateDocumentNonBlocking(doc(firestore, "inventoryItems", id), updatedData)
    toast({ title: "Profile Updated", description: "Material metadata has been synchronized." })
    setIsProcessing(false)
  }

  const handleRestock = () => {
    if (!firestore || !id || restockAmount <= 0) return
    setIsProcessing(true)

    const newStock = (item.currentStock || 0) + restockAmount
    updateDocumentNonBlocking(doc(firestore, "inventoryItems", id), {
      currentStock: newStock
    })
    
    toast({ title: "Stock Replenished", description: `Added ${restockAmount} units to ${item.name}.` })
    setRestockAmount(0)
    setIsProcessing(false)
  }

  const handleDelete = () => {
    if (!firestore || !id) return
    if (window.confirm(`PERMANENT REMOVAL: Are you sure you want to purge "${item.name}" from the catalog? This will affect historical tracking.`)) {
      deleteDocumentNonBlocking(doc(firestore, "inventoryItems", id))
      toast({ variant: "destructive", title: "Record Purged", description: "Item removed from master inventory." })
      router.push("/inventory")
    }
  }

  const isLowStock = item.currentStock <= (item.reorderThreshold || 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild className="border-2 border-black rounded-none font-black h-10 px-4">
          <Link href="/inventory"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Catalog</Link>
        </Button>
        <Button onClick={handleDelete} variant="destructive" className="rounded-none font-black h-10 uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all">
          <Trash2 className="mr-2 h-4 w-4" /> Terminate Item
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
            <CardHeader className="bg-black text-white py-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                  <Package className="h-6 w-6" /> Item Configuration
                </CardTitle>
                <Badge className={isLowStock ? "bg-red-600" : "bg-green-600"}>
                  {isLowStock ? "CRITICAL" : "OPTIMAL"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <form onSubmit={handleUpdateDetails} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Material Name</Label>
                  <Input 
                    name="name" 
                    defaultValue={item.name} 
                    required 
                    className="border-2 border-black rounded-none h-12 font-black text-lg uppercase"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Low Stock Trigger</Label>
                    <Input 
                      name="reorderThreshold" 
                      type="number" 
                      defaultValue={item.reorderThreshold} 
                      required 
                      className="border-2 border-black rounded-none h-12 font-black"
                    />
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Alerts trigger when stock hits this level.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Current Inventory</Label>
                    <div className="h-12 border-2 border-black bg-muted/20 flex items-center justify-center font-black text-2xl">
                      {item.currentStock}
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isProcessing}
                  className="w-full h-14 bg-black text-white rounded-none font-black text-lg uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : <Save className="mr-2" />} SYNCHRONIZE METADATA
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-muted/10">
            <CardHeader className="py-2 px-3 border-b-2 border-black">
              <CardTitle className="text-xs font-black uppercase flex items-center gap-2"><History className="h-3 w-3" /> Audit Reference</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase"><span>System ID</span><span className="text-black">{id}</span></div>
              <div className="flex justify-between text-[10px] font-black uppercase"><span>Sync Status</span><span className="text-green-600">Active / Online</span></div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <Card className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
            <CardHeader className="bg-muted/30 border-b-4 border-black py-4">
              <CardTitle className="text-xl font-black uppercase flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> Stock Replenishment
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Quantity to Add</p>
                  <Input 
                    type="number" 
                    min="1"
                    value={restockAmount}
                    onChange={(e) => setRestockAmount(Number(e.target.value))}
                    className="border-2 border-black rounded-none h-16 font-black text-4xl text-center"
                  />
                </div>

                <div className="p-4 bg-black text-white rounded-none space-y-1 text-center">
                  <p className="text-[10px] font-black uppercase opacity-60">Projected Inventory</p>
                  <p className="text-3xl font-black">{ (item.currentStock || 0) + restockAmount }</p>
                </div>

                <Button 
                  onClick={handleRestock}
                  disabled={restockAmount <= 0 || isProcessing}
                  className="w-full h-14 border-4 border-black bg-white text-black rounded-none font-black text-lg uppercase hover:bg-black hover:text-white transition-colors"
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : "EXECUTE RESTOCK"}
                </Button>
              </div>

              <div className="pt-4 border-t-2 border-black/5 flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-muted-foreground shrink-0" />
                <p className="text-[9px] font-bold text-muted-foreground uppercase leading-tight">
                  Restock operations are recorded for audit purposes. Ensure physical counts match terminal entries.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
