import type { CustomFieldDefinition, CustomFieldValue, CustomFieldValues } from '@/types/custom-fields'

interface CustomFieldsDisplayProps {
  definitions: CustomFieldDefinition[]
  values: CustomFieldValues
}

function formatValue(field: CustomFieldDefinition, value: CustomFieldValue): string {
  if (value === null || value === undefined || value === '') return '—'

  if (Array.isArray(value)) {
    if (value.length === 0) return '—'
    // Map values to labels if options exist
    if (field.options) {
      return value
        .map(v => field.options?.find(o => o.value === v)?.label ?? v)
        .join(', ')
    }
    return value.join(', ')
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if ((field.type === 'SELECT' || field.type === 'RADIO') && field.options) {
    return field.options.find(o => o.value === String(value))?.label ?? String(value)
  }

  return String(value)
}

export function CustomFieldsDisplay({ definitions, values }: CustomFieldsDisplayProps) {
  const inputFields = definitions
    .filter(f => f.type !== 'HEADING' && f.type !== 'PARAGRAPH')
    .sort((a, b) => a.order - b.order)

  if (inputFields.length === 0) return null

  return (
    <div className="space-y-2">
      {inputFields.map(field => {
        const value = values[field.id]
        const hasValue = value !== null && value !== undefined && value !== '' &&
          !(Array.isArray(value) && value.length === 0)

        return (
          <div key={field.id} className="flex gap-2 text-sm">
            <span className="text-muted-foreground shrink-0 min-w-[120px]">{field.label}:</span>
            <span className={hasValue ? 'font-medium' : 'text-muted-foreground italic'}>
              {formatValue(field, value ?? null)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
