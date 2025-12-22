'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState, useTransition } from 'react'
import { Search } from 'lucide-react'

export function MembershipFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || 'ALL')

  function updateFilters(newSearch?: string, newStatus?: string) {
    const params = new URLSearchParams(searchParams.toString())
    
    const searchValue = newSearch !== undefined ? newSearch : search
    const statusValue = newStatus !== undefined ? newStatus : status
    
    if (searchValue) {
      params.set('search', searchValue)
    } else {
      params.delete('search')
    }
    
    if (statusValue && statusValue !== 'ALL') {
      params.set('status', statusValue)
    } else {
      params.delete('status')
    }
    
    startTransition(() => {
      router.push(`/staffadmin/memberships?${params.toString()}`)
    })
  }

  return (
    <div className="flex gap-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or member #..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            updateFilters(e.target.value, undefined)
          }}
          className="pl-9"
        />
      </div>
      
      <Select
        value={status}
        onValueChange={(value) => {
          setStatus(value)
          updateFilters(undefined, value)
        }}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Status</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="EXPIRED">Expired</SelectItem>
          <SelectItem value="CANCELLED">Cancelled</SelectItem>
          <SelectItem value="PENDING_PAYMENT">Pending Payment</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
