/**
 * Absence reason types and utilities
 * Shared between client and server components
 */

import { UI_TEXT } from '@/lib/i18n'

export type AbsenceReason = 'ILLNESS' | 'TRAVEL' | 'WORK' | 'FAMILY' | 'PERSONAL' | 'OTHER'

/**
 * Get localized absence reason label
 */
export function getAbsenceReasonLabel(reason: AbsenceReason): string {
    return UI_TEXT.absence.reasons[reason] || reason
}

/**
 * Get list of absence reasons with labels (for select dropdowns)
 */
export function getAbsenceReasonOptions(): { value: AbsenceReason; label: string }[] {
    return Object.entries(UI_TEXT.absence.reasons).map(([value, label]) => ({
        value: value as AbsenceReason,
        label
    }))
}

// For backwards compatibility - use getAbsenceReasonOptions() instead
export const ABSENCE_REASONS: { value: AbsenceReason; label: string }[] = [
    { value: 'ILLNESS', label: 'Illness' },
    { value: 'TRAVEL', label: 'Travel' },
    { value: 'WORK', label: 'Work' },
    { value: 'FAMILY', label: 'Family' },
    { value: 'PERSONAL', label: 'Personal' },
    { value: 'OTHER', label: 'Other' },
]
