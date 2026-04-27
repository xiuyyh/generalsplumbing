
"use client"

import { useState, useEffect, useRef } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useStorage, useDoc } from "@/firebase"
import { collection, doc, query, orderBy } from "firebase/firestore"
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
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
  Trash2, 
  X,
  FileImage,
  ArrowRight,
  PlusCircle,
  ShieldAlert
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import Image from "next/image"

export default function PunchListPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const storage = useStorage()
  const router = useRouter()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [minDate, setMinDate] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user])
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/auth")
    }
  }, [user, isUserLoading, router])

  useEffect(() => {
    // Prevent hydration error by setting min date on mount
    setMinDate(new Date().toISOString().split('T')[0])
  }, [])

  const punchQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "punchLists"), orderBy("createdAt", "desc"))
  }, [firestore, user])
  const { data: punchItems, isLoading } = useCollection(punchQuery)

  if (isUserLoading || isProfileLoading || !user) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin" /></div>

  const role = profile?.role || "WORKER"
  const isAdmin = role === "ADMIN"
  const isApproved = profile?.status === "approved" || isAdmin
  const canAccess = isAdmin || role === "PUNCH_LIST"

  if (!isApproved || !canAccess) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <ShieldAlert className="h-16 w-16 mx-auto text-black" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Access Denied</h2>
        <p className="text-muted-foreground font-bold">Your account is not authorized to access the punch list system.</p>
        <Button asChild variant="outline" className="border-2 border-black rounded-none uppercase font-black">
          <Link href="/">Return to Terminal</Link>
        </Button>
      </div>
    )
  }

  const getStatusInfo = (item: any) => {
    if (item.status === 'completed') return { color: "bg-green-500", label: "Completed" }
    
    const now = new Date()
    const due = new Date(item.dueDate)
    const diffHours = (now.getTime() - due.getTime()) / (1000 * 60 * 60)

    if (diffHours >= 48) return { color: "bg-red-500", label: "Critically Overdue", isAlertable: true, days: Math.floor(diffHours / 24) }
    if (diffHours >= 24) return { color: "bg-yellow-400", label: "Overdue" }
    return { color: "bg-blue-500", label: "Submitted" }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files])
      
      files.forEach(file => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result as string])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!firestore || !storage || isSubmitting) return

    const formData = new FormData(e.currentTarget)
    const dueDateVal = formData.get("dueDate") as string
    const selectedDate = new Date(dueDateVal)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate < today) {
      toast({
        variant: "destructive",
        title: "Invalid Due Date",
        description: "The deadline cannot be set in the past."
      })
      return
    }

    setIsSubmitting(true)
    const photoUrls: string[] = []

    if (selectedFiles.length > 0) {
      try {
        for (const file of selectedFiles) {
          const storageRef = ref(storage, `punchLists/${Date.now()}_${file.name}`)
          const snapshot = await uploadBytes(storageRef, file)
          const url = await getDownloadURL(snapshot.ref)
          photoUrls.push(url)
        }
      } catch (err) {
        console.error("Storage upload failure:", err)
        toast({ 
          variant: "destructive", 
          title: "Storage Error", 
          description: "One or more image uploads failed." 
        })
      }
    }
    
    const data = {
      description: formData.get("description") as string,
      dueDate: selectedDate.toISOString(),
      address: formData.get("address") as string,
      status: "submitted",
      photoUrls: photoUrls,
      createdAt: new Date().toISOString()
    }

    addDocumentNonBlocking(collection(firestore, "punchLists"), data)
    setIsAddOpen(false)
    setSelectedFiles([])
    setPreviews([])
    setIsSubmitting(false)
    toast({ title: "Task Submitted", description: "Punch list item added." })
  }

  const handleDelete = (id: string) => {
    if (!firestore) return
    if (window.confirm("PERMANENT REMOVAL: Delete this punch task?")) {
      deleteDocumentNonBlocking(doc(firestore, "punchLists", id))
      toast({ variant: "destructive", title: "Task Deleted" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Punch List</h1>
          <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Site Deficiency & Task Management</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-black text-white font-black rounded-none h-12 px-8 border-2 border-black uppercase">
              <Plus className="mr-2 h-5 w-5" /> CREATE PUNCH TASK
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] border-4 border-black rounded-none max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <DialogHeader><DialogTitle className="text-2xl font-black uppercase">Add Deficiency Record</DialogTitle></DialogHeader>
              
              <div className="space-y-1">
                <Label className="font-black uppercase text-[10px]">Task Description</Label>
                <Textarea name="description" required className="border-2 border-black rounded-none min-h-[100px]" placeholder="Detail the issue..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="font-black uppercase text-[10px]">Due Date</Label>
                  <Input name="dueDate" type="date" required min={minDate} className="border-2 border-black rounded-none h-12" />
                </div>
                <div className="space-y-1">
                  <Label className="font-black uppercase text-[10px]">Job Address</Label>
                  <Input name="address" required className="border-2 border-black rounded-none h-12" placeholder="Site location" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px]">Visual Documentation</Label>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {previews.map((url, index) => (
                    <div key={index} className="relative border-2 border-black aspect-square bg-muted overflow-hidden">
                      <Image src={url} alt={`Preview ${index}`} fill className="object-cover" />
                      <Button 
                        type="button" 
                        size="icon" 
                        variant="destructive" 
                        className="absolute top-1 right-1 h-6 w-6 rounded-none p-0" 
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="border-2 border-black border-dashed aspect-square h-auto flex flex-col items-center justify-center gap-2 rounded-none hover:bg-muted" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <PlusCircle className="h-6 w-6" />
                    <span className="text-[10px] font-black uppercase">Add Photo</span>
                  </Button>
                </div>
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

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto h-10 w-10" /></div>
        ) : (
          punchItems?.map((item) => {
            const status = getStatusInfo(item)
            const mainPhoto = item.photoUrls && item.photoUrls.length > 0 ? item.photoUrls[0] : null
            return (
              <Card key={item.id} className="border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                <div className="flex flex-col md:flex-row">
                  <div className={`w-2 h-auto ${status.color} shrink-0`} />
                  <CardContent className="p-3 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <div className="md:col-span-1 hidden md:flex justify-center">
                        <div className={`h-8 w-8 rounded-none border-2 border-black flex items-center justify-center ${status.color}`}>
                          {item.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-white" /> : <AlertCircle className="h-4 w-4 text-white" />}
                        </div>
                      </div>
                      <div className="md:col-span-6 space-y-0.5">
                        <h3 className="font-black uppercase text-xs leading-tight line-clamp-1">{item.description}</h3>
                        <div className="flex items-center gap-3 text-[9px] font-bold uppercase text-muted-foreground">
                          <span className="flex items-center gap-1 truncate max-w-[150px]"><MapPin className="h-2.5 w-2.5" /> {item.address}</span>
                          <span className="flex items-center gap-1 shrink-0"><Calendar className="h-2.5 w-2.5" /> {new Date(item.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <Badge className={`${status.color} text-white font-black uppercase text-[8px] rounded-none px-2 py-0 h-5 inline-flex items-center justify-center`}>
                          {status.label}
                        </Badge>
                      </div>
                      <div className="md:col-span-3 flex justify-end gap-2">
                        <Button size="sm" asChild className="h-8 bg-black text-white rounded-none text-[9px] font-black uppercase px-3">
                          <Link href={`/punch-list/${item.id}`}>Details <ArrowRight className="ml-1 h-3 w-3" /></Link>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-none" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                  {mainPhoto && (
                    <div className="relative w-full md:w-24 aspect-video md:aspect-auto border-t-2 md:border-t-0 md:border-l-2 border-black bg-muted overflow-hidden">
                      <Image src={mainPhoto} alt="Task visual" fill className="object-cover" />
                    </div>
                  )}
                </div>
              </Card>
            )
          })
        )}
        {(!isLoading && (!punchItems || punchItems.length === 0)) && (
          <div className="py-20 text-center border-4 border-black border-dashed bg-muted/20">
            <FileImage className="h-12 w-12 mx-auto opacity-20" />
            <p className="text-xs font-black uppercase mt-4 text-muted-foreground tracking-widest">No site deficiencies currently recorded.</p>
          </div>
        )}
      </div>
    </div>
  )
}
