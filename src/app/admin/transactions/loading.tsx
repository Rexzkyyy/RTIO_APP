export default function TransactionsLoading() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <div className="h-8 bg-slate-200 rounded-lg w-64 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-80"></div>
        </div>
        <div className="h-10 bg-slate-200 rounded-lg w-full md:w-64"></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-8 bg-slate-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-3">
          <div className="h-10 bg-slate-200 rounded-lg w-64"></div>
          <div className="h-10 bg-slate-200 rounded-lg w-32"></div>
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-slate-50 rounded-xl w-full"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
