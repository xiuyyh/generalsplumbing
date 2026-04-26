import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card"
import { 
  Clock, 
  Package, 
  Truck, 
  Users, 
  ArrowUpRight, 
  AlertTriangle,
  History
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Dashboard() {
  const stats = [
    { title: "Staff Clocked In", value: "12", icon: Users, color: "text-blue-600" },
    { title: "Low Stock Items", value: "5", icon: AlertTriangle, color: "text-amber-500" },
    { title: "Dispatches Today", value: "28", icon: Truck, color: "text-emerald-600" },
    { title: "Total Parts Used", value: "142", icon: Package, color: "text-indigo-600" },
  ]

  const recentActivity = [
    { id: 1, user: "John Doe", action: "Clocked In", time: "08:00 AM", detail: "Shift: Residential" },
    { id: 2, user: "Sarah Smith", action: "Dispatch Created", time: "08:45 AM", detail: "Job #4421 - PVC Fittings" },
    { id: 3, user: "Mike Jones", action: "Clocked Out", time: "09:15 AM", detail: "Shift: Emergency Call-out" },
    { id: 4, user: "Warehouse", action: "Low Stock Alert", time: "10:00 AM", detail: "Copper Pipes (1/2\")" },
  ]

  const lowStock = [
    { name: "Copper Elbow 1/2\"", stock: 4, min: 10 },
    { name: "PVC Primer", stock: 2, min: 5 },
    { name: "PEX Tubing Blue", stock: 15, min: 50 },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-foreground">Generals Dashboard</h1>
          <p className="text-muted-foreground">Welcome back.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/analytics"><History className="mr-2 h-4 w-4" /> Usage History</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/dispatch"><Truck className="mr-2 h-4 w-4" /> New Dispatch</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                </div>
                <div className={`p-2 rounded-full bg-background border ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">Recent Activity</CardTitle>
            <CardDescription>Live log of staff actions and inventory changes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div className="mt-1">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{activity.user}</p>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {activity.action}
                      </Badge>
                      <p className="text-xs text-muted-foreground">{activity.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="link" className="w-full mt-6 text-primary h-8" asChild>
              <Link href="/timesheets">View All Activity <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Low Stock Alerts</CardTitle>
            <CardDescription>Items below threshold.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStock.map((item) => (
                <div key={item.name} className="flex flex-col gap-1.5 border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{item.name}</span>
                    <Badge variant="destructive" className="font-mono">{item.stock}</Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div 
                      className="bg-destructive h-1.5 rounded-full" 
                      style={{ width: `${(item.stock / item.min) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Min required: {item.min}</p>
                </div>
              ))}
            </div>
            <Button className="w-full mt-6" variant="outline" asChild>
              <Link href="/inventory">Manage Inventory</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
