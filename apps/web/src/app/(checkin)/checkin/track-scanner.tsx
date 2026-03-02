'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, RotateCcw, ChevronLeft, AlertCircle, CalendarX } from 'lucide-react'

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
    const scannerRef = useRef<Html5QrcodeScanner | null>(null)
    const isMounted = useRef(false)
    const isTransitioning = useRef(false)

    const isEventMode = !!eventId

    useEffect(() => {
        isMounted.current = true
        return () => { isMounted.current = false }
    }, [])

    // Safe scanner cleanup that handles transition states
    const cleanupScanner = async () => {
        if (!scannerRef.current) return
        
        // Wait a bit if we're in a transition
        if (isTransitioning.current) {
            await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        try {
            isTransitioning.current = true
            await scannerRef.current.clear()
        } catch (e) {
            // Ignore transition errors - scanner will be garbage collected
        } finally {
            isTransitioning.current = false
            scannerRef.current = null
        }
    }

    useEffect(() => {
        // Cleaning up scanner when we stop scanning
        if (!scanning) {
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

                scanner.render(onScanSuccess, () => {
                    // ignore scan failures silently
                })
            } catch (e) {
                console.error("Scanner init error", e)
            }
        }, 300)

        return () => {
            clearTimeout(timeout)
            // Don't await cleanup on unmount - let it happen async
            cleanupScanner()
        }
    }, [scanning])

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

    function reset() {
        setResult(null)
        setVerifying(false)
        isTransitioning.current = false
        setScanning(true)
    }

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
                <div className="w-32"></div>
            </div>

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
        </div>
    )
}
