'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
    CalendarOff, 
    Loader2, 
    Calendar, 
    Trash2,
    AlertCircle,
    CheckCircle2
} from 'lucide-react'
import {
    createPlannedAbsence,
    deletePlannedAbsence,
    getUpcomingSessionsForAbsence,
    getPlannedAbsencesForRegistration,
    type PlannedAbsenceData
} from '@/app/actions/absences'
import { formatDateShort } from '@/lib/formatters'
import { getAbsenceReasonLabel, getAbsenceReasonOptions, type AbsenceReason } from '@/lib/absence-utils'
import { UI_TEXT } from '@/lib/i18n'

interface PlannedAbsenceDialogProps {
    registrationId: string
    trackId: string
    trackTitle: string
}

type UpcomingSession = {
    date: Date
    isBreak: boolean
    hasAbsence: boolean
    absenceId?: string
}

export function PlannedAbsenceDialog({ 
    registrationId, 
    trackId,
    trackTitle 
}: PlannedAbsenceDialogProps) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [loading, setLoading] = useState(false)
    const [sessions, setSessions] = useState<UpcomingSession[]>([])
    const [absences, setAbsences] = useState<PlannedAbsenceData[]>([])
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Form state
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [selectedReason, setSelectedReason] = useState<AbsenceReason | ''>('')
    const [reasonText, setReasonText] = useState('')

    // Fetch sessions and existing absences when dialog opens
    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [sessionsData, absencesData] = await Promise.all([
                getUpcomingSessionsForAbsence(registrationId),
                getPlannedAbsencesForRegistration(registrationId)
            ])
            setSessions(sessionsData)
            setAbsences(absencesData)
        } catch (e) {
            console.error('Error fetching absence data:', e)
            setError(UI_TEXT.absence.errorLoad)
        } finally {
            setLoading(false)
        }
    }, [registrationId])

    useEffect(() => {
        if (open) {
            fetchData()
        }
    }, [open, fetchData])

    function handleCreateAbsence() {
        if (!selectedDate || !selectedReason) return

        setError(null)
        setSuccess(null)

        startTransition(async () => {
            const result = await createPlannedAbsence(
                registrationId,
                trackId,
                new Date(selectedDate),
                selectedReason,
                reasonText || undefined
            )

            if (result.success) {
                setSuccess(UI_TEXT.absence.successCreated)
                setSelectedDate('')
                setSelectedReason('')
                setReasonText('')
                await fetchData()
            } else {
                setError(result.error || UI_TEXT.absence.errorCreate)
            }
        })
    }

    function handleDeleteAbsence(absenceId: string) {
        setError(null)
        setSuccess(null)

        startTransition(async () => {
            const result = await deletePlannedAbsence(absenceId)

            if (result.success) {
                setSuccess(UI_TEXT.absence.successDeleted)
                await fetchData()
            } else {
                setError(result.error || UI_TEXT.absence.errorDelete)
            }
        })
    }

    // Filter available dates (not already marked as absent, not break days)
    const availableDates = sessions.filter(s => !s.hasAbsence && !s.isBreak)

    // Get existing absences with upcoming sessions
    const upcomingAbsences = absences.filter(a => {
        const sessionDate = new Date(a.sessionDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return sessionDate >= today
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full gap-2">
                    <CalendarOff className="h-4 w-4" />
                    <span>{UI_TEXT.absence.title}</span>
                    {upcomingAbsences.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                            {upcomingAbsences.length}
                        </Badge>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarOff className="h-5 w-5" />
                        {UI_TEXT.absence.title}
                    </DialogTitle>
                    <DialogDescription>
                        {UI_TEXT.absence.description(trackTitle)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {/* Status messages */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 text-green-700 dark:text-green-400 text-sm">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            {success}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            {/* Register new absence */}
                            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                                <h4 className="font-medium text-sm">{UI_TEXT.absence.registerNew}</h4>
                                
                                {availableDates.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {UI_TEXT.absence.noUpcomingSessions}
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="absence-date">{UI_TEXT.absence.date}</Label>
                                            <Select 
                                                value={selectedDate} 
                                                onValueChange={setSelectedDate}
                                            >
                                                <SelectTrigger id="absence-date">
                                                    <SelectValue placeholder={UI_TEXT.absence.selectDate} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableDates.map((session) => (
                                                        <SelectItem 
                                                            key={session.date.toString()} 
                                                            value={session.date.toISOString()}
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                <Calendar className="h-3.5 w-3.5" />
                                                                {formatDateShort(session.date)}
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="absence-reason">{UI_TEXT.absence.reason}</Label>
                                            <Select 
                                                value={selectedReason} 
                                                onValueChange={(v) => setSelectedReason(v as AbsenceReason)}
                                            >
                                                <SelectTrigger id="absence-reason">
                                                    <SelectValue placeholder={UI_TEXT.absence.selectReason} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {getAbsenceReasonOptions().map((reason) => (
                                                        <SelectItem 
                                                            key={reason.value} 
                                                            value={reason.value}
                                                        >
                                                            {reason.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {selectedReason === 'OTHER' && (
                                            <div className="space-y-1.5">
                                                <Label htmlFor="reason-text">{UI_TEXT.absence.additionalInfo}</Label>
                                                <Input
                                                    id="reason-text"
                                                    value={reasonText}
                                                    onChange={(e) => setReasonText(e.target.value)}
                                                    placeholder={UI_TEXT.absence.additionalInfoPlaceholder}
                                                    maxLength={200}
                                                />
                                            </div>
                                        )}

                                        <Button
                                            onClick={handleCreateAbsence}
                                            disabled={!selectedDate || !selectedReason || isPending}
                                            className="w-full"
                                        >
                                            {isPending ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : null}
                                            {UI_TEXT.absence.registerButton}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* List of registered absences */}
                            {upcomingAbsences.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-medium text-sm">{UI_TEXT.absence.registeredAbsences}</h4>
                                    <div className="space-y-2">
                                        {upcomingAbsences.map((absence) => (
                                            <div 
                                                key={absence.id}
                                                className="flex items-center justify-between p-3 rounded-md border bg-muted/20"
                                            >
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-2 text-sm font-medium">
                                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {formatDateShort(absence.sessionDate)}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {getAbsenceReasonLabel(absence.reason)}
                                                        {absence.reasonText && `: ${absence.reasonText}`}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteAbsence(absence.id)}
                                                    disabled={isPending}
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                >
                                                    {isPending ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
