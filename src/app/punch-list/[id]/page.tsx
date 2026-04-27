
"use client"

import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useRouter, useParams } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { 
  Loader2, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Bell, 
  Trash2, 
  ArrowLeft,
  Clock,
  ExternalLink,
  History,
  ImageIcon
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { notifyPunchOverdue } from "@/ai/flows/notify-punchlist-flow"
import Link from "next/link"
import Image from "next/image"

export default function PunchListDetailPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const docRef = useMemoFirebase(() => {
    if (!firestore || !id) return null
    return doc(firestore, "punchLists", id)
  }, [firestore, id])
  const { data: item, isLoading } = useDoc(docRef)

  const telegramSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, "appSettings", "telegram")
  }, [firestore])
  const { data: telegramSettings } = useDoc(telegramSettingsRef)

  const getStatusInfo = (item: any) => {
    if (!item) return { color: "bg-muted", label: "Unknown" }
    if (item.status === 'completed') return { color: "bg-green-600", label: "COMPLETED" }
    
    const now = new Date()
    const due = new Date(item.dueDate)
    const diffHours = (now.getTime() - due.getTime()) / (1000 * 60 * 60)

    if (diffHours >= 48) return { color: "bg-red-600", label: "CRITICALLY OVERDUE", isAlertable: true, days: Math.floor(diffHours / 24) }
    if (diffHours >= 24) return { color: "bg-yellow-500", label: "OVERDUE" }
    return { color: "bg-blue-600", label: "SUBMITTED" }
  }

  const handleResolve = () => {
    if (!firestore || !id) return
    updateDocumentNonBlocking(doc(firestore, "punchLists", id), {
      status: "completed",
      completedAt: new Date().toISOString()
    })
    toast({ title: "Task Resolved", description: "Deficiency marked as fixed." })
  }

  const handleSendAlert = () => {
    if (!item || !telegramSettings?.chatId) {
      toast({ variant: "destructive", title: "Alert Failed", description: "Telegram configuration missing." })
      return
    }

    const status = getStatusInfo(item)
    notifyPunchOverdue({
      description: item.description,
      address: item.address,
      dueDate: item.dueDate,
      daysOverdue: status.days || 0,
      chatId: telegramSettings.chatId
    }).then(() => {
      toast({ title: "Alert Sent", description: "Telegram notification dispatched." })
    })
  }

  const handleDelete = () => {
    if (!firestore || !id) return
    if (window.confirm("PERMANENT REMOVAL: Delete this punch task record?")) {
      deleteDocumentNonBlocking(doc(firestore, "punchLists", id))
      toast({ variant: "destructive", title: "Task Deleted" })
      router.push("/punch-list")
    }
  }

  if (isUserLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Retrieving Site Intelligence...</p>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="h-16 w-16 mx-auto opacity-20" />
        <h2 className="text-2xl font-black uppercase mt-4">Record Not Found</h2>
        <Button asChild variant="link" className="mt-4 font-black uppercase"><Link href="/punch-list">Return to Registry</Link></Button>
      </div>
    )
  }

  const status = getStatusInfo(item)

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild className="border-2 border-black rounded-none font-black h-10 px-4">
          <Link href="/punch-list"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
        </Button>
        <div className="flex gap-2">
          {item.status !== 'completed' && (
            <>
              {status.isAlertable && (
                <Button onClick={handleSendAlert} variant="outline" className="border-2 border-black rounded-none text-red-600 font-black h-10 uppercase">
                  <Bell className="mr-2 h-4 w-4" /> Disptach Alert
                </Button>
              )}
              <Button onClick={handleResolve} className="bg-black text-white rounded-none font-black h-10 uppercase px-6">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Resolved
              </Button>
            </>
          )}
          <Button onClick={handleDelete} variant="destructive" className="rounded-none font-black h-10 uppercase">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
            <CardHeader className="bg-black text-white py-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl font-black uppercase tracking-tighter">Task</CardTitle>
                <Badge className={`${status.color} text-white font-black uppercase rounded-none border-2 border-white`}>
                  {status.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Requirement Description</Label>
                <p className="text-lg font-black uppercase leading-tight">{item.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4 border-t-2 border-black/5">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1" /> Site Location</Label>
                  <p className="font-bold text-sm uppercase">{item.address}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground"><Calendar className="h-3 w-3 inline mr-1" /> Deadline</Label>
                  <p className="font-bold text-sm uppercase">{new Date(item.dueDate).toLocaleDateString(undefined, { dateStyle: 'full' })}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4 border-t-2 border-black/5">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground"><Clock className="h-3 w-3 inline mr-1" /> Created On</Label>
                  <p className="font-bold text-xs uppercase">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                {item.completedAt && (
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-green-600"><CheckCircle2 className="h-3 w-3 inline mr-1" /> Resolved On</Label>
                    <p className="font-black text-xs uppercase text-green-700">{new Date(item.completedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-muted/10">
            <CardHeader className="py-2 px-3 border-b-2 border-black">
              <CardTitle className="text-xs font-black uppercase flex items-center gap-2"><History className="h-3 w-3" /> Audit Log</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-3 w-3 rounded-full bg-black mt-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" />
                <div>
                  <p className="text-[11px] font-black uppercase">Initial Submission</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {item.status === 'completed' && (
                <div className="flex items-start gap-4">
                  <div className="h-3 w-3 rounded-full bg-green-600 mt-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" />
                  <div>
                    <p className="text-[11px] font-black uppercase text-green-700">Resolution Verified</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">{new Date(item.completedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white h-fit sticky top-20">
            <CardHeader className="bg-black text-white py-2">
              <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                <ExternalLink className="h-3 w-3" /> Photographic Evidence
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {item.photoUrl ? (
                <div className="relative aspect-square border-2 border-black bg-muted overflow-hidden">
                  <Image 
                    src={item.photoUrl} 
                    alt="Task evidence" 
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square flex flex-col items-center justify-center bg-muted border-2 border-black border-dashed opacity-30">
                  <ImageIcon className="h-10 w-10 mb-2" />
                  <p className="text-[10px] font-black uppercase">No Visual Documentation Provided</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
