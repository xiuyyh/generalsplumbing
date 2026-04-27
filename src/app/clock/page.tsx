
"use client"

import { useState, useEffect } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, query, where, getDocs, limit, orderBy } from "firebase/firestore"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
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
import { Clock, Loader2, ShieldAlert, Save, History } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function ClockPage() {
  const { user, isUserLoading: isAuthLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  
  const [selectedStaffId, setSelectedStaffId] = useState<string>("")
  const [activeEntry, setActiveEntry] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Manual record state
  const [manualInTime, setManualInTime] = useState<string>("")
  const [manualOutTime, setManualOutTime] = useState<string>("")

  // Initialize default inputs
  useEffect(() => {
    const now = new Date()
    const offsetNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    setManualInTime(offsetNow)
    setManualOutTime(offsetNow)
  }, [])

  // Guard: Redirect if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/auth")
    }
  }, [user, isAuthLoading, router])

  // Centralized RBAC check using the users collection
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user])
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

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
      notes: "Manual entry recorded via terminal"
    })

    toast({
      title: "Manual Log Created",
      description: `Full shift for ${staff?.firstName} saved successfully.`,
    })

    setIsProcessing(false)
  }

  if (isAuthLoading || isProfileLoading || isStaffLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Verifying Terminal Access...</p>
      </div>
    )
  }

  const isAdmin = profile?.role === "ADMIN"

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <ShieldAlert className="h-16 w-16 mx-auto text-black" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Admin Access Only</h2>
        <p className="text-muted-foreground font-bold">Only administrators are authorized to manage technician attendance logs for the team.</p>
        <Button asChild variant="outline" className="border-2 border-black rounded-none uppercase font-black">
          <Link href="/">Return to Dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Attendance Terminal</h1>
        <p className="text-muted-foreground font-bold tracking-wide uppercase text-[10px]">Administrative Shift Registry</p>
      </div>

      <Card className="border-2 border-black overflow-hidden shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-white rounded-none">
        <CardHeader className="space-y-4 pb-4 border-b-2 border-black bg-muted/10">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Personnel</Label>
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
          
          {selectedStaffId && (
            <div className="flex justify-center gap-2">
              {activeEntry ? (
                <Badge className="bg-black text-white px-4 py-1 text-[10px] font-black uppercase rounded-none">Technician On-Duty</Badge>
              ) : (
                <Badge variant="outline" className="px-4 py-1 text-[10px] font-black uppercase rounded-none border-2 border-black">Technician Off-Duty</Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-6 space-y-6">
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
            className="w-full h-16 text-lg font-black bg-black text-white rounded-none shadow-[1px_1px_0px_0px_rgba(255,255,255,0.2)] hover:bg-black/90 disabled:opacity-30 uppercase" 
            onClick={handleManualRecordSave}
          >
            <Save className="mr-2 h-6 w-6" /> SAVE SHIFT LOG
          </Button>
          
          <div className="p-4 border-2 border-black border-dashed bg-muted/10 text-center space-y-1">
            <History className="h-5 w-5 mx-auto opacity-30 text-black" />
            <p className="text-[9px] font-black uppercase text-muted-foreground">
              AUTHORIZED PERSONNEL ONLY: This terminal is for administrative attendance tracking. 
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
import Link from "next/link"
