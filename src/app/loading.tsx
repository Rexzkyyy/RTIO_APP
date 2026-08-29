export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar skeleton */}
      <div className="bg-white border-b border-slate-200 h-16 sm:h-20 flex items-center px-4 sm:px-6">
        <div className="w-[120px] h-8 bg-slate-200 rounded animate-pulse"></div>
        <div className="ml-auto flex gap-3">
          <div className="w-16 h-8 bg-slate-100 rounded-full animate-pulse hidden sm:block"></div>
          <div className="w-8 h-8 bg-slate-100 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Hero skeleton */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6">
        <div className="w-full h-[200px] sm:h-[300px] bg-slate-200 rounded-2xl animate-pulse"></div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="w-32 h-6 bg-slate-200 rounded animate-pulse mb-2"></div>
            <div className="w-48 h-4 bg-slate-100 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="h-28 sm:h-48 bg-slate-200 animate-pulse"></div>
              <div className="p-3 sm:p-6 space-y-3">
                <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4"></div>
                <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2"></div>
                <div className="h-5 bg-slate-200 rounded animate-pulse w-1/3 mt-4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
