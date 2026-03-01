
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarDays, GraduationCap } from 'lucide-react'
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
    type: 'track'
}

type Event = {
    id: string
    title: string
    startDateTime: string
    locationName?: string
    city?: string
    organizerName: string
    organizerId: string
    ticketCount: number
    type: 'event'
}

export default function CheckinPage() {
    const [organizers, setOrganizers] = useState<Organizer[]>([])
    const [tracks, setTracks] = useState<Track[]>([])
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOrganizer, setSelectedOrganizer] = useState<Organizer | null>(null)
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

    useEffect(() => {
        async function loadData() {
            try {
                const res = await fetch('/api/tickets/tracks')
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}))
                    console.error('Failed to fetch data:', res.status, res.statusText, errorData)
                    return
                }
                const data = await res.json()
                const allTracks = data.tracks || []
                const allEvents = data.events || []
                setTracks(allTracks)
                setEvents(allEvents)

                // Extract unique organizers from tracks and events
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
                
                allEvents.forEach((event: Event) => {
                    if (!orgMap.has(event.organizerId)) {
                        orgMap.set(event.organizerId, {
                            id: event.organizerId,
                            name: event.organizerName
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
                console.error('Failed to load data', e)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    // Show scanner for selected track
    if (selectedTrack) {
        return (
            <TrackScanner 
                trackId={selectedTrack.id}
                trackTitle={selectedTrack.title}
                onBack={() => setSelectedTrack(null)}
            />
        )
    }

    // Show scanner for selected event
    if (selectedEvent) {
        return (
            <TrackScanner 
                eventId={selectedEvent.id}
                trackTitle={selectedEvent.title}
                onBack={() => setSelectedEvent(null)}
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

    // Filter by selected organizer
    const filteredTracks = selectedOrganizer 
        ? tracks.filter(t => t.organizerId === selectedOrganizer.id)
        : tracks
    const filteredEvents = selectedOrganizer
        ? events.filter(e => e.organizerId === selectedOrganizer.id)
        : events

    // Determine default tab based on what's available
    const hasEvents = filteredEvents.length > 0
    const hasTracks = filteredTracks.length > 0
    const defaultTab = hasEvents ? 'events' : 'tracks'

    // Format date for display
    const formatEventDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return new Intl.DateTimeFormat('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date)
    }

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
                    <CardTitle className="text-2xl text-center">Select What to Check In</CardTitle>
                    <p className="text-sm text-slate-400 text-center">Choose event or course to scan tickets for</p>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-white mx-auto"></div>
                            <p className="text-slate-400 mt-4">Loading...</p>
                        </div>
                    ) : !hasEvents && !hasTracks ? (
                        <div className="text-center py-8">
                            <p className="text-slate-400">No active events or courses found</p>
                            <p className="text-sm text-slate-500 mt-2">Contact administrator</p>
                        </div>
                    ) : (
                        <Tabs defaultValue={defaultTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="events" disabled={!hasEvents} className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4" />
                                    Events
                                    {hasEvents && <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">{filteredEvents.length}</span>}
                                </TabsTrigger>
                                <TabsTrigger value="tracks" disabled={!hasTracks} className="flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4" />
                                    Courses
                                    {hasTracks && <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">{filteredTracks.length}</span>}
                                </TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="events" className="space-y-3 mt-0">
                                {filteredEvents.map(event => (
                                    <Button
                                        key={event.id}
                                        variant="outline"
                                        size="lg"
                                        onClick={() => setSelectedEvent(event)}
                                        className="w-full h-auto py-4 flex flex-col items-start text-left"
                                    >
                                        <span className="text-lg font-semibold">{event.title}</span>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                                            <span>{formatEventDate(event.startDateTime)}</span>
                                            {event.locationName && <span>{event.locationName}</span>}
                                            {event.city && <span>{event.city}</span>}
                                        </div>
                                        <span className="text-xs text-slate-500 mt-1">
                                            {event.ticketCount} {event.ticketCount === 1 ? 'ticket' : 'tickets'}
                                        </span>
                                    </Button>
                                ))}
                            </TabsContent>
                            
                            <TabsContent value="tracks" className="space-y-3 mt-0">
                                {filteredTracks.map(track => (
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
                                ))}
                            </TabsContent>
                        </Tabs>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
