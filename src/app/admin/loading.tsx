export default function GlobalAdminLoading() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      <div className="h-10 bg-slate-200 rounded-lg w-1/4 mb-4"></div>
      <div className="h-4 bg-slate-200 rounded w-1/3 mb-8"></div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="h-8 bg-slate-200 rounded-full w-8"></div>
            <div className="h-6 bg-slate-200 rounded w-1/2"></div>
            <div className="h-10 bg-slate-200 rounded-lg w-full mt-4"></div>
          </div>
        ))}
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-64 mt-8 p-6 space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4 mb-6"></div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-slate-50 rounded-lg w-full"></div>
        ))}
      </div>
    </div>
  );
}
