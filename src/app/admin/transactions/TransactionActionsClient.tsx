"use client";

import { useState } from "react";
import { ArrowUpCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import UpgradeModal from "./UpgradeModal";
import ExpiredApproveModal from "./ExpiredApproveModal";

type Category = {
  id: string;
  name: string;
  price: number;
};

// -------- Upgrade Button (APPROVED rows) --------
type UpgradeButtonProps = {
  transactionId: string;
  currentCategoryId: string;
  currentCategoryName: string;
  currentPrice: number;
  totalTickets: number;
  categories: Category[];
  upgradeAction: (formData: FormData) => Promise<void>;
  className?: string;
};

export function UpgradeButton({
  transactionId,
  currentCategoryId,
  currentCategoryName,
  currentPrice,
  totalTickets,
  categories,
  upgradeAction,
  className = "",
}: UpgradeButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center text-sm font-bold rounded-xl text-white bg-violet-600 hover:bg-violet-700 shadow-sm transition-colors ${className}`}
      >
        <ArrowUpCircle className="w-4 h-4 mr-1.5" />
        Upgrade
      </button>

      {open && (
        <UpgradeModal
          transactionId={transactionId}
          currentCategoryId={currentCategoryId}
          currentCategoryName={currentCategoryName}
          currentPrice={currentPrice}
          totalTickets={totalTickets}
          categories={categories}
          onClose={() => setOpen(false)}
          onConfirm={upgradeAction}
        />
      )}
    </>
  );
}

// -------- Reactivate Button (EXPIRED rows) --------
type ReactivateButtonProps = {
  transactionId: string;
  reactivateAction: (formData: FormData) => Promise<void>;
  className?: string;
};

export function ReactivateButton({
  transactionId,
  reactivateAction,
  className = "",
}: ReactivateButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (
      !confirm(
        "Reaktivasi transaksi ini? Status akan kembali ke PENDING dan kuota tiket akan dikurangi kembali."
      )
    )
      return;
    setLoading(true);
    const fd = new FormData();
    fd.append("id", transactionId);
    try {
      await reactivateAction(fd);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center text-sm font-bold rounded-xl text-white bg-amber-500 hover:bg-amber-600 shadow-sm transition-colors disabled:opacity-60 ${className}`}
    >
      <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Memproses..." : "Reaktivasi"}
    </button>
  );
}

// -------- Expired Approve Button (EXPIRED rows — langsung approve dengan bukti TF) --------
type ExpiredApproveButtonProps = {
  transactionId: string;
  buyerName: string;
  categoryName: string;
  ticketCategoryId: string;
  totalTickets: number;
  existingProofUrl?: string | null;
  existingSenderName?: string | null;
  approveExpiredAction: (formData: FormData) => Promise<void>;
  className?: string;
};

export function ExpiredApproveButton({
  transactionId,
  buyerName,
  categoryName,
  ticketCategoryId,
  totalTickets,
  existingProofUrl,
  existingSenderName,
  approveExpiredAction,
  className = "",
}: ExpiredApproveButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center text-sm font-bold rounded-xl text-white ${
          existingProofUrl
            ? "bg-emerald-600 hover:bg-emerald-700"
            : "bg-slate-600 hover:bg-slate-700"
        } shadow-sm transition-colors ${className}`}
      >
        <CheckCircle2 className="w-4 h-4 mr-1.5" />
        {existingProofUrl ? "Verifikasi & Approve" : "Input Bukti & Approve"}
      </button>

      {open && (
        <ExpiredApproveModal
          transactionId={transactionId}
          buyerName={buyerName}
          categoryName={categoryName}
          ticketCategoryId={ticketCategoryId}
          totalTickets={totalTickets}
          existingProofUrl={existingProofUrl}
          existingSenderName={existingSenderName}
          onClose={() => setOpen(false)}
          onConfirm={approveExpiredAction}
        />
      )}
    </>
  );
}
