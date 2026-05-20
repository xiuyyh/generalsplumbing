
"use client"

import { useState, useEffect } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, query, orderBy, limit } from "firebase/firestore"
import { setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { QrCode, Loader2, ShieldAlert, RefreshCw, Clock, History, Timer, Printer, Trash2, MessageCircle } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export default function AdminQRCodeGenerator() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  
  const [expiryValue, setExpiryValue] = useState<number | "">(8)
  const [expiryUnit, setExpiryUnit] = useState<string>("hours")
  const [adminNote, setAdminNote] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [localTimeZone, setLocalTimeZone] = useState<string>("")

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user])
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  const tokenRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, "attendanceTokens", "current")
  }, [firestore])
  const { data: activeToken, isLoading: isTokenLoading } = useDoc(tokenRef)

  const isExpired = activeToken ? new Date(activeToken.expiresAt) < new Date() : true

  useEffect(() => {
    if (!isUserLoading && !user) router.replace("/auth")
    setLocalTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [user, isUserLoading, router])

  if (isUserLoading || isProfileLoading || !user) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin" /></div>
  }

  if (profile?.role !== "ADMIN") {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <ShieldAlert className="h-16 w-16 mx-auto text-black" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Admin Access Only</h2>
        <p className="text-muted-foreground font-bold">Only administrators can generate operational check-in tokens.</p>
        <Button asChild variant="outline" className="border-2 border-black rounded-none uppercase font-black">
          <Link href="/">Return to Dashboard</Link>
        </Button>
      </div>
    )
  }

  const handleGenerateCode = () => {
    const val = typeof expiryValue === 'number' ? expiryValue : 0
    if (!firestore || isGenerating || val <= 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Please enter a valid positive duration." })
      return
    }
    setIsGenerating(true)

    let multiplier = 60000 
    if (expiryUnit === "hours") multiplier = 3600000
    if (expiryUnit === "days") multiplier = 86400000

    const tokenId = Math.random().toString(36).substring(2, 15)
    const expiresAt = new Date(Date.now() + val * multiplier).toISOString()
    
    setDocumentNonBlocking(doc(firestore, "attendanceTokens", "current"), {
      value: tokenId,
      expiresAt,
      adminNote: adminNote || "",
      createdAt: new Date().toISOString()
    }, { merge: true })

    toast({ 
      title: "QR Code Generated", 
      description: `Active for the next ${val} ${expiryUnit}.` 
    })
    setIsGenerating(false)
  }

  const handleTerminateCode = () => {
    if (!firestore || !activeToken) return
    if (window.confirm("IMMEDIATE REVOCATION: Revoke current QR access for all staff?")) {
      updateDocumentNonBlocking(doc(firestore, "attendanceTokens", "current"), {
        expiresAt: new Date(Date.now() - 1000).toISOString()
      })
      toast({ variant: "destructive", title: "Access Revoked", description: "QR code has been invalidated." })
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-20">
      <div className="text-center no-print">
        <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center justify-center gap-3">
          <QrCode className="h-10 w-10" /> Auth Terminal
        </h1>
        <p className="text-muted-foreground font-bold tracking-widest uppercase text-[10px]">Zone: {localTimeZone || "Detecting..."}</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Printable QR Card */}
        <Card className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden print:shadow-none print:border-none">
          <CardHeader className="bg-black text-white p-4 text-center print:bg-white print:text-black print:border-b-4 print:border-black">
            <CardTitle className="text-lg font-black uppercase">Staff Attendance QR</CardTitle>
            <p className="text-[10px] uppercase font-black opacity-60 print:opacity-100">Scan via Management App</p>
          </CardHeader>
          <CardContent className="p-8 flex flex-col items-center justify-center space-y-8">
            <div className={`p-4 border-4 border-black bg-white ${isExpired ? "opacity-20 grayscale" : ""}`}>
              {activeToken && !isExpired ? (
                <QRCodeSVG value={activeToken.value} size={300} level="H" />
              ) : (
                <div className="h-[300px] w-[300px] flex items-center justify-center bg-muted">
                  <Clock className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>

            {activeToken && !isExpired ? (
              <div className="text-center space-y-4 w-full">
                <div className="space-y-1">
                  <p className="text-2xl font-black uppercase">Active Code</p>
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest print:text-black">
                    <Timer className="h-4 w-4" />
                    <span>Expires: {localTimeZone ? formatDateTime(activeToken.expiresAt) : "..."}</span>
                  </div>
                </div>

                {activeToken.adminNote && (
                  <div className="bg-muted/30 p-4 border-2 border-black border-dashed print:bg-white">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 flex items-center justify-center gap-2">
                      <MessageCircle className="h-3 w-3" /> Admin Message
                    </p>
                    <p className="font-bold text-sm uppercase italic">"{activeToken.adminNote}"</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-2 no-print">
                <p className="text-xl font-black uppercase text-destructive">Token Expired / Missing</p>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Generate a new code to restore access</p>
              </div>
            )}
          </CardContent>
        </Card>

        {activeToken && !isExpired && (
          <div className="flex gap-4 no-print">
            <Button onClick={handlePrint} className="flex-1 h-12 border-2 border-black bg-white text-black rounded-none font-black uppercase hover:bg-muted">
              <Printer className="mr-2 h-4 w-4" /> Print / Export PDF
            </Button>
            <Button onClick={handleTerminateCode} variant="destructive" className="flex-1 h-12 border-2 border-black rounded-none font-black uppercase">
              <Trash2 className="mr-2 h-4 w-4" /> Terminate Now
            </Button>
          </div>
        )}

        <Card className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-muted/10 no-print">
          <CardHeader className="pb-2">
            <Label className="text-[10px] font-black uppercase tracking-widest">Configuration Terminal</Label>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase">Lifespan Duration</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input 
                    type="number" 
                    min="1"
                    value={expiryValue}
                    onChange={(e) => setExpiryValue(e.target.value === "" ? "" : Number(e.target.value))}
                    className="h-12 border-2 border-black rounded-none font-black text-lg text-center"
                    placeholder="0"
                  />
                </div>
                <div className="w-[140px]">
                  <Select value={expiryUnit} onValueChange={setExpiryUnit}>
                    <SelectTrigger className="h-12 border-2 border-black rounded-none font-black text-sm uppercase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes" className="font-black uppercase text-[10px]">Minutes</SelectItem>
                      <SelectItem value="hours" className="font-black uppercase text-[10px]">Hours</SelectItem>
                      <SelectItem value="days" className="font-black uppercase text-[10px]">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase">Admin Note / Announcement</Label>
              <Textarea 
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="e.g. Safety briefing at 7:00 AM sharp!"
                className="border-2 border-black rounded-none min-h-[80px] font-bold"
              />
            </div>
            
            <Button 
              onClick={handleGenerateCode} 
              disabled={isGenerating}
              className="w-full h-16 bg-black text-white font-black text-xl rounded-none shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all uppercase"
            >
              {isGenerating ? <Loader2 className="animate-spin h-6 w-6" /> : <><RefreshCw className="mr-2 h-6 w-6" /> REFRESH TERMINAL CODE</>}
            </Button>
          </CardContent>
        </Card>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .container {
            padding: 0 !important;
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  )
}
