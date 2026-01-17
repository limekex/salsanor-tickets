import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const orgnr = searchParams.get('orgnr')

    if (!orgnr || !/^\d{9}$/.test(orgnr)) {
        return NextResponse.json({ error: 'Invalid organization number' }, { status: 400 })
    }

    try {
        // Brønnøysundregistrene API
        const response = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter/${orgnr}`)
        
        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
            }
            throw new Error('API request failed')
        }

        const data = await response.json()

        // Map Brreg data to our format
        const result = {
            organizationNumber: data.organisasjonsnummer,
            legalName: data.navn,
            legalAddress: formatAddress(data.forretningsadresse || data.postadresse),
            legalEmail: data.epostadresse || '',
            companyType: data.organisasjonsform?.kode || '',
            city: (data.forretningsadresse || data.postadresse)?.poststed || '',
            vatRegistered: data.registrertIMvaregisteret || false,
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error fetching from Brreg:', error)
        return NextResponse.json({ error: 'Failed to fetch organization data' }, { status: 500 })
    }
}

function formatAddress(address: any): string {
    if (!address) return ''
    
    const parts = []
    if (address.adresse && address.adresse.length > 0) {
        parts.push(address.adresse.join(', '))
    }
    if (address.postnummer && address.poststed) {
        parts.push(`${address.postnummer} ${address.poststed}`)
    }
    
    return parts.join(', ')
}
