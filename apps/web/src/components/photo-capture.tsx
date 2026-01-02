'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Camera, Upload, X, AlertCircle } from 'lucide-react'

interface PhotoCaptureProps {
    onPhotoCapture: (photoDataUrl: string) => void
    currentPhoto?: string | null
}

export function PhotoCapture({ onPhotoCapture, currentPhoto }: PhotoCaptureProps) {
    const [photoPreview, setPhotoPreview] = useState<string | null>(currentPhoto || null)
    const [capturing, setCapturing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const [stream, setStream] = useState<MediaStream | null>(null)

    const startCamera = async () => {
        setError(null)
        setCapturing(true)
        
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' }, 
                audio: false 
            })
            setStream(mediaStream)
            
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream
            }
        } catch (err) {
            setError('Unable to access camera. Please use file upload instead.')
            setCapturing(false)
            console.error('Camera error:', err)
        }
    }

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
        }
        setCapturing(false)
    }

    const capturePhoto = () => {
        if (videoRef.current) {
            const video = videoRef.current
            const videoWidth = video.videoWidth
            const videoHeight = video.videoHeight
            
            // Calculate crop area for 3:4 portrait ratio
            const targetRatio = 3 / 4
            const videoRatio = videoWidth / videoHeight
            
            let cropWidth, cropHeight, cropX, cropY
            
            if (videoRatio > targetRatio) {
                // Video is wider, crop sides
                cropHeight = videoHeight
                cropWidth = cropHeight * targetRatio
                cropX = (videoWidth - cropWidth) / 2
                cropY = 0
            } else {
                // Video is taller, crop top/bottom
                cropWidth = videoWidth
                cropHeight = cropWidth / targetRatio
                cropX = 0
                cropY = (videoHeight - cropHeight) / 2
            }
            
            // Create canvas with portrait dimensions
            const canvas = document.createElement('canvas')
            const outputWidth = 600  // Fixed width for consistency
            const outputHeight = 800 // 3:4 ratio
            canvas.width = outputWidth
            canvas.height = outputHeight
            
            const ctx = canvas.getContext('2d')
            if (ctx) {
                // Draw the cropped portion of the video
                ctx.drawImage(
                    video,
                    cropX, cropY, cropWidth, cropHeight,
                    0, 0, outputWidth, outputHeight
                )
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
                setPhotoPreview(dataUrl)
                onPhotoCapture(dataUrl)
                stopCamera()
            }
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('File size must be less than 5MB')
                return
            }
            
            const reader = new FileReader()
            reader.onloadend = () => {
                const dataUrl = reader.result as string
                setPhotoPreview(dataUrl)
                onPhotoCapture(dataUrl)
            }
            reader.readAsDataURL(file)
        }
    }

    const clearPhoto = () => {
        setPhotoPreview(null)
        onPhotoCapture('')
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <div className="space-y-4">
            <Label>Profile Photo (Optional)</Label>
            
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!photoPreview && !capturing && (
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={startCamera}
                            className="flex-1"
                        >
                            <Camera className="h-4 w-4 mr-2" />
                            Take Photo
                        </Button>
                        <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Photo
                        </Button>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <p className="text-xs text-muted-foreground">
                        Add a photo for your membership card. This will be displayed when your membership is verified.
                    </p>
                </div>
            )}

            {capturing && (
                <div className="space-y-3">
                    <div className="relative rounded-lg overflow-hidden bg-black">
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline
                            className="w-full"
                        />
                        {/* Portrait Crop Overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Dark overlay outside crop area */}
                            <div className="absolute inset-0 bg-black/50" />
                            {/* Portrait frame - 3:4 aspect ratio centered */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64">
                                <div className="w-full h-full border-4 border-white rounded-lg shadow-lg" />
                                {/* Corner guides */}
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
                                {/* Instructions */}
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                    <p className="text-xs text-white bg-black/70 px-2 py-1 rounded">
                                        Position your face within the frame
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            type="button" 
                            onClick={capturePhoto}
                            className="flex-1"
                        >
                            <Camera className="h-4 w-4 mr-2" />
                            Capture
                        </Button>
                        <Button 
                            type="button" 
                            variant="outline"
                            onClick={stopCamera}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {photoPreview && !capturing && (
                <div className="space-y-3">
                    <div className="relative rounded-lg overflow-hidden border">
                        <img 
                            src={photoPreview} 
                            alt="Profile preview" 
                            className="w-full"
                        />
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={clearPhoto}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400">
                        ✓ Photo ready for membership card
                    </p>
                </div>
            )}
        </div>
    )
}
