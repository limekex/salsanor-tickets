'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, X, ImageIcon, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Image from 'next/image'

export interface ImageConstraints {
    maxSizeBytes: number
    maxSizeMB: number
    acceptedTypes: readonly string[]
    acceptedExtensions: string
    minWidth: number
    minHeight: number
    maxWidth: number
    maxHeight: number
    aspectRatioMin: number
    aspectRatioMax: number
}

interface ImageUploadProps {
    value?: string
    onChange: (url: string) => void
    onUpload: (file: File) => Promise<string>
    constraints: ImageConstraints
    disabled?: boolean
    className?: string
}

interface ValidationError {
    type: 'size' | 'format' | 'dimensions' | 'upload'
    message: string
}

export function ImageUpload({
    value,
    onChange,
    onUpload,
    constraints,
    disabled,
    className
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<ValidationError | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const validateFile = useCallback(async (file: File): Promise<ValidationError | null> => {
        // Check file type
        if (!constraints.acceptedTypes.includes(file.type)) {
            return {
                type: 'format',
                message: `Invalid format. Accepted: ${constraints.acceptedExtensions}`
            }
        }

        // Check file size
        if (file.size > constraints.maxSizeBytes) {
            return {
                type: 'size',
                message: `File too large. Maximum: ${constraints.maxSizeMB}MB`
            }
        }

        // Check dimensions
        return new Promise((resolve) => {
            const img = new window.Image()
            img.onload = () => {
                const { width, height } = img
                const aspectRatio = width / height

                if (width < constraints.minWidth || height < constraints.minHeight) {
                    resolve({
                        type: 'dimensions',
                        message: `Image too small. Minimum: ${constraints.minWidth}x${constraints.minHeight}px`
                    })
                    return
                }

                if (width > constraints.maxWidth || height > constraints.maxHeight) {
                    resolve({
                        type: 'dimensions',
                        message: `Image too large. Maximum: ${constraints.maxWidth}x${constraints.maxHeight}px`
                    })
                    return
                }

                if (aspectRatio < constraints.aspectRatioMin || aspectRatio > constraints.aspectRatioMax) {
                    resolve({
                        type: 'dimensions',
                        message: `Invalid aspect ratio. Use landscape format (${constraints.aspectRatioMin}:1 to ${constraints.aspectRatioMax}:1)`
                    })
                    return
                }

                resolve(null)
            }
            img.onerror = () => {
                resolve({
                    type: 'format',
                    message: 'Could not read image file'
                })
            }
            img.src = URL.createObjectURL(file)
        })
    }, [constraints])

    const handleFile = useCallback(async (file: File) => {
        setError(null)
        
        const validationError = await validateFile(file)
        if (validationError) {
            setError(validationError)
            return
        }

        setIsUploading(true)
        try {
            const url = await onUpload(file)
            onChange(url)
        } catch (err) {
            setError({
                type: 'upload',
                message: err instanceof Error ? err.message : 'Upload failed'
            })
        } finally {
            setIsUploading(false)
        }
    }, [validateFile, onUpload, onChange])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragActive(false)
        
        if (disabled || isUploading) return
        
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }, [disabled, isUploading, handleFile])

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
    }, [handleFile])

    const handleRemove = useCallback(() => {
        onChange('')
        setError(null)
        if (inputRef.current) inputRef.current.value = ''
    }, [onChange])

    return (
        <div className={cn('space-y-rn-2', className)}>
            {value ? (
                <div className="relative group">
                    <div className="relative aspect-[2/1] w-full overflow-hidden rounded-rn-2 border border-rn-border bg-rn-surface-2">
                        <Image
                            src={value}
                            alt="Track hero image"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-rn-2 right-rn-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleRemove}
                        disabled={disabled}
                    >
                        <X className="h-4 w-4 mr-rn-1" />
                        Remove
                    </Button>
                </div>
            ) : (
                <div
                    className={cn(
                        'relative border-2 border-dashed rounded-rn-2 p-rn-8 text-center transition-colors',
                        dragActive ? 'border-rn-primary bg-rn-primary/5' : 'border-rn-border',
                        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-rn-primary/50'
                    )}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => !disabled && !isUploading && inputRef.current?.click()}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept={constraints.acceptedExtensions}
                        onChange={handleChange}
                        disabled={disabled || isUploading}
                        className="hidden"
                    />
                    
                    {isUploading ? (
                        <div className="flex flex-col items-center gap-rn-2">
                            <Loader2 className="h-10 w-10 text-rn-primary animate-spin" />
                            <p className="rn-body text-rn-text-muted">Uploading...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-rn-2">
                            <div className="p-rn-3 rounded-full bg-rn-surface-2">
                                <ImageIcon className="h-8 w-8 text-rn-text-muted" />
                            </div>
                            <div>
                                <p className="rn-body font-medium">
                                    <Upload className="inline h-4 w-4 mr-rn-1" />
                                    Drop image here or click to upload
                                </p>
                                <p className="rn-meta text-rn-text-muted mt-rn-1">
                                    {constraints.acceptedExtensions} • Max {constraints.maxSizeMB}MB
                                </p>
                                <p className="rn-caption text-rn-text-muted">
                                    {constraints.minWidth}x{constraints.minHeight} to {constraints.maxWidth}x{constraints.maxHeight}px
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="flex items-center gap-rn-2 text-rn-danger rn-meta">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error.message}
                </div>
            )}
        </div>
    )
}
