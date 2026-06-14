export default function StudentDashboardLoading() {
  return (
    <div className="min-h-screen bg-bg flex animate-pulse">

      {/* Sidebar skeleton */}
      <div className="hidden lg:flex flex-col w-64 bg-card border-r border-border p-4 gap-3 shrink-0">
        <div className="h-10 bg-bg2 rounded-xl mb-2" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-9 bg-bg2 rounded-xl" />
        ))}
        <div className="mt-auto h-16 bg-bg2 rounded-xl" />
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="h-16 bg-card border-b border-border px-6 flex items-center gap-4">
          <div className="h-6 w-48 bg-bg2 rounded-lg" />
          <div className="ml-auto h-8 w-8 bg-bg2 rounded-full" />
        </div>

        {/* Page content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                <div className="h-4 w-20 bg-bg2 rounded" />
                <div className="h-7 w-12 bg-bg2 rounded" />
              </div>
            ))}
          </div>

          {/* Content cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="h-36 bg-bg2" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-bg2 rounded w-3/4" />
                  <div className="h-3 bg-bg2 rounded w-1/2" />
                  <div className="h-2 bg-bg2 rounded-full w-full mt-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
