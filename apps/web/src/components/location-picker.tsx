'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { MapPin, Search, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface NominatimResult {
    place_id: number
    lat: string
    lon: string
    display_name: string
    name?: string
    address?: {
        house_number?: string
        road?: string
        city?: string
        town?: string
        village?: string
        municipality?: string
        county?: string
        state?: string
        postcode?: string
        country?: string
    }
}

export interface LocationValue {
    locationName?: string
    locationAddress?: string
    latitude?: number
    longitude?: number
}

interface LocationPickerProps {
    value: LocationValue
    onChange: (value: LocationValue) => void
    className?: string
}

export function LocationPicker({ value, onChange, className }: LocationPickerProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<NominatimResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowResults(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const searchLocation = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 3) {
            setResults([])
            return
        }

        setIsSearching(true)
        try {
            // Use OpenStreetMap Nominatim API
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'en,no',
                        'User-Agent': 'SalsaNor Tickets (contact@salsanor.no)'
                    }
                }
            )
            const data: NominatimResult[] = await response.json()
            setResults(data)
            setShowResults(true)
        } catch (error) {
            console.error('Location search error:', error)
            setResults([])
        } finally {
            setIsSearching(false)
        }
    }, [])

    const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newQuery = e.target.value
        setQuery(newQuery)

        // Debounce search
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }
        searchTimeoutRef.current = setTimeout(() => {
            searchLocation(newQuery)
        }, 300)
    }

    const selectLocation = (result: NominatimResult) => {
        const address = result.address
        // Norwegian format: street name first, then number
        const locationName = result.name || 
            (address?.road ? `${address.road} ${address.house_number || ''}`.trim() : undefined) ||
            result.display_name.split(',')[0]
        
        const city = address?.city || address?.town || address?.village || address?.municipality
        const locationAddress = address 
            ? [
                address.road ? `${address.road} ${address.house_number || ''}`.trim() : undefined,
                address.postcode,
                city,
                address.country
              ].filter(Boolean).join(', ')
            : result.display_name

        onChange({
            locationName,
            locationAddress,
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon)
        })
        setQuery('')
        setShowResults(false)
    }

    const clearLocation = () => {
        onChange({
            locationName: undefined,
            locationAddress: undefined,
            latitude: undefined,
            longitude: undefined
        })
    }

    const hasLocation = value.latitude !== undefined && value.longitude !== undefined

    return (
        <div ref={containerRef} className={cn('space-y-3', className)}>
            <Label>Location</Label>
            
            {/* Search input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rn-text-muted" />
                <Input
                    placeholder="Search for a location..."
                    value={query}
                    onChange={handleQueryChange}
                    onFocus={() => results.length > 0 && setShowResults(true)}
                    className="pl-10"
                />
                {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-rn-text-muted" />
                )}
                
                {/* Results dropdown */}
                {showResults && results.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-rn-border bg-rn-surface shadow-lg">
                        {results.map((result) => (
                            <button
                                key={result.place_id}
                                type="button"
                                onClick={() => selectLocation(result)}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-rn-surface-2 first:rounded-t-md last:rounded-b-md"
                            >
                                <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-rn-text-muted" />
                                    <span className="line-clamp-2">{result.display_name}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Selected location display */}
            {hasLocation && (
                <div className="rounded-md border border-rn-border bg-rn-surface-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-rn-primary" />
                            <div className="min-w-0">
                                {value.locationName && (
                                    <p className="font-medium truncate">{value.locationName}</p>
                                )}
                                {value.locationAddress && (
                                    <p className="text-sm text-rn-text-muted truncate">{value.locationAddress}</p>
                                )}
                                <p className="text-xs text-rn-text-muted mt-1">
                                    {value.latitude?.toFixed(6)}, {value.longitude?.toFixed(6)}
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearLocation}
                            className="flex-shrink-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    {/* Mini map preview using OpenStreetMap embed */}
                    <div className="mt-3 rounded overflow-hidden border border-rn-border">
                        <iframe
                            title="Location map"
                            width="100%"
                            height="150"
                            frameBorder="0"
                            scrolling="no"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${value.longitude! - 0.005}%2C${value.latitude! - 0.003}%2C${value.longitude! + 0.005}%2C${value.latitude! + 0.003}&layer=mapnik&marker=${value.latitude}%2C${value.longitude}`}
                            className="w-full"
                        />
                        <a 
                            href={`https://www.openstreetmap.org/?mlat=${value.latitude}&mlon=${value.longitude}#map=17/${value.latitude}/${value.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-center py-1 bg-rn-surface-2 hover:bg-rn-surface-3 text-rn-text-muted"
                        >
                            View larger map →
                        </a>
                    </div>
                </div>
            )}

            {/* Manual coordinate input for fine-tuning */}
            {hasLocation && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs text-rn-text-muted">Latitude</Label>
                        <Input
                            type="number"
                            step="0.000001"
                            value={value.latitude || ''}
                            onChange={(e) => onChange({ ...value, latitude: parseFloat(e.target.value) || undefined })}
                        />
                    </div>
                    <div>
                        <Label className="text-xs text-rn-text-muted">Longitude</Label>
                        <Input
                            type="number"
                            step="0.000001"
                            value={value.longitude || ''}
                            onChange={(e) => onChange({ ...value, longitude: parseFloat(e.target.value) || undefined })}
                        />
                    </div>
                </div>
            )}

            <p className="text-xs text-rn-text-muted">
                Powered by OpenStreetMap. Location data will be used for Wallet Tickets.
            </p>
        </div>
    )
}
