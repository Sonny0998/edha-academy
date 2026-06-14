export default function InstitutionDashboardLoading() {
  return (
    <div className="min-h-screen bg-bg flex animate-pulse">
      <div className="hidden lg:flex flex-col w-64 bg-card border-r border-border p-4 gap-3 shrink-0">
        <div className="h-10 bg-bg2 rounded-xl mb-2" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-9 bg-bg2 rounded-xl" />
        ))}
        <div className="mt-auto h-16 bg-bg2 rounded-xl" />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-16 bg-card border-b border-border px-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-bg2 rounded-xl" />
          <div className="h-6 w-48 bg-bg2 rounded-lg" />
          <div className="ml-auto flex gap-3">
            <div className="h-9 w-32 bg-bg2 rounded-xl" />
            <div className="h-9 w-28 bg-bg2 rounded-xl" />
          </div>
        </div>
        <div className="flex-1 p-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                <div className="h-10 w-10 bg-bg2 rounded-xl" />
                <div className="h-7 w-12 bg-bg2 rounded" />
                <div className="h-3 w-20 bg-bg2 rounded" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-5 flex gap-4">
                <div className="w-16 h-16 bg-bg2 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-bg2 rounded w-3/4" />
                  <div className="h-3 bg-bg2 rounded w-1/2" />
                  <div className="h-5 w-20 bg-bg2 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div> 
      </div>
    </div>
  )
}