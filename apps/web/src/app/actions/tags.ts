'use server'

import { prisma } from '@/lib/db'
import { requireOrgAdminForOrganizer } from '@/utils/auth-org-admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const tagSchema = z.object({
    organizerId: z.string().uuid(),
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
    color: z.string().optional(),
})

export async function createTag(formData: FormData) {
    const organizerId = formData.get('organizerId') as string
    await requireOrgAdminForOrganizer(organizerId)

    const data = {
        organizerId,
        name: formData.get('name'),
        slug: formData.get('slug'),
        color: formData.get('color') || undefined,
    }

    const result = tagSchema.safeParse(data)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    try {
        await prisma.tag.create({
            data: result.data
        })

        revalidatePath('/staffadmin/tags')
        return { success: true }
    } catch (e: any) {
        if (e.code === 'P2002') {
            return { error: { slug: ['Slug must be unique for your organization'] } }
        }
        return { error: { _form: [e.message] } }
    }
}

export async function updateTag(id: string, formData: FormData) {
    // First get the tag to check ownership
    const tag = await prisma.tag.findUnique({
        where: { id },
        select: { organizerId: true }
    })

    if (!tag) {
        return { error: { _form: ['Tag not found'] } }
    }

    await requireOrgAdminForOrganizer(tag.organizerId)

    const data = {
        organizerId: tag.organizerId,
        name: formData.get('name'),
        slug: formData.get('slug'),
        color: formData.get('color') || undefined,
    }

    const result = tagSchema.safeParse(data)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    try {
        await prisma.tag.update({
            where: { id },
            data: {
                name: result.data.name,
                slug: result.data.slug,
                color: result.data.color,
            }
        })

        revalidatePath('/staffadmin/tags')
        revalidatePath(`/staffadmin/tags/${id}`)
        return { success: true }
    } catch (e: any) {
        if (e.code === 'P2002') {
            return { error: { slug: ['Slug must be unique for your organization'] } }
        }
        return { error: { _form: [e.message] } }
    }
}

export async function deleteTag(id: string) {
    // First get the tag to check ownership
    const tag = await prisma.tag.findUnique({
        where: { id },
        select: { organizerId: true }
    })

    if (!tag) {
        return { error: 'Tag not found' }
    }

    await requireOrgAdminForOrganizer(tag.organizerId)

    try {
        await prisma.tag.delete({
            where: { id }
        })

        revalidatePath('/staffadmin/tags')
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function getOrgTags(organizerId: string) {
    await requireOrgAdminForOrganizer(organizerId)

    return await prisma.tag.findMany({
        where: { organizerId },
        orderBy: { name: 'asc' },
        include: {
            _count: {
                select: {
                    periods: true,
                    events: true
                }
            }
        }
    })
}
