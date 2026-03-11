'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type {
  CustomFieldDefinition,
  CustomFieldValue,
  CustomFieldValues,
  CustomFieldValidationErrors,
} from '@/types/custom-fields'
import { evaluateShowIf } from '@/types/custom-fields'

interface CustomFieldsFormProps {
  definitions: CustomFieldDefinition[]
  values: CustomFieldValues
  onChange: (values: CustomFieldValues) => void
  errors?: CustomFieldValidationErrors
  className?: string
}

/**
 * Uniform custom fields form following RegiNor UI Guidelines
 * - Strict 8px spacing grid
 * - Consistent 40px input heights
 * - Clear visual hierarchy
 */
export function CustomFieldsForm({
  definitions,
  values,
  onChange,
  errors = {},
  className,
}: CustomFieldsFormProps) {
  const sorted = [...definitions].sort((a, b) => a.order - b.order)

  function setValue(fieldId: string, value: CustomFieldValue) {
    onChange({ ...values, [fieldId]: value })
  }

  function isVisible(field: CustomFieldDefinition): boolean {
    if (!field.showIf) return true
    return evaluateShowIf(field.showIf, values[field.showIf.fieldId])
  }

  // Render a single field with consistent wrapper
  function renderField(field: CustomFieldDefinition) {
    const error = errors[field.id]
    const fieldId = `cf-${field.id}`
    const hasError = !!error

    // Standard input classes for consistency
    const inputClasses = cn(
      'h-10 text-[15px]',
      hasError && 'border-destructive focus-visible:ring-destructive/25'
    )

    switch (field.type) {
      case 'TEXT':
        return (
          <Input
            id={fieldId}
            value={(values[field.id] as string) ?? ''}
            onChange={e => setValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            aria-invalid={hasError}
            className={inputClasses}
          />
        )

      case 'TEXTAREA':
        return (
          <Textarea
            id={fieldId}
            value={(values[field.id] as string) ?? ''}
            onChange={e => setValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            aria-invalid={hasError}
            className={cn('text-[15px] min-h-[88px]', hasError && 'border-destructive')}
          />
        )

      case 'NUMBER':
        return (
          <Input
            id={fieldId}
            type="number"
            value={(values[field.id] as number) ?? ''}
            onChange={e => setValue(field.id, e.target.value ? Number(e.target.value) : null)}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            aria-invalid={hasError}
            className={inputClasses}
          />
        )

      case 'EMAIL':
        return (
          <Input
            id={fieldId}
            type="email"
            value={(values[field.id] as string) ?? ''}
            onChange={e => setValue(field.id, e.target.value)}
            placeholder={field.placeholder ?? 'email@example.com'}
            aria-invalid={hasError}
            className={inputClasses}
          />
        )

      case 'PHONE':
        return (
          <Input
            id={fieldId}
            type="tel"
            value={(values[field.id] as string) ?? ''}
            onChange={e => setValue(field.id, e.target.value)}
            placeholder={field.placeholder ?? '+47 000 00 000'}
            aria-invalid={hasError}
            className={inputClasses}
          />
        )

      case 'DATE':
        return (
          <Input
            id={fieldId}
            type="date"
            value={(values[field.id] as string) ?? ''}
            onChange={e => setValue(field.id, e.target.value)}
            aria-invalid={hasError}
            className={inputClasses}
          />
        )

      case 'URL':
        return (
          <Input
            id={fieldId}
            type="url"
            value={(values[field.id] as string) ?? ''}
            onChange={e => setValue(field.id, e.target.value)}
            placeholder={field.placeholder ?? 'https://'}
            aria-invalid={hasError}
            className={inputClasses}
          />
        )

      case 'SELECT':
      case 'MULTI_SELECT':
        return (
          <Select
            value={(values[field.id] as string) ?? ''}
            onValueChange={val => setValue(field.id, val)}
          >
            <SelectTrigger
              id={fieldId}
              aria-invalid={hasError}
              className={inputClasses}
            >
              <SelectValue placeholder={field.placeholder ?? 'Velg...'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'RADIO':
        return (
          <RadioGroup
            value={(values[field.id] as string) ?? ''}
            onValueChange={val => setValue(field.id, val)}
            className="flex flex-col gap-3 pt-1"
          >
            {field.options?.map(opt => (
              <label
                key={opt.value}
                htmlFor={`${fieldId}-${opt.value}`}
                className={cn(
                  'flex items-center gap-3 cursor-pointer py-2 px-3 rounded-lg border bg-background transition-colors',
                  'hover:bg-muted/50',
                  (values[field.id] as string) === opt.value && 'border-primary bg-primary/5',
                  opt.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <RadioGroupItem
                  value={opt.value}
                  id={`${fieldId}-${opt.value}`}
                  disabled={opt.disabled}
                />
                <span className="text-[15px]">{opt.label}</span>
              </label>
            ))}
          </RadioGroup>
        )

      case 'CHECKBOX':
        return (
          <label
            htmlFor={fieldId}
            className={cn(
              'flex items-start gap-3 cursor-pointer py-2 px-3 rounded-lg border bg-background transition-colors',
              'hover:bg-muted/50',
              (values[field.id] as boolean) && 'border-primary bg-primary/5',
              hasError && 'border-destructive'
            )}
          >
            <Checkbox
              id={fieldId}
              checked={(values[field.id] as boolean) ?? false}
              onCheckedChange={checked => setValue(field.id, checked === true)}
              aria-invalid={hasError}
              className="mt-0.5"
            />
            <span className={cn('text-[15px] leading-snug', hasError && 'text-destructive')}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </span>
          </label>
        )

      case 'CHECKBOX_GROUP':
        return (
          <div className="flex flex-col gap-2 pt-1">
            {field.options?.map(opt => {
              const currentValues = (values[field.id] as string[]) ?? []
              const isChecked = currentValues.includes(opt.value)
              return (
                <label
                  key={opt.value}
                  htmlFor={`${fieldId}-${opt.value}`}
                  className={cn(
                    'flex items-center gap-3 cursor-pointer py-2 px-3 rounded-lg border bg-background transition-colors',
                    'hover:bg-muted/50',
                    isChecked && 'border-primary bg-primary/5',
                    opt.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Checkbox
                    id={`${fieldId}-${opt.value}`}
                    checked={isChecked}
                    disabled={opt.disabled}
                    onCheckedChange={checked => {
                      const next = checked
                        ? [...currentValues, opt.value]
                        : currentValues.filter(v => v !== opt.value)
                      setValue(field.id, next)
                    }}
                  />
                  <span className="text-[15px]">{opt.label}</span>
                </label>
              )
            })}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {sorted.map(field => {
        if (!isVisible(field)) return null

        // HEADING: Section divider
        if (field.type === 'HEADING') {
          return (
            <div key={field.id} className="pt-4 first:pt-0">
              <h3 className="text-base font-semibold text-foreground pb-1 border-b">
                {field.label}
              </h3>
            </div>
          )
        }

        // PARAGRAPH: Informational text
        if (field.type === 'PARAGRAPH') {
          return (
            <p key={field.id} className="text-sm text-muted-foreground -mt-4 pb-2">
              {field.label}
            </p>
          )
        }

        const error = errors[field.id]
        const fieldId = `cf-${field.id}`

        // For CHECKBOX, label is inline - handled in renderField
        if (field.type === 'CHECKBOX') {
          return (
            <div key={field.id} className="space-y-1.5">
              {renderField(field)}
              {field.description && (
                <p className="text-xs text-muted-foreground pl-3">{field.description}</p>
              )}
              {error && (
                <p className="text-xs text-destructive pl-3" role="alert">{error}</p>
              )}
            </div>
          )
        }

        // Standard field layout
        return (
          <div key={field.id} className="space-y-2">
            <Label
              htmlFor={fieldId}
              className={cn(
                'text-sm font-medium',
                error && 'text-destructive'
              )}
            >
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-xs text-muted-foreground -mt-1">{field.description}</p>
            )}
            {renderField(field)}
            {error && (
              <p className="text-xs text-destructive" role="alert">{error}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
