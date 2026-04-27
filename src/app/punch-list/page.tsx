
"use client"

import { useState, useEffect, useRef } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, query, orderBy } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Loader2, 
  Plus, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Bell, 
  Trash2, 
  Camera,
  X
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { notifyPunchOverdue } from "@/ai/flows/notify-punchlist-flow"
import { uploadToCloudinary } from "./upload-action"
import Image from "next/image"

export default function PunchListPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [hasCameraPermission, setHasCameraPermission] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/auth")
    }
  }, [user, isUserLoading, router])

  const punchQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "punchLists"), orderBy("createdAt", "desc"))
  }, [firestore, user])
  const { data: punchItems, isLoading } = useCollection(punchQuery)

  const settingsRef = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, "appSettings", "telegram")
  }, [firestore])
  const { data: telegramSettings } = useDoc(settingsRef)

  const getStatusInfo = (item: any) => {
    if (item.status === 'completed') return { color: "bg-green-500", label: "Completed" }
    
    const now = new Date()
    const due = new Date(item.dueDate)
    const diffHours = (now.getTime() - due.getTime()) / (1000 * 60 * 60)

    if (diffHours >= 48) return { color: "bg-red-500", label: "Critically Overdue", isAlertable: true, days: Math.floor(diffHours / 24) }
    if (diffHours >= 24) return { color: "bg-yellow-400", label: "Overdue" }
    return { color: "bg-blue-500", label: "Submitted" }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      setHasCameraPermission(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setIsCameraOpen(true)
    } catch (error) {
      console.error('Error accessing camera:', error)
      toast({ variant: 'destructive', title: 'Camera Access Denied' })
    }
  }

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas")
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0)
        setCapturedPhoto(canvas.toDataURL("image/jpeg"))
        stopCamera()
      }
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setIsCameraOpen(false)
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!firestore || isSubmitting) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    let photoUrl = null

    // Upload to Cloudinary if photo captured
    if (capturedPhoto) {
      try {
        const uploadResult = await uploadToCloudinary(capturedPhoto)
        photoUrl = uploadResult.url
      } catch (err) {
        toast({ 
          variant: "destructive", 
          title: "Cloudinary Sync Error", 
          description: "Image upload failed. Storing metadata only." 
        })
      }
    }
    
    const data = {
      description: formData.get("description") as string,
      dueDate: new Date(formData.get("dueDate") as string).toISOString(),
      address: formData.get("address") as string,
      status: "submitted",
      photoUrl: photoUrl,
      createdAt: new Date().toISOString()
    }

    addDocumentNonBlocking(collection(firestore, "punchLists"), data)
    setIsAddOpen(false)
    setCapturedPhoto(null)
    setIsSubmitting(false)
    toast({ title: "Task Submitted", description: "Punch list item added and image synchronized." })
  }

  const handleResolve = (item: any) => {
    if (!firestore) return
    updateDocumentNonBlocking(doc(firestore, "punchLists", item.id), {
      status: "completed",
      completedAt: new Date().toISOString()
    })
    toast({ title: "Task Resolved", description: "Marked as completed." })
  }

  const handleSendAlert = (item: any) => {
    if (!telegramSettings?.chatId) {
      toast({ variant: "destructive", title: "Configuration Error", description: "Telegram Chat ID not set in system settings." })
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
      toast({ title: "Alert Sent", description: "Overdue notification delivered to Telegram." })
    }).catch(() => {
      toast({ variant: "destructive", title: "Alert Failed", description: "Could not deliver Telegram notification." })
    })
  }

  const handleDelete = (id: string) => {
    if (!firestore) return
    if (window.confirm("PERMANENT REMOVAL: Delete this punch task?")) {
      deleteDocumentNonBlocking(doc(firestore, "punchLists", id))
      toast({ variant: "destructive", title: "Task Deleted" })
    }
  }

  if (isUserLoading || !user) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Punch List</h1>
          <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Site Deficiency & Task Tracking</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-black text-white font-black rounded-none h-12 px-8 border-2 border-black uppercase">
              <Plus className="mr-2 h-5 w-5" /> CREATE PUNCH TASK
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] border-4 border-black rounded-none">
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <DialogHeader><DialogTitle className="text-2xl font-black uppercase">Add Deficiency Record</DialogTitle></DialogHeader>
              
              <div className="space-y-1">
                <Label className="font-black uppercase text-[10px]">Task Description</Label>
                <Textarea name="description" required className="border-2 border-black rounded-none min-h-[100px]" placeholder="Detail the issue or requirement..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="font-black uppercase text-[10px]">Due Date</Label>
                  <Input name="dueDate" type="date" required className="border-2 border-black rounded-none h-12" />
                </div>
                <div className="space-y-1">
                  <Label className="font-black uppercase text-[10px]">Job Address</Label>
                  <Input name="address" required className="border-2 border-black rounded-none h-12" placeholder="Site location" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px]">Visual Documentation</Label>
                {capturedPhoto ? (
                  <div className="relative border-4 border-black aspect-video">
                    <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                    <Button type="button" size="icon" variant="destructive" className="absolute top-2 right-2 rounded-none" onClick={() => setCapturedPhoto(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="w-full border-2 border-black border-dashed h-20 rounded-none font-black uppercase" onClick={startCamera}>
                    <Camera className="mr-2 h-6 w-6" /> Take Photo
                  </Button>
                )}
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full bg-black text-white font-black h-14 rounded-none text-lg uppercase">
                  {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : "AUTHORIZE SUBMISSION"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isCameraOpen} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="max-w-2xl border-4 border-black rounded-none p-0 overflow-hidden bg-black">
          <div className="relative aspect-video">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
              <Button onClick={capturePhoto} className="h-16 w-16 rounded-full bg-white border-4 border-black hover:bg-white/90">
                <div className="h-10 w-10 rounded-full border-4 border-black" />
              </Button>
              <Button onClick={stopCamera} variant="destructive" className="h-16 w-16 rounded-full border-4 border-black">
                <X className="h-8 w-8" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto h-10 w-10" /></div>
        ) : (
          punchItems?.map((item) => {
            const status = getStatusInfo(item)
            return (
              <Card key={item.id} className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className={`w-2 h-auto ${status.color}`} />
                  <CardContent className="p-4 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="md:col-span-1 flex justify-center">
                        <div className={`h-10 w-10 rounded-none border-2 border-black flex items-center justify-center ${status.color}`}>
                          {item.status === 'completed' ? <CheckCircle2 className="text-white" /> : <AlertCircle className="text-white" />}
                        </div>
                      </div>
                      <div className="md:col-span-5 space-y-1">
                        <h3 className="font-black uppercase text-sm leading-tight">{item.description}</h3>
                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {item.address}</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> DUE: {new Date(item.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <Badge className={`${status.color} text-white font-black uppercase text-[8px] rounded-none px-2`}>
                          {status.label}
                        </Badge>
                      </div>
                      <div className="md:col-span-4 flex flex-wrap justify-end gap-2">
                        {item.status !== 'completed' && (
                          <>
                            {status.isAlertable && (
                              <Button size="sm" variant="outline" className="h-8 border-2 border-black rounded-none text-[9px] font-black uppercase text-red-600 hover:bg-red-50" onClick={() => handleSendAlert(item)}>
                                <Bell className="h-3 w-3 mr-1" /> Send Alert
                              </Button>
                            )}
                            <Button size="sm" className="h-8 bg-black text-white rounded-none text-[9px] font-black uppercase" onClick={() => handleResolve(item)}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 text-destructive hover:bg-destructive/10 rounded-none" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {item.completedAt && (
                      <div className="mt-2 pt-2 border-t border-black/5 text-[8px] font-black uppercase text-green-600">
                        Completed at: {new Date(item.completedAt).toLocaleString()}
                      </div>
                    )}
                  </CardContent>
                  {item.photoUrl && (
                    <div className="relative w-full md:w-32 aspect-video md:aspect-auto border-l-0 md:border-l-2 border-black bg-muted">
                      <Image src={item.photoUrl} alt="Task visual" fill className="object-cover" />
                    </div>
                  )}
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
