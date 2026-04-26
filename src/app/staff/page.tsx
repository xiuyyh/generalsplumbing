"use client"

import { useState } from "react"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
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
import { UserPlus, MapPin, Briefcase, Mail, Phone, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useDoc } from "@/firebase/firestore/use-doc"

export default function StaffPage() {
  const { user } = useUser()
  const firestore = useFirestore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Admin check
  const adminRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "roles_admin", user.uid)
  }, [firestore, user])
  const { data: adminRole, isLoading: isAdminLoading } = useDoc(adminRef)

  // Staff collection
  const staffQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, "staffMembers")
  }, [firestore])
  const { data: staffMembers, isLoading: isStaffLoading } = useCollection(staffQuery)

  const handleCreateStaff = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!firestore) return

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

  if (isAdminLoading || isStaffLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!adminRole) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Only administrators can manage staff records.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Staff Registry</h1>
          <p className="text-muted-foreground">Manage employee records and roles.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-black hover:bg-black/90 text-white font-bold">
              <UserPlus className="mr-2 h-5 w-5" /> Hire New Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleCreateStaff}>
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
                <DialogDescription>
                  Enter the details for the new employee. All fields are required.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" name="firstName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" name="lastName" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="officialRole">Official Role</Label>
                  <Input id="officialRole" name="officialRole" placeholder="e.g. Master Plumber" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Residential Address</Label>
                  <Input id="address" name="address" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input id="phoneNumber" name="phoneNumber" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full">Save Staff Record</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffMembers?.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell className="font-bold">
                    {staff.firstName} {staff.lastName}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      {staff.officialRole}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {staff.email}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {staff.phoneNumber}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {staff.address}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(staff.hireDate).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {(!staffMembers || staffMembers.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No staff members found.
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
