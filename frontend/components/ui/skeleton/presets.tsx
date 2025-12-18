import { Skeleton } from './Skeleton';

export function SkeletonCard() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-neutral-900/5 space-y-4">
      <Skeleton variant="title" width="60%" />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="80%" />
      <div className="flex gap-3 pt-2">
        <Skeleton variant="button" width="100px" />
        <Skeleton variant="button" width="100px" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton variant="text" width="100%" height="40px" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="text" width="100%" height="60px" />
      ))}
    </div>
  );
}

export function SkeletonForm() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton variant="text" width="80px" height="16px" />
        <Skeleton variant="button" width="100%" />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" width="100px" height="16px" />
        <Skeleton variant="button" width="100%" />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" width="120px" height="16px" />
        <Skeleton variant="card" width="100%" />
      </div>
      <div className="flex gap-3">
        <Skeleton variant="button" width="120px" />
        <Skeleton variant="button" width="120px" />
      </div>
    </div>
  );
}
