import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const prefix = searchParams.get('prefix')
    const excludeId = searchParams.get('excludeId')

    if (!prefix) {
        return NextResponse.json({ available: true })
    }

    // Validate format
    if (prefix.length < 3 || prefix.length > 5 || !/^[A-Z0-9]+$/.test(prefix)) {
        return NextResponse.json({ 
            available: false, 
            message: 'Must be 3-5 characters (A-Z, 0-9 only)' 
        })
    }

    try {
        const existingOrg = await prisma.organizer.findFirst({
            where: {
                orderPrefix: prefix,
                ...(excludeId ? { id: { not: excludeId } } : {})
            }
        })

        if (existingOrg) {
            return NextResponse.json({ 
                available: false, 
                message: 'This prefix is taken, please choose another one' 
            })
        }

        return NextResponse.json({ available: true })
    } catch (error) {
        console.error('Error checking prefix:', error)
        return NextResponse.json({ available: true })
    }
}
