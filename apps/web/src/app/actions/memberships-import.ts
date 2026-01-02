'use server'

import { revalidatePath } from 'next/cache'
import Papa from 'papaparse'
import { prisma } from '@/lib/db'
import { requireOrganizerAccess } from '@/utils/auth-admin'

export interface CSVPreview {
  headers: string[]
  sampleRows: Record<string, string>[]
}

export interface FieldMapping {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  memberNumber?: string
  tierId?: string
  validFrom?: string
  validTo?: string
  autoRenew?: string
}

export interface ImportDefaults {
  tierId?: string // Fallback tier if not in CSV
  validFromOffset?: number // Days from today if not in CSV
  validToOffset?: number // Days from validFrom if not in CSV (default 365)
  autoRenew?: boolean // Default auto-renew if not in CSV
}

export interface ImportSummary {
  total: number
  created: number
  updated: number
  skipped: number
  errors: string[]
}

export async function previewCSV(csvContent: string): Promise<CSVPreview> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || []
        const sampleRows = results.data.slice(0, 5) as Record<string, string>[]
        resolve({ headers, sampleRows })
      },
      error: (error: Error) => {
        reject(new Error(`CSV parse error: ${error.message}`))
      },
    })
  })
}

export async function importMembershipsWithMapping(
  csvContent: string,
  fieldMapping: FieldMapping,
  defaults: ImportDefaults
): Promise<ImportSummary> {
  const user = await requireOrganizerAccess()
  const organizerId = user.userAccount.roles[0]?.organizerId
  
  if (!organizerId) {
    throw new Error('No organization access')
  }

  const summary: ImportSummary = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  return new Promise((resolve) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[]
        summary.total = rows.length

        // Validate required mappings
        if (!fieldMapping.email) {
          summary.errors.push('Email field mapping is required')
          resolve(summary)
          return
        }

        if (!fieldMapping.firstName && !fieldMapping.lastName) {
          summary.errors.push('At least one of firstName or lastName mapping is required')
          resolve(summary)
          return
        }

        // If no default tier and no mapping, check if we have at least one tier
        if (!defaults.tierId && !fieldMapping.tierId) {
          const tierCount = await prisma.membershipTier.count({
            where: { organizerId, enabled: true },
          })
          if (tierCount === 0) {
            summary.errors.push('No enabled membership tiers found. Create a tier first.')
            resolve(summary)
            return
          }
          // Get the first enabled tier as default
          const defaultTier = await prisma.membershipTier.findFirst({
            where: { organizerId, enabled: true },
            orderBy: { priority: 'asc' },
          })
          defaults.tierId = defaultTier?.id
        }

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          const rowNum = i + 2 // Account for header + 1-indexed

          try {
            // Map fields from CSV
            const email = fieldMapping.email ? row[fieldMapping.email]?.trim() : ''
            if (!email) {
              summary.errors.push(`Row ${rowNum}: Email is required`)
              summary.skipped++
              continue
            }

            const firstName = fieldMapping.firstName ? row[fieldMapping.firstName]?.trim() : ''
            const lastName = fieldMapping.lastName ? row[fieldMapping.lastName]?.trim() : ''
            
            if (!firstName && !lastName) {
              summary.errors.push(`Row ${rowNum}: At least one of firstName or lastName is required`)
              summary.skipped++
              continue
            }

            const phone = fieldMapping.phone ? row[fieldMapping.phone]?.trim() : undefined
            const memberNumber = fieldMapping.memberNumber ? row[fieldMapping.memberNumber]?.trim() : undefined

            // Determine tier
            let tierId = defaults.tierId
            if (fieldMapping.tierId && row[fieldMapping.tierId]) {
              const tierSlugOrName = row[fieldMapping.tierId].trim()
              const tier = await prisma.membershipTier.findFirst({
                where: {
                  organizerId,
                  OR: [
                    { slug: tierSlugOrName.toLowerCase() },
                    { name: { equals: tierSlugOrName, mode: 'insensitive' as const } },
                  ],
                },
              })
              if (tier) {
                tierId = tier.id
              } else {
                summary.errors.push(`Row ${rowNum}: Tier "${tierSlugOrName}" not found, using default`)
              }
            }

            if (!tierId) {
              summary.errors.push(`Row ${rowNum}: No tier specified and no default available`)
              summary.skipped++
              continue
            }

            // Determine validity dates
            let validFrom = new Date()
            if (fieldMapping.validFrom && row[fieldMapping.validFrom]) {
              const parsed = new Date(row[fieldMapping.validFrom])
              if (!isNaN(parsed.getTime())) {
                validFrom = parsed
              }
            } else if (defaults.validFromOffset !== undefined) {
              validFrom = new Date()
              validFrom.setDate(validFrom.getDate() + defaults.validFromOffset)
            }

            let validTo = new Date(validFrom)
            if (fieldMapping.validTo && row[fieldMapping.validTo]) {
              const parsed = new Date(row[fieldMapping.validTo])
              if (!isNaN(parsed.getTime())) {
                validTo = parsed
              } else {
                validTo.setDate(validFrom.getDate() + (defaults.validToOffset || 365))
              }
            } else {
              validTo.setDate(validFrom.getDate() + (defaults.validToOffset || 365))
            }

            // Determine auto-renew
            let autoRenew = defaults.autoRenew ?? false
            if (fieldMapping.autoRenew && row[fieldMapping.autoRenew]) {
              const value = row[fieldMapping.autoRenew].toLowerCase().trim()
              autoRenew = value === 'true' || value === 'yes' || value === '1'
            }

            // Find or create person
            let person = await prisma.personProfile.findFirst({
              where: { email },
            })

            if (!person) {
              person = await prisma.personProfile.create({
                data: {
                  email,
                  firstName: firstName || '',
                  lastName: lastName || '',
                  phone: phone || null,
                },
              })
            } else {
              // Update person if data changed
              await prisma.personProfile.update({
                where: { id: person.id },
                data: {
                  firstName: firstName || person.firstName,
                  lastName: lastName || person.lastName,
                  phone: phone || person.phone,
                },
              })
            }

            // Check for existing membership
            const existing = await prisma.membership.findFirst({
              where: {
                personId: person.id,
                organizerId,
                validFrom,
              },
            })

            if (existing) {
              // Update existing
              await prisma.membership.update({
                where: { id: existing.id },
                data: {
                  tierId,
                  memberNumber,
                  validTo,
                  autoRenew,
                  status: validTo > new Date() ? 'ACTIVE' : 'EXPIRED',
                },
              })
              summary.updated++
            } else {
              // Create new
              await prisma.membership.create({
                data: {
                  organizerId,
                  personId: person.id,
                  tierId,
                  memberNumber,
                  validFrom,
                  validTo,
                  autoRenew,
                  source: 'IMPORT',
                  status: validTo > new Date() ? 'ACTIVE' : 'EXPIRED',
                },
              })
              summary.created++
            }
          } catch (error) {
            summary.errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`)
            summary.skipped++
          }
        }

        revalidatePath('/staffadmin/memberships')
        resolve(summary)
      },
      error: (error: Error) => {
        summary.errors.push(`CSV parse error: ${error.message}`)
        resolve(summary)
      },
    })
  })
}
