import React from 'react';

// Reusable skeleton component with shimmer effect
const Skeleton = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] rounded ${className}`}
        style={{ animation: 'shimmer 1.5s infinite' }} />
);

// Balance Card Skeleton
export const BalanceCardSkeleton = () => (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#242424] p-5 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2 mb-3">
            <Skeleton className="w-16 h-4" />
        </div>
        <Skeleton className="w-32 h-10 mb-2" />
        <div className="flex items-center gap-2">
            <Skeleton className="w-20 h-4" />
        </div>
    </div>
);

// Transaction Item Skeleton
export const TransactionItemSkeleton = () => (
    <div className="flex items-center gap-4 p-3 bg-[#1a1a1a] rounded-xl border border-white/5">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1">
            <Skeleton className="w-24 h-4 mb-2" />
            <Skeleton className="w-16 h-3" />
        </div>
        <div className="text-right">
            <Skeleton className="w-20 h-5 mb-1" />
            <Skeleton className="w-14 h-3" />
        </div>
    </div>
);

// Transaction List Skeleton
export const TransactionListSkeleton = () => (
    <div className="space-y-3">
        <TransactionItemSkeleton />
        <TransactionItemSkeleton />
        <TransactionItemSkeleton />
    </div>
);

// Quick Actions Skeleton
export const QuickActionsSkeleton = () => (
    <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-14 h-14 rounded-2xl" />
                <Skeleton className="w-12 h-3" />
            </div>
        ))}
    </div>
);

// Full Dashboard Skeleton
export const DashboardSkeleton = () => (
    <div className="px-5 space-y-6">
        <BalanceCardSkeleton />
        <QuickActionsSkeleton />
        <div>
            <Skeleton className="w-28 h-5 mb-4" />
            <TransactionListSkeleton />
        </div>
    </div>
);

// Add shimmer keyframes to global styles
const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;

// Inject shimmer animation
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = shimmerKeyframes;
    if (!document.head.querySelector('[data-skeleton-shimmer]')) {
        style.setAttribute('data-skeleton-shimmer', 'true');
        document.head.appendChild(style);
    }
}

export default Skeleton;
