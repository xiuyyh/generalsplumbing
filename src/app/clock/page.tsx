"use client"

import { useState, useEffect } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, query, where, getDocs, limit, orderBy } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Clock, Play, Square, User, Loader2, ShieldAlert } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useDoc } from "@/firebase/firestore/use-doc"

export default function ClockPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [selectedStaffId, setSelectedStaffId] = useState<string>("")
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [activeEntry, setActiveEntry] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Admin check
  const adminRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "roles_admin", user.uid)
  }, [firestore, user])
  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRef)

  // Staff list for selection
  const staffQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, "staffMembers")
  }, [firestore])
  const { data: staffMembers, isLoading: isStaffLoading } = useCollection(staffQuery)

  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Check for active clock-in for selected staff
  useEffect(() => {
    async function checkActiveEntry() {
      if (!firestore || !selectedStaffId) {
        setActiveEntry(null)
        return
      }

      const q = query(
        collection(firestore, "timeEntries"),
        where("staffMemberId", "==", selectedStaffId),
        where("clockOutTime", "==", null),
        limit(1)
      )

      const querySnapshot = await getDocs(q)
      if (!querySnapshot.empty) {
        setActiveEntry({ ...querySnapshot.docs[0].data(), id: querySnapshot.docs[0].id })
      } else {
        setActiveEntry(null)
      }
    }

    checkActiveEntry()
  }, [selectedStaffId, firestore])

  const handleClockToggle = () => {
    if (!firestore || !selectedStaffId || isProcessing) return
    setIsProcessing(true)

    const now = new Date().toISOString()
    const staff = staffMembers?.find(s => s.id === selectedStaffId)

    if (!activeEntry) {
      // Clock In
      const newEntry = {
        staffMemberId: selectedStaffId,
        clockInTime: now,
        clockOutTime: null,
        notes: "Admin clocked in worker"
      }
      addDocumentNonBlocking(collection(firestore, "timeEntries"), newEntry)
      toast({
        title: "Staff Clocked In",
        description: `${staff?.firstName} is now active.`,
      })
      // Optimistic update for UI feel (though real state comes from checkActiveEntry effect)
      setActiveEntry({ ...newEntry, id: 'temp' })
    } else {
      // Clock Out
      const entryRef = doc(firestore, "timeEntries", activeEntry.id)
      updateDocumentNonBlocking(entryRef, {
        clockOutTime: now
      })
      toast({
        title: "Staff Clocked Out",
        description: `${staff?.firstName} shift completed.`,
      })
      setActiveEntry(null)
    }
    
    setIsProcessing(false)
  }

  if (isAdminLoading || isStaffLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!adminRole) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <ShieldAlert className="h-16 w-16 mx-auto text-destructive" />
        <h2 className="text-2xl font-black">Admin Access Required</h2>
        <p className="text-muted-foreground">Only administrators are authorized to clock workers in or out for shifts.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-headline font-bold">Attendance Manager</h1>
        <p className="text-muted-foreground mt-2">Manage worker shifts and time tracking</p>
      </div>

      <Card className="border-2 overflow-hidden shadow-2xl">
        <div className={`h-3 ${activeEntry ? 'bg-black' : 'bg-muted'}`} />
        <CardHeader className="text-center pb-2">
          <div className="space-y-4">
            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select Worker</Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger className="h-14 text-lg font-bold">
                <SelectValue placeholder="Choose a technician..." />
              </SelectTrigger>
              <SelectContent>
                {staffMembers?.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.firstName} {staff.lastName} - {staff.officialRole}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedStaffId && (
            <div className="mt-6 flex justify-center gap-2">
              {activeEntry ? (
                <Badge className="bg-black text-white px-4 py-1 text-sm font-black uppercase">On Duty</Badge>
              ) : (
                <Badge variant="secondary" className="px-4 py-1 text-sm font-black uppercase">Clocked Out</Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-6 space-y-8">
          <div className="text-center space-y-2">
            <p className="text-5xl md:text-7xl font-headline font-black tabular-nums tracking-tighter text-black">
              {currentTime ? currentTime.toLocaleTimeString([], { hour12: true }) : "--:--:--"}
            </p>
            <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em]">
              {currentTime ? currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : "Loading..."}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {!activeEntry ? (
              <Button 
                size="lg" 
                disabled={!selectedStaffId || isProcessing}
                className="h-20 text-xl font-black bg-black text-white shadow-xl hover:scale-[1.02] transition-transform" 
                onClick={handleClockToggle}
              >
                <Play className="mr-3 h-6 w-6 fill-current" /> START SHIFT
              </Button>
            ) : (
              <Button 
                size="lg" 
                variant="destructive" 
                disabled={isProcessing}
                className="h-20 text-xl font-black shadow-xl hover:scale-[1.02] transition-transform" 
                onClick={handleClockToggle}
              >
                <Square className="mr-3 h-6 w-6 fill-current" /> END SHIFT
              </Button>
            )}
            
            {activeEntry && (
              <div className="bg-muted p-4 rounded-lg flex items-center justify-center gap-3 text-sm font-bold text-muted-foreground">
                <Clock className="h-4 w-4" />
                Shift started at {new Date(activeEntry.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
