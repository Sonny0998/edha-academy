export default function AdminDashboardLoading() {
  return (
    <div className="min-h-screen bg-bg flex animate-pulse">

      {/* Sidebar skeleton */}
      <div className="hidden lg:flex flex-col w-64 bg-card border-r border-border p-4 gap-3 shrink-0">
        <div className="h-10 bg-bg2 rounded-xl mb-2" />
        {[...Array(9)].map((_, i) => (
          <div key={i} className="h-9 bg-bg2 rounded-xl" />
        ))}
        <div className="mt-auto h-16 bg-bg2 rounded-xl" />
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="h-16 bg-card border-b border-border px-6 flex items-center gap-4">
          <div className="h-6 w-40 bg-bg2 rounded-lg" />
          <div className="ml-auto flex gap-2">
            <div className="h-8 w-8 bg-bg2 rounded-full" />
            <div className="h-8 w-8 bg-bg2 rounded-full" />
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                <div className="h-4 w-24 bg-bg2 rounded" />
                <div className="h-8 w-16 bg-bg2 rounded" />
                <div className="h-3 w-20 bg-bg2 rounded" />
              </div>
            ))}
          </div>

          {/* Two column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-border">
                  <div className="h-5 w-36 bg-bg2 rounded" />
                </div>
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                    <div className="h-8 w-8 bg-bg2 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-bg2 rounded w-3/4" />
                      <div className="h-3 bg-bg2 rounded w-1/2" />
                    </div>
                    <div className="h-6 w-16 bg-bg2 rounded-full" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
