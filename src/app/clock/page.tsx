
"use client"

import { useState, useEffect } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, query, where, getDocs, limit, orderBy } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useRouter } from "next/navigation"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Clock, Play, Square, Loader2, ShieldAlert, CalendarClock } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useDoc } from "@/firebase/firestore/use-doc"

export default function ClockPage() {
  const { user, isUserLoading: isAuthLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const [selectedStaffId, setSelectedStaffId] = useState<string>("")
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [activeEntry, setActiveEntry] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [customDateTime, setCustomDateTime] = useState<string>("")

  // Set initial custom date time to now (local)
  useEffect(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    setCustomDateTime(now.toISOString().slice(0, 16))
    
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/auth")
    }
  }, [user, isAuthLoading, router])

  // Admin check
  const adminRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "roles_admin", user.uid)
  }, [firestore, user])
  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRef)

  // Sorted staff list for selection
  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "staffMembers"), orderBy("lastName", "asc"))
  }, [firestore, user])
  const { data: staffMembers, isLoading: isStaffLoading } = useCollection(staffQuery)

  // Check for active clock-in for selected staff
  useEffect(() => {
    async function checkActiveEntry() {
      if (!firestore || !selectedStaffId || !user) {
        setActiveEntry(null)
        return
      }

      const q = query(
        collection(firestore, "timeEntries"),
        where("staffMemberId", "==", selectedStaffId),
        where("clockOutTime", "==", null),
        limit(1)
      )

      try {
        const querySnapshot = await getDocs(q)
        if (!querySnapshot.empty) {
          setActiveEntry({ ...querySnapshot.docs[0].data(), id: querySnapshot.docs[0].id })
        } else {
          setActiveEntry(null)
        }
      } catch (e) {
        // Errors are handled by the global listener if they are permissions-related
        setActiveEntry(null)
      }
    }

    checkActiveEntry()
  }, [selectedStaffId, firestore, user])

  const handleClockToggle = () => {
    if (!firestore || !selectedStaffId || isProcessing || !user) return
    setIsProcessing(true)

    const timestamp = new Date(customDateTime).toISOString()
    const staff = staffMembers?.find(s => s.id === selectedStaffId)

    if (!activeEntry) {
      // Clock In
      const newEntry = {
        staffMemberId: selectedStaffId,
        clockInTime: timestamp,
        clockOutTime: null,
        notes: "Admin manual clock in"
      }
      addDocumentNonBlocking(collection(firestore, "timeEntries"), newEntry)
      toast({
        title: "Staff Clocked In",
        description: `${staff?.firstName} session recorded at ${new Date(customDateTime).toLocaleString()}.`,
      })
      // Do not use 'temp' ID to avoid permission errors on immediate update attempts
      // The useEffect query will find the real document shortly
    } else {
      // Clock Out - only proceed if we have a real document ID
      if (activeEntry.id === 'temp') {
        setIsProcessing(false)
        return
      }

      const entryRef = doc(firestore, "timeEntries", activeEntry.id)
      updateDocumentNonBlocking(entryRef, {
        clockOutTime: timestamp
      })
      toast({
        title: "Staff Clocked Out",
        description: `${staff?.firstName} session closed at ${new Date(customDateTime).toLocaleString()}.`,
      })
      setActiveEntry(null)
    }
    
    setIsProcessing(false)
  }

  if (isAuthLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Verifying Identity...</p>
      </div>
    )
  }

  if (isAdminLoading || isStaffLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Accessing Records...</p>
      </div>
    )
  }

  if (!adminRole) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <ShieldAlert className="h-16 w-16 mx-auto text-black" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Admin Access Required</h2>
        <p className="text-muted-foreground font-bold">Only administrators are authorized to clock workers in or out for shifts.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Attendance Manager</h1>
        <p className="text-muted-foreground font-bold tracking-wide uppercase text-[10px]">Manual override enabled for administrators</p>
      </div>

      <Card className="border-2 border-black overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white">
        <div className={`h-2 ${activeEntry ? 'bg-black' : 'bg-muted'}`} />
        <CardHeader className="space-y-4 pb-2">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">1. Select Worker</Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger className="h-12 text-sm font-black border-2 border-black rounded-none">
                <SelectValue placeholder="Choose a technician..." />
              </SelectTrigger>
              <SelectContent>
                {staffMembers?.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id} className="font-bold">
                    {staff.firstName} {staff.lastName} - {staff.officialRole}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <CalendarClock className="h-3 w-3" /> 2. Set Log Time
            </Label>
            <Input 
              type="datetime-local" 
              value={customDateTime}
              onChange={(e) => setCustomDateTime(e.target.value)}
              className="h-12 text-sm font-black border-2 border-black rounded-none bg-muted/30 focus:bg-white transition-colors"
            />
          </div>
          
          {selectedStaffId && (
            <div className="flex justify-center gap-2">
              {activeEntry ? (
                <Badge className="bg-black text-white px-4 py-1 text-[10px] font-black uppercase rounded-none">Active Shift</Badge>
              ) : (
                <Badge variant="outline" className="px-4 py-1 text-[10px] font-black uppercase rounded-none border-2 border-black">Off-Duty</Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-4 space-y-6">
          <div className="text-center space-y-1 py-4 border-y-2 border-black/5 bg-muted/10">
            <p className="text-5xl font-black tabular-nums tracking-tighter text-black uppercase">
              {currentTime ? currentTime.toLocaleTimeString([], { hour12: true }) : "--:--:--"}
            </p>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
              {currentTime ? currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : "..."}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {!activeEntry ? (
              <Button 
                size="lg" 
                disabled={!selectedStaffId || !customDateTime || isProcessing}
                className="h-16 text-lg font-black bg-black text-white rounded-none shadow-[1px_1px_0px_0px_rgba(255,255,255,0.2)] hover:bg-black/90 transition-all disabled:opacity-30" 
                onClick={handleClockToggle}
              >
                <Play className="mr-2 h-6 w-6 fill-current" /> RECORD CLOCK-IN
              </Button>
            ) : (
              <Button 
                size="lg" 
                variant="destructive" 
                disabled={!customDateTime || isProcessing}
                className="h-16 text-lg font-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)] hover:bg-destructive/90 transition-all disabled:opacity-30" 
                onClick={handleClockToggle}
              >
                <Square className="mr-2 h-6 w-6 fill-current" /> RECORD CLOCK-OUT
              </Button>
            )}
            
            {activeEntry && (
              <div className="bg-muted/30 p-3 border border-black/10 rounded-none flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-tight">
                <Clock className="h-4 w-4" />
                Started: {new Date(activeEntry.clockInTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
