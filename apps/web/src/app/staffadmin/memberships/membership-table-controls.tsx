'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useState, useTransition } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

interface MembershipTableControlsProps {
  currentPage: number
  totalPages: number
  perPage: number
  totalCount: number
}

export function MembershipTableControls({ 
  currentPage, 
  totalPages, 
  perPage, 
  totalCount 
}: MembershipTableControlsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || 'ALL')

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    
    startTransition(() => {
      router.push(`/staffadmin/memberships?${params.toString()}`)
    })
  }

  function handleSearch(value: string) {
    setSearch(value)
    updateParams({ search: value || null, page: '1' })
  }

  function handleStatusChange(value: string) {
    setStatus(value)
    updateParams({ status: value === 'ALL' ? null : value, page: '1' })
  }

  function handlePerPageChange(value: string) {
    updateParams({ perPage: value, page: '1' })
  }

  function handlePageChange(newPage: number) {
    updateParams({ page: newPage.toString() })
  }

  const startRecord = (currentPage - 1) * perPage + 1
  const endRecord = Math.min(currentPage * perPage, totalCount)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or member #..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
            disabled={isPending}
          />
        </div>
        
        <Select value={status} onValueChange={handleStatusChange} disabled={isPending}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={perPage.toString()} onValueChange={handlePerPageChange} disabled={isPending}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 per page</SelectItem>
            <SelectItem value="25">25 per page</SelectItem>
            <SelectItem value="50">50 per page</SelectItem>
            <SelectItem value="100">100 per page</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {startRecord} to {endRecord} of {totalCount} memberships
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isPending}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isPending}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
