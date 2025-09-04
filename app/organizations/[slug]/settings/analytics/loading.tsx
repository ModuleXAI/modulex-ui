"use client"

import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="p-6 pt-14 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 w-32"><Skeleton className="h-6 w-32" /></div>
          <div className="mt-2 h-4 w-56"><Skeleton className="h-4 w-56" /></div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-8 w-12" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-[#292929] p-4 sm:p-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <Skeleton className="h-18 w-18 rounded-full" />
            <div>
              <Skeleton className="h-3 w-28" />
              <div className="mt-2"><Skeleton className="h-4 w-24" /></div>
            </div>
          </div>
          <div className="my-6"><Skeleton className="h-px w-full" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-md border border-[#2F2F2F] p-4"><Skeleton className="h-6 w-24" /><div className="mt-2"><Skeleton className="h-6 w-20" /></div></div>
            <div className="rounded-md border border-[#2F2F2F] p-4"><Skeleton className="h-6 w-32" /><div className="mt-2"><Skeleton className="h-6 w-24" /></div></div>
            <div className="rounded-md border border-[#2F2F2F] p-4"><Skeleton className="h-6 w-40" /><div className="mt-2"><Skeleton className="h-6 w-28" /></div></div>
          </div>
        </div>
        <div className="rounded-lg border border-[#292929] p-4 sm:p-6">
          <Skeleton className="h-4 w-28 mb-3" />
          <Skeleton className="h-5 w-48" />
          <div className="my-4"><Skeleton className="h-px w-full" /></div>
          <Skeleton className="h-4 w-28 mb-3" />
          <Skeleton className="h-5 w-60" />
        </div>
      </div>

      <div className="rounded-lg border border-[#292929]">
        <div className="h-10 border-b border-[#292929]"><Skeleton className="h-10 w-full" /></div>
        <div className="h-80"><Skeleton className="h-full w-full" /></div>
      </div>
    </div>
  )
}


