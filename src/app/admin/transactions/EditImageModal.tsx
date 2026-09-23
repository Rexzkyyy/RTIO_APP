"use client";

import { useState, useRef } from "react";
import { CheckCircle2, X, Upload, ImageIcon, Loader2 } from "lucide-react";
import { uploadAdminProof } from "./uploadActions";

type EditImageModalProps = {
  transactionId: string;
  existingProofUrl?: string | null;
  onClose: () => void;
  onConfirm: (formData: FormData) => Promise<void>;
};

export default function EditImageModal({
  transactionId,
  existingProofUrl,
  onClose,
  onConfirm,
}: EditImageModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(existingProofUrl ?? null);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 5 * 1024 * 1024) {
      setError("Ukuran file maksimal 5MB.");
      return;
    }
    setError("");
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      setError("Pilih foto pengganti terlebih dahulu.");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      const { url } = await uploadAdminProof(uploadForm);

      setUploading(false);
      setSubmitting(true);

      const fd = new FormData();
      fd.append("id", transactionId);
      fd.append("paymentProofUrl", url);
      await onConfirm(fd);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat menyimpan gambar.");
      setUploading(false);
      setSubmitting(false);
    }
  }

  const isLoading = uploading || submitting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-800 text-lg">Edit Bukti Transfer</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* File Upload / Preview */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Pilih Foto Baru <span className="text-red-500">*</span>
            </label>

            {/* Drop Zone */}
            <div
              onClick={() => !isLoading && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer overflow-hidden ${
                preview
                  ? file
                    ? "border-blue-300 bg-blue-50/40"
                    : "border-slate-300 bg-slate-50/40"
                  : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 bg-slate-50"
              } ${isLoading ? "pointer-events-none opacity-60" : ""}`}
            >
              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview bukti TF"
                    className="w-full max-h-52 object-contain rounded-xl"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 rounded-xl">
                    <span className="bg-white/90 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" /> {file ? "Ganti Foto" : "Pilih Foto Pengganti"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <span className="block text-sm font-semibold text-slate-600">Klik untuk pilih foto</span>
                    <span className="text-xs text-slate-400">JPG, PNG, WEBP · Maks. 5MB</span>
                  </div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isLoading}
            />

            {file && (
              <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-blue-500" />
                {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading || !file}
              className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Mengupload...</>
              ) : submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Simpan Gambar</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
