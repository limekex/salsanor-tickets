'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Course registration cart item
export interface CourseCartItem {
    type: 'course'
    trackId: string
    trackTitle: string
    periodId: string
    organizerId: string
    organizerName: string
    role: 'LEADER' | 'FOLLOWER'
    hasPartner: boolean
    partnerEmail?: string
    priceSnapshot: number
    addedAt: number
}

// Event registration cart item
export interface EventCartItem {
    type: 'event'
    eventId: string
    eventTitle: string
    organizerId: string
    organizerName: string
    quantity: number // Number of tickets
    pricePerTicket: number
    addedAt: number
}

export type CartItemStored = CourseCartItem | EventCartItem

const STORAGE_KEY = 'salsanor_cart_v1'

interface CartContextType {
    items: CartItemStored[]
    addCourseItem: (item: Omit<CourseCartItem, 'addedAt' | 'type'>) => void
    addEventItem: (item: Omit<EventCartItem, 'addedAt' | 'type'>) => void
    removeItem: (id: string) => void // trackId or eventId
    updateEventQuantity: (eventId: string, quantity: number) => void
    clearCart: () => void
    getCartOrganizerId: () => string | null
    getCartOrganizerName: () => string | null
    isLoaded: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
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

    const addCourseItem = (item: Omit<CourseCartItem, 'addedAt' | 'type'>) => {
        setItems(current => {
            const exists = current.find(i => i.type === 'course' && i.trackId === item.trackId)
            if (exists) {
                return current.map(i => 
                    i.type === 'course' && i.trackId === item.trackId 
                        ? { ...item, type: 'course' as const, addedAt: Date.now() } 
                        : i
                )
            }
            return [...current, { ...item, type: 'course' as const, addedAt: Date.now() }]
        })
    }

    const addEventItem = (item: Omit<EventCartItem, 'addedAt' | 'type'>) => {
        setItems(current => {
            const exists = current.find(i => i.type === 'event' && i.eventId === item.eventId)
            if (exists) {
                // Update existing event item
                return current.map(i => 
                    i.type === 'event' && i.eventId === item.eventId 
                        ? { ...item, type: 'event' as const, addedAt: Date.now() } 
                        : i
                )
            }
            return [...current, { ...item, type: 'event' as const, addedAt: Date.now() }]
        })
    }

    const removeItem = (id: string) => {
        setItems(current => current.filter(i => 
            (i.type === 'course' && i.trackId !== id) ||
            (i.type === 'event' && i.eventId !== id)
        ))
    }

    const updateEventQuantity = (eventId: string, quantity: number) => {
        if (quantity < 1) {
            removeItem(eventId)
            return
        }
        setItems(current => current.map(i => 
            i.type === 'event' && i.eventId === eventId 
                ? { ...i, quantity } 
                : i
        ))
    }

    const clearCart = () => {
        setItems([])
        localStorage.removeItem(STORAGE_KEY)
    }

    const getCartOrganizerId = (): string | null => {
        return items.length > 0 ? items[0].organizerId : null
    }

    const getCartOrganizerName = (): string | null => {
        return items.length > 0 ? items[0].organizerName : null
    }

    return (
        <CartContext.Provider value={{
            items,
            addCourseItem,
            addEventItem,
            removeItem,
            updateEventQuantity,
            clearCart,
            getCartOrganizerId,
            getCartOrganizerName,
            isLoaded
        }}>
            {children}
        </CartContext.Provider>
    )
}

export function useCart() {
    const context = useContext(CartContext)
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider')
    }
    return context
}
