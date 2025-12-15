
'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react'

type ScanResult = {
    valid: boolean
    message?: string
    personName?: string
    courses?: string
    periodName?: string
}

export default function CheckinPage() {
    const [result, setResult] = useState<ScanResult | null>(null)
    const [scanning, setScanning] = useState(true)
    const [verifying, setVerifying] = useState(false)
    const scannerRef = useRef<Html5QrcodeScanner | null>(null)
    const isMounted = useRef(false)

    useEffect(() => {
        isMounted.current = true
        return () => { isMounted.current = false }
    }, [])

    useEffect(() => {
        // Cleaning up scanner when we stop scanning
        if (!scanning) {
            if (scannerRef.current) {
                try {
                    scannerRef.current.clear().catch(err => {
                        console.error("Failed to clear scanner", err)
                    })
                } catch (e) {
                    console.error("Error clearing scanner", e)
                }
                scannerRef.current = null
            }
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

                scanner.render(onScanSuccess, (err) => {
                    // ignore scan failures
                })
            } catch (e) {
                console.error("Scanner init error", e)
            }
        }, 300)

        return () => {
            clearTimeout(timeout)
            if (scannerRef.current) {
                try {
                    scannerRef.current.clear().catch(() => { })
                } catch (e) { }
                scannerRef.current = null
            }
        }
    }, [scanning])

    async function onScanSuccess(decodedText: string) {
        if (!isMounted.current || verifying) return

        // Immediately stop scanning UI to prevent double-scan
        setVerifying(true)
        // We do NOT setScanning(false) yet, we wait until we have a result
        // actually, we should probably hide the scanner to stop it processing

        try {
            if (scannerRef.current) {
                await scannerRef.current.pause(true)
            }
        } catch (e) { }

        try {
            const res = await fetch('/api/tickets/validate', {
                method: 'POST',
                body: JSON.stringify({ token: decodedText })
            })
            const data = await res.json()

            if (isMounted.current) {
                setResult(data)
                setScanning(false) // This switches views
            }
        } catch (e) {
            if (isMounted.current) {
                setResult({ valid: false, message: 'Network error' })
                setScanning(false)
            }
        } finally {
            if (isMounted.current) {
                setVerifying(false)
            }
        }
    }

    function reset() {
        setResult(null)
        setVerifying(false)
        setScanning(true)
    }

    if (verifying && scanning) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="flex flex-col items-center space-y-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-white"></div>
                    <h2 className="text-xl font-semibold text-white">Verifying Ticket...</h2>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
            {scanning ? (
                <div className="w-full max-w-md space-y-4 text-center">
                    <h2 className="text-xl font-semibold text-white">Ready to Scan</h2>
                    <div id="reader" className="overflow-hidden rounded-lg border-2 border-slate-700 bg-black"></div>
                    <p className="text-sm text-slate-400">Point camera at QR code</p>
                </div>
            ) : (
                <Card className={`w-full max-w-md border-2 ${result?.valid ? 'border-green-500 bg-green-950/30' : 'border-red-500 bg-red-950/30'}`}>
                    <CardHeader className="text-center pb-2">
                        {result?.valid ? (
                            <CheckCircle2 className="h-20 w-20 mx-auto text-green-400 mb-4" />
                        ) : (
                            <XCircle className="h-20 w-20 mx-auto text-red-400 mb-4" />
                        )}
                        <CardTitle className={`text-3xl font-bold ${result?.valid ? 'text-green-400' : 'text-red-400'}`}>
                            {result?.valid ? 'Access Granted' : 'Access Denied'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 text-center">
                        {result?.valid ? (
                            <div className="space-y-2">
                                <div>
                                    <h3 className="font-bold text-2xl text-white tracking-wide">{result.personName || "Unknown Name"}</h3>
                                    <p className="text-lg text-slate-300">{result.periodName}</p>
                                </div>

                                {result.courses ? (
                                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                        <p className="font-semibold text-lg text-blue-200">{result.courses}</p>
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic">No course info</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-xl text-red-300 font-medium">{result?.message}</p>
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
    )
}
