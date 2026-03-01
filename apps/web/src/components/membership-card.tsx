'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDateNumeric } from '@/lib/formatters'
import { Download, Wallet, Maximize2, X } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
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
            accentColor?: string | null  // Custom accent color (hex)
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

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        }
        : null
}

/**
 * Calculate relative luminance for WCAG contrast calculations
 */
function getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Determine if text should be light or dark based on background color
 * Returns true if light text (white) should be used
 */
function shouldUseLightText(hexColor: string): boolean {
    const rgb = hexToRgb(hexColor)
    if (!rgb) return true
    const luminance = getLuminance(rgb.r, rgb.g, rgb.b)
    return luminance < 0.5
}

/**
 * Darken a hex color by a percentage (for gradient)
 */
function darkenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex)
    if (!rgb) return hex
    const factor = 1 - percent / 100
    const r = Math.round(rgb.r * factor)
    const g = Math.round(rgb.g * factor)
    const b = Math.round(rgb.b * factor)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Lighten a hex color (for badge background)
 */
function lightenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex)
    if (!rgb) return hex
    const factor = percent / 100
    const r = Math.round(rgb.r + (255 - rgb.r) * factor)
    const g = Math.round(rgb.g + (255 - rgb.g) * factor)
    const b = Math.round(rgb.b + (255 - rgb.b) * factor)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// Tier color mapping (fallback for tiers without custom accentColor)
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
    
    // Calculate colors - prefer custom accentColor, then fallback to tier slug mapping
    const { colors, customStyles } = useMemo(() => {
        const accentColor = membership.tier.accentColor
        
        if (accentColor && /^#[0-9A-Fa-f]{6}$/.test(accentColor)) {
            // Custom accent color provided - generate matching colors
            const useLightText = shouldUseLightText(accentColor)
            const darkerColor = darkenColor(accentColor, 25)
            const badgeBg = lightenColor(accentColor, 85)
            const badgeText = darkenColor(accentColor, 30)
            
            return {
                colors: null, // Signal to use custom styles instead
                customStyles: {
                    cardBg: `linear-gradient(to bottom right, ${accentColor}, ${darkerColor})`,
                    borderColor: accentColor,
                    textColor: useLightText ? '#ffffff' : '#1f2937',
                    badgeBg: badgeBg,
                    badgeText: badgeText,
                }
            }
        }
        
        return {
            colors: tierColors[membership.tier.slug] || defaultColor,
            customStyles: null
        }
    }, [membership.tier.accentColor, membership.tier.slug])
    
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
        try {
            // Trigger download of .pkpass file
            const link = document.createElement('a')
            link.href = `/api/memberships/${membership.id}/wallet/apple`
            link.download = `membership-${membership.memberNumber || membership.id}.pkpass`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (error) {
            console.error('Failed to download Apple Wallet pass:', error)
            alert('Failed to generate Apple Wallet pass. Please try again.')
        } finally {
            setDownloadingApple(false)
        }
    }

    const handleDownloadGoogleWallet = async () => {
        setDownloadingGoogle(true)
        try {
            const response = await fetch(`/api/memberships/${membership.id}/wallet/google`)
            if (response.ok) {
                const { saveUrl } = await response.json()
                window.open(saveUrl, '_blank')
            } else {
                const error = await response.json()
                console.error('Failed to generate Google Wallet pass:', error)
                alert('Failed to generate Google Wallet pass. Please try again.')
            }
        } catch (error) {
            console.error('Error:', error)
            alert('An error occurred. Please try again.')
        } finally {
            setDownloadingGoogle(false)
        }
    }

    return (
        <>
            <Card 
                className={`overflow-hidden border-2 relative !py-0 !gap-0 ${colors ? colors.border : ''}`}
                style={customStyles ? { borderColor: customStyles.borderColor } : undefined}
            >
                {/* Fullscreen Toggle Button (Mobile) */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 z-10 md:hidden bg-black/20 hover:bg-black/40 text-white"
                    onClick={() => setFullscreen(true)}
                >
                    <Maximize2 className="h-4 w-4" />
                </Button>

                <div 
                    className={`p-6 ${colors ? `${colors.bg} ${colors.text}` : ''}`}
                    style={customStyles ? { 
                        background: customStyles.cardBg, 
                        color: customStyles.textColor 
                    } : undefined}
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                            <div className="text-xs opacity-80 mb-1">MEMBERSHIP CARD</div>
                            <h3 className="text-2xl font-bold">{membership.organizer.name}</h3>
                        </div>
                        <Badge 
                            className={colors ? colors.badge : ''}
                            style={customStyles ? { 
                                backgroundColor: customStyles.badgeBg, 
                                color: customStyles.badgeText 
                            } : undefined}
                        >
                            {membership.tier.name}
                        </Badge>
                    </div>

                <div className="flex gap-4 items-center mb-4">
                    {membership.person.photoUrl && (
                        <div 
                            className={`w-20 h-20 rounded-full overflow-hidden border-2 ${!customStyles ? 'border-white/50' : ''}`}
                            style={customStyles ? { borderColor: 'rgba(255,255,255,0.5)' } : undefined}
                        >
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
                            <div className="font-semibold">{formatDateNumeric(membership.validFrom)}</div>
                        </div>
                        <div>
                            <div className="text-xs opacity-80">VALID UNTIL</div>
                            <div className="font-semibold">{formatDateNumeric(membership.validTo)}</div>
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
                <div 
                    className={`min-h-full p-4 sm:p-8 ${colors ? `${colors.bg} ${colors.text}` : ''}`}
                    style={customStyles ? { 
                        background: customStyles.cardBg, 
                        color: customStyles.textColor 
                    } : undefined}
                >
                    <div className="flex justify-between items-start mb-3 sticky top-0 bg-inherit pb-3 z-10">
                        <div className="flex-1">
                            <div className="text-xs opacity-80 mb-1">MEMBERSHIP CARD</div>
                            <h3 className="text-xl sm:text-2xl font-bold">{membership.organizer.name}</h3>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`hover:bg-white/20 shrink-0 -mt-1 -mr-1 ${!customStyles ? 'text-white' : ''}`}
                            style={customStyles ? { color: customStyles.textColor } : undefined}
                            onClick={() => setFullscreen(false)}
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>

                    <div className="flex flex-col items-center gap-3 mb-3">
                        <Badge 
                            className={`text-base px-4 py-1 ${colors ? colors.badge : ''}`}
                            style={customStyles ? { 
                                backgroundColor: customStyles.badgeBg, 
                                color: customStyles.badgeText 
                            } : undefined}
                        >
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
                            <div 
                                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 ${!customStyles ? 'border-white/50' : ''}`}
                                style={customStyles ? { borderColor: 'rgba(255,255,255,0.5)' } : undefined}
                            >
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
                                <div className="font-semibold">{formatDateNumeric(membership.validFrom)}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs opacity-80 mb-1">VALID UNTIL</div>
                                <div className="font-semibold">{formatDateNumeric(membership.validTo)}</div>
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
