'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const categorySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
    description: z.string().optional(),
    icon: z.string().optional(),
    sortOrder: z.coerce.number().int().min(0),
})

export async function createCategory(formData: FormData) {
    await requireAdmin()

    const data = {
        name: formData.get('name'),
        slug: formData.get('slug'),
        description: formData.get('description') || undefined,
        icon: formData.get('icon') || undefined,
        sortOrder: formData.get('sortOrder'),
    }

    const result = categorySchema.safeParse(data)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    try {
        await prisma.category.create({
            data: result.data
        })

        revalidatePath('/admin/categories')
        return { success: true }
    } catch (e: any) {
        if (e.code === 'P2002') {
            const target = e.meta?.target
            if (target?.includes('name')) {
                return { error: { name: ['Name must be unique'] } }
            }
            if (target?.includes('slug')) {
                return { error: { slug: ['Slug must be unique'] } }
            }
        }
        return { error: { _form: [e.message] } }
    }
}

export async function updateCategory(id: string, formData: FormData) {
    await requireAdmin()

    const data = {
        name: formData.get('name'),
        slug: formData.get('slug'),
        description: formData.get('description') || undefined,
        icon: formData.get('icon') || undefined,
        sortOrder: formData.get('sortOrder'),
    }

    const result = categorySchema.safeParse(data)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    try {
        await prisma.category.update({
            where: { id },
            data: result.data
        })

        revalidatePath('/admin/categories')
        revalidatePath(`/admin/categories/${id}`)
        return { success: true }
    } catch (e: any) {
        if (e.code === 'P2002') {
            const target = e.meta?.target
            if (target?.includes('name')) {
                return { error: { name: ['Name must be unique'] } }
            }
            if (target?.includes('slug')) {
                return { error: { slug: ['Slug must be unique'] } }
            }
        }
        return { error: { _form: [e.message] } }
    }
}

export async function deleteCategory(id: string) {
    await requireAdmin()

    try {
        await prisma.category.delete({
            where: { id }
        })

        revalidatePath('/admin/categories')
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function getAllCategories() {
    await requireAdmin()

    return await prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
            _count: {
                select: {
                    CoursePeriod: true,
                    Event: true
                }
            }
        }
    })
}
