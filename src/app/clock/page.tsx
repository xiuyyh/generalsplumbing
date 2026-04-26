
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Play, Square, Loader2, ShieldAlert, CalendarClock, Save, History } from "lucide-react"
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
  
  // Real-time toggle state
  const [toggleDateTime, setToggleDateTime] = useState<string>("")
  
  // Manual record state
  const [manualInTime, setManualInTime] = useState<string>("")
  const [manualOutTime, setManualOutTime] = useState<string>("")

  // Update clocks and default inputs
  useEffect(() => {
    const now = new Date()
    // Local ISO string for datetime-local input
    const offsetNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    setToggleDateTime(offsetNow)
    setManualInTime(offsetNow)
    setManualOutTime(offsetNow)
    
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Guard: Redirect if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/auth")
    }
  }, [user, isAuthLoading, router])

  // Admin access check
  const adminRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "roles_admin", user.uid)
  }, [firestore, user])
  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRef)

  // Fetch staff registry (sorted by last name)
  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "staffMembers"), orderBy("lastName", "asc"))
  }, [firestore, user])
  const { data: staffMembers, isLoading: isStaffLoading } = useCollection(staffQuery)

  // Check for active (unclosed) shift for selected technician
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
        setActiveEntry(null)
      }
    }

    checkActiveEntry()
  }, [selectedStaffId, firestore, user])

  const handleClockToggle = () => {
    if (!firestore || !selectedStaffId || isProcessing || !user) return
    setIsProcessing(true)

    const timestamp = new Date(toggleDateTime).toISOString()
    const staff = staffMembers?.find(s => s.id === selectedStaffId)

    if (!activeEntry) {
      // Create new clock-in record
      addDocumentNonBlocking(collection(firestore, "timeEntries"), {
        staffMemberId: selectedStaffId,
        clockInTime: timestamp,
        clockOutTime: null,
        notes: "Shift initiated via terminal"
      })
      toast({
        title: "Clock-In Recorded",
        description: `${staff?.firstName} session started at ${new Date(toggleDateTime).toLocaleString()}.`,
      })
    } else {
      // Update existing record with clock-out time
      const entryRef = doc(firestore, "timeEntries", activeEntry.id)
      updateDocumentNonBlocking(entryRef, {
        clockOutTime: timestamp
      })
      toast({
        title: "Clock-Out Recorded",
        description: `${staff?.firstName} session closed at ${new Date(toggleDateTime).toLocaleString()}.`,
      })
      setActiveEntry(null)
    }
    
    setIsProcessing(false)
  }

  const handleManualRecordSave = () => {
    if (!firestore || !selectedStaffId || !manualInTime || !manualOutTime || isProcessing || !user) return
    
    // Simple validation
    if (new Date(manualOutTime) <= new Date(manualInTime)) {
      toast({
        variant: "destructive",
        title: "Invalid Duration",
        description: "Clock-out time must be after clock-in time.",
      })
      return
    }

    setIsProcessing(true)
    const clockInTime = new Date(manualInTime).toISOString()
    const clockOutTime = new Date(manualOutTime).toISOString()
    const staff = staffMembers?.find(s => s.id === selectedStaffId)

    addDocumentNonBlocking(collection(firestore, "timeEntries"), {
      staffMemberId: selectedStaffId,
      clockInTime,
      clockOutTime,
      notes: "Manual historical entry"
    })

    toast({
      title: "Manual Log Created",
      description: `Full shift for ${staff?.firstName} saved successfully.`,
    })

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
        <p className="text-muted-foreground font-bold">Only administrators are authorized to manage technician attendance logs.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Attendance Terminal</h1>
        <p className="text-muted-foreground font-bold tracking-wide uppercase text-[10px]">Real-time and Historical Log Management</p>
      </div>

      <Card className="border-2 border-black overflow-hidden shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-white rounded-none">
        <CardHeader className="space-y-4 pb-2 border-b-2 border-black bg-muted/10">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Identify Technician</Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger className="h-12 text-sm font-black border-2 border-black rounded-none">
                <SelectValue placeholder="Choose a worker..." />
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
            <div className="flex justify-center gap-2">
              {activeEntry ? (
                <Badge className="bg-black text-white px-4 py-1 text-[10px] font-black uppercase rounded-none">Currently Active</Badge>
              ) : (
                <Badge variant="outline" className="px-4 py-1 text-[10px] font-black uppercase rounded-none border-2 border-black">Off-Duty</Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <Tabs defaultValue="toggle" className="w-full">
            <TabsList className="w-full grid grid-cols-2 rounded-none bg-muted/50 border-b-2 border-black h-12 p-0">
              <TabsTrigger value="toggle" className="rounded-none font-black uppercase text-[10px] data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-black">Shift Action</TabsTrigger>
              <TabsTrigger value="manual" className="rounded-none font-black uppercase text-[10px] data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-black">Manual History</TabsTrigger>
            </TabsList>

            <TabsContent value="toggle" className="p-6 space-y-6 m-0">
              <div className="text-center space-y-1 py-6 bg-muted/5 border-2 border-black/5">
                <p className="text-5xl font-black tabular-nums tracking-tighter text-black">
                  {currentTime ? currentTime.toLocaleTimeString([], { hour12: true }) : "--:--:--"}
                </p>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                  {currentTime ? currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) : "..."}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                    <CalendarClock className="h-3 w-3" /> Timestamp Override
                  </Label>
                  <Input 
                    type="datetime-local" 
                    value={toggleDateTime}
                    onChange={(e) => setToggleDateTime(e.target.value)}
                    className="h-12 border-2 border-black rounded-none font-black"
                  />
                </div>

                {!activeEntry ? (
                  <Button 
                    size="lg" 
                    disabled={!selectedStaffId || isProcessing}
                    className="w-full h-16 text-lg font-black bg-black text-white rounded-none shadow-[1px_1px_0px_0px_rgba(255,255,255,0.2)] hover:bg-black/90 disabled:opacity-30" 
                    onClick={handleClockToggle}
                  >
                    <Play className="mr-2 h-6 w-6 fill-current" /> RECORD CLOCK-IN
                  </Button>
                ) : (
                  <Button 
                    size="lg" 
                    variant="destructive" 
                    disabled={isProcessing}
                    className="w-full h-16 text-lg font-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)] hover:bg-destructive/90 disabled:opacity-30" 
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
            </TabsContent>

            <TabsContent value="manual" className="p-6 space-y-6 m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" /> Manual Clock-In
                  </Label>
                  <Input 
                    type="datetime-local" 
                    value={manualInTime}
                    onChange={(e) => setManualInTime(e.target.value)}
                    className="h-12 border-2 border-black rounded-none font-black"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" /> Manual Clock-Out
                  </Label>
                  <Input 
                    type="datetime-local" 
                    value={manualOutTime}
                    onChange={(e) => setManualOutTime(e.target.value)}
                    className="h-12 border-2 border-black rounded-none font-black"
                  />
                </div>
              </div>

              <Button 
                size="lg" 
                disabled={!selectedStaffId || isProcessing}
                className="w-full h-16 text-lg font-black bg-black text-white rounded-none shadow-[1px_1px_0px_0px_rgba(255,255,255,0.2)] hover:bg-black/90 disabled:opacity-30" 
                onClick={handleManualRecordSave}
              >
                <Save className="mr-2 h-6 w-6" /> SAVE COMPLETED SHIFT
              </Button>
              
              <div className="p-4 border-2 border-black border-dashed bg-muted/10 text-center space-y-1">
                <History className="h-5 w-5 mx-auto opacity-30" />
                <p className="text-[9px] font-black uppercase text-muted-foreground">
                  Use this module to manually insert a completed historical record into the database.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
