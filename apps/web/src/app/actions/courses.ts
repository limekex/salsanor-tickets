'use server'

import { 
  getPublicCoursePeriods as queryPublicCoursePeriods,
  getCourseTrackById,
  getCourseTrackByIdOrSlug,
  getAvailableCourseLevels as queryAvailableCourseLevels,
} from '@/lib/queries'

// Re-export type from queries
export type { CourseFilters } from '@/lib/queries'

export async function getPublicCoursePeriods(filters?: import('@/lib/queries').CourseFilters) {
    return await queryPublicCoursePeriods(filters)
}

export async function getCourseTrack(trackId: string) {
    return await getCourseTrackById(trackId)
}

export async function getCourseTrackDetails(identifier: string, periodId?: string) {
    return await getCourseTrackByIdOrSlug(identifier, periodId)
}

export async function getAvailableCourseLevels() {
    return await queryAvailableCourseLevels()
}
