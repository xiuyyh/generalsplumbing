
"use client"

import { useState, useEffect } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, query, where, getDocs, limit } from "firebase/firestore"
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
import { Label } from "@/components/ui/label"
import { Clock, Play, Square, Loader2, ShieldAlert } from "lucide-react"
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

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/auth")
    }
  }, [user, isAuthLoading, router])

  // Admin check - gated by user presence
  const adminRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "roles_admin", user.uid)
  }, [firestore, user])
  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRef)

  // Staff list for selection - gated by user presence
  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "staffMembers")
  }, [firestore, user])
  const { data: staffMembers, isLoading: isStaffLoading } = useCollection(staffQuery)

  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

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
        console.error("Error checking active entry:", e)
      }
    }

    checkActiveEntry()
  }, [selectedStaffId, firestore, user])

  const handleClockToggle = () => {
    if (!firestore || !selectedStaffId || isProcessing || !user) return
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
      // Optimistic update
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
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-black uppercase tracking-tighter">Attendance Manager</h1>
        <p className="text-muted-foreground font-bold mt-2 tracking-wide uppercase text-xs">Manage worker shifts and time tracking</p>
      </div>

      <Card className="border-4 border-black overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] bg-white">
        <div className={`h-4 ${activeEntry ? 'bg-black' : 'bg-muted'}`} />
        <CardHeader className="text-center pb-2">
          <div className="space-y-4 text-left">
            <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Select Worker</Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger className="h-16 text-lg font-black border-2 border-black rounded-none">
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
          
          {selectedStaffId && (
            <div className="mt-6 flex justify-center gap-2">
              {activeEntry ? (
                <Badge className="bg-black text-white px-6 py-2 text-sm font-black uppercase rounded-none">On Duty</Badge>
              ) : (
                <Badge variant="secondary" className="px-6 py-2 text-sm font-black uppercase rounded-none border-2 border-black">Clocked Out</Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-6 space-y-8">
          <div className="text-center space-y-2">
            <p className="text-6xl md:text-8xl font-black tabular-nums tracking-tighter text-black uppercase">
              {currentTime ? currentTime.toLocaleTimeString([], { hour12: true }) : "--:--:--"}
            </p>
            <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.3em]">
              {currentTime ? currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : "Loading..."}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {!activeEntry ? (
              <Button 
                size="lg" 
                disabled={!selectedStaffId || isProcessing}
                className="h-24 text-2xl font-black bg-black text-white rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all" 
                onClick={handleClockToggle}
              >
                <Play className="mr-3 h-8 w-8 fill-current" /> START SHIFT
              </Button>
            ) : (
              <Button 
                size="lg" 
                variant="destructive" 
                disabled={isProcessing}
                className="h-24 text-2xl font-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all" 
                onClick={handleClockToggle}
              >
                <Square className="mr-3 h-8 w-8 fill-current" /> END SHIFT
              </Button>
            )}
            
            {activeEntry && (
              <div className="bg-muted p-4 border-2 border-black rounded-none flex items-center justify-center gap-3 text-sm font-black text-black uppercase tracking-tight">
                <Clock className="h-5 w-5" />
                Shift started at {new Date(activeEntry.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
