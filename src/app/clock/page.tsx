"use client"

import { useState, useEffect } from "react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Play, Square, Coffee, User } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function ClockPage() {
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState("00:00:00")

  useEffect(() => {
    // Initialize time only on the client to avoid hydration mismatch
    setCurrentTime(new Date())
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isClockedIn && startTime) {
      timer = setInterval(() => {
        const diff = new Date().getTime() - startTime.getTime()
        const hours = Math.floor(diff / 3600000)
        const minutes = Math.floor((diff % 3600000) / 60000)
        const seconds = Math.floor((diff % 60000) / 1000)
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        )
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [isClockedIn, startTime])

  const handleClockToggle = () => {
    if (!isClockedIn) {
      const now = new Date()
      setStartTime(now)
      setIsClockedIn(true)
      toast({
        title: "Clocked In",
        description: `Successfully clocked in at ${now.toLocaleTimeString()}`,
      })
    } else {
      setIsClockedIn(false)
      setStartTime(null)
      setElapsedTime("00:00:00")
      toast({
        title: "Clocked Out",
        description: `Shift completed at ${new Date().toLocaleTimeString()}`,
      })
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-headline font-bold">Staff Attendance</h1>
        <p className="text-muted-foreground mt-2">Manage your daily work hours</p>
      </div>

      <Card className="border-2 overflow-hidden">
        <div className={`h-2 ${isClockedIn ? 'bg-accent' : 'bg-muted'}`} />
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Staff Member</CardTitle>
          <CardDescription>Shift: Standard Operations</CardDescription>
          <div className="mt-4 flex justify-center gap-2">
            {isClockedIn ? (
              <Badge className="bg-accent hover:bg-accent text-white px-4 py-1">Active</Badge>
            ) : (
              <Badge variant="secondary" className="px-4 py-1 text-muted-foreground">Offline</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-8">
          <div className="text-center space-y-2">
            <p className="text-4xl md:text-6xl font-headline font-black tabular-nums tracking-tighter text-primary">
              {currentTime ? currentTime.toLocaleTimeString([], { hour12: true }) : "--:--:--"}
            </p>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              {currentTime ? currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : "Loading date..."}
            </p>
          </div>

          {isClockedIn && (
            <div className="bg-muted/50 p-6 rounded-xl text-center space-y-2 animate-in fade-in zoom-in duration-300">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Shift Duration</p>
              <p className="text-3xl font-headline font-bold tabular-nums text-accent">{elapsedTime}</p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-2">
                <Clock className="h-3 w-3" />
                Started at {startTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isClockedIn ? (
              <Button 
                size="lg" 
                className="h-16 text-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform" 
                onClick={handleClockToggle}
              >
                <Play className="mr-2 h-5 w-5 fill-current" /> Clock In
              </Button>
            ) : (
              <Button 
                size="lg" 
                variant="destructive" 
                className="h-16 text-lg font-bold shadow-lg shadow-destructive/20 hover:scale-[1.02] transition-transform" 
                onClick={handleClockToggle}
              >
                <Square className="mr-2 h-5 w-5 fill-current" /> Clock Out
              </Button>
            )}
            <Button size="lg" variant="secondary" className="h-16 text-lg font-bold">
              <Coffee className="mr-2 h-5 w-5" /> Take Break
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
