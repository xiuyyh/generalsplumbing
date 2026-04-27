"use client"

import { useState, useEffect, useRef } from "react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, useStorage } from "@/firebase"
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
  Upload,
  X,
  FileImage,
  ArrowRight
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export default function PunchListPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const storage = useStorage()
  const router = useRouter()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!firestore || !storage || isSubmitting) return
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    let photoUrl = null

    if (selectedFile) {
      try {
        const storageRef = ref(storage, `punchLists/${Date.now()}_${selectedFile.name}`)
        const snapshot = await uploadBytes(storageRef, selectedFile)
        photoUrl = await getDownloadURL(snapshot.ref)
      } catch (err) {
        console.error("Storage upload failure:", err)
        toast({ 
          variant: "destructive", 
          title: "Storage Error", 
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
    setSelectedFile(null)
    setPreviewUrl(null)
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

  if (isUserLoading || !user) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin" /></div>

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
          <DialogContent className="sm:max-w-[500px] border-4 border-black rounded-none">
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <DialogHeader><DialogTitle className="text-2xl font-black uppercase">Add Deficiency Record</DialogTitle></DialogHeader>
              
              <div className="space-y-1">
                <Label className="font-black uppercase text-[10px]">Task Description</Label>
                <Textarea name="description" required className="border-2 border-black rounded-none min-h-[100px]" placeholder="Detail the issue..." />
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
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                {previewUrl ? (
                  <div className="relative border-4 border-black aspect-video bg-muted">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="destructive" 
                      className="absolute top-2 right-2 rounded-none" 
                      onClick={() => {
                        setSelectedFile(null)
                        setPreviewUrl(null)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full border-2 border-black border-dashed h-20 rounded-none font-black uppercase" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-6 w-6" /> Upload Site Photo
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

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto h-10 w-10" /></div>
        ) : (
          punchItems?.map((item) => {
            const status = getStatusInfo(item)
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
                  {item.photoUrl && (
                    <div className="relative w-full md:w-24 aspect-video md:aspect-auto border-t-2 md:border-t-0 md:border-l-2 border-black bg-muted overflow-hidden">
                      <img src={item.photoUrl} alt="Task visual" className="w-full h-full object-cover" />
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
