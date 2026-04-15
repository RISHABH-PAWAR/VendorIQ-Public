export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        {/* Animated VendorIQ logo */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-xl bg-brand/20 animate-pulse-slow" />
          <div className="absolute inset-0 rounded-xl border-2 border-brand/40 animate-spin" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-brand font-mono font-bold text-lg">V</span>
          </div>
        </div>
        <div className="space-y-2 w-48">
          <div className="skeleton h-2 w-full" />
          <div className="skeleton h-2 w-3/4 mx-auto" />
        </div>
      </div>
    </div>
  );
}
