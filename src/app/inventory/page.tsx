"use client"

import { useState } from "react"
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
  Edit2
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
  const [searchTerm, setSearchTerm] = useState("")

  const filteredItems = inventoryItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Inventory Catalog</h1>
          <p className="text-muted-foreground">Master list of plumbing parts and supplies.</p>
        </div>
        <Button className="bg-accent hover:bg-accent/90">
          <Plus className="mr-2 h-4 w-4" /> Add New Item
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search items by name, ID or category..." 
            className="pl-10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" /> Filter
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Stock Level</TableHead>
                <TableHead className="text-center">Min Threshold</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.id}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">{item.category}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold">
                    {item.stock} <span className="text-[10px] text-muted-foreground font-normal">{item.unit}</span>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground font-mono">
                    {item.min}
                  </TableCell>
                  <TableCell>
                    {item.stock <= item.min ? (
                      <Badge variant="destructive" className="animate-pulse">Low Stock</Badge>
                    ) : (
                      <Badge variant="outline" className="text-accent border-accent/30 bg-accent/5">Optimal</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Edit2 className="mr-2 h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Package className="mr-2 h-4 w-4" /> Adjust Stock
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Delete Item
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Package className="h-12 w-12 opacity-20 mb-4" />
              <p>No items found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
