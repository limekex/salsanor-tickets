'use client'

import { useRouter } from 'next/navigation'
import type { Category, Tag, Organizer } from '@prisma/client'

type EventFiltersProps = {
    organizers: Array<Pick<Organizer, 'id' | 'name' | 'slug'>>
    categories: Category[]
    tags: Tag[]
    currentOrg?: string
    currentCategory?: string
    currentTag?: string
}

export function EventFilters({ 
    organizers, 
    categories, 
    tags, 
    currentOrg, 
    currentCategory, 
    currentTag 
}: EventFiltersProps) {
    const router = useRouter()

    const handleFilterChange = (filterType: 'org' | 'category' | 'tag', value: string) => {
        const params = new URLSearchParams()
        
        const org = filterType === 'org' ? value : currentOrg
        const category = filterType === 'category' ? value : currentCategory
        const tag = filterType === 'tag' ? value : currentTag
        
        if (org && org !== 'all') params.set('org', org)
        if (category && category !== 'all') params.set('category', category)
        if (tag && tag !== 'all') params.set('tag', tag)
        
        router.push(`/events?${params.toString()}`)
    }

    return (
        <div className="grid gap-rn-4 sm:grid-cols-3">
            {/* Organizer Filter */}
            {organizers.length > 1 && (
                <div className="space-y-rn-2">
                    <label className="rn-meta font-medium">Organizer</label>
                    <select 
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        defaultValue={currentOrg || 'all'}
                        onChange={(e) => handleFilterChange('org', e.target.value)}
                    >
                        <option value="all">All Organizers</option>
                        {organizers.map(o => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Category Filter */}
            <div className="space-y-rn-2">
                <label className="rn-meta font-medium">Category</label>
                <select 
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    defaultValue={currentCategory || 'all'}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                    <option value="all">All Categories</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                </select>
            </div>

            {/* Tag Filter */}
            <div className="space-y-rn-2">
                <label className="rn-meta font-medium">Tag</label>
                <select 
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    defaultValue={currentTag || 'all'}
                    onChange={(e) => handleFilterChange('tag', e.target.value)}
                >
                    <option value="all">All Tags</option>
                    {tags.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>
        </div>
    )
}
