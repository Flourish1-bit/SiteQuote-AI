import React from "react";

export function SkeletonBox({ className = "" }) {
  return (
    <div
      className={`bg-slate-800/60 rounded-xl animate-pulse ${className}`}
    />
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <SkeletonBox className="h-3 w-24" />
        <SkeletonBox className="h-8 w-8 rounded-xl" />
      </div>
      <SkeletonBox className="h-7 w-32" />
      <SkeletonBox className="h-3 w-40" />
    </div>
  );
}

export function LeadCardSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonBox className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5">
            <SkeletonBox className="h-4 w-32" />
            <SkeletonBox className="h-3 w-24" />
          </div>
        </div>
        <SkeletonBox className="h-6 w-20 rounded-full" />
      </div>

      <SkeletonBox className="h-12 w-full rounded-xl" />

      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <SkeletonBox className="h-3 w-20" />
        <SkeletonBox className="h-8 w-28 rounded-xl" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr className="animate-pulse border-b border-slate-800/60">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <SkeletonBox className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function ProposalViewerSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex justify-between items-center">
          <SkeletonBox className="h-6 w-48" />
          <SkeletonBox className="h-7 w-24 rounded-full" />
        </div>
        <SkeletonBox className="h-8 w-3/4" />
        <SkeletonBox className="h-16 w-full rounded-xl" />
      </div>

      {/* Grid Specs Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl space-y-2">
            <SkeletonBox className="h-3 w-16" />
            <SkeletonBox className="h-5 w-24" />
          </div>
        ))}
      </div>

      {/* Line Items Table Skeleton */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <SkeletonBox className="h-5 w-36" />
        <div className="space-y-3">
          <SkeletonBox className="h-10 w-full" />
          <SkeletonBox className="h-10 w-full" />
          <SkeletonBox className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
