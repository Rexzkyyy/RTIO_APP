"use client";

import { useState, useRef } from "react";
import { ArrowUpCircle, X, ChevronDown, ImageIcon, Upload, Loader2 } from "lucide-react";
import { uploadAdminProof } from "./uploadActions";

type Category = {
  id: string;
  name: string;
  price: number;
};

type UpgradeModalProps = {
  transactionId: string;
  currentCategoryId: string;
  currentCategoryName: string;
  currentPrice: number;
  totalTickets: number;
  categories: Category[];
  onClose: () => void;
  onConfirm: (formData: FormData) => Promise<void>;
};

export default function UpgradeModal({
  transactionId,
  currentCategoryId,
  currentCategoryName,
  currentPrice,
  totalTickets,
  categories,
  onClose,
  onConfirm,
}: UpgradeModalProps) {
  const [selectedCatId, setSelectedCatId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Only show categories with higher price (upgrade)
  const upgradableCategories = categories.filter(
    (c) => c.id !== currentCategoryId && c.price > currentPrice / totalTickets
  );

  const selectedCat = upgradableCategories.find((c) => c.id === selectedCatId);
  const pricePerTicket = currentPrice / totalTickets;
  const priceDiff = selectedCat
    ? (selectedCat.price - pricePerTicket) * totalTickets
    : 0;

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
    if (!selectedCatId) {
      setError("Pilih kategori tiket baru terlebih dahulu.");
      return;
    }
    if (!file) {
      setError("Pilih foto bukti transfer kedua terlebih dahulu.");
      return;
    }
    setError("");
    setUploading(true);

    let proofUrl2 = "";
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      const { url } = await uploadAdminProof(uploadForm);
      proofUrl2 = url;
    } catch (err: any) {
      setError("Gagal upload gambar: " + (err?.message || "Coba lagi."));
      setUploading(false);
      return;
    }

    setUploading(false);
    setSubmitting(true);

    const fd = new FormData();
    fd.append("transactionId", transactionId);
    fd.append("newCategoryId", selectedCatId);
    fd.append("paymentProofUrl2", proofUrl2);
    fd.append("priceDiff", String(priceDiff));
    fd.append("oldCategoryId", currentCategoryId);
    try {
      await onConfirm(fd);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  const isLoading = uploading || submitting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-violet-600" />
            <h2 className="font-bold text-slate-800 text-lg">Upgrade Tiket</h2>
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
          {/* Current category info */}
          <div className="bg-slate-50 rounded-xl p-4 text-sm border border-slate-100">
            <span className="text-slate-500 text-xs uppercase font-bold tracking-wider block mb-1">
              Kategori Saat Ini
            </span>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">{currentCategoryName}</span>
              <span className="text-slate-500">
                {totalTickets}x × Rp {pricePerTicket.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* New category picker */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Upgrade ke Kategori <span className="text-red-500">*</span>
            </label>
            {upgradableCategories.length === 0 ? (
              <div className="text-sm text-red-500 bg-red-50 rounded-xl p-3 border border-red-100">
                Tidak ada kategori yang lebih tinggi dari kategori saat ini.
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  disabled={isLoading}
                  className="w-full appearance-none pl-4 pr-10 py-3 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 bg-white disabled:opacity-60"
                >
                  <option value="">-- Pilih kategori baru --</option>
                  {upgradableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — Rp {c.price.toLocaleString("id-ID")} / tiket
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Price diff display */}
          {selectedCat && (
            <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-violet-700">Harga baru ({totalTickets}x)</span>
                <span className="font-semibold text-violet-800">
                  Rp {(selectedCat.price * totalTickets).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Sudah dibayar</span>
                <span className="text-slate-600">− Rp {currentPrice.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-violet-200 mt-2">
                <span className="text-violet-800">Selisih yang Harus Dibayar</span>
                <span className="text-violet-700">Rp {priceDiff.toLocaleString("id-ID")}</span>
              </div>
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Foto Bukti Transfer Kedua (Selisih) <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => !isLoading && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer overflow-hidden ${
                preview
                  ? "border-violet-300 bg-violet-50/40"
                  : "border-slate-300 hover:border-violet-400 hover:bg-violet-50/30 bg-slate-50"
              } ${isLoading ? "pointer-events-none opacity-60" : ""}`}
            >
              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview bukti TF kedua"
                    className="w-full max-h-48 object-contain rounded-xl"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 rounded-xl">
                    <span className="bg-white/90 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" /> Ganti Foto
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-7 gap-2 text-slate-400">
                  <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5" />
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
                <ImageIcon className="w-3 h-3 text-violet-500" />
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
              disabled={isLoading || !selectedCatId || !file}
              className="flex-1 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Mengupload...</>
              ) : submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
              ) : (
                <><ArrowUpCircle className="w-4 h-4" /> Konfirmasi Upgrade</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
