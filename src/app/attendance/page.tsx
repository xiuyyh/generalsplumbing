
"use client"

import { useState, useEffect, useRef } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, query, where, orderBy, limit, serverTimestamp, getDocs } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
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
  Loader2, 
  QrCode, 
  Clock, 
  History, 
  Camera, 
  ShieldCheck, 
  X,
  CheckCircle2
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Html5QrcodeScanner } from "html5-qrcode"
import Link from "next/link"

export default function StaffAttendancePage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const [isScanning, setIsScanning] = useState(false)
  const [activeShift, setActiveShift] = useState<any>(null)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user])
  const { data: profile } = useDoc(profileRef)

  const tokenRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, "attendanceTokens", "current")
  }, [firestore])
  const { data: currentToken } = useDoc(tokenRef)

  useEffect(() => {
    if (!isUserLoading && !user) router.replace("/auth")
  }, [user, isUserLoading, router])

  useEffect(() => {
    async function fetchActiveShift() {
      if (!firestore || !user) return
      const q = query(
        collection(firestore, "timeEntries"),
        where("userId", "==", user.uid),
        where("clockOutTime", "==", null),
        limit(1)
      )
      const snap = await getDocs(q)
      if (!snap.empty) {
        setActiveShift({ ...snap.docs[0].data(), id: snap.docs[0].id })
      } else {
        setActiveShift(null)
      }
    }
    fetchActiveShift()
  }, [firestore, user])

  const startScanner = () => {
    setIsScanning(true)
    setTimeout(() => {
      scannerRef.current = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false)
      scannerRef.current.render(onScanSuccess, onScanError)
    }, 100)
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error)
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  async function onScanSuccess(decodedText: string) {
    if (!firestore || !user || !profile || !currentToken) return
    
    if (decodedText !== currentToken.value) {
      toast({ variant: "destructive", title: "Invalid Token", description: "This QR code is not recognized by the system." })
      return
    }

    if (new Date(currentToken.expiresAt) < new Date()) {
      toast({ variant: "destructive", title: "Token Expired", description: "This QR code has expired. Request a new one from admin." })
      return
    }

    stopScanner()

    if (activeShift) {
      // Clock Out
      updateDocumentNonBlocking(doc(firestore, "timeEntries", activeShift.id), {
        clockOutTime: new Date().toISOString()
      })
      toast({ title: "Clock Out Successful", description: "Shift ended. Have a great day!" })
      setActiveShift(null)
    } else {
      // Clock In
      addDocumentNonBlocking(collection(firestore, "timeEntries"), {
        userId: user.uid,
        displayName: profile.displayName || user.email,
        clockInTime: new Date().toISOString(),
        clockOutTime: null,
        notes: "Verified via QR Terminal"
      })
      toast({ title: "Clock In Successful", description: "Shift started. Work safe!" })
      // Re-fetch shift would happen via effect or reload, but for MVP we toast
      setTimeout(() => window.location.reload(), 1500)
    }
  }

  function onScanError(err: any) {
    // Suppress noise
  }

  if (isUserLoading || !user) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin" /></div>

  return (
    <div className="max-w-md mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Personnel Terminal</h1>
        <p className="text-muted-foreground font-bold tracking-widest uppercase text-[10px]">Secure Attendance Interface</p>
      </div>

      <Card className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
        <CardHeader className="bg-black text-white p-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-black uppercase">Operation Status</CardTitle>
          {activeShift ? (
            <Badge className="bg-green-600 text-white font-black rounded-none border-2 border-white">ON-DUTY</Badge>
          ) : (
            <Badge variant="outline" className="text-white border-white font-black rounded-none">OFF-DUTY</Badge>
          )}
        </CardHeader>
        <CardContent className="p-8 space-y-8 text-center">
          {activeShift ? (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-muted-foreground">Current Session Started</p>
              <p className="text-3xl font-black tabular-nums">{new Date(activeShift.clockInTime).toLocaleTimeString()}</p>
            </div>
          ) : (
            <div className="py-6">
              <Clock className="h-16 w-16 mx-auto opacity-10" />
              <p className="mt-4 font-black uppercase text-muted-foreground">No Active Session</p>
            </div>
          )}

          {!isScanning ? (
            <Button 
              onClick={startScanner}
              className="w-full h-20 bg-black text-white font-black text-xl rounded-none shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all uppercase"
            >
              <Camera className="mr-3 h-8 w-8" /> 
              {activeShift ? "SCAN TO CHECK-OUT" : "SCAN TO CHECK-IN"}
            </Button>
          ) : (
            <div className="space-y-4">
              <div id="reader" className="w-full border-4 border-black overflow-hidden bg-black"></div>
              <Button onClick={stopScanner} variant="destructive" className="w-full h-12 rounded-none font-black uppercase">
                <X className="mr-2 h-4 w-4" /> CANCEL SCAN
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-2 border-black rounded-none p-4 bg-muted/10 text-center">
          <ShieldCheck className="h-6 w-6 mx-auto mb-2" />
          <p className="text-[9px] font-black uppercase">Secure QR Auth</p>
        </Card>
        <Button variant="outline" asChild className="border-2 border-black rounded-none h-full font-black uppercase text-xs flex flex-col gap-1 items-center justify-center">
          <Link href="/timesheets">
            <History className="h-5 w-5" />
            <span>My Logs</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
