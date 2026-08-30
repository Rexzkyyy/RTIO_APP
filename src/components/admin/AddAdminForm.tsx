"use client";

import { useState } from "react";
import { Mail, PlusCircle, ShieldAlert } from "lucide-react";

type EventOption = {
  id: string;
  title: string;
};

type AddAdminFormProps = {
  events: EventOption[];
  action: (formData: FormData) => void;
};

export default function AddAdminForm({ events, action }: AddAdminFormProps) {
  const [role, setRole] = useState("SUPER_ADMIN");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
        <PlusCircle className="w-5 h-5 mr-2 text-emerald-500" />
        Daftarkan Admin Baru
      </h2>
      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Mail className="h-5 w-5" />
            </div>
            <input 
              type="email" 
              name="email"
              required
              placeholder="Masukkan email Google (misal: budi@gmail.com)"
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
            />
          </div>
          
          <select 
            name="role" 
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full sm:w-48 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-700"
          >
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="VALIDATOR">Validator</option>
          </select>

          <button 
            type="submit"
            className="py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md transition-all whitespace-nowrap active:scale-95"
          >
            Simpan Akses
          </button>
        </div>

        {role === "VALIDATOR" && (
          <div className="mt-2 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
            <p className="font-bold text-sm text-slate-700 mb-3">Pilih Event yang dapat divalidasi:</p>
            {events.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Belum ada event yang tersedia.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {events.map((event) => (
                  <label key={event.id} className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors">
                    <input 
                      type="checkbox" 
                      name="eventIds" 
                      value={event.id}
                      className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 border-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-700 line-clamp-1">{event.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </form>
      <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-lg flex items-start">
        <ShieldAlert className="w-5 h-5 mr-2 shrink-0 mt-0.5 opacity-70" />
        <p>
          <strong>Informasi:</strong> Akun yang didaftarkan wajib menggunakan email Google (Gmail atau Google Workspace). Sistem otomatis memverifikasi melalui Google Login.
        </p>
      </div>
    </div>
  );
}
