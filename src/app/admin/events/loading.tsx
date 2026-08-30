export default function EventsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <div className="h-8 bg-slate-200 rounded-lg w-48 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-64"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 bg-slate-200 rounded-lg w-64"></div>
          <div className="h-10 bg-slate-200 rounded-lg w-40"></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="hidden md:block">
          <div className="h-12 bg-slate-50 border-b border-slate-200 w-full"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-white border-b border-slate-100 w-full flex items-center px-6 gap-4">
              <div className="h-5 bg-slate-200 rounded w-1/4"></div>
              <div className="h-5 bg-slate-200 rounded w-1/5"></div>
              <div className="h-5 bg-slate-200 rounded w-1/5"></div>
              <div className="h-6 bg-slate-200 rounded-full w-16"></div>
            </div>
          ))}
        </div>
        <div className="md:hidden space-y-4 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-slate-50 rounded-xl w-full"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
