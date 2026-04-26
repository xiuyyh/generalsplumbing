"use client"

import { useState } from "react"
import { useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase"
import { doc } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Settings, ShieldAlert, Loader2, Save, UserPlus, Lock } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { user } = useUser()
  const firestore = useFirestore()

  const adminRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "roles_admin", user.uid)
  }, [firestore, user])
  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRef)

  const settingsRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, "appSettings", "auth")
  }, [firestore])
  const { data: authSettings, isLoading: isSettingsLoading } = useDoc(settingsRef)

  const handleToggleSignup = (checked: boolean) => {
    if (!settingsRef) return
    
    setDocumentNonBlocking(settingsRef, { 
      signupDisabled: checked 
    }, { merge: true })

    toast({
      title: checked ? "Sign-ups Disabled" : "Sign-ups Enabled",
      description: checked 
        ? "The public registration tab has been removed from the portal." 
        : "The registration tab is now active for new users.",
    })
  }

  if (isAdminLoading || isSettingsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Configuring Terminal...</p>
      </div>
    )
  }

  if (!adminRole) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <ShieldAlert className="h-16 w-16 mx-auto text-black" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Admin Access Only</h2>
        <p className="text-muted-foreground font-bold">Only system administrators can modify core application policies.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
          <Settings className="h-10 w-10" /> System Settings
        </h1>
        <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Global Configuration Panel</p>
      </div>

      <div className="space-y-6">
        <Card className="border-4 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white">
          <CardHeader className="bg-black text-white p-4">
            <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
              <Lock className="h-5 w-5" /> Security & Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 pb-8 space-y-8">
            <div className="flex items-center justify-between p-6 border-2 border-black bg-muted/10">
              <div className="space-y-1">
                <Label className="text-sm font-black uppercase flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Disable Public Sign-ups
                </Label>
                <p className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">
                  When active, the registration portal will be hidden.<br/>
                  New accounts must be manually authorized by an admin.
                </p>
              </div>
              <Switch 
                checked={!!authSettings?.signupDisabled} 
                onCheckedChange={handleToggleSignup}
                className="data-[state=checked]:bg-black"
              />
            </div>

            <div className="p-4 border-2 border-black border-dashed bg-destructive/5 text-destructive">
              <p className="text-[9px] font-black uppercase text-center leading-tight">
                Warning: Modifying system settings affects all users immediately.<br/>
                Ensure you have alternative account creation methods if disabling sign-ups.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-muted/20">
          <CardHeader className="py-3">
            <CardTitle className="text-xs font-black uppercase opacity-60">System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase">
              <span>Environment</span>
              <span className="text-black">Production / Prototype</span>
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase">
              <span>Database Status</span>
              <span className="text-green-600">Online / Connected</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
