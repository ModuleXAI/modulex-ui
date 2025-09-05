'use client'

import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsTabsLoading() {
  return (
    <div className="w-full p-6 space-y-4">
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}


