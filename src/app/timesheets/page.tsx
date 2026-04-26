"use client"

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { FileDown, Calendar as CalendarIcon, Filter, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const shifts = [
  { id: 1, staff: "John Doe", date: "2024-05-20", clockIn: "08:00 AM", clockOut: "04:30 PM", total: "8.5h", status: "Approved" },
  { id: 2, staff: "Sarah Smith", date: "2024-05-20", clockIn: "08:15 AM", clockOut: "05:00 PM", total: "8.75h", status: "Approved" },
  { id: 3, staff: "Mike Jones", date: "2024-05-20", clockIn: "09:00 AM", clockOut: "03:00 PM", total: "6.0h", status: "Pending" },
  { id: 4, staff: "John Doe", date: "2024-05-21", clockIn: "08:00 AM", clockOut: "04:00 PM", total: "8.0h", status: "Approved" },
  { id: 5, staff: "Sarah Smith", date: "2024-05-21", clockIn: "08:30 AM", clockOut: "05:30 PM", total: "9.0h", status: "Approved" },
  { id: 6, staff: "Emily Davis", date: "2024-05-21", clockIn: "10:00 AM", clockOut: "06:00 PM", total: "8.0h", status: "Review Required" },
]

export default function TimesheetsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Timesheet Reports</h1>
          <p className="text-muted-foreground">Review and manage staff working hours.</p>
        </div>
        <Button variant="outline" className="bg-white">
          <FileDown className="mr-2 h-4 w-4" /> Export for Payroll
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1">
          <Select defaultValue="this-week">
            <SelectTrigger>
              <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="last-week">Last Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-1">
          <Select defaultValue="all">
            <SelectTrigger>
              <Filter className="mr-2 h-4 w-4 opacity-50" />
              <SelectValue placeholder="Staff Member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              <SelectItem value="jdoe">John Doe</SelectItem>
              <SelectItem value="ssmith">Sarah Smith</SelectItem>
              <SelectItem value="mjones">Mike Jones</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Shifts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium">{shift.staff}</TableCell>
                    <TableCell>{shift.date}</TableCell>
                    <TableCell>{shift.clockIn}</TableCell>
                    <TableCell>{shift.clockOut}</TableCell>
                    <TableCell className="font-mono">{shift.total}</TableCell>
                    <TableCell>
                      {shift.status === "Approved" && (
                        <Badge variant="outline" className="text-accent border-accent/30 bg-accent/5">Approved</Badge>
                      )}
                      {shift.status === "Pending" && (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                      {shift.status === "Review Required" && (
                        <Badge variant="destructive">Review</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-accent/5 border-accent/20">
          <CardHeader>
            <CardTitle className="text-lg">Weekly Summary</CardTitle>
            <CardDescription>May 19 - May 25, 2024</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Staff Hours</span>
                <span className="font-bold">142.5h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overtime Recorded</span>
                <span className="font-bold text-accent">12.0h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active Shifts Now</span>
                <span className="font-bold">4</span>
              </div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Top Contributors</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">John Doe</span>
                  <Badge variant="secondary">38.5h</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sarah Smith</span>
                  <Badge variant="secondary">40.0h</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Mike Jones</span>
                  <Badge variant="secondary">32.0h</Badge>
                </div>
              </div>
            </div>
            
            <Button variant="link" className="w-full text-accent p-0 h-auto text-sm justify-start">
              View Detailed Analytics <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
