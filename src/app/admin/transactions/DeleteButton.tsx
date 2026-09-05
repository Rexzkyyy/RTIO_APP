"use client";

import { Trash2 } from "lucide-react";

export function DeleteButton({ className = "" }: { className?: string }) {
  return (
    <button 
      type="submit" 
      onClick={(e) => {
        if (!confirm('Yakin ingin menghapus data ini? Data yang dihapus tidak dapat dikembalikan.')) {
          e.preventDefault();
        }
      }}
      className={`bg-white border-2 border-slate-200 text-slate-600 font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center justify-center ${className}`} 
      title="Hapus"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
