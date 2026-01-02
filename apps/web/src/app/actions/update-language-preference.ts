'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function updateLanguagePreference(personProfileId: string, language: string) {
  await prisma.personProfile.update({
    where: { id: personProfileId },
    data: { preferredLanguage: language }
  })

  revalidatePath('/profile/settings')
  revalidatePath('/profile')
}
