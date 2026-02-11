'use server'

import { 
  getPublicCoursePeriods as queryPublicCoursePeriods,
  getCourseTrackById,
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

export async function getAvailableCourseLevels() {
    return await queryAvailableCourseLevels()
}
