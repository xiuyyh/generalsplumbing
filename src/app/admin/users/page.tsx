
"use client"

import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, query, orderBy } from "firebase/firestore"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { 
  Card, 
  CardContent, 
} from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserCog, Loader2, Check, X, Trash2, ShieldAlert } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import Link from "next/link"

const ROLES = ["ADMIN", "PUNCH_LIST", "INVENTORY", "WORKER"]

export default function UserManagementPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user])
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, "users"), orderBy("createdAt", "desc"))
  }, [firestore, user])
  const { data: users, isLoading } = useCollection(usersQuery)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/auth")
    }
  }, [user, isUserLoading, router])

  if (isUserLoading || isProfileLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin h-10 w-10" />
      </div>
    )
  }

  const isAdmin = profile?.role === "ADMIN"

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <ShieldAlert className="h-16 w-16 mx-auto text-black" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Access Denied</h2>
        <p className="text-muted-foreground font-bold">Only administrators are authorized to manage system users.</p>
        <Button asChild variant="outline" className="border-2 border-black rounded-none uppercase font-black">
          <Link href="/">Return to Terminal</Link>
        </Button>
      </div>
    )
  }

  const handleUpdateRole = (uid: string, role: string) => {
    if (!firestore) return
    updateDocumentNonBlocking(doc(firestore, "users", uid), { role })
    toast({ title: "Role Updated", description: `User role changed to ${role}` })
  }

  const handleApprove = (uid: string) => {
    if (!firestore) return
    updateDocumentNonBlocking(doc(firestore, "users", uid), { status: "approved" })
    toast({ title: "User Approved", description: "Access granted to the system." })
  }

  const handleReject = (uid: string) => {
    if (!firestore) return
    updateDocumentNonBlocking(doc(firestore, "users", uid), { status: "rejected" })
    toast({ variant: "destructive", title: "User Rejected", description: "Access denied." })
  }

  const handleDelete = (uid: string, email: string) => {
    if (!firestore) return
    if (uid === user?.uid) {
      toast({ variant: "destructive", title: "Action Denied", description: "You cannot delete your own administrative account." })
      return
    }
    
    if (window.confirm(`PERMANENT REMOVAL: Delete user ${email}? This will remove all associated profile data.`)) {
      deleteDocumentNonBlocking(doc(firestore, "users", uid))
      toast({ variant: "destructive", title: "User Deleted", description: "Profile has been purged from the system." })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
          <UserCog className="h-10 w-10" /> User Management
        </h1>
        <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest">Authorize Personnel Access</p>
      </div>

      <Card className="border-4 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-black">
              <TableRow className="hover:bg-black">
                <TableHead className="text-white font-black uppercase text-xs">User</TableHead>
                <TableHead className="text-white font-black uppercase text-xs">Status</TableHead>
                <TableHead className="text-white font-black uppercase text-xs">Role Assignment</TableHead>
                <TableHead className="text-white font-black uppercase text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => (
                <TableRow key={u.uid} className="border-b-2 border-black/10 hover:bg-muted/50">
                  <TableCell>
                    <div className="font-black uppercase text-xs">{u.displayName}</div>
                    <div className="text-[9px] font-bold text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "rounded-none font-black uppercase text-[8px] px-2 py-0 h-5",
                      u.status === 'approved' ? 'bg-green-600' : u.status === 'pending' ? 'bg-amber-500' : 'bg-red-600'
                    )}>
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select defaultValue={u.role} onValueChange={(val) => handleUpdateRole(u.uid, val)}>
                      <SelectTrigger className="h-8 border-2 border-black rounded-none font-black text-[10px] uppercase w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(role => (
                          <SelectItem key={role} value={role} className="font-black text-[10px] uppercase">{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {u.status === 'pending' && (
                        <>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 border-2 border-transparent hover:border-black rounded-none" onClick={() => handleApprove(u.uid)} title="Approve User">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 border-2 border-transparent hover:border-black rounded-none" onClick={() => handleReject(u.uid)} title="Reject User">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-destructive border-2 border-transparent hover:border-black rounded-none" 
                        onClick={() => handleDelete(u.uid, u.email)}
                        disabled={u.uid === user?.uid}
                        title="Delete User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!users || users.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20 text-muted-foreground font-black uppercase text-xs">
                    No registered personnel found.
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
