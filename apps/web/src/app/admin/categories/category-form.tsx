'use client'

import { createCategory, updateCategory } from '@/app/actions/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

interface CategoryFormProps {
    category?: {
        id: string
        name: string
        slug: string
        description: string | null
        icon: string | null
        sortOrder: number
    }
}

export function CategoryForm({ category }: CategoryFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [errors, setErrors] = useState<Record<string, string[]>>({})

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setErrors({})

        const formData = new FormData(e.currentTarget)

        startTransition(async () => {
            const result = category 
                ? await updateCategory(category.id, formData)
                : await createCategory(formData)

            if (result?.error) {
                if (typeof result.error === 'object' && '_form' in result.error) {
                    toast.error(result.error._form[0])
                } else {
                    setErrors(result.error as Record<string, string[]>)
                }
            } else {
                toast.success(category ? 'Category updated' : 'Category created')
                router.push('/admin/categories')
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
                    defaultValue={category?.name}
                    required
                    onChange={(e) => {
                        if (!category) {
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
                    defaultValue={category?.slug}
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
                <Label htmlFor="icon">Icon (emoji)</Label>
                <Input
                    id="icon"
                    name="icon"
                    defaultValue={category?.icon || ''}
                    placeholder="🎵"
                    maxLength={4}
                />
                <p className="text-sm text-muted-foreground">
                    Single emoji or icon
                </p>
                {errors.icon && (
                    <p className="text-sm text-destructive">{errors.icon[0]}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    name="description"
                    defaultValue={category?.description || ''}
                    rows={3}
                />
                {errors.description && (
                    <p className="text-sm text-destructive">{errors.description[0]}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order *</Label>
                <Input
                    id="sortOrder"
                    name="sortOrder"
                    type="number"
                    defaultValue={category?.sortOrder ?? 0}
                    required
                    min={0}
                />
                <p className="text-sm text-muted-foreground">
                    Lower numbers appear first
                </p>
                {errors.sortOrder && (
                    <p className="text-sm text-destructive">{errors.sortOrder[0]}</p>
                )}
            </div>

            <div className="flex gap-4">
                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
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
