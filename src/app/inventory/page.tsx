"use client"

import { useState, useEffect } from "react"
import { useUser } from "@/firebase"
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
  ArrowUpDown, 
  MoreHorizontal,
  Edit2,
  Loader2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const inventoryItems = [
  { id: "INV-001", name: "Copper Elbow 1/2\"", category: "Fittings", stock: 4, min: 10, unit: "pcs" },
  { id: "INV-002", name: "PVC Pipe 1.5\"", category: "Pipes", stock: 45, min: 20, unit: "ft" },
  { id: "INV-003", name: "Plumbers Putty", category: "Consumables", stock: 12, min: 15, unit: "tubs" },
  { id: "INV-004", name: "PEX Crimp Tool", category: "Tools", stock: 2, min: 1, unit: "unit" },
  { id: "INV-005", name: "Teflon Tape", category: "Consumables", stock: 30, min: 10, unit: "rolls" },
  { id: "INV-006", name: "Ball Valve 3/4\"", category: "Valves", stock: 8, min: 12, unit: "pcs" },
  { id: "INV-007", name: "Solder Lead-Free", category: "Consumables", stock: 15, min: 10, unit: "spools" },
]

export default function InventoryPage() {
  const { user, isUserLoading } = useUser()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/auth")
    }
  }, [user, isUserLoading, router])

  const filteredItems = inventoryItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <p className="text-muted-foreground text-xs uppercase font-bold">Master material list</p>
        </div>
        <Button className="bg-black text-white rounded-none h-10 px-6 font-black uppercase text-xs">
          <Plus className="mr-2 h-4 w-4" /> Add New Item
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            placeholder="Search items..." 
            className="pl-10 h-10 w-full border-2 border-black rounded-none bg-white text-xs font-bold" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="border-2 border-black h-10 rounded-none text-xs">
          <Filter className="mr-2 h-4 w-4" /> Filter
        </Button>
      </div>

      <Card className="border-4 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-black">
              <TableRow className="hover:bg-black border-none">
                <TableHead className="text-white font-black uppercase text-[10px]">ID</TableHead>
                <TableHead className="text-white font-black uppercase text-[10px]">Item</TableHead>
                <TableHead className="text-white font-black uppercase text-[10px]">Category</TableHead>
                <TableHead className="text-white font-black uppercase text-[10px] text-center">Stock</TableHead>
                <TableHead className="text-white font-black uppercase text-[10px]">Status</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id} className="border-b border-black/10 hover:bg-muted/50">
                  <TableCell className="font-mono text-[10px] text-muted-foreground">{item.id}</TableCell>
                  <TableCell className="font-bold text-xs uppercase">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-black text-[9px] uppercase rounded-none px-1.5">{item.category}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono font-black text-xs">
                    {item.stock} <span className="text-[8px] text-muted-foreground font-normal">{item.unit}</span>
                  </TableCell>
                  <TableCell>
                    {item.stock <= item.min ? (
                      <Badge variant="destructive" className="animate-pulse rounded-none text-[8px] px-1 py-0">LOW</Badge>
                    ) : (
                      <Badge variant="outline" className="text-black border-black bg-white rounded-none text-[8px] px-1 py-0">OK</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-none border-2 border-black">
                        <DropdownMenuItem className="text-xs font-black uppercase">
                          <Edit2 className="mr-2 h-3 w-3" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs font-black uppercase">
                          <Package className="mr-2 h-3 w-3" /> Stock
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Package className="h-8 w-8 opacity-20 mb-2" />
              <p className="text-[10px] font-black uppercase">No results found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
