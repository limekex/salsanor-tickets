
'use client'

import { useState, useEffect } from 'react'

export interface CartItemStored {
    trackId: string
    trackTitle: string
    periodId: string
    role: 'LEADER' | 'FOLLOWER'
    hasPartner: boolean
    partnerEmail?: string
    priceSnapshot: number // Display only, real price recalc on server
    addedAt: number
}

const STORAGE_KEY = 'salsanor_cart_v1'

export function useCart() {
    const [items, setItems] = useState<CartItemStored[]>([])
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            try {
                setItems(JSON.parse(stored))
            } catch (e) {
                console.error('Failed to parse cart', e)
            }
        }
        setIsLoaded(true)
    }, [])

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
        }
    }, [items, isLoaded])

    const addItem = (item: Omit<CartItemStored, 'addedAt'>) => {
        setItems(current => {
            // Check duplicates (same track)
            const exists = current.find(i => i.trackId === item.trackId)
            if (exists) {
                // Update existing? Or just ignore? 
                // Let's replace.
                return current.map(i => i.trackId === item.trackId ? { ...item, addedAt: Date.now() } : i)
            }
            return [...current, { ...item, addedAt: Date.now() }]
        })
    }

    const removeItem = (trackId: string) => {
        setItems(current => current.filter(i => i.trackId !== trackId))
    }

    const clearCart = () => {
        setItems([])
    }

    return {
        items,
        addItem,
        removeItem,
        clearCart,
        isLoaded
    }
}
