
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
  CheckCircle2,
  Megaphone,
  Bell
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Html5Qrcode } from "html5-qrcode"
import Link from "next/link"

export default function StaffAttendancePage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const [isScanning, setIsScanning] = useState(false)
  const [activeShift, setActiveShift] = useState<any>(null)
  const [localTimeZone, setLocalTimeZone] = useState<string>("")
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user])
  const { data: profile } = useDoc(profileRef)

  const tokenRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, "attendanceTokens", "current")
  }, [firestore])
  const { data: currentToken, isLoading: isTokenLoading } = useDoc(tokenRef)

  useEffect(() => {
    if (!isUserLoading && !user) router.replace("/auth")
    setLocalTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
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

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error)
      }
    }
  }, [])

  const startScanner = () => {
    setIsScanning(true)
    setTimeout(() => {
      const html5QrCode = new Html5Qrcode("reader")
      scannerRef.current = html5QrCode
      
      const config = { 
        fps: 15, 
        qrbox: { width: 250, height: 250 } 
      }

      html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        onScanSuccess, 
        onScanError
      ).catch(err => {
        console.error("Scanner start error:", err)
        toast({ 
          variant: "destructive", 
          title: "Camera Error", 
          description: "Could not access the rear camera. Check device permissions." 
        })
        setIsScanning(false)
      })
    }, 100)
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop().catch(console.error)
      }
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  async function onScanSuccess(decodedText: string) {
    if (!firestore || !user || !profile || !currentToken) return
    
    if (decodedText !== currentToken.value) {
      toast({ variant: "destructive", title: "Invalid Token", description: "QR code not recognized." })
      return
    }

    if (new Date(currentToken.expiresAt) < new Date()) {
      toast({ variant: "destructive", title: "Token Expired", description: "This code has been revoked or expired." })
      return
    }

    await stopScanner()

    if (activeShift) {
      updateDocumentNonBlocking(doc(firestore, "timeEntries", activeShift.id), {
        clockOutTime: new Date().toISOString()
      })
      toast({ title: "Clock Out Successful", description: "Session terminated." })
      setActiveShift(null)
    } else {
      addDocumentNonBlocking(collection(firestore, "timeEntries"), {
        userId: user.uid,
        displayName: profile.displayName || user.email,
        clockInTime: new Date().toISOString(),
        clockOutTime: null,
        notes: "QR Verified"
      })
      toast({ title: "Clock In Successful", description: "Shift session started." })
      setTimeout(() => window.location.reload(), 1500)
    }
  }

  function onScanError(err: any) {}

  const formatTime = (isoString: string) => {
    if (!isoString) return "--:--"
    return new Date(isoString).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  if (isUserLoading || !user) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin" /></div>

  return (
    <div className="max-w-md mx-auto space-y-6 pb-12">
      <div className="text-center">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Attendance Portal</h1>
        <p className="text-muted-foreground font-bold tracking-widest uppercase text-[10px]">Secure Site Terminal</p>
      </div>

      {currentToken && !isTokenLoading && currentToken.adminNote && (
        <Card className="border-4 border-black rounded-none bg-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-in fade-in slide-in-from-top-4">
          <CardContent className="p-4 flex gap-3 items-start">
            <Megaphone className="h-5 w-5 shrink-0 text-black" />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-amber-800 flex items-center gap-1">
                <Bell className="h-3 w-3" /> System Announcement
              </p>
              <p className="font-bold text-sm uppercase leading-tight italic">"{currentToken.adminNote}"</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
        <CardHeader className="bg-black text-white p-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-black uppercase">Operation Status</CardTitle>
          {activeShift ? (
            <Badge className="bg-green-600 text-white font-black rounded-none border-2 border-white uppercase text-[8px]">Session Active</Badge>
          ) : (
            <Badge variant="outline" className="text-white border-white font-black rounded-none uppercase text-[8px]">Offline</Badge>
          )}
        </CardHeader>
        <CardContent className="p-8 space-y-8 text-center">
          {activeShift ? (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-muted-foreground">Clock-In Registered</p>
              <p className="text-4xl font-black tabular-nums">{localTimeZone ? formatTime(activeShift.clockInTime) : "..."}</p>
            </div>
          ) : (
            <div className="py-6">
              <Clock className="h-20 w-20 mx-auto opacity-10" />
              <p className="mt-4 font-black uppercase text-muted-foreground tracking-widest text-[12px]">Ready for Dispatch</p>
            </div>
          )}

          {!isScanning ? (
            <Button 
              onClick={startScanner}
              className="w-full h-24 bg-black text-white font-black text-xl rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all uppercase flex flex-col gap-1 items-center justify-center"
            >
              <Camera className="h-8 w-8" /> 
              <span>{activeShift ? "SCAN TO CHECK-OUT" : "SCAN TO CHECK-IN"}</span>
            </Button>
          ) : (
            <div className="space-y-4">
              <div id="reader" className="w-full border-4 border-black overflow-hidden bg-black min-h-[300px] flex items-center justify-center">
                <p className="text-white text-[10px] font-black uppercase">Initialising Camera...</p>
              </div>
              <Button onClick={stopScanner} variant="destructive" className="w-full h-12 rounded-none font-black uppercase border-2 border-black">
                <X className="mr-2 h-4 w-4" /> CANCEL AUTHENTICATION
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-2 border-black rounded-none p-4 bg-muted/10 text-center flex flex-col items-center justify-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          <p className="text-[9px] font-black uppercase leading-tight">Biometric & QR Verified</p>
        </Card>
        <Button variant="outline" asChild className="border-2 border-black rounded-none h-full font-black uppercase text-xs flex flex-col gap-1 items-center justify-center py-4">
          <Link href="/timesheets">
            <History className="h-5 w-5" />
            <span>My Audit Log</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
