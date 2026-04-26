"use client"

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts"
import { 
  History, 
  TrendingUp, 
  Users, 
  Package, 
  AlertCircle 
} from "lucide-react"
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart"

const usageData = [
  { name: "Mon", pvc: 40, copper: 24, valves: 12 },
  { name: "Tue", pvc: 30, copper: 13, valves: 10 },
  { name: "Wed", pvc: 20, copper: 98, valves: 8 },
  { name: "Thu", pvc: 27, copper: 39, valves: 15 },
  { name: "Fri", pvc: 18, copper: 48, valves: 21 },
  { name: "Sat", pvc: 23, copper: 38, valves: 5 },
  { name: "Sun", pvc: 34, copper: 43, valves: 2 },
]

const topPartsData = [
  { name: "PVC Fittings", value: 45 },
  { name: "Copper Pipes", value: 30 },
  { name: "Valves", value: 15 },
  { name: "Teflon", value: 10 },
]

const COLORS = ['#297CB0', '#3C9F8A', '#22C55E', '#A855F7']

const chartConfig = {
  pvc: {
    label: "PVC Components",
    color: "hsl(var(--chart-1))",
  },
  copper: {
    label: "Copper Pipes",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold">Usage History & Analytics</h1>
        <p className="text-muted-foreground">Analyze inventory trends and operational efficiency.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daily Material Consumption</CardTitle>
                <CardDescription>Units used across different material categories this week.</CardDescription>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="pvc" fill="var(--color-pvc)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="copper" fill="var(--color-copper)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Mix</CardTitle>
            <CardDescription>Most utilized part categories.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topPartsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {topPartsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {topPartsData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-bold">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Most Efficient Technician
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Sarah Smith</div>
            <p className="text-xs text-muted-foreground">+12% items correctly logged vs last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-accent" /> High Turnover Item
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PVC Primer</div>
            <p className="text-xs text-muted-foreground">Average 4.2 units per dispatch</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" /> Waste Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">15% Discrepancy</div>
            <p className="text-xs text-muted-foreground">Unaccounted copper fittings in Zone B</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historical Log Access</CardTitle>
          <CardDescription>Comprehensive audit trail of all inventory and staff interactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-secondary">
                    <History className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Archive Report: Q{i} 2024 Inventory Audit</h4>
                    <p className="text-xs text-muted-foreground">Generated by System Admin • May {15 + i}, 2024</p>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-bold text-primary">Download PDF</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
