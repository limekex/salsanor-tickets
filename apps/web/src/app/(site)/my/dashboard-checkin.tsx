'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, Loader2, MapPin, AlertCircle, Calendar } from 'lucide-react'

type TrackWithStatus = {
  id: string
  title: string
  periodName: string
  weekday: number
  timeStart: string
  checkInWindowBefore: number
  checkInWindowAfter: number
  geofenceEnabled: boolean
  geofenceRadius: number | null
  latitude: number | null
  longitude: number | null
  registrationId: string
  alreadyCheckedIn: boolean
  checkedInTime?: string
}

type UpcomingDay = {
  dayLabel: string
  courses: { title: string; time: string; periodName: string }[]
}

type WindowStatus = {
  isOpen: boolean
  secondsUntilOpen?: number
  secondsUntilClose?: number
  isClosed?: boolean
}

/**
 * Calculate time until check-in window opens/closes
 */
function calculateWindowStatus(track: TrackWithStatus): WindowStatus {
  const [startHour, startMin] = track.timeStart.split(':').map(Number)
  if (isNaN(startHour) || isNaN(startMin)) return { isOpen: true }

  const now = new Date()
  const classStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMin, 0)
  const windowOpen = new Date(classStart.getTime() - track.checkInWindowBefore * 60 * 1000)
  const windowClose = new Date(classStart.getTime() + track.checkInWindowAfter * 60 * 1000)

  if (now < windowOpen) {
    return { isOpen: false, secondsUntilOpen: Math.ceil((windowOpen.getTime() - now.getTime()) / 1000) }
  }
  if (now > windowClose) {
    return { isOpen: false, isClosed: true }
  }
  return { isOpen: true, secondsUntilClose: Math.ceil((windowClose.getTime() - now.getTime()) / 1000) }
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60)
    const remainMins = mins % 60
    return `${hrs}h ${remainMins}m`
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}

function formatTime(time: string): string {
  const [hour, min] = time.split(':').map(Number)
  return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
}

/**
 * Get user's current location via browser Geolocation API
 */
function getUserLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'))
      return
    }
    
    // Check if we're on HTTPS or localhost
    if (typeof window !== 'undefined' && 
        window.location.protocol !== 'https:' && 
        !window.location.hostname.includes('localhost') &&
        !window.location.hostname.includes('127.0.0.1')) {
      reject(new Error('Location services require a secure connection (HTTPS)'))
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location access was denied. Please allow location access in your browser settings and try again.'))
            break
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location unavailable. Please try again.'))
            break
          case error.TIMEOUT:
            reject(new Error('Location request timed out. Please try again.'))
            break
          default:
            reject(new Error('Unable to get your location. Please try again.'))
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    )
  })
}

type CheckInItemProps = {
  track: TrackWithStatus
  onCheckIn: (trackId: string) => Promise<void>
  loading: boolean
  gettingLocation: boolean
}

function CheckInItem({ track, onCheckIn, loading, gettingLocation }: CheckInItemProps) {
  const [windowStatus, setWindowStatus] = useState<WindowStatus>(() => calculateWindowStatus(track))

  // Update countdown every second
  useEffect(() => {
    if (track.alreadyCheckedIn) return

    const interval = setInterval(() => {
      setWindowStatus(calculateWindowStatus(track))
    }, 1000)

    return () => clearInterval(interval)
  }, [track])

  const handleCheckIn = useCallback(() => {
    onCheckIn(track.id)
  }, [onCheckIn, track.id])

  // Already checked in
  if (track.alreadyCheckedIn) {
    return (
      <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="font-medium">{track.title}</p>
            <p className="text-sm text-muted-foreground">
              Checked in at {track.checkedInTime}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
          Done
        </Badge>
      </div>
    )
  }

  // Window is closed
  if (windowStatus.isClosed) {
    return (
      <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-slate-400 shrink-0" />
          <div>
            <p className="font-medium">{track.title}</p>
            <p className="text-sm text-muted-foreground">
              Check-in window has closed
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Window not yet open - show countdown
  if (!windowStatus.isOpen && windowStatus.secondsUntilOpen) {
    return (
      <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <p className="font-medium">{track.title}</p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Class at {formatTime(track.timeStart)} • Check-in opens in{' '}
              <span className="font-mono font-semibold">
                {formatCountdown(windowStatus.secondsUntilOpen)}
              </span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Window is open - show check-in button
  return (
    <div className="p-4 rounded-lg bg-rn-primary/5 border-2 border-rn-primary space-y-3">
      {/* Title and time */}
      <div className="flex items-center gap-3">
        <MapPin className="h-5 w-5 text-rn-primary shrink-0" />
        <div>
          <p className="font-medium">{track.title}</p>
          <p className="text-sm text-muted-foreground">
            Class at {formatTime(track.timeStart)}
            {track.geofenceEnabled && (
              <span className="ml-2 text-blue-600 dark:text-blue-400">
                • Location required
              </span>
            )}
          </p>
        </div>
      </div>
      
      {/* Button */}
      <Button 
        onClick={handleCheckIn}
        disabled={loading}
        size="lg"
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {gettingLocation ? 'Getting location...' : 'Checking in...'}
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Check In
          </>
        )}
      </Button>
      
      {/* Countdown */}
      {windowStatus.secondsUntilClose && (
        <p className="text-xs text-center text-orange-600 dark:text-orange-400">
          Window closes in {formatCountdown(windowStatus.secondsUntilClose)}
        </p>
      )}
    </div>
  )
}

type Props = {
  initialTracks: TrackWithStatus[]
  upcomingCourses?: UpcomingDay[]
}

export function DashboardCheckin({ initialTracks, upcomingCourses = [] }: Props) {
  const [tracks, setTracks] = useState<TrackWithStatus[]>(initialTracks)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [locationStatus, setLocationStatus] = useState<string | null>(null)

  const handleCheckIn = useCallback(async (trackId: string) => {
    setLoading(trackId)
    setError(null)
    setSuccess(null)
    setLocationStatus(null)

    try {
      // Find the track to check if geofence is required
      const track = tracks.find(t => t.id === trackId)
      
      let userLatitude: number | undefined
      let userLongitude: number | undefined
      
      // Get location if geofence is enabled
      if (track?.geofenceEnabled) {
        setLocationStatus('Getting your location...')
        try {
          const location = await getUserLocation()
          userLatitude = location.latitude
          userLongitude = location.longitude
          setLocationStatus(null)
        } catch (locationError) {
          setError(locationError instanceof Error ? locationError.message : 'Location error')
          return
        }
      }

      const res = await fetch('/api/my/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          trackId,
          userLatitude,
          userLongitude
        })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || data.message || 'Check-in failed')
        return
      }

      // Update track as checked in
      setTracks(prev => prev.map(t => 
        t.id === trackId 
          ? { ...t, alreadyCheckedIn: true, checkedInTime: data.checkedInTime }
          : t
      ))
      setSuccess(`Welcome to ${data.trackTitle}! 🎉`)

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(null)
      setLocationStatus(null)
    }
  }, [tracks])

  // No tracks for today and no upcoming courses
  if (tracks.length === 0 && upcomingCourses.length === 0) {
    return null
  }

  // Only upcoming courses (no classes today)
  if (tracks.length === 0) {
    return (
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Upcoming</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-1">
          {upcomingCourses.slice(0, 3).map((day, idx) => (
            <div key={idx} className="text-xs">
              <span className="font-medium text-slate-500">{day.dayLabel}:</span>{' '}
              {day.courses.map((course, i) => (
                <span key={i} className="text-slate-400">
                  {i > 0 && ', '}
                  {formatTime(course.time)}
                </span>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // All tracks already checked in
  const allCheckedIn = tracks.every(t => t.alreadyCheckedIn)

  return (
    <Card className={allCheckedIn 
      ? "border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/10" 
      : "border-rn-primary/50 bg-rn-primary/5"
    }>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {allCheckedIn ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <Clock className="h-5 w-5 text-rn-primary" />
            )}
            <CardTitle className="text-base">
              {allCheckedIn ? "Today's Classes" : "Check In for Today's Class"}
            </CardTitle>
          </div>
          {!allCheckedIn && (
            <Badge variant="outline" className="border-rn-primary text-rn-primary">
              Self Check-in
            </Badge>
          )}
        </div>
        {!allCheckedIn && (
          <CardDescription>
            Check in when you arrive at the venue
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {locationStatus && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-sm">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            {locationStatus}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-300 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}
        {tracks.map(track => (
          <CheckInItem
            key={track.id}
            track={track}
            onCheckIn={handleCheckIn}
            loading={loading === track.id}
            gettingLocation={loading === track.id && !!locationStatus}
          />
        ))}
      </CardContent>

      {/* Upcoming - compact */}
      {upcomingCourses.length > 0 && (
        <div className="px-4 pb-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Next:</span>{' '}
            {upcomingCourses.slice(0, 2).map((day, idx) => (
              <span key={idx}>
                {idx > 0 && ' · '}
                {day.dayLabel} {day.courses.map(c => formatTime(c.time)).join(', ')}
              </span>
            ))}
          </p>
        </div>
      )}
    </Card>
  )
}
