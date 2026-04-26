
"use client"

import { useState, useEffect } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserPlus, Briefcase, Mail, Phone, Loader2, ShieldAlert, MoreVertical, Edit2, Trash2, AlertTriangle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useDoc } from "@/firebase/firestore/use-doc"

export default function StaffPage() {
  const { user, isUserLoading: isAuthLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<any>(null)

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/auth")
    }
  }, [user, isAuthLoading, router])

  const adminRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "roles_admin", user.uid)
  }, [firestore, user])
  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRef)

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, "staffMembers")
  }, [firestore, user])
  const { data: staffMembers, isLoading: isStaffLoading } = useCollection(staffQuery)

  const handleCreateStaff = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!firestore || !user) return

    const formData = new FormData(e.currentTarget)
    const staffData = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      officialRole: formData.get("officialRole") as string,
      address: formData.get("address") as string,
      email: formData.get("email") as string,
      phoneNumber: formData.get("phoneNumber") as string,
      hireDate: new Date().toISOString(),
    }

    addDocumentNonBlocking(collection(firestore, "staffMembers"), staffData)
    
    setIsAddDialogOpen(false)
    setTimeout(() => {
      toast({ title: "Staff Created", description: "Personnel added to registry." })
    }, 100)
  }

  const handleUpdateStaff = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!firestore || !selectedStaff) return

    const formData = new FormData(e.currentTarget)
    const updatedData = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      officialRole: formData.get("officialRole") as string,
      address: formData.get("address") as string,
      email: formData.get("email") as string,
      phoneNumber: formData.get("phoneNumber") as string,
    }

    updateDocumentNonBlocking(doc(firestore, "staffMembers", selectedStaff.id), updatedData)
    
    setIsEditDialogOpen(false)
    setTimeout(() => {
      toast({ title: "Staff Updated", description: "Record modified successfully." })
      setSelectedStaff(null)
    }, 100)
  }

  const handleDeleteStaff = () => {
    if (!firestore || !selectedStaff) return
    deleteDocumentNonBlocking(doc(firestore, "staffMembers", selectedStaff.id))
    
    setIsDeleteDialogOpen(false)
    setTimeout(() => {
      toast({ variant: "destructive", title: "Record Deleted", description: "Staff member removed from system." })
      setSelectedStaff(null)
    }, 100)
  }

  if (isAuthLoading || !user) return <div className="flex flex-col items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (isAdminLoading || isStaffLoading) return <div className="flex flex-col items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!adminRole) return <div className="text-center py-20"><ShieldAlert className="h-16 w-16 mx-auto" /><h2 className="text-2xl font-black uppercase mt-4">Access Denied</h2></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Staff Registry</h1>
          <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Administrative Personnel Database</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-black text-white font-black rounded-none h-12 px-8 border-2 border-black">
              <UserPlus className="mr-2 h-5 w-5" /> HIRE STAFF
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] border-4 border-black rounded-none">
            <form onSubmit={handleCreateStaff}>
              <DialogHeader><DialogTitle className="text-2xl font-black uppercase">Hire Staff Member</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label className="font-black uppercase text-[10px]">First Name</Label><Input name="firstName" required className="border-2 border-black rounded-none h-12" /></div>
                  <div className="space-y-1"><Label className="font-black uppercase text-[10px]">Last Name</Label><Input name="lastName" required className="border-2 border-black rounded-none h-12" /></div>
                </div>
                <div className="space-y-1"><Label className="font-black uppercase text-[10px]">Official Role</Label><Input name="officialRole" required className="border-2 border-black rounded-none h-12" /></div>
                <div className="space-y-1"><Label className="font-black uppercase text-[10px]">Address</Label><Input name="address" required className="border-2 border-black rounded-none h-12" /></div>
                <div className="space-y-1"><Label className="font-black uppercase text-[10px]">Email</Label><Input name="email" type="email" required className="border-2 border-black rounded-none h-12" /></div>
                <div className="space-y-1"><Label className="font-black uppercase text-[10px]">Phone</Label><Input name="phoneNumber" required className="border-2 border-black rounded-none h-12" /></div>
              </div>
              <DialogFooter><Button type="submit" className="w-full bg-black text-white font-black h-14 rounded-none text-lg">SAVE RECORD</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] bg-white rounded-none overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-black">
              <TableRow className="hover:bg-black">
                <TableHead className="text-white font-black uppercase text-xs">Name</TableHead>
                <TableHead className="text-white font-black uppercase text-xs hidden md:table-cell">Role</TableHead>
                <TableHead className="text-white font-black uppercase text-xs hidden lg:table-cell">Contact</TableHead>
                <TableHead className="text-white font-black uppercase text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffMembers?.map((staff) => (
                <TableRow key={staff.id} className="border-b-2 border-black/10 hover:bg-muted/50">
                  <TableCell className="font-black uppercase text-xs">{staff.firstName} {staff.lastName}</TableCell>
                  <TableCell className="hidden md:table-cell font-bold uppercase text-[10px]"><Briefcase className="h-3 w-3 inline mr-1" />{staff.officialRole}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="text-[10px] font-bold uppercase"><Mail className="h-3 w-3 inline mr-1" />{staff.email}</div>
                    <div className="text-[10px] font-bold uppercase"><Phone className="h-3 w-3 inline mr-1" />{staff.phoneNumber}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-none border-2 border-transparent hover:border-black"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-none border-2 border-black p-1">
                        <DropdownMenuItem onClick={() => { setSelectedStaff(staff); setIsEditDialogOpen(true); }} className="font-black uppercase text-[10px] focus:bg-black focus:text-white"><Edit2 className="h-3 w-3 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-black/10" />
                        <DropdownMenuItem onClick={() => { setSelectedStaff(staff); setIsDeleteDialogOpen(true); }} className="font-black uppercase text-[10px] text-destructive focus:bg-destructive focus:text-white"><Trash2 className="h-3 w-3 mr-2" /> Terminate</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] border-4 border-black rounded-none">
          <form onSubmit={handleUpdateStaff}>
            <DialogHeader><DialogTitle className="text-2xl font-black uppercase">Edit Staff Record</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label className="font-black uppercase text-[10px]">First Name</Label><Input name="firstName" defaultValue={selectedStaff?.firstName} required className="border-2 border-black rounded-none h-12" /></div>
                <div className="space-y-1"><Label className="font-black uppercase text-[10px]">Last Name</Label><Input name="lastName" defaultValue={selectedStaff?.lastName} required className="border-2 border-black rounded-none h-12" /></div>
              </div>
              <div className="space-y-1"><Label className="font-black uppercase text-[10px]">Official Role</Label><Input name="officialRole" defaultValue={selectedStaff?.officialRole} required className="border-2 border-black rounded-none h-12" /></div>
              <div className="space-y-1"><Label className="font-black uppercase text-[10px]">Address</Label><Input name="address" defaultValue={selectedStaff?.address} required className="border-2 border-black rounded-none h-12" /></div>
              <div className="space-y-1"><Label className="font-black uppercase text-[10px]">Email</Label><Input name="email" defaultValue={selectedStaff?.email} type="email" required className="border-2 border-black rounded-none h-12" /></div>
              <div className="space-y-1"><Label className="font-black uppercase text-[10px]">Phone</Label><Input name="phoneNumber" defaultValue={selectedStaff?.phoneNumber} required className="border-2 border-black rounded-none h-12" /></div>
            </div>
            <DialogFooter><Button type="submit" className="w-full bg-black text-white font-black h-14 rounded-none text-lg">UPDATE RECORD</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="border-4 border-black rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-destructive" /> Confirm Termination</AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-black uppercase text-[11px]">Are you sure you want to remove <span className="underline">{selectedStaff?.firstName} {selectedStaff?.lastName}</span> from the active staff registry? This action is permanent.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-black rounded-none font-black text-xs">ABORT</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStaff} className="bg-destructive text-white border-2 border-black rounded-none font-black text-xs">TERMINATE</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
