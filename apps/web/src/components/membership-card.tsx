'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { Download, Wallet, Maximize2, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

interface MembershipCardProps {
    membership: {
        id: string
        memberNumber: string | null
        validFrom: Date
        validTo: Date
        status: string
        verificationToken: string | null
        tier: {
            name: string
            slug: string
        }
        organizer: {
            name: string
        }
        person: {
            firstName: string
            lastName: string
            photoUrl: string | null
        }
    }
}

// Tier color mapping
const tierColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    normal: {
        bg: 'bg-gradient-to-br from-slate-600 to-slate-800',
        border: 'border-slate-400',
        text: 'text-white',
        badge: 'bg-slate-100 text-slate-800'
    },
    supporting: {
        bg: 'bg-gradient-to-br from-blue-600 to-blue-800',
        border: 'border-blue-400',
        text: 'text-white',
        badge: 'bg-blue-100 text-blue-800'
    },
    family: {
        bg: 'bg-gradient-to-br from-green-600 to-green-800',
        border: 'border-green-400',
        text: 'text-white',
        badge: 'bg-green-100 text-green-800'
    },
    honorary: {
        bg: 'bg-gradient-to-br from-purple-600 to-purple-800',
        border: 'border-purple-400',
        text: 'text-white',
        badge: 'bg-purple-100 text-purple-800'
    },
    vip: {
        bg: 'bg-gradient-to-br from-amber-500 to-amber-700',
        border: 'border-amber-300',
        text: 'text-white',
        badge: 'bg-amber-100 text-amber-800'
    },
    board: {
        bg: 'bg-gradient-to-br from-red-600 to-red-800',
        border: 'border-red-400',
        text: 'text-white',
        badge: 'bg-red-100 text-red-800'
    }
}

// Default color for unknown tiers
const defaultColor = {
    bg: 'bg-gradient-to-br from-gray-600 to-gray-800',
    border: 'border-gray-400',
    text: 'text-white',
    badge: 'bg-gray-100 text-gray-800'
}

export function MembershipCard({ membership }: MembershipCardProps) {
    const [downloadingApple, setDownloadingApple] = useState(false)
    const [downloadingGoogle, setDownloadingGoogle] = useState(false)
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
    const [fullscreen, setFullscreen] = useState(false)
    const [qrEnlarged, setQrEnlarged] = useState(false)
    
    const colors = tierColors[membership.tier.slug] || defaultColor
    const membershipYear = new Date(membership.validFrom).getFullYear()

    // Generate QR code for verification
    useEffect(() => {
        if (membership.verificationToken) {
            const verificationUrl = `${window.location.origin}/verify/membership/${membership.verificationToken}`
            QRCode.toDataURL(verificationUrl, {
                width: 200,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            }).then(setQrCodeDataUrl).catch(console.error)
        }
    }, [membership.verificationToken])

    const handleDownloadAppleWallet = async () => {
        setDownloadingApple(true)
        // TODO: Implement Apple Wallet pass generation
        // This would typically call an API endpoint that generates a .pkpass file
        await new Promise(resolve => setTimeout(resolve, 1000))
        alert('Apple Wallet functionality coming soon!')
        setDownloadingApple(false)
    }

    const handleDownloadGoogleWallet = async () => {
        setDownloadingGoogle(true)
        // TODO: Implement Google Wallet pass generation
        // This would typically generate a JWT and redirect to Google Wallet
        await new Promise(resolve => setTimeout(resolve, 1000))
        alert('Google Wallet functionality coming soon!')
        setDownloadingGoogle(false)
    }

    return (
        <>
            <Card className={`overflow-hidden border-2 ${colors.border} relative`}>
                {/* Fullscreen Toggle Button (Mobile) */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 z-10 md:hidden bg-black/20 hover:bg-black/40 text-white"
                    onClick={() => setFullscreen(true)}
                >
                    <Maximize2 className="h-4 w-4" />
                </Button>

                <div className={`${colors.bg} ${colors.text} p-6`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                            <div className="text-xs opacity-80 mb-1">MEMBERSHIP CARD</div>
                            <h3 className="text-2xl font-bold">{membership.organizer.name}</h3>
                        </div>
                        <Badge className={colors.badge}>
                            {membership.tier.name}
                        </Badge>
                    </div>

                <div className="flex gap-4 items-center mb-4">
                    {membership.person.photoUrl && (
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/50">
                            <img 
                                src={membership.person.photoUrl} 
                                alt={`${membership.person.firstName} ${membership.person.lastName}`}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <div className="flex-1">
                        <div className="text-xs opacity-80">MEMBER</div>
                        <div className="text-xl font-bold">
                            {membership.person.firstName} {membership.person.lastName}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                        <div className="text-xs opacity-80">MEMBER NUMBER</div>
                        <div className="text-lg font-mono font-bold">
                            {membership.memberNumber || 'Not assigned'}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs opacity-80">MEMBERSHIP YEAR</div>
                        <div className="text-lg font-bold">{membershipYear}</div>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <div className="text-xs opacity-80">ACTIVATED</div>
                            <div className="font-semibold">{format(membership.validFrom, 'dd.MM.yyyy')}</div>
                        </div>
                        <div>
                            <div className="text-xs opacity-80">VALID UNTIL</div>
                            <div className="font-semibold">{format(membership.validTo, 'dd.MM.yyyy')}</div>
                        </div>
                        {qrCodeDataUrl && (
                            <div className="flex justify-end">
                                <div 
                                    className="bg-white p-1 rounded cursor-pointer hover:ring-2 hover:ring-white/50 transition-all"
                                    onClick={() => setQrEnlarged(true)}
                                    title="Click to enlarge QR code"
                                >
                                    <img src={qrCodeDataUrl} alt="Verification QR" className="w-16 h-16" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CardContent className="p-4 space-y-2">
                <div className="text-xs text-muted-foreground text-center mb-2">
                    Download to mobile wallet
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadAppleWallet}
                        disabled={downloadingApple}
                        className="w-full"
                    >
                        <Wallet className="h-4 w-4 mr-2" />
                        {downloadingApple ? 'Loading...' : 'Apple Wallet'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadGoogleWallet}
                        disabled={downloadingGoogle}
                        className="w-full"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        {downloadingGoogle ? 'Loading...' : 'Google Wallet'}
                    </Button>
                </div>
            </CardContent>
        </Card>

        {/* Fullscreen Modal */}
        <Dialog open={fullscreen} onOpenChange={setFullscreen}>
            <DialogContent className="!h-[100dvh] !w-screen !max-w-none !rounded-none !border-0 !p-0 !gap-0 !left-0 !top-0 !translate-x-0 !translate-y-0 sm:!h-auto sm:!max-h-[90vh] sm:!w-full sm:!max-w-md sm:!left-[50%] sm:!top-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:!rounded-lg sm:!border overflow-y-auto" showCloseButton={false}>
                <DialogTitle className="sr-only">Membership Card</DialogTitle>
                <div className={`${colors.bg} ${colors.text} min-h-full p-4 sm:p-8`}>
                    <div className="flex justify-between items-start mb-3 sticky top-0 bg-inherit pb-3 z-10">
                        <div className="flex-1">
                            <div className="text-xs opacity-80 mb-1">MEMBERSHIP CARD</div>
                            <h3 className="text-xl sm:text-2xl font-bold">{membership.organizer.name}</h3>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20 shrink-0 -mt-1 -mr-1"
                            onClick={() => setFullscreen(false)}
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>

                    <div className="flex flex-col items-center gap-3 mb-3">
                        <Badge className={`${colors.badge} text-base px-4 py-1`}>
                            {membership.tier.name}
                        </Badge>
                        
                        {qrCodeDataUrl && (
                            <div 
                                className="bg-white p-2 rounded-lg cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setQrEnlarged(true)}
                            >
                                <img src={qrCodeDataUrl} alt="Verification QR" className="w-44 h-44 sm:w-48 sm:h-48" />
                            </div>
                        )}
                    </div>

                    {membership.person.photoUrl && (
                        <div className="flex justify-center mb-3">
                            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white/50">
                                <img 
                                    src={membership.person.photoUrl} 
                                    alt={`${membership.person.firstName} ${membership.person.lastName}`}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    )}

                    <div className="text-center mb-3">
                        <div className="text-sm opacity-80 mb-1">MEMBER</div>
                        <div className="text-2xl font-bold">
                            {membership.person.firstName} {membership.person.lastName}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="text-center">
                            <div className="text-xs opacity-80 mb-1">MEMBER NUMBER</div>
                            <div className="text-sm font-mono font-bold break-all">
                                {membership.memberNumber || 'Not assigned'}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs opacity-80 mb-1">MEMBERSHIP YEAR</div>
                            <div className="text-sm font-bold">{membershipYear}</div>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-white/20">
                        <div className="flex justify-between text-base">
                            <div>
                                <div className="text-xs opacity-80 mb-1">ACTIVATED</div>
                                <div className="font-semibold">{format(membership.validFrom, 'dd.MM.yyyy')}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs opacity-80 mb-1">VALID UNTIL</div>
                                <div className="font-semibold">{format(membership.validTo, 'dd.MM.yyyy')}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        {/* Enlarged QR Code Modal */}
        <Dialog open={qrEnlarged} onOpenChange={setQrEnlarged}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Scan Membership QR Code</DialogTitle>
                </DialogHeader>
                <div className="flex justify-center p-6">
                    {qrCodeDataUrl && (
                        <div className="bg-white p-4 rounded-lg">
                            <img src={qrCodeDataUrl} alt="Verification QR" className="w-64 h-64" />
                        </div>
                    )}
                </div>
                <p className="text-sm text-center text-muted-foreground">
                    Scan this QR code to verify membership
                </p>
            </DialogContent>
        </Dialog>
    </>
    )
}
