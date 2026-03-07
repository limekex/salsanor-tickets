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
): string | null {
    const windowBefore = checkInWindowBefore ?? 30
    const windowAfter = checkInWindowAfter ?? 30

    // Parse timeStart into hours and minutes
    const [startHour, startMin] = timeStart.split(':').map(Number)
    if (isNaN(startHour) || isNaN(startMin)) return null // can't validate, allow through

    const now = new Date()

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
