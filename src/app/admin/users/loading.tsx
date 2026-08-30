export default function UsersLoading() {
  return (
    <div className="w-full space-y-8 animate-pulse">
      <div className="mb-8">
        <div className="h-8 bg-slate-200 rounded-lg w-64 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-96"></div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="h-6 bg-slate-200 rounded w-48 mb-4"></div>
        <div className="h-12 bg-slate-200 rounded-lg w-full"></div>
        <div className="h-12 bg-emerald-100 rounded-lg w-32"></div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between">
          <div className="h-6 bg-slate-200 rounded w-40"></div>
          <div className="h-10 bg-slate-200 rounded-lg w-64"></div>
        </div>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 sm:p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0"></div>
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-slate-200 rounded w-48"></div>
                <div className="h-4 bg-slate-200 rounded w-32"></div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
