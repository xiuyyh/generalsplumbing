
"use client"

import { useState } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
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
import { 
  FileDown, 
  Calendar as CalendarIcon, 
  Filter, 
  ArrowRight, 
  Loader2,
  Clock,
  User,
  Activity,
  CalendarDays
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import Link from "next/link"

export default function TimesheetsPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [selectedEntry, setSelectedEntry] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "staffMembers")
  }, [firestore, user])
  const { data: staffMembers } = useCollection(staffQuery)

  const timeQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "timeEntries"), orderBy("clockInTime", "desc"))
  }, [firestore, user])
  const { data: timeEntries, isLoading } = useCollection(timeQuery)

  const calculateHours = (start: string, end: string | null) => {
    if (!end) return "Active"
    const diff = new Date(end).getTime() - new Date(start).getTime()
    return (diff / (1000 * 60 * 60)).toFixed(2) + "h"
  }

  const handleRowClick = (entry: any) => {
    const staff = staffMembers?.find(s => s.id === entry.staffMemberId)
    setSelectedEntry({ ...entry, staffName: staff ? `${staff.firstName} ${staff.lastName}` : "Unknown" })
    setIsDetailsOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Timesheet Reports</h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Master logs for payroll audit</p>
        </div>
        <Button variant="outline" className="border-2 border-black rounded-none font-black h-10 px-4">
          <FileDown className="mr-2 h-4 w-4" /> Export for Payroll
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 border-2 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
          <CardHeader className="bg-muted/30 border-b-2 border-black py-3">
            <CardTitle className="text-lg font-black uppercase">Recent Logs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-black">
                <TableRow className="hover:bg-black">
                  <TableHead className="text-white font-black uppercase text-[10px]">Staff Name</TableHead>
                  <TableHead className="text-white font-black uppercase text-[10px]">Date</TableHead>
                  <TableHead className="text-white font-black uppercase text-[10px] hidden md:table-cell">Clock In</TableHead>
                  <TableHead className="text-white font-black uppercase text-[10px] hidden md:table-cell">Clock Out</TableHead>
                  <TableHead className="text-white font-black uppercase text-[10px]">Duration</TableHead>
                  <TableHead className="text-white font-black uppercase text-[10px] hidden md:table-cell">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-20 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : (
                  timeEntries?.map((entry) => {
                    const staff = staffMembers?.find(s => s.id === entry.staffMemberId)
                    return (
                      <TableRow 
                        key={entry.id} 
                        className="border-b border-black/10 hover:bg-muted/30 transition-colors cursor-pointer group"
                        onClick={() => handleRowClick(entry)}
                      >
                        <TableCell className="font-black text-xs uppercase">{staff ? `${staff.firstName} ${staff.lastName}` : "Unknown"}</TableCell>
                        <TableCell className="text-xs font-bold uppercase">{new Date(entry.clockInTime).toLocaleDateString()}</TableCell>
                        <TableCell className="text-xs font-mono font-bold uppercase hidden md:table-cell">
                          {new Date(entry.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-bold uppercase hidden md:table-cell">
                          {entry.clockOutTime ? new Date(entry.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-black">
                          {calculateHours(entry.clockInTime, entry.clockOutTime)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {entry.clockOutTime ? (
                            <Badge variant="outline" className="text-black border-2 border-black bg-white rounded-none text-[8px] px-1 py-0 font-black">LOCKED</Badge>
                          ) : (
                            <Badge variant="destructive" className="animate-pulse rounded-none text-[8px] px-1 py-0 font-black">ACTIVE</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
                {(!timeEntries || timeEntries.length === 0) && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 font-black text-muted-foreground text-xs uppercase tracking-widest">
                      No time records found in database.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-black text-white border-2 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase">Summary</CardTitle>
            <CardDescription className="font-bold text-white/60 text-xs uppercase">Operational Insight</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold uppercase opacity-60">Staff Registered</span>
                <span className="font-black">{staffMembers?.length || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-bold uppercase opacity-60">Total Logs</span>
                <span className="font-black">{timeEntries?.length || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-bold uppercase opacity-60">Active Shifts</span>
                <span className="font-black">{timeEntries?.filter(e => !e.clockOutTime).length || 0}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-4">
              <h4 className="text-[10px] font-black uppercase text-white/40 tracking-widest">Quick View</h4>
              <p className="text-[10px] leading-relaxed font-bold uppercase text-white/70">
                All records shown are retrieved directly from Firestore. Use the Attendance page to manually manage active shifts.
              </p>
            </div>
            
            <Button variant="link" className="w-full text-white p-0 h-auto text-xs justify-start font-black uppercase tracking-tighter hover:no-underline hover:translate-x-1 transition-transform" asChild>
              <Link href="/analytics">Operational Analytics <ArrowRight className="ml-2 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="border-4 border-black rounded-none max-w-sm sm:max-w-md">
          <DialogHeader className="border-b-2 border-black pb-4">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Shift Summary</DialogTitle>
            <DialogDescription className="font-bold text-xs uppercase text-muted-foreground">
              Full record for session {selectedEntry?.id.slice(-6)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEntry && (
            <div className="py-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> Technician
                  </p>
                  <p className="font-black text-sm uppercase">{selectedEntry.staffName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Date
                  </p>
                  <p className="font-black text-sm uppercase">{new Date(selectedEntry.clockInTime).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 border-2 border-black bg-muted/20">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Clock In</p>
                  <p className="font-black text-lg tabular-nums">
                    {new Date(selectedEntry.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Clock Out</p>
                  <p className="font-black text-lg tabular-nums">
                    {selectedEntry.clockOutTime 
                      ? new Date(selectedEntry.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : "--:--"
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t-2 border-black pt-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Total Duration
                  </p>
                  <p className="text-xl font-black">{calculateHours(selectedEntry.clockInTime, selectedEntry.clockOutTime)}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1 justify-end">
                    <Activity className="h-3 w-3" /> Status
                  </p>
                  {selectedEntry.clockOutTime ? (
                    <Badge className="bg-black text-white rounded-none font-black uppercase text-[10px]">Session Locked</Badge>
                  ) : (
                    <Badge variant="destructive" className="rounded-none font-black uppercase text-[10px] animate-pulse">In Progress</Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-4">
            <Button 
              onClick={() => setIsDetailsOpen(false)}
              className="w-full bg-black text-white font-black h-12 rounded-none uppercase text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              CLOSE RECORDS
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
