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
}

export function CustomFieldsForm({
  definitions,
  values,
  onChange,
  errors = {},
}: CustomFieldsFormProps) {
  const sorted = [...definitions].sort((a, b) => a.order - b.order)

  function setValue(fieldId: string, value: CustomFieldValue) {
    onChange({ ...values, [fieldId]: value })
  }

  function isVisible(field: CustomFieldDefinition): boolean {
    if (!field.showIf) return true
    return evaluateShowIf(field.showIf, values[field.showIf.fieldId])
  }

  return (
    <div className="space-y-4">
      {sorted.map(field => {
        if (!isVisible(field)) return null

        if (field.type === 'HEADING') {
          return (
            <h3 key={field.id} className="text-base font-semibold pt-2">
              {field.label}
            </h3>
          )
        }

        if (field.type === 'PARAGRAPH') {
          return (
            <p key={field.id} className="text-sm text-muted-foreground">
              {field.label}
            </p>
          )
        }

        const error = errors[field.id]
        const fieldId = `cf-${field.id}`

        return (
          <div key={field.id} className="space-y-1.5">
            {field.type !== 'CHECKBOX' && (
              <Label htmlFor={fieldId}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
            )}
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}

            {field.type === 'TEXT' && (
              <Input
                id={fieldId}
                value={(values[field.id] as string) ?? ''}
                onChange={e => setValue(field.id, e.target.value)}
                placeholder={field.placeholder}
              />
            )}

            {field.type === 'TEXTAREA' && (
              <Textarea
                id={fieldId}
                value={(values[field.id] as string) ?? ''}
                onChange={e => setValue(field.id, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
              />
            )}

            {field.type === 'NUMBER' && (
              <Input
                id={fieldId}
                type="number"
                value={(values[field.id] as number) ?? ''}
                onChange={e => setValue(field.id, e.target.value ? Number(e.target.value) : null)}
                placeholder={field.placeholder}
                min={field.min}
                max={field.max}
              />
            )}

            {field.type === 'EMAIL' && (
              <Input
                id={fieldId}
                type="email"
                value={(values[field.id] as string) ?? ''}
                onChange={e => setValue(field.id, e.target.value)}
                placeholder={field.placeholder ?? 'email@example.com'}
              />
            )}

            {field.type === 'PHONE' && (
              <Input
                id={fieldId}
                type="tel"
                value={(values[field.id] as string) ?? ''}
                onChange={e => setValue(field.id, e.target.value)}
                placeholder={field.placeholder ?? '+47 000 00 000'}
              />
            )}

            {field.type === 'DATE' && (
              <Input
                id={fieldId}
                type="date"
                value={(values[field.id] as string) ?? ''}
                onChange={e => setValue(field.id, e.target.value)}
              />
            )}

            {field.type === 'URL' && (
              <Input
                id={fieldId}
                type="url"
                value={(values[field.id] as string) ?? ''}
                onChange={e => setValue(field.id, e.target.value)}
                placeholder={field.placeholder ?? 'https://'}
              />
            )}

            {(field.type === 'SELECT' || field.type === 'MULTI_SELECT') && (
              <Select
                value={(values[field.id] as string) ?? ''}
                onValueChange={val => setValue(field.id, val)}
              >
                <SelectTrigger id={fieldId}>
                  <SelectValue placeholder={field.placeholder ?? 'Select...'} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {field.type === 'RADIO' && (
              <RadioGroup
                value={(values[field.id] as string) ?? ''}
                onValueChange={val => setValue(field.id, val)}
              >
                {field.options?.map(opt => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.value} id={`${fieldId}-${opt.value}`} disabled={opt.disabled} />
                    <Label htmlFor={`${fieldId}-${opt.value}`} className="cursor-pointer font-normal">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {field.type === 'CHECKBOX' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={fieldId}
                  checked={(values[field.id] as boolean) ?? false}
                  onCheckedChange={checked => setValue(field.id, checked === true)}
                />
                <Label htmlFor={fieldId} className="cursor-pointer font-normal">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
              </div>
            )}

            {field.type === 'CHECKBOX_GROUP' && (
              <div className="space-y-2">
                {field.options?.map(opt => {
                  const currentValues = (values[field.id] as string[]) ?? []
                  return (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${fieldId}-${opt.value}`}
                        checked={currentValues.includes(opt.value)}
                        disabled={opt.disabled}
                        onCheckedChange={checked => {
                          const next = checked
                            ? [...currentValues, opt.value]
                            : currentValues.filter(v => v !== opt.value)
                          setValue(field.id, next)
                        }}
                      />
                      <Label htmlFor={`${fieldId}-${opt.value}`} className="cursor-pointer font-normal">
                        {opt.label}
                      </Label>
                    </div>
                  )
                })}
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
