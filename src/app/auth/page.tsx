
"use client"

import { useState, useEffect } from "react"
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { initiateEmailSignIn, initiateEmailSignUp } from "@/firebase/non-blocking-login"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { doc, getDoc, collection, getDocs, limit, query } from "firebase/firestore"
import { 
  Card, 
  CardContent, 
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogIn, ShieldCheck, Loader2, ArrowLeft, UserPlus, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

export default function AuthPage() {
  const { user, isUserLoading } = useUser()
  const auth = useAuth()
  const firestore = useFirestore()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Fetch signup settings
  const settingsRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, "appSettings", "auth")
  }, [firestore])
  const { data: authSettings, isLoading: isSettingsLoading } = useDoc(settingsRef)

  useEffect(() => {
    if (user && firestore && !isUserLoading) {
      const userRef = doc(firestore, "users", user.uid)
      
      // Initialize profile if it doesn't exist
      getDoc(userRef).then(async (snap) => {
        if (!snap.exists()) {
          // Check if this is the first user in the system to bootstrap Admin
          let role = "WORKER"
          let status = "pending"

          try {
            const usersQuery = query(collection(firestore, "users"), limit(1))
            const usersSnap = await getDocs(usersQuery)
            if (usersSnap.empty) {
              // First user ever! Make them approved Admin
              role = "ADMIN"
              status = "approved"
            }
          } catch (e) {
            // Permission denied or other error - default to worker/pending
          }

          setDocumentNonBlocking(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: displayName || user.email?.split('@')[0] || "New User",
            status: status,
            role: role,
            createdAt: new Date().toISOString()
          }, { merge: true })
        }
        router.push("/")
      })
    }
  }, [user, firestore, isUserLoading, router, displayName])

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    initiateEmailSignIn(auth, email, password)
  }

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Password Mismatch",
        description: "The passwords entered do not match."
      })
      return
    }
    setIsProcessing(true)
    initiateEmailSignUp(auth, email, password)
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  if (isUserLoading || isSettingsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Verifying Identity...</p>
      </div>
    )
  }

  const signupDisabled = !!authSettings?.signupDisabled

  return (
    <div className="max-w-md mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-black uppercase tracking-tighter">Access Portal</h1>
        <p className="text-muted-foreground font-bold uppercase text-xs tracking-[0.2em]">Generals Plumbing Management</p>
      </div>

      <Card className="border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
        <div className="bg-black text-white p-4 flex items-center justify-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-xs font-black uppercase tracking-widest">Secure Entry Point</span>
        </div>
        
        <CardContent className="pt-6">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className={`grid w-full grid-cols-${signupDisabled ? "1" : "2"} bg-muted border-2 border-black rounded-none h-12 p-1 mb-6`}>
              <TabsTrigger value="signin" className="font-black uppercase text-xs data-[state=active]:bg-black data-[state=active]:text-white rounded-none">
                Sign In
              </TabsTrigger>
              {!signupDisabled && (
                <TabsTrigger value="signup" className="font-black uppercase text-xs data-[state=active]:bg-black data-[state=active]:text-white rounded-none">
                  Register
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="signin">
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
                  <div className="relative">
                    <Input 
                      id="password-signin" 
                      type={showPassword ? "text" : "password"} 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-2 border-black rounded-none h-12 pr-10"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-black"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={isProcessing}
                  className="w-full h-16 text-xl font-black bg-black text-white rounded-none shadow-[1px_1px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all uppercase"
                >
                  {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : <><LogIn className="mr-2 h-6 w-6" /> Authorize</>}
                </Button>
              </form>
            </TabsContent>

            {!signupDisabled && (
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name-signup" className="font-black uppercase text-xs">Full Name</Label>
                    <Input 
                      id="name-signup" 
                      type="text" 
                      placeholder="John Doe" 
                      required 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="border-2 border-black rounded-none h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-signup" className="font-black uppercase text-xs">Email</Label>
                    <Input 
                      id="email-signup" 
                      type="email" 
                      placeholder="name@example.com" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-2 border-black rounded-none h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signup" className="font-black uppercase text-xs">Password</Label>
                    <div className="relative">
                      <Input 
                        id="password-signup" 
                        type={showPassword ? "text" : "password"} 
                        required 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border-2 border-black rounded-none h-12 pr-10"
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-black"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password-signup" className="font-black uppercase text-xs">Confirm Password</Label>
                    <Input 
                      id="confirm-password-signup" 
                      type={showPassword ? "text" : "password"} 
                      required 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="border-2 border-black rounded-none h-12"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isProcessing}
                    className="w-full h-16 text-xl font-black bg-black text-white rounded-none shadow-[1px_1px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all uppercase"
                  >
                    {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : <><UserPlus className="mr-2 h-6 w-6" /> Register Account</>}
                  </Button>
                </form>
              </TabsContent>
            )}
          </Tabs>
          
          <div className="mt-6 p-4 bg-muted/20 border-2 border-black border-dashed">
            <p className="text-[9px] text-center font-black uppercase text-muted-foreground leading-tight">
              {signupDisabled 
                ? "Public registration is restricted. Approved users only."
                : "New accounts require administrative approval before accessing the terminal."}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button variant="link" asChild className="text-black font-black uppercase text-xs">
          <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Return to Terminal</Link>
        </Button>
      </div>
    </div>
  )
}
