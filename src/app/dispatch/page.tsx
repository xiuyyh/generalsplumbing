"use client"

import { useState, useEffect } from "react"
import { useUser } from "@/firebase"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card"
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
import { Truck, Plus, Trash2, ClipboardList, Send, Loader2, MapPin } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function DispatchPage() {
  const { user, isUserLoading } = useUser()
  const router = useRouter()
  const [items, setItems] = useState([
    { id: 1, item: "", quantity: 1 }
  ])

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/auth")
    }
  }, [user, isUserLoading, router])

  const addItemRow = () => {
    setItems([...items, { id: Date.now(), item: "", quantity: 1 }])
  }

  const removeItemRow = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast({
      title: "Dispatch Recorded",
      description: "Inventory has been updated and log entry created.",
    })
    // Reset form
    setItems([{ id: 1, item: "", quantity: 1 }])
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
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black uppercase tracking-tighter">New Dispatch Log</h1>
        <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest">Record material outflow and destination</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Card className="lg:col-span-7 border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <CardHeader className="border-b-2 border-black bg-muted/30">
              <CardTitle className="text-xl font-black uppercase flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Material List
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-12 gap-4 mb-2">
                <div className="col-span-7 md:col-span-8">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">1. Item Specification</Label>
                </div>
                <div className="col-span-3 md:col-span-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">2. Qty</Label>
                </div>
              </div>
              
              {items.map((row) => (
                <div key={row.id} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-7 md:col-span-8">
                    <Select>
                      <SelectTrigger className="h-12 border-2 border-black rounded-none font-bold">
                        <SelectValue placeholder="Select item..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="c1" className="font-bold">Copper Elbow 1/2"</SelectItem>
                        <SelectItem value="p1" className="font-bold">PVC Pipe 1.5" (10ft)</SelectItem>
                        <SelectItem value="v1" className="font-bold">Ball Valve 3/4"</SelectItem>
                        <SelectItem value="s1" className="font-bold">Solder Lead-Free</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <Input type="number" min="1" defaultValue="1" className="h-12 border-2 border-black rounded-none font-black text-center" />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-white hover:bg-destructive rounded-none border-2 border-transparent hover:border-black transition-all"
                      onClick={() => removeItemRow(row.id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-12 mt-2 border-2 border-black border-dashed rounded-none font-black uppercase hover:bg-muted" 
                onClick={addItemRow}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Line Item
              </Button>
            </CardContent>
          </Card>

          <div className="lg:col-span-5 space-y-8">
            <Card className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="border-b-2 border-black bg-muted/30">
                <CardTitle className="text-xl font-black uppercase">Assignment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label className="font-black uppercase text-xs">Technician</Label>
                  <Select required>
                    <SelectTrigger className="h-12 border-2 border-black rounded-none font-bold">
                      <SelectValue placeholder="Choose personnel..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="t1" className="font-bold">John Doe</SelectItem>
                      <SelectItem value="t2" className="font-bold">Sarah Smith</SelectItem>
                      <SelectItem value="t3" className="font-bold">Mike Jones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-black uppercase text-xs">Job Reference #</Label>
                  <Input placeholder="e.g. JB-2024-001" className="h-12 border-2 border-black rounded-none font-bold" />
                </div>

                <div className="space-y-2">
                  <Label className="font-black uppercase text-xs flex items-center gap-2">
                    <MapPin className="h-3 w-3" /> Delivery Address
                  </Label>
                  <Input 
                    placeholder="Enter destination address..." 
                    className="h-12 border-2 border-black rounded-none font-bold bg-muted/10 focus:bg-white" 
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-black uppercase text-xs">Internal Notes</Label>
                  <Input placeholder="Optional dispatch notes..." className="h-12 border-2 border-black rounded-none font-bold" />
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button type="submit" className="w-full h-16 bg-black text-white rounded-none font-black text-lg shadow-[1px_1px_0px_0px_rgba(255,255,255,0.2)] hover:bg-black/90 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
                  <Send className="mr-3 h-6 w-6" /> RECORD DISPATCH
                </Button>
              </CardFooter>
            </Card>

            <div className="p-6 border-2 border-black bg-black text-white rounded-none flex items-center gap-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
              <div className="p-2 bg-white/10 rounded-none border border-white/20">
                <Truck className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black uppercase text-sm tracking-tight">Cloud Sync Active</h4>
                <p className="text-[10px] font-bold uppercase text-white/60">Stock levels update in real-time across all terminals.</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
