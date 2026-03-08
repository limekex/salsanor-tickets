'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, ChevronUp, ChevronDown, Edit2, GripVertical } from 'lucide-react'
import type {
  CustomFieldDefinition,
  FieldType,
  SelectOption,
} from '@/types/custom-fields'
import { FIELD_TYPE_LABELS } from '@/types/custom-fields'

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
}

interface CustomFieldBuilderProps {
  fields: CustomFieldDefinition[]
  onChange: (fields: CustomFieldDefinition[]) => void
}

const INPUT_FIELD_TYPES: FieldType[] = [
  'TEXT', 'TEXTAREA', 'NUMBER', 'EMAIL', 'PHONE', 'DATE',
  'SELECT', 'MULTI_SELECT', 'RADIO', 'CHECKBOX', 'CHECKBOX_GROUP',
  'URL',
]
const LAYOUT_FIELD_TYPES: FieldType[] = ['HEADING', 'PARAGRAPH']
const OPTION_FIELD_TYPES: FieldType[] = ['SELECT', 'MULTI_SELECT', 'RADIO', 'CHECKBOX_GROUP']

const defaultField = (type: FieldType, order: number): CustomFieldDefinition => ({
  id: generateId(),
  type,
  label: '',
  required: false,
  order,
})

export function CustomFieldBuilder({ fields, onChange }: CustomFieldBuilderProps) {
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null)
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const [optionsText, setOptionsText] = useState('')

  const sortedFields = [...fields].sort((a, b) => a.order - b.order)

  function addField(type: FieldType) {
    const newField = defaultField(type, fields.length)
    setShowTypeSelector(false)
    setEditingField(newField)
    setOptionsText('')
  }

  function saveField(field: CustomFieldDefinition) {
    const exists = fields.some(f => f.id === field.id)
    const updated = exists
      ? fields.map(f => f.id === field.id ? field : f)
      : [...fields, field]
    onChange(updated.map((f, i) => ({ ...f, order: i })))
    setEditingField(null)
  }

  function deleteField(id: string) {
    onChange(fields.filter(f => f.id !== id).map((f, i) => ({ ...f, order: i })))
  }

  function moveField(id: string, direction: 'up' | 'down') {
    const sorted = [...fields].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex(f => f.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === sorted.length - 1) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const newFields = [...sorted]
    ;[newFields[idx], newFields[swapIdx]] = [newFields[swapIdx], newFields[idx]]
    onChange(newFields.map((f, i) => ({ ...f, order: i })))
  }

  function startEdit(field: CustomFieldDefinition) {
    setEditingField({ ...field })
    if (OPTION_FIELD_TYPES.includes(field.type)) {
      setOptionsText(field.options?.map(o => `${o.value}|${o.label}`).join('\n') ?? '')
    } else {
      setOptionsText('')
    }
  }

  function parseOptions(text: string): SelectOption[] {
    return text.split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [value, ...rest] = line.split('|')
        return { value: value.trim(), label: rest.join('|').trim() || value.trim() }
      })
      .filter(opt => opt.value !== '')
  }

  const hasOptions = editingField && OPTION_FIELD_TYPES.includes(editingField.type)

  return (
    <div className="space-y-3">
      {sortedFields.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
          No custom fields yet. Add fields to collect additional information from participants.
        </p>
      )}

      {sortedFields.map((field, idx) => (
        <Card key={field.id} className="bg-muted/30">
          <CardContent className="p-3 flex items-center gap-3">
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">{field.label || '(no label)'}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {FIELD_TYPE_LABELS[field.type]}
                </Badge>
                {field.required && (
                  <Badge variant="secondary" className="text-xs shrink-0">Required</Badge>
                )}
              </div>
              {field.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{field.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveField(field.id, 'up')}
                disabled={idx === 0}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveField(field.id, 'down')}
                disabled={idx === sortedFields.length - 1}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => startEdit(field)}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => deleteField(field.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowTypeSelector(true)}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Field
      </Button>

      {/* Type Selector Dialog */}
      <Dialog open={showTypeSelector} onOpenChange={setShowTypeSelector}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose Field Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Input Fields</p>
              <div className="grid grid-cols-2 gap-2">
                {INPUT_FIELD_TYPES.map(type => (
                  <Button
                    key={type}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => addField(type)}
                  >
                    {FIELD_TYPE_LABELS[type]}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Layout</p>
              <div className="grid grid-cols-2 gap-2">
                {LAYOUT_FIELD_TYPES.map(type => (
                  <Button
                    key={type}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => addField(type)}
                  >
                    {FIELD_TYPE_LABELS[type]}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Field Edit Dialog */}
      {editingField && (
        <Dialog open={!!editingField} onOpenChange={() => setEditingField(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {fields.some(f => f.id === editingField.id) ? 'Edit Field' : 'Add Field'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="field-label">
                  {editingField.type === 'HEADING' || editingField.type === 'PARAGRAPH'
                    ? 'Text'
                    : 'Label'}
                </Label>
                <Input
                  id="field-label"
                  value={editingField.label}
                  onChange={e => setEditingField({ ...editingField, label: e.target.value })}
                  placeholder={
                    editingField.type === 'HEADING'
                      ? 'Section title'
                      : editingField.type === 'PARAGRAPH'
                      ? 'Informational text'
                      : 'e.g. T-shirt size'
                  }
                />
              </div>

              {editingField.type !== 'HEADING' && editingField.type !== 'PARAGRAPH' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="field-description">Help text (optional)</Label>
                    <Input
                      id="field-description"
                      value={editingField.description ?? ''}
                      onChange={e => setEditingField({ ...editingField, description: e.target.value || undefined })}
                      placeholder="Short description shown below the field"
                    />
                  </div>

                  {(editingField.type === 'TEXT' || editingField.type === 'TEXTAREA' ||
                    editingField.type === 'EMAIL' || editingField.type === 'PHONE' ||
                    editingField.type === 'URL' || editingField.type === 'NUMBER') && (
                    <div className="space-y-2">
                      <Label htmlFor="field-placeholder">Placeholder (optional)</Label>
                      <Input
                        id="field-placeholder"
                        value={editingField.placeholder ?? ''}
                        onChange={e => setEditingField({ ...editingField, placeholder: e.target.value || undefined })}
                        placeholder="Placeholder text"
                      />
                    </div>
                  )}

                  {hasOptions && (
                    <div className="space-y-2">
                      <Label htmlFor="field-options">
                        Options <span className="text-muted-foreground font-normal">(one per line, format: value|Label)</span>
                      </Label>
                      <Textarea
                        id="field-options"
                        value={optionsText}
                        onChange={e => setOptionsText(e.target.value)}
                        placeholder={'none|No restrictions\nvegetarian|Vegetarian\nvegan|Vegan'}
                        rows={5}
                        className="font-mono text-sm"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label htmlFor="field-required" className="cursor-pointer">Required field</Label>
                    <Switch
                      id="field-required"
                      checked={editingField.required}
                      onCheckedChange={checked => setEditingField({ ...editingField, required: checked })}
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingField(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const fieldToSave = hasOptions
                    ? { ...editingField, options: parseOptions(optionsText) }
                    : editingField
                  saveField(fieldToSave)
                }}
                disabled={!editingField.label.trim()}
              >
                Save Field
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
