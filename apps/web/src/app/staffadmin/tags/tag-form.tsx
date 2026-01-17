'use client'

import { createTag, updateTag } from '@/app/actions/tags'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

interface TagFormProps {
    organizerId: string
    tag?: {
        id: string
        name: string
        slug: string
        color: string | null
    }
}

const predefinedColors = [
    '#ef4444', // red
    '#f97316', // orange
    '#f59e0b', // amber
    '#eab308', // yellow
    '#84cc16', // lime
    '#22c55e', // green
    '#10b981', // emerald
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#0ea5e9', // sky
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#a855f7', // purple
    '#d946ef', // fuchsia
    '#ec4899', // pink
    '#f43f5e', // rose
]

export function TagForm({ organizerId, tag }: TagFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [errors, setErrors] = useState<Record<string, string[]>>({})
    const [selectedColor, setSelectedColor] = useState(tag?.color || predefinedColors[0])

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setErrors({})

        const formData = new FormData(e.currentTarget)
        formData.set('organizerId', organizerId)
        formData.set('color', selectedColor)

        startTransition(async () => {
            const result = tag 
                ? await updateTag(tag.id, formData)
                : await createTag(formData)

            if (result?.error) {
                if (typeof result.error === 'object' && '_form' in result.error) {
                    toast.error(result.error._form[0])
                } else {
                    setErrors(result.error as Record<string, string[]>)
                }
            } else {
                toast.success(tag ? 'Tag updated' : 'Tag created')
                router.push('/staffadmin/tags')
                router.refresh()
            }
        })
    }

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                    id="name"
                    name="name"
                    defaultValue={tag?.name}
                    required
                    onChange={(e) => {
                        if (!tag) {
                            const slugInput = document.getElementById('slug') as HTMLInputElement
                            if (slugInput && !slugInput.value) {
                                slugInput.value = generateSlug(e.target.value)
                            }
                        }
                    }}
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name[0]}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                    id="slug"
                    name="slug"
                    defaultValue={tag?.slug}
                    required
                    pattern="[a-z0-9-]+"
                    placeholder="lowercase-with-hyphens"
                />
                <p className="text-sm text-muted-foreground">
                    Lowercase letters, numbers, and hyphens only
                </p>
                {errors.slug && (
                    <p className="text-sm text-destructive">{errors.slug[0]}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label>Color</Label>
                <div className="grid grid-cols-9 gap-2">
                    {predefinedColors.map((color) => (
                        <button
                            key={color}
                            type="button"
                            className={`w-10 h-10 rounded-full border-2 transition-all ${
                                selectedColor === color 
                                    ? 'border-black ring-2 ring-offset-2 ring-black' 
                                    : 'border-gray-300 hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setSelectedColor(color)}
                        />
                    ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                    <Label htmlFor="customColor">Or enter custom hex:</Label>
                    <Input
                        id="customColor"
                        type="text"
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        placeholder="#000000"
                        pattern="^#[0-9A-Fa-f]{6}$"
                        className="w-32"
                    />
                    <div 
                        className="w-10 h-10 rounded-full border"
                        style={{ backgroundColor: selectedColor }}
                    />
                </div>
            </div>

            <div className="flex gap-4">
                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Saving...' : tag ? 'Update Tag' : 'Create Tag'}
                </Button>
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.back()}
                    disabled={isPending}
                >
                    Cancel
                </Button>
            </div>
        </form>
    )
}
