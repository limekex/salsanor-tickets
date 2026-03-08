/**
 * Custom form field types for course registrations
 *
 * Stored as JSON in CoursePeriod.customFields (definitions)
 * and Registration.customFieldValues (responses)
 */

export type FieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'EMAIL'
  | 'PHONE'
  | 'DATE'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'RADIO'
  | 'CHECKBOX'
  | 'CHECKBOX_GROUP'
  | 'URL'
  | 'HEADING'
  | 'PARAGRAPH'

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export type ShowIfCondition = {
  fieldId: string
  operator: 'equals' | 'notEquals' | 'contains' | 'isNotEmpty'
  value: unknown
}

export type CustomFieldDefinition = {
  id: string
  type: FieldType
  label: string
  description?: string
  placeholder?: string
  required: boolean

  // For SELECT, RADIO, CHECKBOX_GROUP, MULTI_SELECT
  options?: SelectOption[]

  // For NUMBER
  min?: number
  max?: number

  // For TEXT, TEXTAREA
  minLength?: number
  maxLength?: number
  pattern?: string

  // Conditional display
  showIf?: ShowIfCondition

  // Layout
  order: number
  width?: 'full' | 'half'
  section?: string
}

export type CustomFieldValue =
  | string
  | number
  | boolean
  | string[]
  | null
  | undefined

export type CustomFieldValues = Record<string, CustomFieldValue>

export type CustomFieldValidationErrors = Record<string, string>

// Course template type (mirrors Prisma enum)
export type CourseTemplateType =
  | 'CUSTOM'
  | 'INDIVIDUAL'
  | 'PARTNER'
  | 'VIRTUAL'
  | 'WORKSHOP'
  | 'DROP_IN'
  | 'KIDS_YOUTH'
  | 'TEAM'
  | 'SUBSCRIPTION'
  | 'PRIVATE'

// Delivery method (mirrors Prisma enum)
export type DeliveryMethod = 'IN_PERSON' | 'VIRTUAL' | 'HYBRID'

export const COURSE_TEMPLATE_LABELS: Record<CourseTemplateType, string> = {
  CUSTOM: 'Custom',
  INDIVIDUAL: 'Individual Course',
  PARTNER: 'Partner / Couples',
  VIRTUAL: 'Virtual / Online',
  WORKSHOP: 'Workshop / Single Session',
  DROP_IN: 'Drop-In / Punch Card',
  KIDS_YOUTH: 'Kids & Youth',
  TEAM: 'Team / Group',
  SUBSCRIPTION: 'Subscription / Membership',
  PRIVATE: 'Private / 1-on-1',
}

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  IN_PERSON: 'In Person',
  VIRTUAL: 'Virtual / Online',
  HYBRID: 'Hybrid (Participant Chooses)',
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: 'Short Text',
  TEXTAREA: 'Long Text',
  NUMBER: 'Number',
  EMAIL: 'Email',
  PHONE: 'Phone Number',
  DATE: 'Date',
  SELECT: 'Dropdown (Single)',
  MULTI_SELECT: 'Dropdown (Multiple)',
  RADIO: 'Radio Buttons',
  CHECKBOX: 'Checkbox (Yes/No)',
  CHECKBOX_GROUP: 'Checkboxes (Multiple)',
  URL: 'URL / Link',
  HEADING: 'Section Heading',
  PARAGRAPH: 'Informational Text',
}

/**
 * Validate custom field values against their definitions
 */
export function validateCustomFields(
  definitions: CustomFieldDefinition[],
  values: CustomFieldValues
): CustomFieldValidationErrors {
  const errors: CustomFieldValidationErrors = {}

  for (const field of definitions) {
    // Skip layout-only fields
    if (field.type === 'HEADING' || field.type === 'PARAGRAPH') continue

    // Check conditional display — skip validation if field is hidden
    if (field.showIf) {
      const condValue = values[field.showIf.fieldId]
      const isVisible = evaluateShowIf(field.showIf, condValue)
      if (!isVisible) continue
    }

    const value = values[field.id]
    const isEmpty = isEmptyValue(value)

    if (field.required && isEmpty) {
      errors[field.id] = `${field.label} is required`
      continue
    }

    if (isEmpty) continue

    switch (field.type) {
      case 'EMAIL':
        if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors[field.id] = 'Invalid email address'
        }
        break
      case 'PHONE':
        if (typeof value === 'string' && !/^\+?[\d\s\-().]{7,20}$/.test(value)) {
          errors[field.id] = 'Invalid phone number'
        }
        break
      case 'URL':
        if (typeof value === 'string') {
          try {
            new URL(value)
          } catch {
            errors[field.id] = 'Invalid URL'
          }
        }
        break
      case 'NUMBER':
        if (typeof value === 'number') {
          if (field.min !== undefined && value < field.min) {
            errors[field.id] = `Minimum value is ${field.min}`
          }
          if (field.max !== undefined && value > field.max) {
            errors[field.id] = `Maximum value is ${field.max}`
          }
        }
        break
      case 'TEXT':
      case 'TEXTAREA':
        if (typeof value === 'string') {
          if (field.minLength !== undefined && value.length < field.minLength) {
            errors[field.id] = `Minimum ${field.minLength} characters`
          }
          if (field.maxLength !== undefined && value.length > field.maxLength) {
            errors[field.id] = `Maximum ${field.maxLength} characters`
          }
          if (field.pattern && !new RegExp(field.pattern).test(value)) {
            errors[field.id] = 'Invalid format'
          }
        }
        break
      case 'SELECT':
      case 'RADIO':
        if (!field.options?.some(o => o.value === value)) {
          errors[field.id] = 'Invalid selection'
        }
        break
    }
  }

  return errors
}

function isEmptyValue(value: CustomFieldValue): boolean {
  if (value === null || value === undefined || value === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

export function evaluateShowIf(condition: ShowIfCondition, currentValue: CustomFieldValue): boolean {
  switch (condition.operator) {
    case 'equals':
      return currentValue === condition.value
    case 'notEquals':
      return currentValue !== condition.value
    case 'contains':
      if (Array.isArray(currentValue)) {
        return currentValue.includes(condition.value as string)
      }
      if (typeof currentValue === 'string') {
        return currentValue.includes(condition.value as string)
      }
      return false
    case 'isNotEmpty':
      return !isEmptyValue(currentValue)
    default:
      return true
  }
}
