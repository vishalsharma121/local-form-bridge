import React from 'react';

export default function OverviewSkeleton() {
  return (
    <div className="flex flex-col space-y-4 animate-pulse font-sans w-full pb-0">
      {/* 1. Executive Operations Bar Skeleton */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-4.5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 bg-slate-200 rounded-lg w-48" />
            <div className="h-3 bg-slate-100 rounded-lg w-64" />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-32 bg-slate-200 rounded-xl" />
          <div className="h-9 w-24 bg-slate-100 rounded-xl" />
        </div>
      </div>

      {/* 2. Top KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 shrink-0">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 bg-slate-200 rounded-full w-28" />
              <div className="w-9 h-9 rounded-2xl bg-slate-100 shrink-0" />
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <div className="h-8 bg-slate-200 rounded-lg w-20" />
              <div className="h-5 bg-slate-100 rounded-full w-16" />
            </div>
            <div className="h-3 bg-slate-100 rounded-full w-32" />
          </div>
        ))}
      </div>

      {/* 3. Main Section: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 w-full items-start">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* CRM Channel Breakdown Card Skeleton */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex justify-between items-center pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 bg-slate-200 rounded-lg w-52" />
                  <div className="h-3 bg-slate-100 rounded-lg w-72" />
                </div>
              </div>
              <div className="h-6 w-24 bg-slate-100 rounded-full" />
            </div>

            <div className="space-y-3 pt-2">
              <div className="h-3.5 bg-slate-100 rounded-full w-full" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="h-28 bg-slate-50 border border-slate-200/60 rounded-3xl" />
                <div className="h-28 bg-slate-50 border border-slate-200/60 rounded-3xl" />
              </div>
            </div>
          </div>

          {/* Deals Pipeline Stages Skeleton */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex justify-between items-center pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 bg-slate-200 rounded-lg w-48" />
                  <div className="h-3 bg-slate-100 rounded-lg w-64" />
                </div>
              </div>
              <div className="h-4 w-20 bg-slate-100 rounded-lg" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-slate-50 border border-slate-200/60 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column Skeleton */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div className="h-8 w-44 bg-slate-100 rounded-2xl" />
            <div className="h-4 w-14 bg-slate-100 rounded-lg" />
          </div>

          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-14 bg-slate-50 border border-slate-200/60 rounded-2xl" />
            ))}
          </div>

          <div className="h-10 bg-slate-200 rounded-2xl w-full mt-3" />
        </div>
      </div>
    </div>
  );
}
