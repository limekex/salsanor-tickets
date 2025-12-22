'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { updateLanguagePreference } from '@/app/actions/update-language-preference'

interface LanguageSelectorProps {
  personProfileId: string
  currentLanguage: string
}

export function LanguageSelector({ personProfileId, currentLanguage }: LanguageSelectorProps) {
  const [language, setLanguage] = useState(currentLanguage)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await updateLanguagePreference(personProfileId, language)
      toast.success('Language preference updated')
    } catch (error) {
      console.error('Failed to update language:', error)
      toast.error('Failed to update language preference')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <RadioGroup value={language} onValueChange={setLanguage}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="no" id="no" />
          <Label htmlFor="no" className="font-normal cursor-pointer">
            🇳🇴 Norwegian (Norsk)
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="en" id="en" />
          <Label htmlFor="en" className="font-normal cursor-pointer">
            🇬🇧 English
          </Label>
        </div>
      </RadioGroup>

      {language !== currentLanguage && (
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Language Preference'}
        </Button>
      )}
    </div>
  )
}
