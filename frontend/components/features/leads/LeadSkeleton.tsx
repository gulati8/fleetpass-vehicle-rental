'use client';

import { Card, CardContent } from '@/components/ui/card/Card';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';

interface LeadSkeletonProps {
  viewMode?: 'grid' | 'list';
  count?: number;
}

function SingleLeadSkeleton({ viewMode = 'grid' }: { viewMode?: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            {/* Avatar skeleton */}
            <Skeleton width="4rem" height="4rem" className="rounded-full flex-shrink-0" />

            {/* Content skeleton */}
            <div className="flex-1 space-y-3">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <Skeleton width="10rem" height="1.25rem" />
                  <Skeleton width="14rem" height="1rem" />
                </div>
                <div className="flex gap-2">
                  <Skeleton width="4rem" height="1.5rem" className="rounded-full" />
                  <Skeleton width="5rem" height="1.5rem" className="rounded-full" />
                </div>
              </div>

              <div className="flex gap-6 items-center">
                <Skeleton width="8rem" height="1rem" />
                <Skeleton width="8rem" height="1rem" />
              </div>

              <div className="flex justify-end gap-2">
                <Skeleton width="4rem" height="2rem" className="rounded-lg" />
                <Skeleton width="4rem" height="2rem" className="rounded-lg" />
                <Skeleton width="4rem" height="2rem" className="rounded-lg" />
                <Skeleton width="4rem" height="2rem" className="rounded-lg" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view skeleton
  return (
    <Card>
      <CardContent className="p-0">
        {/* Avatar header skeleton */}
        <div className="relative h-32 bg-neutral-100">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Skeleton width="5rem" height="5rem" className="rounded-full" />
          </div>
          <div className="absolute top-3 right-3 flex gap-2">
            <Skeleton width="3rem" height="1.5rem" className="rounded-full" />
            <Skeleton width="4rem" height="1.5rem" className="rounded-full" />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Name and email skeleton */}
          <div className="text-center space-y-2">
            <Skeleton width="60%" height="1.25rem" className="mx-auto" />
            <Skeleton width="80%" height="1rem" className="mx-auto" />
          </div>

          {/* Stats skeleton */}
          <div className="flex items-center justify-center gap-3 pb-3 border-b border-neutral-200">
            <Skeleton width="6rem" height="1rem" />
            <Skeleton width="6rem" height="1rem" />
          </div>

          {/* Actions skeleton */}
          <div className="flex gap-2 pt-2">
            <Skeleton width="33%" height="2rem" className="rounded-lg" />
            <Skeleton width="33%" height="2rem" className="rounded-lg" />
            <Skeleton width="33%" height="2rem" className="rounded-lg" />
          </div>
          <div className="mt-2">
            <Skeleton width="100%" height="2rem" className="rounded-lg" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LeadSkeleton({ viewMode = 'grid', count }: LeadSkeletonProps) {
  const defaultCount = viewMode === 'grid' ? 6 : 10;
  const skeletonCount = count ?? defaultCount;

  return (
    <>
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <SingleLeadSkeleton key={index} viewMode={viewMode} />
      ))}
    </>
  );
}
