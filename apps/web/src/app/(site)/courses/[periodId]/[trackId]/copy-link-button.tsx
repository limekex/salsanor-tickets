'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CopyLinkButtonProps {
    url: string
}

export function CopyLinkButton({ url }: CopyLinkButtonProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        const fullUrl = `${window.location.origin}${url}`
        await navigator.clipboard.writeText(fullUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCopy}
            className="h-auto py-rn-1 px-rn-2 text-rn-text-muted hover:text-rn-text"
        >
            <code className="text-xs bg-rn-surface-2 px-rn-2 py-rn-1 rounded">
                {url}
            </code>
            {copied ? (
                <Check className="h-3 w-3 ml-rn-1 text-rn-success" />
            ) : (
                <Copy className="h-3 w-3 ml-rn-1" />
            )}
        </Button>
    )
}
