"use client"

import { useState, useEffect } from "react"
import { useAuth, useUser, useFirestore } from "@/firebase"
import { initiateEmailSignIn, initiateEmailSignUp } from "@/firebase/non-blocking-login"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { doc } from "firebase/firestore"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogIn, UserPlus, ShieldCheck, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function AuthPage() {
  const { user, isUserLoading } = useUser()
  const auth = useAuth()
  const firestore = useFirestore()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Redirect and auto-promote to admin if logged in
  useEffect(() => {
    if (user && firestore && !isUserLoading) {
      // Auto-promote user to admin as per requirement: "anyone can signup and become admin"
      const adminRef = doc(firestore, "roles_admin", user.uid)
      setDocumentNonBlocking(adminRef, { 
        assignedAt: new Date().toISOString(),
        email: user.email 
      }, { merge: true })
      
      router.push("/")
    }
  }, [user, firestore, isUserLoading, router])

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    initiateEmailSignIn(auth, email, password)
  }

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    initiateEmailSignUp(auth, email, password)
  }

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Verifying Identity...</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-black uppercase tracking-tighter">Access Portal</h1>
        <p className="text-muted-foreground font-bold uppercase text-xs tracking-[0.2em]">Generals Plumbing Management</p>
      </div>

      <Card className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
        <div className="bg-black text-white p-4 flex items-center justify-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-xs font-black uppercase tracking-widest">Secure Entry Point</span>
        </div>
        <CardHeader>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted rounded-none h-12 p-1 border-2 border-black">
              <TabsTrigger value="signin" className="font-black uppercase text-xs data-[state=active]:bg-black data-[state=active]:text-white">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="font-black uppercase text-xs data-[state=active]:bg-black data-[state=active]:text-white">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signin" className="font-black uppercase text-xs">Email Address</Label>
                  <Input 
                    id="email-signin" 
                    type="email" 
                    placeholder="admin@generalsplumbing.com" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-2 border-black rounded-none h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signin" className="font-black uppercase text-xs">Password</Label>
                  <Input 
                    id="password-signin" 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-2 border-black rounded-none h-12"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isProcessing}
                  className="w-full h-16 text-xl font-black bg-black text-white rounded-none shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all uppercase"
                >
                  {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : <><LogIn className="mr-2 h-6 w-6" /> Authorize</>}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signup" className="font-black uppercase text-xs">Email Address</Label>
                  <Input 
                    id="email-signup" 
                    type="email" 
                    placeholder="admin@generalsplumbing.com" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-2 border-black rounded-none h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup" className="font-black uppercase text-xs">New Password</Label>
                  <Input 
                    id="password-signup" 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-2 border-black rounded-none h-12"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isProcessing}
                  className="w-full h-16 text-xl font-black bg-black text-white rounded-none shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all uppercase"
                >
                  {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : <><UserPlus className="mr-2 h-6 w-6" /> Register Admin</>}
                </Button>
                <p className="text-[10px] text-center font-black uppercase text-muted-foreground mt-4 leading-tight">
                  Signing up grants immediate administrative access to all system management modules.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>

      <div className="text-center">
        <Button variant="link" asChild className="text-black font-black uppercase text-xs">
          <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Return to Terminal</Link>
        </Button>
      </div>
    </div>
  )
}
