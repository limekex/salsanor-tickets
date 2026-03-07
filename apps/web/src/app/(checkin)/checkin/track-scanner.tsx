'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { CheckCircle2, XCircle, RotateCcw, ChevronLeft, AlertCircle, CalendarX, Users, ScanLine, UserCheck, Undo2 } from 'lucide-react'

const checkInTimeFormatter = new Intl.DateTimeFormat('en-GB', { timeStyle: 'short' })

type ScanResult = {
    valid: boolean
    message?: string
    personName?: string
    course?: string
    periodName?: string
    eventTitle?: string
    ticketNumber?: number
    alreadyCheckedIn?: boolean
    wrongDay?: boolean
    type?: 'track' | 'event'
}

type AttendanceEntry = {
    id: string
    personName: string
    checkInTime: string
    chosenRole: string
}

type NotCheckedInEntry = {
    registrationId: string
    personName: string
    chosenRole: string
}

type AttendanceData = {
    sessionDate: string
    totalRegistered: number
    attendances: AttendanceEntry[]
    notCheckedIn: NotCheckedInEntry[]
}

type ManualCheckInState =
    | { phase: 'idle' }
    | { phase: 'confirming'; entry: NotCheckedInEntry }
    | { phase: 'loading' }
    | { phase: 'success'; personName: string }
    | { phase: 'error'; message: string }

type UndoCheckInState =
    | { phase: 'idle' }
    | { phase: 'confirming'; entry: AttendanceEntry }
    | { phase: 'loading' }
    | { phase: 'success'; personName: string }
    | { phase: 'error'; message: string }

type Props = {
    trackId?: string
    eventId?: string
    trackTitle: string
    onBack: () => void
}

export default function TrackScanner({ trackId, eventId, trackTitle, onBack }: Props) {
    const [result, setResult] = useState<ScanResult | null>(null)
    const [scanning, setScanning] = useState(true)
    const [verifying, setVerifying] = useState(false)
    const [view, setView] = useState<'scanner' | 'list'>('scanner')
    const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null)
    const [loadingList, setLoadingList] = useState(false)
    const [manualCheckIn, setManualCheckIn] = useState<ManualCheckInState>({ phase: 'idle' })
    const [undoCheckIn, setUndoCheckIn] = useState<UndoCheckInState>({ phase: 'idle' })
    const scannerRef = useRef<Html5QrcodeScanner | null>(null)
    const isMounted = useRef(false)
    const isTransitioning = useRef(false)

    const isEventMode = !!eventId

    useEffect(() => {
        isMounted.current = true
        return () => { isMounted.current = false }
    }, [])

    const fetchAttendance = useCallback(async () => {
        if (!trackId) return
        setLoadingList(true)
        try {
            const res = await fetch(`/api/tickets/attendance?trackId=${trackId}`)
            if (res.ok) {
                const data = await res.json()
                if (isMounted.current) setAttendanceData(data)
            }
        } catch (e) {
            console.error('Failed to load attendance', e)
        } finally {
            if (isMounted.current) setLoadingList(false)
        }
    }, [trackId])

    // Refresh attendance list when switching to list view
    useEffect(() => {
        if (view === 'list' && trackId) {
            fetchAttendance()
        }
    }, [view, trackId, fetchAttendance])

    // Safe scanner cleanup that handles transition states
    const cleanupScanner = async () => {
        if (!scannerRef.current) return
        
        const scanner = scannerRef.current
        scannerRef.current = null // Clear ref immediately to prevent double cleanup
        
        // Wait a bit if we're in a transition
        if (isTransitioning.current) {
            await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        try {
            isTransitioning.current = true
            await scanner.clear()
        } catch (e) {
            // Ignore transition errors - scanner will be garbage collected
        } finally {
            isTransitioning.current = false
        }
    }

    useEffect(() => {
        // Clean up scanner when we stop scanning or switch to list view
        if (!scanning || view === 'list') {
            cleanupScanner()
            return
        }

        const timeout = setTimeout(() => {
            if (!document.getElementById("reader") || !isMounted.current) return

            // Prevent duplicates
            if (scannerRef.current) return

            try {
                const scanner = new Html5QrcodeScanner(
                    "reader",
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    false
                )
                scannerRef.current = scanner

                scanner.render(
                    (decodedText) => {
                        // Wrap callback to catch any post-cleanup errors
                        try {
                            onScanSuccess(decodedText)
                        } catch (e) {
                            // Ignore errors if component unmounted
                        }
                    },
                    () => {
                        // ignore scan failures silently
                    }
                )
            } catch (e) {
                console.error("Scanner init error", e)
            }
        }, 300)

        return () => {
            clearTimeout(timeout)
            // Don't await cleanup on unmount - let it happen async
            cleanupScanner()
        }
    }, [scanning, view])

    async function onScanSuccess(decodedText: string) {
        if (!isMounted.current || verifying || isTransitioning.current) return

        // Immediately stop scanning UI to prevent double-scan
        setVerifying(true)
        isTransitioning.current = true

        // Don't try to pause - just stop scanning state which will trigger cleanup
        // This avoids transition state conflicts

        try {
            // Send either trackId or eventId depending on mode
            const payload = isEventMode
                ? { token: decodedText, eventId }
                : { token: decodedText, trackId }

            const res = await fetch('/api/tickets/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const data = await res.json()

            if (isMounted.current) {
                setResult(data)
                setScanning(false)
                // Refresh attendance list eagerly on a successful scan
                if (data.valid && trackId) {
                    fetchAttendance()
                }
            }
        } catch (e) {
            if (isMounted.current) {
                setResult({ valid: false, message: 'Network error' })
                setScanning(false)
            }
        } finally {
            if (isMounted.current) {
                setVerifying(false)
                isTransitioning.current = false
            }
        }
    }

    async function confirmManualCheckIn() {
        if (manualCheckIn.phase !== 'confirming' || !trackId) return
        const entry = manualCheckIn.entry
        setManualCheckIn({ phase: 'loading' })
        try {
            const res = await fetch('/api/tickets/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ registrationId: entry.registrationId, trackId })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                setManualCheckIn({ phase: 'success', personName: data.personName })
                fetchAttendance()
            } else {
                setManualCheckIn({ phase: 'error', message: data.message ?? 'Check-in failed' })
            }
        } catch {
            setManualCheckIn({ phase: 'error', message: 'Network error' })
        }
    }

    function closeManualDialog() {
        setManualCheckIn({ phase: 'idle' })
    }

    async function confirmUndoCheckIn() {
        if (undoCheckIn.phase !== 'confirming') return
        const entry = undoCheckIn.entry
        setUndoCheckIn({ phase: 'loading' })
        try {
            const res = await fetch('/api/tickets/attendance', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attendanceId: entry.id, reason: 'Manual undo' })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                setUndoCheckIn({ phase: 'success', personName: data.personName })
                fetchAttendance()
            } else {
                setUndoCheckIn({ phase: 'error', message: data.message ?? 'Undo failed' })
            }
        } catch {
            setUndoCheckIn({ phase: 'error', message: 'Network error' })
        }
    }

    function closeUndoDialog() {
        setUndoCheckIn({ phase: 'idle' })
    }

    function reset() {
        setResult(null)
        setVerifying(false)
        isTransitioning.current = false
        setScanning(true)
    }

    const formatCheckInTime = (iso: string) => checkInTimeFormatter.format(new Date(iso))

    const isManualDialogOpen = manualCheckIn.phase !== 'idle'
    const isUndoDialogOpen = undoCheckIn.phase !== 'idle'

    if (verifying && scanning) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="flex flex-col items-center space-y-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-white"></div>
                    <h2 className="text-xl font-semibold text-white">Verifying ticket...</h2>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={onBack}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <div className="text-center flex-1">
                    <h2 className="text-lg font-semibold text-white">{trackTitle}</h2>
                    <p className="text-xs text-slate-400">
                        {isEventMode ? 'Scanning for this event' : 'Scanning for this track'}
                    </p>
                </div>
                {/* Attendance list toggle — only for course tracks */}
                {!isEventMode && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setView(v => v === 'scanner' ? 'list' : 'scanner')
                            if (view === 'list') {
                                reset()
                            }
                        }}
                        className="flex items-center gap-1 text-slate-300"
                    >
                        {view === 'scanner' ? (
                            <>
                                <Users className="h-4 w-4" />
                                {attendanceData && (
                                    <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">
                                        {attendanceData.attendances.length}
                                    </span>
                                )}
                            </>
                        ) : (
                            <ScanLine className="h-4 w-4" />
                        )}
                    </Button>
                )}
                {isEventMode && <div className="w-16"></div>}
            </div>

            {/* ─── LIST VIEW ─── */}
            {view === 'list' && !isEventMode && (
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="max-w-2xl mx-auto space-y-3">
                        {/* Summary */}
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-white">Today&apos;s Attendance</h3>
                            <Button variant="ghost" size="sm" onClick={fetchAttendance} disabled={loadingList} className="text-slate-400">
                                <RotateCcw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>

                        {loadingList ? (
                            <div className="text-center py-8">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-white mx-auto"></div>
                                <p className="text-slate-400 mt-3">Loading...</p>
                            </div>
                        ) : attendanceData ? (
                            <>
                                {/* Stats summary card */}
                                <div className="flex items-center gap-3 bg-slate-800 rounded-lg p-4">
                                    <Users className="h-5 w-5 text-slate-400 shrink-0" />
                                    <div>
                                        <p className="text-2xl font-bold text-white">
                                            {attendanceData.attendances.length}
                                            <span className="text-slate-400 text-base font-normal"> / {attendanceData.totalRegistered}</span>
                                        </p>
                                        <p className="text-xs text-slate-400">checked in today</p>
                                    </div>
                                    {attendanceData.totalRegistered > 0 && (
                                        <div className="ml-auto text-right">
                                            <p className="text-lg font-semibold text-white">
                                                {Math.round((attendanceData.attendances.length / attendanceData.totalRegistered) * 100)}%
                                            </p>
                                            <p className="text-xs text-slate-400">attendance</p>
                                        </div>
                                    )}
                                </div>

                                {/* Checked-in list */}
                                {attendanceData.attendances.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Checked in</p>
                                        {attendanceData.attendances.map((entry, idx) => (
                                            <div key={entry.id} className="flex items-center gap-3 bg-slate-800 rounded-lg px-4 py-3">
                                                <span className="text-slate-500 text-sm w-6 shrink-0">{idx + 1}</span>
                                                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                                                <span className="flex-1 text-white font-medium">{entry.personName}</span>
                                                <span className="text-xs text-slate-400">{formatCheckInTime(entry.checkInTime)}</span>
                                                <button
                                                    onClick={() => setUndoCheckIn({ phase: 'confirming', entry })}
                                                    className="p-1.5 rounded-md hover:bg-slate-700 active:bg-slate-600 transition-colors"
                                                    title="Undo check-in"
                                                >
                                                    <Undo2 className="h-4 w-4 text-slate-400 hover:text-slate-200" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Not yet checked-in list */}
                                {attendanceData.notCheckedIn.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 pt-2">Not yet checked in</p>
                                        {attendanceData.notCheckedIn.map(entry => (
                                            <button
                                                key={entry.registrationId}
                                                onClick={() => setManualCheckIn({ phase: 'confirming', entry })}
                                                className="w-full flex items-center gap-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg px-4 py-3 text-left transition-colors"
                                            >
                                                <UserCheck className="h-4 w-4 text-slate-500 shrink-0" />
                                                <span className="flex-1 text-slate-300 font-medium">{entry.personName}</span>
                                                <span className="text-xs text-slate-500">Tap to check in</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {attendanceData.attendances.length === 0 && attendanceData.notCheckedIn.length === 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-slate-400">No registrations for this track</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-center text-slate-400 py-8">Failed to load attendance</p>
                        )}
                    </div>
                </div>
            )}

            {/* ─── SCANNER VIEW ─── */}
            {view === 'scanner' && (
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                    {scanning ? (
                        <div className="w-full max-w-md space-y-4 text-center">
                            <h3 className="text-xl font-semibold text-white">Ready to Scan</h3>
                            <div id="reader" className="overflow-hidden rounded-lg border-2 border-slate-700 bg-black"></div>
                            <p className="text-sm text-slate-400">Point camera at QR code</p>
                        </div>
                    ) : (
                        <Card className={`w-full max-w-md border-4 ${
                            result?.valid 
                                ? 'border-green-500 bg-green-900' 
                                : result?.alreadyCheckedIn 
                                    ? 'border-amber-500 bg-amber-900'
                                    : result?.wrongDay
                                        ? 'border-blue-500 bg-blue-900'
                                        : 'border-red-500 bg-red-900'
                        }`}>
                            <CardHeader className="text-center pb-2">
                                {result?.valid ? (
                                    <CheckCircle2 className="h-20 w-20 mx-auto text-green-300 mb-4" />
                                ) : result?.alreadyCheckedIn ? (
                                    <AlertCircle className="h-20 w-20 mx-auto text-amber-300 mb-4" />
                                ) : result?.wrongDay ? (
                                    <CalendarX className="h-20 w-20 mx-auto text-blue-300 mb-4" />
                                ) : (
                                    <XCircle className="h-20 w-20 mx-auto text-red-300 mb-4" />
                                )}
                                <CardTitle className="text-3xl font-bold text-white">
                                    {result?.valid 
                                        ? 'Access Granted' 
                                        : result?.alreadyCheckedIn 
                                            ? 'Already Checked In'
                                            : result?.wrongDay
                                                ? 'Wrong Day'
                                                : 'Access Denied'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 text-center">
                                {result?.valid ? (
                                    <div className="space-y-2">
                                        <div>
                                            <h3 className="font-bold text-2xl text-white tracking-wide">{result.personName || "Unknown"}</h3>
                                            {isEventMode && result.ticketNumber && (
                                                <p className="text-lg text-green-100">Ticket #{result.ticketNumber}</p>
                                            )}
                                            {!isEventMode && result.periodName && (
                                                <p className="text-lg text-green-100">{result.periodName}</p>
                                            )}
                                        </div>

                                        {!isEventMode && result.course ? (
                                            <div className="bg-green-800 p-4 rounded-lg border border-green-600">
                                                <p className="font-semibold text-lg text-white">{result.course}</p>
                                            </div>
                                        ) : isEventMode && result.eventTitle ? (
                                            <div className="bg-green-800 p-4 rounded-lg border border-green-600">
                                                <p className="font-semibold text-lg text-white">{result.eventTitle}</p>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : result?.alreadyCheckedIn ? (
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-xl text-white">{result.personName}</h3>
                                        <p className="text-lg text-amber-100">{result?.message}</p>
                                    </div>
                                ) : result?.wrongDay ? (
                                    <p className="text-xl text-blue-100 font-medium">{result?.message}</p>
                                ) : (
                                    <p className="text-xl text-red-100 font-medium">{result?.message}</p>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button onClick={reset} size="lg" className="w-full h-14 text-lg font-semibold bg-white text-black hover:bg-slate-200">
                                    <RotateCcw className="mr-2 h-5 w-5" />
                                    Scan Next
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                </div>
            )}

            {/* ─── MANUAL CHECK-IN DIALOG ─── */}
            <Dialog open={isManualDialogOpen} onOpenChange={open => { if (!open) closeManualDialog() }}>
                <DialogContent className="max-w-sm">
                    {manualCheckIn.phase === 'confirming' && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Manual Check-In</DialogTitle>
                                <DialogDescription asChild>
                                    <p className="text-rn-text-muted">Check in <span className="font-bold text-rn-text">{manualCheckIn.entry.personName}</span> without a QR code?</p>
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="flex-row gap-2 sm:flex-row">
                                <Button variant="outline" className="flex-1" onClick={closeManualDialog}>
                                    Cancel
                                </Button>
                                <Button className="flex-1" onClick={confirmManualCheckIn}>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Confirm
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                    {manualCheckIn.phase === 'loading' && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
                            <p className="text-sm text-muted-foreground">Checking in...</p>
                        </div>
                    )}
                    {manualCheckIn.phase === 'success' && (
                        <>
                            <DialogHeader>
                                <div className="flex flex-col items-center gap-3 py-2">
                                    <CheckCircle2 className="h-14 w-14 text-green-500" />
                                    <DialogTitle className="text-xl">Checked In</DialogTitle>
                                    <DialogDescription className="text-center text-base">
                                        <span className="font-semibold text-foreground">{manualCheckIn.personName}</span> has been manually checked in.
                                    </DialogDescription>
                                </div>
                            </DialogHeader>
                            <DialogFooter>
                                <Button className="w-full" onClick={closeManualDialog}>Done</Button>
                            </DialogFooter>
                        </>
                    )}
                    {manualCheckIn.phase === 'error' && (
                        <>
                            <DialogHeader>
                                <div className="flex flex-col items-center gap-3 py-2">
                                    <XCircle className="h-14 w-14 text-red-500" />
                                    <DialogTitle className="text-xl">Check-In Failed</DialogTitle>
                                    <DialogDescription className="text-center">
                                        {manualCheckIn.message}
                                    </DialogDescription>
                                </div>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" className="w-full" onClick={closeManualDialog}>Close</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* ─── UNDO CHECK-IN DIALOG ─── */}
            <Dialog open={isUndoDialogOpen} onOpenChange={open => { if (!open) closeUndoDialog() }}>
                <DialogContent className="max-w-sm">
                    {undoCheckIn.phase === 'confirming' && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Undo Check-In</DialogTitle>
                                <DialogDescription asChild>
                                    <p className="text-rn-text-muted">Remove check-in for <span className="font-bold text-rn-text">{undoCheckIn.entry.personName}</span>?</p>
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="flex-row gap-2 sm:flex-row">
                                <Button variant="outline" className="flex-1" onClick={closeUndoDialog}>
                                    Cancel
                                </Button>
                                <Button variant="destructive" className="flex-1" onClick={confirmUndoCheckIn}>
                                    <Undo2 className="mr-2 h-4 w-4" />
                                    Undo
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                    {undoCheckIn.phase === 'loading' && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
                            <p className="text-sm text-muted-foreground">Removing check-in...</p>
                        </div>
                    )}
                    {undoCheckIn.phase === 'success' && (
                        <>
                            <DialogHeader>
                                <div className="flex flex-col items-center gap-3 py-2">
                                    <CheckCircle2 className="h-14 w-14 text-green-500" />
                                    <DialogTitle className="text-xl">Check-In Removed</DialogTitle>
                                    <DialogDescription className="text-center text-base">
                                        <span className="font-semibold text-foreground">{undoCheckIn.personName}</span>&apos;s check-in has been removed.
                                    </DialogDescription>
                                </div>
                            </DialogHeader>
                            <DialogFooter>
                                <Button className="w-full" onClick={closeUndoDialog}>Done</Button>
                            </DialogFooter>
                        </>
                    )}
                    {undoCheckIn.phase === 'error' && (
                        <>
                            <DialogHeader>
                                <div className="flex flex-col items-center gap-3 py-2">
                                    <XCircle className="h-14 w-14 text-red-500" />
                                    <DialogTitle className="text-xl">Undo Failed</DialogTitle>
                                    <DialogDescription className="text-center">
                                        {undoCheckIn.message}
                                    </DialogDescription>
                                </div>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" className="w-full" onClick={closeUndoDialog}>Close</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

