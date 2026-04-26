
"use client"

import { useState } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
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
  ArrowRight, 
  Loader2,
  Clock,
  User,
  Activity,
  CalendarDays,
  Trash2,
  AlertTriangle
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

export default function TimesheetsPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [selectedEntry, setSelectedEntry] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

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

  const handleDeleteEntry = () => {
    if (!firestore || !selectedEntry) return
    
    const targetId = selectedEntry.id;
    setIsDeleteDialogOpen(false)
    setIsDetailsOpen(false)

    setTimeout(() => {
      deleteDocumentNonBlocking(doc(firestore, "timeEntries", targetId))
      toast({ variant: "destructive", title: "Log Deleted", description: "Time entry removed from audit trail." })
      setSelectedEntry(null)
    }, 300)
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
                  <TableHead className="text-white font-black uppercase text-[10px] hidden md:table-cell">Duration</TableHead>
                  <TableHead className="text-white font-black uppercase text-[10px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></TableCell></TableRow>
                ) : (
                  timeEntries?.map((entry) => {
                    const staff = staffMembers?.find(s => s.id === entry.staffMemberId)
                    return (
                      <TableRow 
                        key={entry.id} 
                        className="border-b border-black/10 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => handleRowClick(entry)}
                      >
                        <TableCell className="font-black text-xs uppercase">{staff ? `${staff.firstName} ${staff.lastName}` : "Unknown"}</TableCell>
                        <TableCell className="text-[10px] font-bold uppercase">{new Date(entry.clockInTime).toLocaleDateString()}</TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs font-black">
                          {calculateHours(entry.clockInTime, entry.clockOutTime)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" className="rounded-none border-2 border-transparent hover:border-black"><ArrowRight className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
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
              <div className="flex justify-between text-xs"><span className="font-bold uppercase opacity-60">Staff Registered</span><span className="font-black">{staffMembers?.length || 0}</span></div>
              <div className="flex justify-between text-xs"><span className="font-bold uppercase opacity-60">Total Logs</span><span className="font-black">{timeEntries?.length || 0}</span></div>
            </div>
            <Button variant="link" className="w-full text-white p-0 h-auto text-xs justify-start font-black uppercase tracking-tighter hover:no-underline" asChild>
              <Link href="/analytics">Operational Analytics <ArrowRight className="ml-2 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDetailsOpen(false)
          setTimeout(() => setSelectedEntry(null), 300)
        } else {
          setIsDetailsOpen(true)
        }
      }}>
        <DialogContent className="border-4 border-black rounded-none max-w-sm sm:max-w-md">
          <DialogHeader className="border-b-2 border-black pb-4">
            <DialogTitle className="text-2xl font-black uppercase">Shift Summary</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            {selectedEntry && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><p className="text-[10px] font-black uppercase text-muted-foreground"><User className="h-3 w-3 inline mr-1" /> Technician</p><p className="font-black text-sm uppercase">{selectedEntry.staffName || "Unknown"}</p></div>
                  <div className="space-y-1"><p className="text-[10px] font-black uppercase text-muted-foreground"><CalendarDays className="h-3 w-3 inline mr-1" /> Date</p><p className="font-black text-sm uppercase">{new Date(selectedEntry.clockInTime).toLocaleDateString()}</p></div>
                </div>
                <div className="p-4 border-2 border-black bg-muted/20 grid grid-cols-2 gap-4">
                  <div className="space-y-1"><p className="text-[10px] font-black uppercase text-muted-foreground">Start</p><p className="font-black text-lg tabular-nums">{new Date(selectedEntry.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>
                  <div className="space-y-1"><p className="text-[10px] font-black uppercase text-muted-foreground">End</p><p className="font-black text-lg tabular-nums">{selectedEntry.clockOutTime ? new Date(selectedEntry.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}</p></div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t-2 border-black">
                  <div className="space-y-1"><p className="text-[10px] font-black uppercase text-muted-foreground">Duration</p><p className="text-xl font-black">{calculateHours(selectedEntry.clockInTime, selectedEntry.clockOutTime)}</p></div>
                  <Button onClick={() => setIsDeleteDialogOpen(true)} variant="destructive" className="rounded-none border-2 border-black font-black uppercase text-xs px-4 h-12"><Trash2 className="h-4 w-4 mr-2" /> DELETE LOG</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDeleteDialogOpen(false)
        } else {
          setIsDeleteDialogOpen(true)
        }
      }}>
        <AlertDialogContent className="border-4 border-black rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-destructive" /> Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-black uppercase text-[11px]">Are you sure you want to permanently remove this time record? This will affect payroll auditing.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-black rounded-none font-black text-xs">ABORT</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                handleDeleteEntry()
              }} 
              className="bg-destructive text-white border-2 border-black rounded-none font-black text-xs"
            >
              DELETE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
