'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeDisplayProps {
    token: string
    size?: number
    className?: string
}

export function QRCodeDisplay({ token, size = 200, className = '' }: QRCodeDisplayProps) {
    const [qrDataURL, setQRDataURL] = useState<string>('')
    const [error, setError] = useState<string>('')

    useEffect(() => {
        async function generateQR() {
            try {
                const dataURL = await QRCode.toDataURL(token, {
                    errorCorrectionLevel: 'H',
                    type: 'image/png',
                    width: size,
                    margin: 2,
                })
                setQRDataURL(dataURL)
            } catch (err) {
                console.error('Failed to generate QR code:', err)
                setError('Failed to generate QR code')
            }
        }

        generateQR()
    }, [token, size])

    if (error) {
        return <div className={`text-red-500 ${className}`}>{error}</div>
    }

    if (!qrDataURL) {
        return <div className={className}>Generating QR code...</div>
    }

    return (
        <img 
            src={qrDataURL} 
            alt="QR Code" 
            className={className}
            style={{ width: size, height: size }}
        />
    )
}
