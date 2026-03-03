'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, XCircle, ScanLine, Phone, RotateCcw, Loader2 } from 'lucide-react'

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
}

type Props = {
    trackId: string
}

const weekdayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function SelfCheckInScanner({ trackId }: Props) {
    const [track, setTrack] = useState<TrackInfo | null>(null)
    const [loadingTrack, setLoadingTrack] = useState(true)
    const [trackError, setTrackError] = useState<string | null>(null)

    const [mode, setMode] = useState<'qr' | 'phone'>('qr')
    const [result, setResult] = useState<CheckInResult | null>(null)
    const [loading, setLoading] = useState(false)

    // Phone form
    const [phoneInput, setPhoneInput] = useState('')

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

    // QR Scanner setup
    useEffect(() => {
        if (mode !== 'qr' || result || loadingTrack || !!trackError) return

        const scannerId = 'self-checkin-qr-reader'
        const scanner = new Html5QrcodeScanner(scannerId, {
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
    }, [mode, result, loadingTrack, trackError, doCheckIn])

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
            <div className="flex-1 flex items-center justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    // Track error
    if (trackError || !track) {
        return (
            <div className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-sm border-slate-700">
                    <CardContent className="pt-6 text-center space-y-2">
                        <XCircle className="h-12 w-12 text-red-400 mx-auto" />
                        <p className="text-slate-300">{trackError || 'Unknown error'}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Result screen
    if (result) {
        const isSuccess = result.valid || result.alreadyCheckedIn
        return (
            <div className="flex-1 flex items-center justify-center p-4">
                <Card className={`w-full max-w-sm border-slate-700 ${isSuccess ? 'border-green-700' : 'border-red-700'}`}>
                    <CardContent className="pt-6 text-center space-y-4">
                        {result.valid ? (
                            <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto" />
                        ) : result.alreadyCheckedIn ? (
                            <CheckCircle2 className="h-16 w-16 text-yellow-400 mx-auto" />
                        ) : (
                            <XCircle className="h-16 w-16 text-red-400 mx-auto" />
                        )}
                        {result.personName && (
                            <p className="text-xl font-semibold text-white">{result.personName}</p>
                        )}
                        <p className={`text-sm ${result.valid ? 'text-green-300' : result.alreadyCheckedIn ? 'text-yellow-300' : 'text-red-300'}`}>
                            {result.message}
                        </p>
                        <Button
                            variant="outline"
                            onClick={reset}
                            className="w-full border-slate-600 mt-2"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Check in another
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col items-center p-4 gap-4">
            {/* Track header */}
            <Card className="w-full max-w-sm border-slate-700">
                <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-base text-center text-white">{track.title}</CardTitle>
                    <p className="text-xs text-slate-400 text-center">
                        {track.periodName} · {weekdayNames[track.weekday] ?? ''} {track.timeStart}
                    </p>
                </CardHeader>
            </Card>

            {/* Mode toggle */}
            <div className="flex gap-2 w-full max-w-sm">
                <Button
                    variant={mode === 'qr' ? 'default' : 'outline'}
                    className={`flex-1 ${mode !== 'qr' ? 'border-slate-600 text-slate-300' : ''}`}
                    onClick={() => { setMode('qr'); reset() }}
                >
                    <ScanLine className="h-4 w-4 mr-2" />
                    Scan QR
                </Button>
                <Button
                    variant={mode === 'phone' ? 'default' : 'outline'}
                    className={`flex-1 ${mode !== 'phone' ? 'border-slate-600 text-slate-300' : ''}`}
                    onClick={() => { setMode('phone'); reset() }}
                >
                    <Phone className="h-4 w-4 mr-2" />
                    Phone number
                </Button>
            </div>

            {/* QR Scanner */}
            {mode === 'qr' && !loading && (
                <Card className="w-full max-w-sm border-slate-700">
                    <CardContent className="pt-4">
                        <div id="self-checkin-qr-reader" className="w-full" />
                        <p className="text-xs text-slate-400 text-center mt-2">
                            Scan the QR code from your course ticket
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Phone number form */}
            {mode === 'phone' && (
                <Card className="w-full max-w-sm border-slate-700">
                    <CardContent className="pt-4">
                        <form onSubmit={handlePhoneSubmit} className="space-y-3">
                            <div className="space-y-1">
                                <Label htmlFor="phone" className="text-slate-300">Your phone number</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="+47 900 00 000"
                                    value={phoneInput}
                                    onChange={e => setPhoneInput(e.target.value)}
                                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                                    autoFocus
                                />
                            </div>
                            <Button
                                type="submit"
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
                        <p className="text-xs text-slate-500 text-center mt-3">
                            Enter the phone number you registered with
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Loading overlay for QR mode */}
            {mode === 'qr' && loading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
            )}
        </div>
    )
}
