"use client"

import { useState, useEffect } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
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
import { UserPlus, MapPin, Briefcase, Mail, Phone, Loader2, ShieldAlert } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useDoc } from "@/firebase/firestore/use-doc"

export default function StaffPage() {
  const { user, isUserLoading: isAuthLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/auth")
    }
  }, [user, isAuthLoading, router])

  // Admin check - gated by user presence
  const adminRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "roles_admin", user.uid)
  }, [firestore, user])
  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRef)

  // Staff collection - gated by user presence
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
    
    toast({
      title: "Staff Created",
      description: `${staffData.firstName} ${staffData.lastName} has been added to the registry.`,
    })
    setIsDialogOpen(false)
  }

  if (isAuthLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Verifying Identity...</p>
      </div>
    )
  }

  if (isAdminLoading || isStaffLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Accessing Records...</p>
      </div>
    )
  }

  if (!adminRole) {
    return (
      <div className="text-center py-20 space-y-4">
        <ShieldAlert className="h-16 w-16 mx-auto text-black" />
        <h2 className="text-3xl font-black uppercase tracking-tighter">Access Denied</h2>
        <p className="text-muted-foreground font-bold">Only administrators can manage staff records.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Staff Registry</h1>
          <p className="text-muted-foreground font-bold">Master database of all active personnel.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-black hover:bg-black/90 text-white font-black rounded-none h-12 px-8 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">
              <UserPlus className="mr-2 h-5 w-5" /> HIRE NEW STAFF
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] border-4 border-black rounded-none">
            <form onSubmit={handleCreateStaff}>
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Hire Staff Member</DialogTitle>
                <DialogDescription className="font-bold">
                  Enter official records for the new employee.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="font-black uppercase text-xs">First Name</Label>
                    <Input id="firstName" name="firstName" required className="border-2 border-black rounded-none h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="font-black uppercase text-xs">Last Name</Label>
                    <Input id="lastName" name="lastName" required className="border-2 border-black rounded-none h-12" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="officialRole" className="font-black uppercase text-xs">Official Role</Label>
                  <Input id="officialRole" name="officialRole" placeholder="e.g. Master Plumber" required className="border-2 border-black rounded-none h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="font-black uppercase text-xs">Residential Address</Label>
                  <Input id="address" name="address" required className="border-2 border-black rounded-none h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-black uppercase text-xs">Email Address</Label>
                  <Input id="email" name="email" type="email" required className="border-2 border-black rounded-none h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="font-black uppercase text-xs">Phone Number</Label>
                  <Input id="phoneNumber" name="phoneNumber" required className="border-2 border-black rounded-none h-12" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full bg-black text-white font-black h-14 rounded-none text-lg">SAVE RECORD</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-black">
              <TableRow className="hover:bg-black">
                <TableHead className="text-white font-black uppercase tracking-widest text-xs">Name</TableHead>
                <TableHead className="text-white font-black uppercase tracking-widest text-xs">Role</TableHead>
                <TableHead className="text-white font-black uppercase tracking-widest text-xs">Contact</TableHead>
                <TableHead className="text-white font-black uppercase tracking-widest text-xs">Address</TableHead>
                <TableHead className="text-white font-black uppercase tracking-widest text-xs">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffMembers?.map((staff) => (
                <TableRow key={staff.id} className="border-b-2 border-black/10 hover:bg-muted/50">
                  <TableCell className="font-black uppercase tracking-tight">
                    {staff.firstName} {staff.lastName}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-bold uppercase text-xs">
                      <Briefcase className="h-4 w-4 text-black" />
                      {staff.officialRole}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <Mail className="h-3 w-3 text-black" />
                        {staff.email}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <Phone className="h-3 w-3 text-black" />
                        {staff.phoneNumber}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                      <MapPin className="h-3 w-3" />
                      {staff.address}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-black uppercase">
                    {new Date(staff.hireDate).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {(!staffMembers || staffMembers.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 font-black text-muted-foreground uppercase tracking-widest">
                    No staff records found in system.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
