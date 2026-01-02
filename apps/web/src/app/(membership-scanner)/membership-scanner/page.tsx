'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, RotateCcw, User, Building2, Calendar, Hash } from 'lucide-react'

type MembershipScanResult = {
    valid: boolean
    message?: string
    personName?: string
    organizerName?: string
    tierName?: string
    memberNumber?: string
    validFrom?: string
    validTo?: string
    status?: string
    photoUrl?: string
}

export default function MembershipScannerPage() {
    const [result, setResult] = useState<MembershipScanResult | null>(null)
    const [scanning, setScanning] = useState(true)
    const [verifying, setVerifying] = useState(false)
    const scannerRef = useRef<Html5QrcodeScanner | null>(null)
    const isMounted = useRef(false)

    useEffect(() => {
        isMounted.current = true
        return () => { isMounted.current = false }
    }, [])

    useEffect(() => {
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
            if (!document.getElementById("membership-reader") || !isMounted.current) return
            if (scannerRef.current) return

            try {
                const scanner = new Html5QrcodeScanner(
                    "membership-reader",
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    false
                )
                scannerRef.current = scanner

                scanner.render(onScanSuccess, () => {
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

    const onScanSuccess = async (decodedText: string) => {
        if (verifying) return
        
        setScanning(false)
        setVerifying(true)

        try {
            // Extract token from URL or use directly
            let token = decodedText
            if (decodedText.includes('/verify/membership/')) {
                const parts = decodedText.split('/verify/membership/')
                token = parts[1]?.split('?')[0] || decodedText
            }

            const response = await fetch(`/api/verify-membership/${token}`)
            const data = await response.json()

            if (response.ok && data.valid) {
                setResult({
                    valid: true,
                    personName: data.personName,
                    organizerName: data.organizerName,
                    tierName: data.tierName,
                    memberNumber: data.memberNumber,
                    validFrom: data.validFrom,
                    validTo: data.validTo,
                    status: data.status,
                    photoUrl: data.photoUrl
                })
            } else {
                setResult({
                    valid: false,
                    message: data.message || 'Invalid membership'
                })
            }
        } catch (error) {
            console.error('Verification error:', error)
            setResult({
                valid: false,
                message: 'Failed to verify membership'
            })
        } finally {
            setVerifying(false)
        }
    }

    const resetScanner = () => {
        setResult(null)
        setScanning(true)
    }

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <Card className="border-slate-700">
                <CardHeader>
                    <CardTitle className="text-center text-2xl">Membership Scanner</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {scanning && (
                        <div>
                            <div id="membership-reader" className="rounded-lg overflow-hidden"></div>
                            {verifying && (
                                <div className="text-center mt-4 text-slate-400">
                                    Verifying membership...
                                </div>
                            )}
                        </div>
                    )}

                    {result && (
                        <div className="space-y-4">
                            <Card className={`${
                                result.valid 
                                    ? 'border-green-500 bg-green-950/20' 
                                    : 'border-red-500 bg-red-950/20'
                            }`}>
                                <CardHeader className="text-center pb-4">
                                    <div className="flex justify-center mb-3">
                                        {result.valid ? (
                                            <CheckCircle2 className="h-16 w-16 text-green-500" />
                                        ) : (
                                            <XCircle className="h-16 w-16 text-red-500" />
                                        )}
                                    </div>
                                    <CardTitle className={`text-2xl ${
                                        result.valid ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                        {result.valid ? 'Valid Membership' : 'Invalid Membership'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {result.valid ? (
                                        <>
                                            {result.photoUrl && (
                                                <div className="flex justify-center mb-4">
                                                    <img 
                                                        src={result.photoUrl} 
                                                        alt={result.personName}
                                                        className="w-32 h-32 rounded-full object-cover border-4 border-slate-700"
                                                    />
                                                </div>
                                            )}
                                            
                                            <div className="space-y-3 text-slate-200">
                                                <div className="flex items-center gap-3">
                                                    <User className="h-5 w-5 text-slate-400" />
                                                    <div>
                                                        <div className="text-xs text-slate-400">Member</div>
                                                        <div className="font-semibold text-lg">{result.personName}</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <Building2 className="h-5 w-5 text-slate-400" />
                                                    <div>
                                                        <div className="text-xs text-slate-400">Organization</div>
                                                        <div className="font-medium">{result.organizerName}</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className="text-sm">
                                                        {result.tierName}
                                                    </Badge>
                                                </div>

                                                {result.memberNumber && (
                                                    <div className="flex items-center gap-3">
                                                        <Hash className="h-5 w-5 text-slate-400" />
                                                        <div>
                                                            <div className="text-xs text-slate-400">Member Number</div>
                                                            <div className="font-mono">{result.memberNumber}</div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-3">
                                                    <Calendar className="h-5 w-5 text-slate-400" />
                                                    <div>
                                                        <div className="text-xs text-slate-400">Valid Period</div>
                                                        <div className="text-sm">
                                                            {result.validFrom} - {result.validTo}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-2">
                                                    <Badge variant="default" className="bg-green-600">
                                                        {result.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center text-red-400">
                                            {result.message || 'Membership not found or invalid'}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Button 
                                onClick={resetScanner}
                                className="w-full"
                                size="lg"
                            >
                                <RotateCcw className="h-5 w-5 mr-2" />
                                Scan Next
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
