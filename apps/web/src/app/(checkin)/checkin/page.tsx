
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import TrackScanner from './track-scanner'

type Organizer = {
    id: string
    name: string
}

type Track = {
    id: string
    title: string
    periodName: string
    organizerId: string
}

export default function CheckinPage() {
    const [organizers, setOrganizers] = useState<Organizer[]>([])
    const [tracks, setTracks] = useState<Track[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOrganizer, setSelectedOrganizer] = useState<Organizer | null>(null)
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)

    useEffect(() => {
        async function loadData() {
            try {
                const res = await fetch('/api/tickets/tracks')
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}))
                    console.error('Failed to fetch tracks:', res.status, res.statusText, errorData)
                    return
                }
                const data = await res.json()
                const allTracks = data.tracks || []
                setTracks(allTracks)

                // Extract unique organizers from tracks
                const orgMap = new Map<string, Organizer>()
                allTracks.forEach((track: Track) => {
                    if (!orgMap.has(track.organizerId)) {
                        // Extract organizer name from periodName (format: "OrgName - PeriodName")
                        const orgName = track.periodName.split(' - ')[0]
                        orgMap.set(track.organizerId, {
                            id: track.organizerId,
                            name: orgName
                        })
                    }
                })
                
                const orgs = Array.from(orgMap.values())
                setOrganizers(orgs)

                // Auto-select if only one organizer
                if (orgs.length === 1) {
                    setSelectedOrganizer(orgs[0])
                }
            } catch (e) {
                console.error('Failed to load tracks', e)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    if (selectedTrack) {
        return (
            <TrackScanner 
                trackId={selectedTrack.id}
                trackTitle={selectedTrack.title}
                onBack={() => setSelectedTrack(null)}
            />
        )
    }

    // Show organizer selection if user has access to multiple orgs and none selected yet
    if (!selectedOrganizer && organizers.length > 1) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle className="text-2xl text-center">Select Organization</CardTitle>
                        <p className="text-sm text-slate-400 text-center">Choose which organization you are checking in for</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-white mx-auto"></div>
                                <p className="text-slate-400 mt-4">Loading organizations...</p>
                            </div>
                        ) : (
                            organizers.map(org => (
                                <Button
                                    key={org.id}
                                    variant="outline"
                                    size="lg"
                                    onClick={() => setSelectedOrganizer(org)}
                                    className="w-full h-auto py-4 text-left"
                                >
                                    <span className="text-lg font-semibold">{org.name}</span>
                                </Button>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Show track selection
    const filteredTracks = selectedOrganizer 
        ? tracks.filter(t => t.organizerId === selectedOrganizer.id)
        : tracks

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    {organizers.length > 1 && selectedOrganizer && (
                        <div className="mb-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedOrganizer(null)}
                                className="mb-2"
                            >
                                ← Change Organization
                            </Button>
                            <p className="text-sm text-slate-400">Selected: {selectedOrganizer.name}</p>
                        </div>
                    )}
                    <CardTitle className="text-2xl text-center">Select Track to Scan</CardTitle>
                    <p className="text-sm text-slate-400 text-center">Choose which track/course you are checking in</p>
                </CardHeader>
                <CardContent className="space-y-3">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-white mx-auto"></div>
                            <p className="text-slate-400 mt-4">Loading tracks...</p>
                        </div>
                    ) : filteredTracks.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-slate-400">No active tracks found</p>
                            <p className="text-sm text-slate-500 mt-2">Contact your administrator</p>
                        </div>
                    ) : (
                        filteredTracks.map(track => (
                            <Button
                                key={track.id}
                                variant="outline"
                                size="lg"
                                onClick={() => setSelectedTrack(track)}
                                className="w-full h-auto py-4 flex flex-col items-start text-left"
                            >
                                <span className="text-lg font-semibold">{track.title}</span>
                                <span className="text-sm text-slate-400">{track.periodName}</span>
                            </Button>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
