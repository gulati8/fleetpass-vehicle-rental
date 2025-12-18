'use client';

import { Card, CardContent } from '@/components/ui/card/Card';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';

interface VehicleSkeletonProps {
  viewMode?: 'grid' | 'list';
  count?: number;
}

function SingleVehicleSkeleton({ viewMode = 'grid' }: { viewMode?: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            {/* Image skeleton */}
            <Skeleton width="8rem" height="6rem" className="rounded-lg flex-shrink-0" />

            {/* Content skeleton */}
            <div className="flex-1 space-y-3">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <Skeleton width="12rem" height="1.5rem" />
                  <Skeleton width="8rem" height="1rem" />
                </div>
                <Skeleton width="5rem" height="1.5rem" className="rounded-full" />
              </div>

              <div className="flex gap-4">
                <Skeleton width="5rem" height="1rem" />
                <Skeleton width="4rem" height="1rem" />
                <Skeleton width="4rem" height="1rem" />
              </div>

              <div className="flex justify-between items-center">
                <Skeleton width="6rem" height="2rem" />
                <div className="flex gap-2">
                  <Skeleton width="4rem" height="2rem" className="rounded-lg" />
                  <Skeleton width="4rem" height="2rem" className="rounded-lg" />
                  <Skeleton width="4rem" height="2rem" className="rounded-lg" />
                </div>
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
        <Skeleton width="100%" height="12rem" className="rounded-t-xl" />
        <div className="p-4 space-y-3">
          <div>
            <Skeleton width="100%" height="1.5rem" className="mb-2" />
            <Skeleton width="60%" height="1rem" />
          </div>
          <div className="flex gap-3">
            <Skeleton width="4rem" height="0.875rem" />
            <Skeleton width="3rem" height="0.875rem" />
            <Skeleton width="3rem" height="0.875rem" />
          </div>
          <Skeleton width="100%" height="0.75rem" />
          <div className="border-t border-neutral-200 pt-3">
            <div className="flex justify-between items-center">
              <div>
                <Skeleton width="5rem" height="1.5rem" className="mb-1" />
                <Skeleton width="3rem" height="0.75rem" />
              </div>
              <div className="flex gap-2">
                <Skeleton width="3.5rem" height="2rem" className="rounded-lg" />
                <Skeleton width="3.5rem" height="2rem" className="rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function VehicleSkeleton({ viewMode = 'grid', count = 6 }: VehicleSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SingleVehicleSkeleton key={index} viewMode={viewMode} />
      ))}
    </>
  );
}
