/**
 * Validates whether the current time is within the check-in window for a track.
 *
 * The check-in window is:
 *   [class start - checkInWindowBefore minutes] → [class start + checkInWindowAfter minutes]
 *
 * Times are calculated in local time for easy comparison.
 *
 * @returns null if within the window (OK to check in), or a descriptive message string if outside.
 */
export function validateCheckInWindow(
    timeStart: string,                    // "HH:MM"
    checkInWindowBefore: number | null | undefined, // minutes before class start (default 30)
    checkInWindowAfter: number | null | undefined,  // minutes after class start (default 30)
    periodStartDate?: Date | null,        // Period start date
    periodEndDate?: Date | null,          // Period end date
): string | null {
    const windowBefore = checkInWindowBefore ?? 30
    const windowAfter = checkInWindowAfter ?? 30

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Check period date range first
    if (periodStartDate) {
        const startDate = new Date(periodStartDate)
        const periodStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
        if (today < periodStart) {
            const daysUntil = Math.ceil((periodStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            const formattedDate = periodStart.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
            return `This course period hasn't started yet. Classes begin on ${formattedDate} (in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}).`
        }
    }

    if (periodEndDate) {
        const endDate = new Date(periodEndDate)
        const periodEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
        if (today > periodEnd) {
            const formattedDate = periodEnd.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
            return `This course period has ended. The semester concluded on ${formattedDate}.`
        }
    }

    // Parse timeStart into hours and minutes
    const [startHour, startMin] = timeStart.split(':').map(Number)
    if (isNaN(startHour) || isNaN(startMin)) return null // can't validate, allow through

    // Compute class start as a Date on today's date in LOCAL time
    const classStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMin, 0)

    const windowOpen = new Date(classStart.getTime() - windowBefore * 60 * 1000)
    const windowClose = new Date(classStart.getTime() + windowAfter * 60 * 1000)

    const fmtTime = (d: Date) =>
        d.toTimeString().slice(0, 5) // HH:MM in local time

    if (now < windowOpen) {
        const minutesUntilOpen = Math.ceil((windowOpen.getTime() - now.getTime()) / 60000)
        return `Check-in opens at ${fmtTime(windowOpen)} (${windowBefore} minute${windowBefore !== 1 ? 's' : ''} before class at ${timeStart}). Opens in ${minutesUntilOpen} minute${minutesUntilOpen !== 1 ? 's' : ''}.`
    }

    if (now > windowClose) {
        return `Check-in has closed. The check-in window ended at ${fmtTime(windowClose)} (${windowAfter} minute${windowAfter !== 1 ? 's' : ''} after class started at ${timeStart}).`
    }

    return null // within window
}
