
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
import { Truck, Plus, Trash2, ClipboardList, Send, Loader2 } from "lucide-react"
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-headline font-bold">New Dispatch Log</h1>
        <p className="text-muted-foreground">Record materials taken for jobs or assigned to technicians.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Material List
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-12 gap-4 mb-2">
                <div className="col-span-7 md:col-span-8">
                  <Label className="text-xs uppercase text-muted-foreground font-bold">Item Name / ID</Label>
                </div>
                <div className="col-span-3 md:col-span-2">
                  <Label className="text-xs uppercase text-muted-foreground font-bold">Qty</Label>
                </div>
              </div>
              
              {items.map((row) => (
                <div key={row.id} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-7 md:col-span-8">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select inventory item..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="c1">Copper Elbow 1/2"</SelectItem>
                        <SelectItem value="p1">PVC Pipe 1.5" (10ft)</SelectItem>
                        <SelectItem value="v1">Ball Valve 3/4"</SelectItem>
                        <SelectItem value="s1">Solder Lead-Free</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <Input type="number" min="1" defaultValue="1" />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeItemRow(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button 
                type="button" 
                variant="outline" 
                className="w-full mt-2 border-dashed" 
                onClick={addItemRow}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Another Item
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Technician</Label>
                  <Select required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="t1">John Doe</SelectItem>
                      <SelectItem value="t2">Sarah Smith</SelectItem>
                      <SelectItem value="t3">Mike Jones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Job Reference #</Label>
                  <Input placeholder="e.g. JB-2024-001" />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input placeholder="Optional details..." />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90">
                  <Send className="mr-2 h-4 w-4" /> Record Dispatch
                </Button>
              </CardFooter>
            </Card>

            <Card className="bg-primary text-primary-foreground">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/10">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold">Inventory Sync</h4>
                    <p className="text-xs text-primary-foreground/70">Stock levels will update automatically on submission.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
