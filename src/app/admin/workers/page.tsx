"use client"

import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc, query, where, orderBy } from "firebase/firestore"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
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
import { SearchCode, Loader2, ShieldAlert, ArrowRight, User } from "lucide-react"
import Link from "next/link"

export default function WorkerTrackingPage() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "users", user.uid)
  }, [firestore, user])
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef)

  const workersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null
    // List all approved workers/admins for auditing
    return query(
      collection(firestore, "users"), 
      where("status", "==", "approved"),
      orderBy("displayName", "asc")
    )
  }, [firestore, user])
  const { data: workers, isLoading: isWorkersLoading } = useCollection(workersQuery)

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace("/auth")
    }
  }, [user, isUserLoading, router])

  if (isUserLoading || isProfileLoading || isWorkersLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Synchronizing Workforce Data...</p>
      </div>
    )
  }

  const isAdmin = profile?.role === "ADMIN"

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <ShieldAlert className="h-16 w-16 mx-auto text-black" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Access Denied</h2>
        <p className="text-muted-foreground font-bold">Only administrators can access worker request logs.</p>
        <Button asChild variant="outline" className="border-2 border-black rounded-none uppercase font-black">
          <Link href="/">Return to Terminal</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
          <SearchCode className="h-10 w-10" /> Worker Logs
        </h1>
        <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest">Select personnel to view historical requests</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workers?.map((worker) => (
          <Card key={worker.id} className="border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer overflow-hidden group">
            <Link href={`/admin/workers/${worker.uid}`}>
              <CardHeader className="bg-black text-white py-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-black uppercase truncate">{worker.displayName}</CardTitle>
                <User className="h-4 w-4" />
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">System Role</p>
                  <Badge className="bg-muted text-black font-black uppercase text-[9px] rounded-none px-2 h-5">{worker.role}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Email Identifier</p>
                  <p className="text-xs font-bold truncate">{worker.email}</p>
                </div>
                <div className="pt-4 border-t-2 border-black border-dashed flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase group-hover:underline">View History</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
        {(!workers || workers.length === 0) && (
          <div className="col-span-full py-20 text-center border-4 border-black border-dashed bg-muted/20">
             <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">No personnel records found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
