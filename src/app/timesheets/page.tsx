"use client"

import { useState, useEffect } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, orderBy, doc, where } from "firebase/firestore"
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
  CalendarDays,
  Trash2,
  ShieldAlert
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

export default function TimesheetsPage() {
  const { user, isUserLoading: isAuthLoading } = useUser()
  const firestore = useFirestore()
  const [selectedEntry, setSelectedEntry] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [localTimeZone, setLocalTimeZone] = useState<string>("")

  useEffect(() => {
    setLocalTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [])

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user])
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  const isAdmin = profile?.role === "ADMIN"

  const timeQuery = useMemoFirebase(() => {
    if (!firestore || !user || !profile) return null
    if (profile.role === "ADMIN") {
      return query(collection(firestore, "timeEntries"), orderBy("clockInTime", "desc"))
    } else {
      return query(
        collection(firestore, "timeEntries"), 
        where("userId", "==", user.uid),
        orderBy("clockInTime", "desc")
      )
    }
  }, [firestore, user, profile])
  const { data: timeEntries, isLoading } = useCollection(timeQuery)

  const calculateHours = (start: string, end: string | null) => {
    if (!end) return "Active"
    const diff = new Date(end).getTime() - new Date(start).getTime()
    return (diff / (1000 * 60 * 60)).toFixed(2) + "h"
  }

  const formatDateTime = (isoString: string) => {
    if (!isoString) return "--:--"
    return new Date(isoString).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short'
    })
  }

  const handleRowClick = (entry: any) => {
    setSelectedEntry(entry)
    setIsDetailsOpen(true)
  }

  const handleDeleteEntry = (entry: any) => {
    if (!firestore || !isAdmin) return
    if (window.confirm(`PERMANENT REMOVAL: Delete this time record from audit trail?`)) {
      deleteDocumentNonBlocking(doc(firestore, "timeEntries", entry.id))
      toast({ variant: "destructive", title: "Log Deleted" })
      setIsDetailsOpen(false)
      setSelectedEntry(null)
    }
  }

  if (isAuthLoading || isProfileLoading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Attendance History</h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Verified Session Logs (Zone: {localTimeZone || "Detecting..."})</p>
        </div>
        {isAdmin && (
          <Button variant="outline" className="border-2 border-black rounded-none font-black h-10 px-4">
            <FileDown className="mr-2 h-4 w-4" /> Export Data
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 border-2 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
          <CardHeader className="bg-muted/30 border-b-2 border-black py-3">
            <CardTitle className="text-lg font-black uppercase">{isAdmin ? "Full Workforce Logs" : "My Personal Logs"}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-black">
                <TableRow className="hover:bg-black">
                  <TableHead className="text-white font-black uppercase text-[10px]">Personnel</TableHead>
                  <TableHead className="text-white font-black uppercase text-[10px]">Start Time</TableHead>
                  <TableHead className="text-white font-black uppercase text-[10px] hidden md:table-cell">Duration</TableHead>
                  <TableHead className="text-white font-black uppercase text-[10px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></TableCell></TableRow>
                ) : (
                  timeEntries?.map((entry) => (
                    <TableRow 
                      key={entry.id} 
                      className="border-b border-black/10 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handleRowClick(entry)}
                    >
                      <TableCell className="font-black text-xs uppercase">{entry.displayName || "Unknown"}</TableCell>
                      <TableCell className="text-[10px] font-bold uppercase">{localTimeZone ? formatDateTime(entry.clockInTime) : "..."}</TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs font-black">
                        {calculateHours(entry.clockInTime, entry.clockOutTime)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="rounded-none border-2 border-transparent hover:border-black"><ArrowRight className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {!isLoading && (!timeEntries || timeEntries.length === 0) && (
                  <TableRow><TableCell colSpan={4} className="py-20 text-center text-[10px] font-black uppercase text-muted-foreground">No attendance records found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-black text-white border-2 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs"><span className="font-bold uppercase opacity-60">Total Logs</span><span className="font-black">{timeEntries?.length || 0}</span></div>
            </div>
            <p className="text-[9px] font-bold text-white/50 uppercase leading-relaxed">
              Attendance records are verified via QR terminal scan. Times reflect the local zone: {localTimeZone || "Detecting..."}.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="border-4 border-black rounded-none max-w-sm">
          <DialogHeader className="border-b-2 border-black pb-4">
            <DialogTitle className="text-2xl font-black uppercase">Verification Details</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            {selectedEntry && (
              <>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground"><User className="h-3 w-3 inline mr-1" /> Personnel</p>
                  <p className="font-black text-sm uppercase">{selectedEntry.displayName}</p>
                </div>
                <div className="p-4 border-2 border-black bg-muted/20 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Check-In</p>
                    <p className="font-black text-lg tabular-nums">
                      {localTimeZone ? new Date(selectedEntry.clockInTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : "..."}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Check-Out</p>
                    <p className="font-black text-lg tabular-nums">
                      {selectedEntry.clockOutTime ? new Date(selectedEntry.clockOutTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t-2 border-black">
                  <div className="space-y-1"><p className="text-[10px] font-black uppercase text-muted-foreground">Total Duration</p><p className="text-xl font-black">{calculateHours(selectedEntry.clockInTime, selectedEntry.clockOutTime)}</p></div>
                  {isAdmin && (
                    <Button onClick={() => handleDeleteEntry(selectedEntry)} variant="destructive" className="rounded-none font-black uppercase text-xs h-12">
                      <Trash2 className="h-4 w-4 mr-2" /> DELETE
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
