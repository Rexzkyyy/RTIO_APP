"use client";

import { useState, useRef } from "react";
import { CheckCircle2, X, Upload, User, AlertTriangle, ImageIcon, Loader2 } from "lucide-react";
import { uploadAdminProof } from "./uploadActions";

type ExpiredApproveModalProps = {
  transactionId: string;
  buyerName: string;
  categoryName: string;
  ticketCategoryId: string;
  totalTickets: number;
  existingProofUrl?: string | null;
  existingSenderName?: string | null;
  onClose: () => void;
  onConfirm: (formData: FormData) => Promise<void>;
};

export default function ExpiredApproveModal({
  transactionId,
  buyerName,
  categoryName,
  totalTickets,
  existingProofUrl,
  existingSenderName,
  onClose,
  onConfirm,
}: ExpiredApproveModalProps) {
  const [senderName, setSenderName] = useState(existingSenderName ?? "");
  // Jika sudah ada bukti TF, pakai URL lama sebagai "preview awal"
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(existingProofUrl ?? null);
  // URL yang akan dipakai: file baru (jika diupload ulang) atau URL lama
  const [existingUrl] = useState<string | null>(existingProofUrl ?? null);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasExistingProof = !!existingProofUrl;

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

    // Wajib ada bukti TF: bisa dari file baru atau URL lama
    if (!file && !existingUrl) {
      setError("Pilih foto bukti transfer terlebih dahulu.");
      return;
    }
    if (!senderName.trim()) {
      setError("Nama rekening pengirim wajib diisi.");
      return;
    }
    setError("");

    let proofUrl = existingUrl ?? "";

    // Jika ada file baru yang dipilih, upload dulu
    if (file) {
      setUploading(true);
      try {
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        const { url } = await uploadAdminProof(uploadForm);
        proofUrl = url;
      } catch (err: any) {
        setError("Gagal upload gambar: " + (err?.message || "Coba lagi."));
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    setSubmitting(true);
    const fd = new FormData();
    fd.append("id", transactionId);
    fd.append("paymentProofUrl", proofUrl);
    fd.append("senderAccountName", senderName.trim());
    try {
      await onConfirm(fd);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat approve.");
    } finally {
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-slate-800 text-lg">
              {hasExistingProof ? "Verifikasi & Approve" : "Input Bukti & Approve"}
            </h2>
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
          {/* Warning */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              Transaksi ini berstatus <strong>EXPIRED</strong>. Approve langsung akan menggunakan kembali kuota tiket yang sudah dikembalikan.
            </p>
          </div>

          {/* Buyer Info */}
          <div className="bg-slate-50 rounded-xl p-4 text-sm border border-slate-100">
            <span className="text-slate-500 text-xs uppercase font-bold tracking-wider block mb-1">Peserta</span>
            <div className="font-semibold text-slate-700">{buyerName}</div>
            <div className="text-slate-500 text-xs mt-0.5">{totalTickets}x {categoryName}</div>
          </div>

          {/* File Upload / Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-700">
                Foto Bukti Transfer {!hasExistingProof && <span className="text-red-500">*</span>}
              </label>
              {hasExistingProof && !file && (
                <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ✓ Sudah ada bukti TF
                </span>
              )}
              {file && (
                <span className="text-xs text-violet-600 font-semibold bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                  Foto baru dipilih
                </span>
              )}
            </div>

            {/* Drop Zone */}
            <div
              onClick={() => !isLoading && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer overflow-hidden ${
                preview
                  ? file
                    ? "border-violet-300 bg-violet-50/40"
                    : "border-emerald-300 bg-emerald-50/40"
                  : "border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/30 bg-slate-50"
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
                      <Upload className="w-3.5 h-3.5" /> {file ? "Ganti Foto" : "Ganti dengan Foto Baru"}
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

            {file ? (
              <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-violet-500" />
                {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            ) : hasExistingProof ? (
              <p className="text-xs text-slate-400 mt-1.5">
                Klik gambar di atas jika ingin mengganti dengan foto baru.
              </p>
            ) : null}
          </div>

          {/* Sender Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nama Rekening Pengirim <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Nama sesuai rekening bank pengirim"
                required
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 disabled:opacity-60"
              />
            </div>
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
              disabled={isLoading || (!file && !existingUrl) || !senderName}
              className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Mengupload...</>
              ) : submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Approve Sekarang</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
