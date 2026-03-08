'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, XCircle, ScanLine, Phone, RotateCcw, Loader2, Clock } from 'lucide-react'

type CheckInResult = {
    valid: boolean
    message: string
    personName?: string
    alreadyCheckedIn?: boolean
    wrongDay?: boolean
}

type TrackInfo = {
    id: string
    title: string
    periodName: string
    allowSelfCheckIn: boolean
    weekday: number
    timeStart: string
    checkInWindowBefore: number
    checkInWindowAfter: number
    periodStartDate?: string
    periodEndDate?: string
}

type WindowStatus = {
    isOpen: boolean
    secondsUntilOpen?: number
    secondsUntilClose?: number
    isClosed?: boolean
    periodNotStarted?: boolean
    periodEnded?: boolean
    periodMessage?: string
}

type Props = {
    trackId: string
    allowOverride?: boolean
}

const weekdayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/**
 * Calculate time until check-in window opens/closes
 * Also checks if current date is within the period date range
 * Returns: { isOpen: boolean, secondsUntilOpen?: number, secondsUntilClose?: number, periodNotStarted?: boolean, periodEnded?: boolean, periodMessage?: string }
 */
function calculateWindowStatus(track: TrackInfo): WindowStatus {
    const [startHour, startMin] = track.timeStart.split(':').map(Number)
    if (isNaN(startHour) || isNaN(startMin)) return { isOpen: true }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Check period date range first
    if (track.periodStartDate) {
        const startDate = new Date(track.periodStartDate)
        const periodStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
        if (today < periodStart) {
            const daysUntil = Math.ceil((periodStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            const formattedDate = periodStart.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
            return { 
                isOpen: false, 
                periodNotStarted: true, 
                periodMessage: `Course period starts ${formattedDate} (${daysUntil} day${daysUntil !== 1 ? 's' : ''})` 
            }
        }
    }

    if (track.periodEndDate) {
        const endDate = new Date(track.periodEndDate)
        const periodEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
        if (today > periodEnd) {
            const formattedDate = periodEnd.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
            return { 
                isOpen: false, 
                periodEnded: true, 
                periodMessage: `Course period ended ${formattedDate}` 
            }
        }
    }

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
        return `${hrs}h ${remainMins}m ${secs}s`
    }
    return `${mins}m ${secs}s`
}

export default function SelfCheckInScanner({ trackId, allowOverride = false }: Props) {
    const [track, setTrack] = useState<TrackInfo | null>(null)
    const [loadingTrack, setLoadingTrack] = useState(true)
    const [trackError, setTrackError] = useState<string | null>(null)

    const [mode, setMode] = useState<'qr' | 'phone'>('qr')
    const [result, setResult] = useState<CheckInResult | null>(null)
    const [loading, setLoading] = useState(false)

    // Window timing
    const [windowStatus, setWindowStatus] = useState<WindowStatus>({ isOpen: true })

    // Phone form
    const [phoneInput, setPhoneInput] = useState('')

    // Auto-reset countdown for result screen
    const [resetCountdown, setResetCountdown] = useState<number | null>(null)

    const scannerRef = useRef<Html5QrcodeScanner | null>(null)
    const isMounted = useRef(false)
    const scanHandled = useRef(false)

    useEffect(() => {
        isMounted.current = true
        return () => { isMounted.current = false }
    }, [])

    // Load track info
    useEffect(() => {
        async function loadTrack() {
            try {
                const res = await fetch(`/api/selfcheckin?trackId=${trackId}`)
                const data = await res.json()
                if (!res.ok) {
                    setTrackError(data.error || 'Track not found')
                } else if (!data.allowSelfCheckIn) {
                    setTrackError('Self check-in is not enabled for this course.')
                } else {
                    setTrack(data)
                }
            } catch {
                setTrackError('Failed to load course info')
            } finally {
                setLoadingTrack(false)
            }
        }
        loadTrack()
    }, [trackId])

    // Update window status every second
    useEffect(() => {
        if (!track || allowOverride) return

        const updateStatus = () => {
            const status = calculateWindowStatus(track)
            setWindowStatus(status)
        }

        updateStatus() // Initial check
        const interval = setInterval(updateStatus, 1000)

        return () => clearInterval(interval)
    }, [track, allowOverride])

    const doCheckIn = useCallback(async (params: { token?: string; phone?: string }) => {
        if (loading) return
        setLoading(true)
        try {
            const res = await fetch('/api/selfcheckin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...params, trackId })
            })
            const data = await res.json()
            if (isMounted.current) {
                setResult(data as CheckInResult)
            }
        } catch {
            if (isMounted.current) {
                setResult({ valid: false, message: 'Network error. Please try again.' })
            }
        } finally {
            if (isMounted.current) setLoading(false)
        }
    }, [loading, trackId])

    // Derive stable boolean for scanner availability
    const canShowScanner = windowStatus.isOpen || allowOverride

    // QR Scanner setup
    useEffect(() => {
        // Don't initialize if window not open (unless override)
        if (!canShowScanner) return
        if (mode !== 'qr' || result || loadingTrack || !!trackError || loading) return

        // Ensure the DOM element exists before initializing scanner
        const element = document.getElementById('self-checkin-qr-reader')
        if (!element) return

        const scanner = new Html5QrcodeScanner('self-checkin-qr-reader', {
            fps: 5,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1,
            showTorchButtonIfSupported: true,
        }, false)

        scannerRef.current = scanner

        scanner.render(
            (decodedText) => {
                if (scanHandled.current) return
                scanHandled.current = true
                scanner.clear().catch(() => {})
                doCheckIn({ token: decodedText })
            },
            () => {} // ignore errors
        )

        return () => {
            scanner.clear().catch(() => {})
            scannerRef.current = null
        }
    }, [mode, result, loadingTrack, trackError, loading, doCheckIn, canShowScanner])

    // Auto-reset countdown after showing result
    useEffect(() => {
        if (!result) {
            setResetCountdown(null)
            return
        }
        // Start 5-second countdown when result is shown
        setResetCountdown(5)
        const interval = setInterval(() => {
            setResetCountdown(prev => {
                if (prev === null) {
                    clearInterval(interval)
                    return null
                }
                if (prev <= 1) {
                    clearInterval(interval)
                    return 0 // Set to 0 to trigger the reset effect
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(interval)
    }, [result])

    // Auto-reset when countdown reaches 0
    useEffect(() => {
        if (resetCountdown === 0) {
            reset()
        }
    }, [resetCountdown])

    function reset() {
        setResult(null)
        setPhoneInput('')
        scanHandled.current = false
    }

    function handlePhoneSubmit(e: React.FormEvent) {
        e.preventDefault()
        const trimmed = phoneInput.trim()
        if (!trimmed) return
        doCheckIn({ phone: trimmed })
    }

    // Loading state
    if (loadingTrack) {
        return (
            <div className="flex-1 flex items-center justify-center p-rn-4">
                <Loader2 className="h-8 w-8 animate-spin text-rn-text-muted" />
            </div>
        )
    }

    // Track error
    if (trackError || !track) {
        return (
            <div className="flex-1 flex items-center justify-center p-rn-4">
                <Card className="w-full max-w-sm">
                    <CardContent className="pt-rn-6 text-center space-y-rn-2">
                        <XCircle className="h-12 w-12 text-rn-danger mx-auto" />
                        <p className="text-rn-text font-medium">{trackError || 'Unknown error'}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Countdown overlay (check-in window not yet open)
    if (!canShowScanner) {
        return (
            <div className="flex-1 flex items-center justify-center p-rn-4">
                <Card className="w-full max-w-sm">
                    <CardHeader className="text-center pb-rn-2">
                        <CardTitle className="rn-h3 text-rn-text">{track.title}</CardTitle>
                        <p className="rn-caption text-rn-text-muted">
                            {track.periodName} · {weekdayNames[track.weekday] ?? ''} {track.timeStart}
                        </p>
                    </CardHeader>
                    <CardContent className="text-center space-y-rn-4">
                        <Clock className="h-16 w-16 text-rn-text-muted mx-auto" />
                        {windowStatus.periodNotStarted ? (
                            <>
                                <p className="rn-h2 text-amber-600">Course Not Started</p>
                                <p className="rn-body text-rn-text-muted">
                                    {windowStatus.periodMessage}
                                </p>
                            </>
                        ) : windowStatus.periodEnded ? (
                            <>
                                <p className="rn-h2 text-rn-text-muted">Course Ended</p>
                                <p className="rn-body text-rn-text-muted">
                                    {windowStatus.periodMessage}
                                </p>
                            </>
                        ) : windowStatus.isClosed ? (
                            <>
                                <p className="rn-h2 text-rn-danger">Check-in Closed</p>
                                <p className="rn-body text-rn-text-muted">
                                    The check-in window has ended for today.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="rn-h2 text-rn-text">Check-in Opens In</p>
                                <p className="text-4xl font-mono font-bold text-primary">
                                    {formatCountdown(windowStatus.secondsUntilOpen ?? 0)}
                                </p>
                                <p className="rn-caption text-rn-text-muted">
                                    Check-in opens {track.checkInWindowBefore} minutes before class at {track.timeStart}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Result screen
    if (result) {
        const isSuccess = result.valid || result.alreadyCheckedIn
        return (
            <div className="flex-1 flex items-center justify-center p-rn-4">
                <Card className={`w-full max-w-sm ${isSuccess ? 'border-rn-success' : 'border-rn-danger'}`}>
                    <CardContent className="pt-rn-6 text-center space-y-rn-4">
                        {result.valid ? (
                            <CheckCircle2 className="h-16 w-16 text-rn-success mx-auto" />
                        ) : result.alreadyCheckedIn ? (
                            <CheckCircle2 className="h-16 w-16 text-rn-warning mx-auto" />
                        ) : (
                            <XCircle className="h-16 w-16 text-rn-danger mx-auto" />
                        )}
                        {result.personName && (
                            <p className="rn-h2 text-rn-text">{result.personName}</p>
                        )}
                        <p className={`rn-body ${result.valid ? 'text-rn-success' : result.alreadyCheckedIn ? 'text-rn-warning' : 'text-rn-danger'}`}>
                            {result.message}
                        </p>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={reset}
                            className="w-full mt-rn-2"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Check in another {resetCountdown !== null && `(${resetCountdown}s)`}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col items-center p-rn-4 gap-rn-4">
            {/* Track header */}
            <Card className="w-full max-w-sm">
                <CardHeader className="pb-rn-2 pt-rn-4">
                    <CardTitle className="rn-h3 text-center text-rn-text">{track.title}</CardTitle>
                    <p className="rn-caption text-rn-text-muted text-center">
                        {track.periodName} · {weekdayNames[track.weekday] ?? ''} {track.timeStart}
                    </p>
                </CardHeader>
            </Card>

            {/* Mode toggle */}
            <div className="flex gap-rn-2 w-full max-w-sm">
                <Button
                    variant={mode === 'qr' ? 'default' : 'outline'}
                    size="lg"
                    className="flex-1"
                    onClick={() => { setMode('qr'); reset() }}
                >
                    <ScanLine className="h-4 w-4 mr-2" />
                    Scan QR
                </Button>
                <Button
                    variant={mode === 'phone' ? 'default' : 'outline'}
                    size="lg"
                    className="flex-1"
                    onClick={() => { setMode('phone'); reset() }}
                >
                    <Phone className="h-4 w-4 mr-2" />
                    Phone number
                </Button>
            </div>

            {/* QR Scanner */}
            {mode === 'qr' && !loading && (
                <Card className="w-full max-w-sm">
                    <CardContent className="pt-rn-4">
                        <div id="self-checkin-qr-reader" className="w-full" />
                        <p className="rn-caption text-rn-text-muted text-center mt-rn-2">
                            Scan the QR code from your course ticket
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Phone number form */}
            {mode === 'phone' && (
                <Card className="w-full max-w-sm">
                    <CardContent className="pt-rn-4">
                        <form onSubmit={handlePhoneSubmit} className="space-y-rn-3">
                            <div className="space-y-rn-1">
                                <Label htmlFor="phone" className="text-rn-text">Your phone number</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="+47 900 00 000"
                                    value={phoneInput}
                                    onChange={e => setPhoneInput(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <Button
                                type="submit"
                                size="lg"
                                disabled={loading || !phoneInput.trim()}
                                className="w-full"
                            >
                                {loading ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking in...</>
                                ) : (
                                    'Check in'
                                )}
                            </Button>
                        </form>
                        <p className="rn-caption text-rn-text-subtle text-center mt-rn-3">
                            Enter the phone number you registered with
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Loading overlay for QR mode */}
            {mode === 'qr' && loading && (
                <div className="flex items-center justify-center py-rn-8">
                    <Loader2 className="h-8 w-8 animate-spin text-rn-text-muted" />
                </div>
            )}
        </div>
    )
}
