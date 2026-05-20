
"use client"

import { useState, useEffect } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, query, orderBy, limit } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
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
import { QrCode, Loader2, ShieldAlert, RefreshCw, Clock, History, Timer } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

const BUSINESS_TIMEZONE = 'America/New_York'

export default function AdminQRCodeGenerator() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  
  const [expiryValue, setExpiryValue] = useState<number | "">(8)
  const [expiryUnit, setExpiryUnit] = useState<string>("hours")
  const [isGenerating, setIsGenerating] = useState(false)

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user])
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  const tokenQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "attendanceTokens"), orderBy("createdAt", "desc"), limit(1))
  }, [firestore, user])
  const { data: latestTokens, isLoading: isTokenLoading } = useCollection(tokenQuery)

  const activeToken = latestTokens?.[0]
  const isExpired = activeToken ? new Date(activeToken.expiresAt) < new Date() : true

  useEffect(() => {
    if (!isUserLoading && !user) router.replace("/auth")
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
      createdAt: new Date().toISOString()
    }, { merge: true })

    toast({ 
      title: "QR Code Generated", 
      description: `Active for the next ${val} ${expiryUnit}.` 
    })
    setIsGenerating(false)
  }

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      timeZone: BUSINESS_TIMEZONE,
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center justify-center gap-3">
          <QrCode className="h-10 w-10" /> Shift Authorization
        </h1>
        <p className="text-muted-foreground font-bold tracking-widest uppercase text-[10px]">Administrative Token Terminal</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
          <CardHeader className="bg-black text-white p-4 text-center">
            <CardTitle className="text-lg font-black uppercase">Live Check-In Code</CardTitle>
          </CardHeader>
          <CardContent className="p-8 flex flex-col items-center justify-center space-y-8">
            <div className={`p-4 border-4 border-black ${isExpired ? "opacity-20 grayscale" : ""}`}>
              {activeToken ? (
                <QRCodeSVG value={activeToken.value} size={256} level="H" />
              ) : (
                <div className="h-[256px] w-[256px] flex items-center justify-center bg-muted">
                  <Clock className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>

            {activeToken && !isExpired ? (
              <div className="text-center space-y-2">
                <p className="text-2xl font-black uppercase">Active Token</p>
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <Timer className="h-4 w-4" />
                  <span>Expires: {formatDateTime(activeToken.expiresAt)} (Business Time)</span>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-xl font-black uppercase text-destructive">Token Expired / Missing</p>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Generate a new code for staff access</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-muted/10">
          <CardHeader className="pb-2">
            <Label className="text-[10px] font-black uppercase tracking-widest">Token Lifespan Configuration</Label>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
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

      <div className="flex justify-center gap-4">
        <Button variant="outline" asChild className="border-2 border-black rounded-none font-black uppercase text-xs">
          <Link href="/timesheets"><History className="mr-2 h-4 w-4" /> Audit Logs</Link>
        </Button>
      </div>
    </div>
  )
}
