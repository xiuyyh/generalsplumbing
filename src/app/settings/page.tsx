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
import { Input } from "@/components/ui/input"
import { Settings, ShieldAlert, Loader2, Save, UserPlus, Lock, Send, MessageSquareText, Info, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [isSaving, setIsSaving] = useState(false)

  const adminRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "roles_admin", user.uid)
  }, [firestore, user])
  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRef)

  const authSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, "appSettings", "auth")
  }, [firestore])
  const { data: authSettings, isLoading: isAuthLoading } = useDoc(authSettingsRef)

  const telegramSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, "appSettings", "telegram")
  }, [firestore])
  const { data: telegramSettings, isLoading: isTelLoading } = useDoc(telegramSettingsRef)

  const handleToggleSignup = (checked: boolean) => {
    if (!authSettingsRef) return
    setDocumentNonBlocking(authSettingsRef, { signupDisabled: checked }, { merge: true })
    toast({
      title: checked ? "Sign-ups Disabled" : "Sign-ups Enabled",
      description: checked ? "Public registration restricted." : "Registration portal active.",
    })
  }

  const handleSaveTelegram = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!telegramSettingsRef) return
    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    const chatId = (formData.get("chatId") as string).trim()

    setDocumentNonBlocking(telegramSettingsRef, { chatId }, { merge: true })
    toast({ title: "Telegram Settings Saved", description: "Chat ID updated for notifications." })
    setIsSaving(false)
  }

  if (isAdminLoading || isAuthLoading || isTelLoading) {
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

      <div className="space-y-6 pb-12">
        {/* Auth Section */}
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
                <p className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">Registration portal restricted to existing admins.</p>
              </div>
              <Switch 
                checked={!!authSettings?.signupDisabled} 
                onCheckedChange={handleToggleSignup}
                className="data-[state=checked]:bg-black"
              />
            </div>
          </CardContent>
        </Card>

        {/* Telegram Section */}
        <Card className="border-4 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white">
          <CardHeader className="bg-black text-white p-4">
            <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
              <MessageSquareText className="h-5 w-5" /> Telegram Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
            <form onSubmit={handleSaveTelegram} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase">Telegram Chat ID</Label>
                <Input 
                  name="chatId" 
                  defaultValue={telegramSettings?.chatId || ""} 
                  placeholder="-100xxxxxxxxx" 
                  required 
                  className="border-2 border-black rounded-none h-12 font-bold"
                />
                
                <div className="p-4 bg-amber-50 border-2 border-amber-200 space-y-3">
                  <p className="text-[10px] font-black uppercase flex items-center gap-2 text-amber-800">
                    <AlertCircle className="h-4 w-4" /> Critical Configuration Instructions:
                  </p>
                  <ul className="text-[10px] font-bold text-amber-900/70 uppercase list-disc pl-5 space-y-1 leading-relaxed">
                    <li>The bot MUST be added as an <b>Administrator</b> in the channel.</li>
                    <li>For private channels/groups, you MUST use the <b>-100</b> prefix.</li>
                    <li>If your ID is <code>3712964818</code>, you should enter: <code>-1003712964818</code>.</li>
                    <li>Tip: Use the bot <span className="text-amber-950 underline">@getidsbot</span> in your channel to get the exact numeric ID.</li>
                  </ul>
                </div>
              </div>
              <Button type="submit" disabled={isSaving} className="w-full h-12 bg-black text-white font-black uppercase rounded-none border-2 border-black">
                {isSaving ? <Loader2 className="animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> UPDATE</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-2 border-black rounded-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-muted/20">
          <CardHeader className="py-3">
            <CardTitle className="text-xs font-black uppercase opacity-60">System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase"><span>Environment</span><span className="text-black">Production / Prototype</span></div>
            <div className="flex justify-between text-[10px] font-black uppercase"><span>Database Status</span><span className="text-green-600">Online / Connected</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
