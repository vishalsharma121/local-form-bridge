import React from 'react';

export default function OverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse font-sans">
      {/* Top KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 bg-slate-200 rounded-full w-28" />
              <div className="w-10 h-10 rounded-2xl bg-slate-100 shrink-0" />
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <div className="h-8 bg-slate-200 rounded-lg w-20" />
              <div className="h-5 bg-slate-100 rounded-full w-16" />
            </div>
            <div className="h-3 bg-slate-100 rounded-full w-32" />
          </div>
        ))}
      </div>

      {/* Main Section: Banner & Breakdown Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Operations Hub Banner Skeleton */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
            <div className="h-5 bg-slate-200 rounded-full w-36" />
            <div className="h-7 bg-slate-200 rounded-lg w-64" />
            <div className="h-4 bg-slate-100 rounded-full w-full max-w-md" />
            <div className="flex gap-3 pt-2">
              <div className="h-10 bg-slate-200 rounded-2xl w-32" />
              <div className="h-10 bg-slate-100 rounded-2xl w-28" />
            </div>
          </div>

          {/* Subject Distribution Skeleton */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="h-4 bg-slate-200 rounded-full w-48" />
                <div className="h-3 bg-slate-100 rounded-full w-36" />
              </div>
              <div className="h-6 bg-slate-100 rounded-xl w-24" />
            </div>

            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3.5 bg-slate-200 rounded-full w-32" />
                    <div className="h-3.5 bg-slate-200 rounded-full w-16" />
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Recent Submissions Feed Skeleton) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="h-4 bg-slate-200 rounded-full w-36" />
                <div className="h-3 bg-slate-100 rounded-full w-28" />
              </div>
              <div className="h-4 bg-slate-100 rounded-full w-12" />
            </div>

            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50 space-y-2"
                >
                  <div className="flex justify-between">
                    <div className="h-3.5 bg-slate-200 rounded-full w-28" />
                    <div className="h-3 bg-slate-100 rounded-full w-16" />
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full w-40" />
                </div>
              ))}
            </div>
          </div>

          <div className="h-10 bg-slate-200 rounded-2xl w-full mt-4" />
        </div>
      </div>
    </div>
  );
}

