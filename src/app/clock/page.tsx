
"use client"

import { useState, useEffect } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, query, orderBy, limit, serverTimestamp } from "firebase/firestore"
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
import { Label } from "@/components/ui/label"
import { QrCode, Loader2, ShieldAlert, RefreshCw, Clock, History } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export default function AdminQRCodeGenerator() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const [expiryMinutes, setExpiryMinutes] = useState("30")
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
    if (!firestore || isGenerating) return
    setIsGenerating(true)

    const tokenId = Math.random().toString(36).substring(2, 15)
    const expiresAt = new Date(Date.now() + parseInt(expiryMinutes) * 60000).toISOString()
    
    setDocumentNonBlocking(doc(firestore, "attendanceTokens", "current"), {
      value: tokenId,
      expiresAt,
      createdAt: new Date().toISOString()
    }, { merge: true })

    toast({ title: "QR Code Generated", description: `Active for the next ${expiryMinutes} minutes.` })
    setIsGenerating(false)
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
          <CardHeader className="bg-black text-white p-4">
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
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Expires: {new Date(activeToken.expiresAt).toLocaleTimeString()}
                </p>
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
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">Token Lifespan</Label>
              <Select value={expiryMinutes} onValueChange={setExpiryMinutes}>
                <SelectTrigger className="h-12 border-2 border-black rounded-none font-black text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 MINUTES</SelectItem>
                  <SelectItem value="30">30 MINUTES</SelectItem>
                  <SelectItem value="60">1 HOUR</SelectItem>
                  <SelectItem value="480">8 HOURS (FULL SHIFT)</SelectItem>
                </SelectContent>
              </Select>
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
