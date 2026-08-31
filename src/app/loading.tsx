import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 z-[9999] fixed inset-0">
      <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-3" />
        <p className="text-slate-600 font-bold text-sm animate-pulse">Memuat...</p>
      </div>
    </div>
  );
}
