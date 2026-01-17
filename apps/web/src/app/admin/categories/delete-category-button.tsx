'use client'

import { deleteCategory } from '@/app/actions/categories'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function DeleteCategoryButton({ 
    categoryId, 
    categoryName,
    hasUsage 
}: { 
    categoryId: string
    categoryName: string
    hasUsage: boolean
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteCategory(categoryId)
            
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(`Category "${categoryName}" deleted`)
                setIsOpen(false)
                router.refresh()
            }
        })
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" disabled={hasUsage}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete the category "{categoryName}"? 
                        This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDelete}
                        disabled={isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isPending ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
