"use client";

import { Plus, Trash2, CheckCircle2, GripVertical, Settings2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { saveFormFields } from "@/app/admin/events/[id]/form-builder/actions";

export function FormBuilder({ event, initialFields }: { event: any, initialFields: any[] }) {
  const [fields, setFields] = useState(
    initialFields.length > 0 
      ? initialFields.map(f => ({
          ...f,
          // If it's a SELECT type and has JSON options, parse them back to a comma-separated string
          optionsStr: f.options ? JSON.parse(f.options).join(", ") : ""
        }))
      : [{ id: Date.now().toString(), name: "", type: "TEXT", optionsStr: "", isRequired: true }]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addField = () => {
    setFields([...fields, { id: Date.now().toString(), name: "", type: "TEXT", optionsStr: "", isRequired: true }]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f: any) => f.id !== id));
  };

  const updateField = (id: string, key: string, value: any) => {
    setFields(fields.map((f: any) => f.id === id ? { ...f, [key]: value } : f));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Custom Form Builder</h1>
          <p className="text-slate-500 mt-1">Buat pertanyaan tambahan untuk peserta event <span className="font-semibold text-emerald-600">{event.title}</span></p>
        </div>
        <Link 
          href="/admin/events" 
          className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition-colors"
        >
          Batal
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <form action={async (formData) => {
          setIsSubmitting(true);
          await saveFormFields(event.id, formData);
        }} className="p-8 space-y-8">
          
          <div>
            <div className="flex justify-between items-center border-b pb-4 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                <Settings2 className="w-5 h-5 mr-2 text-slate-500" />
                Daftar Pertanyaan Tambahan
              </h3>
              <button 
                type="button" 
                onClick={addField}
                className="flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg font-medium text-sm transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Tambah Pertanyaan
              </button>
            </div>

            <div className="space-y-4">
              {/* Locked Default Fields */}
              {[
                { name: "Nama Lengkap", type: "TEXT" },
                { name: "Alamat Email", type: "TEXT" },
                { name: "Nomor WhatsApp", type: "PHONE" }
              ].map((def, idx) => (
                <div key={`default-${idx}`} className="flex gap-4 items-start bg-slate-100/50 p-5 rounded-xl border border-slate-200">
                  <div className="mt-8 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-5">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Pertanyaan (Bawaan Sistem)</label>
                      <input 
                        type="text" 
                        value={def.name}
                        disabled
                        className="w-full px-3 py-2 rounded-md border border-slate-300 bg-slate-100 text-slate-500 outline-none text-sm cursor-not-allowed"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Tipe Jawaban</label>
                      <select 
                        disabled
                        className="w-full px-3 py-2 rounded-md border border-slate-300 bg-slate-100 text-slate-500 outline-none text-sm cursor-not-allowed"
                      >
                        <option>{def.type === "TEXT" ? "Teks Singkat" : "Nomor HP"}</option>
                      </select>
                    </div>
                    <div className="md:col-span-3 flex items-end h-full pb-2">
                      <label className="flex items-center cursor-not-allowed opacity-70">
                        <input 
                          type="checkbox" 
                          checked={true}
                          disabled
                          className="w-4 h-4 text-emerald-500 rounded border-slate-300 bg-slate-100"
                        />
                        <span className="ml-2 text-sm text-slate-600 font-medium">Wajib Diisi</span>
                      </label>
                    </div>
                  </div>
                  <div className="mt-8 flex justify-end pl-2 border-l border-slate-200">
                    <button type="button" disabled className="p-2 text-slate-300 cursor-not-allowed" title="Pertanyaan bawaan tidak bisa dihapus">
                      <Settings2 className="w-5 h-5 opacity-50" />
                    </button>
                  </div>
                </div>
              ))}

              {fields.map((field: any, index: number) => (
                <div key={field.id} className="flex gap-4 items-start bg-slate-50 p-5 rounded-xl border border-slate-200 group">
                  <div className="mt-8 text-slate-300 cursor-move">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                    <input type="hidden" name="fieldId[]" value={field.id} />
                    <input type="hidden" name="fieldRequired[]" value={field.isRequired.toString()} />
                    
                    <div className="md:col-span-5">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Pertanyaan</label>
                      <input 
                        type="text" 
                        name="fieldName[]"
                        value={field.name}
                        onChange={(e) => updateField(field.id, "name", e.target.value)}
                        required
                        placeholder="Misal: Ukuran Kaos"
                        className="w-full px-3 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                      />
                    </div>
                    
                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Tipe Jawaban</label>
                      <select 
                        name="fieldType[]"
                        value={field.type}
                        onChange={(e) => updateField(field.id, "type", e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-white"
                      >
                        <option value="TEXT">Teks Singkat</option>
                        <option value="NUMBER">Angka</option>
                        <option value="PHONE">Nomor HP</option>
                        <option value="FILE">Upload File / Gambar</option>
                        <option value="SELECT">Pilihan Ganda (Dropdown)</option>
                      </select>
                    </div>

                    <div className="md:col-span-3 flex items-end h-full pb-2">
                      <label className="flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={field.isRequired}
                          onChange={(e) => updateField(field.id, "isRequired", e.target.checked)}
                          className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-slate-600 font-medium">Wajib Diisi</span>
                      </label>
                    </div>

                    {field.type === "SELECT" && (
                      <div className="md:col-span-12 mt-2 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                        <label className="block text-xs font-medium text-indigo-800 mb-1">Opsi Pilihan (Pisahkan dengan koma)</label>
                        <input 
                          type="text" 
                          name="fieldOptions[]"
                          value={field.optionsStr}
                          onChange={(e) => updateField(field.id, "optionsStr", e.target.value)}
                          required={field.type === "SELECT"}
                          placeholder="Misal: S, M, L, XL, XXL"
                          className="w-full px-3 py-2 rounded-md border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                        />
                      </div>
                    )}

                    {field.type !== "SELECT" && (
                       <input type="hidden" name="fieldOptions[]" value="" />
                    )}
                  </div>
                  
                  <div className="mt-8 flex justify-end pl-2 border-l border-slate-200">
                    <button 
                      type="button" 
                      onClick={() => removeField(field.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus Pertanyaan"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6 border-t">
            <button 
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex justify-center items-center px-6 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-500/50 transition-all text-lg shadow-lg shadow-emerald-500/30 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isSubmitting ? (
                <span>Menyimpan Form...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6 mr-2" />
                  Simpan Struktur Form
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
