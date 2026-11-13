"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpCircle, RefreshCw, CheckCircle2, ImageIcon } from "lucide-react";
import UpgradeModal from "./UpgradeModal";
import ExpiredApproveModal from "./ExpiredApproveModal";
import EditImageModal from "./EditImageModal";
import {
  updateTransactionStatus,
  upgradeTicketCategory,
  reactivateTransaction,
  approveExpiredTransaction,
  updatePaymentProof,
} from "./actions";

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
  upgradeAction?: (formData: FormData) => Promise<any>;
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
  const actionToUse = upgradeAction || upgradeTicketCategory;

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
          onConfirm={actionToUse}
        />
      )}
    </>
  );
}

// -------- Reactivate Button (EXPIRED rows) --------
type ReactivateButtonProps = {
  transactionId: string;
  reactivateAction?: (formData: FormData) => Promise<any>;
  className?: string;
};

export function ReactivateButton({
  transactionId,
  reactivateAction,
  className = "",
}: ReactivateButtonProps) {
  const [loading, setLoading] = useState(false);
  const actionToUse = reactivateAction || reactivateTransaction;

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
      await actionToUse(fd);
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
  approveExpiredAction?: (formData: FormData) => Promise<any>;
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
  const actionToUse = approveExpiredAction || approveExpiredTransaction;

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
          onConfirm={actionToUse}
        />
      )}
    </>
  );
}

// -------- Edit Image Button (Any Status where Proof exists or is missing) --------
type EditImageButtonProps = {
  transactionId: string;
  existingProofUrl?: string | null;
  editImageAction?: (formData: FormData) => Promise<any>;
  className?: string;
};

export function EditImageButton({
  transactionId,
  existingProofUrl,
  editImageAction,
  className = "",
}: EditImageButtonProps) {
  const [open, setOpen] = useState(false);
  const actionToUse = editImageAction || updatePaymentProof;

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        className={`inline-flex items-center justify-center p-2 rounded-xl text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 shadow-sm border border-blue-100 transition-colors ${className}`}
        title="Edit Bukti Transfer"
      >
        <ImageIcon className="w-5 h-5" />
      </button>

      {open && (
        <EditImageModal
          transactionId={transactionId}
          existingProofUrl={existingProofUrl}
          onClose={() => setOpen(false)}
          onConfirm={actionToUse}
        />
      )}
    </>
  );
}

// -------- Approve & Reject Buttons (PENDING rows) --------
type ApproveRejectButtonsProps = {
  transactionId: string;
  isMobile?: boolean;
};

export function ApproveRejectButtons({
  transactionId,
  isMobile = false,
}: ApproveRejectButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVED" | "REJECTED" | null>(null);

  async function handleStatus(status: "APPROVED" | "REJECTED") {
    if (loading) return;

    if (status === "REJECTED") {
      const ok = confirm(
        "Yakin ingin menolak transaksi ini? Peserta akan diberi waktu 60 menit untuk mengunggah ulang bukti pembayaran."
      );
      if (!ok) return;
    }

    setLoading(status);

    try {
      // 1. Coba REST API Route terlebih dahulu (lebih stabil dan tidak terpengaruh RPC state)
      const res = await fetch("/api/admin/transactions/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: transactionId, status }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengubah status");
      }

      router.refresh();
    } catch (err: any) {
      console.warn("Direct API call failed, trying Server Action fallback...", err);
      try {
        const fd = new FormData();
        fd.append("id", transactionId);
        fd.append("status", status);
        await updateTransactionStatus(fd);
        router.refresh();
      } catch (fallbackErr: any) {
        alert(
          fallbackErr.message ||
            err.message ||
            "Terjadi kesalahan saat memproses status transaksi."
        );
      }
    } finally {
      setLoading(null);
    }
  }

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => handleStatus("REJECTED")}
          disabled={loading !== null}
          className="flex-1 py-2.5 bg-white border-2 border-red-100 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center text-sm"
        >
          {loading === "REJECTED" ? (
            <>
              <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
              Menolak...
            </>
          ) : (
            "Tolak"
          )}
        </button>
        <button
          type="button"
          onClick={() => handleStatus("APPROVED")}
          disabled={loading !== null}
          className="flex-1 py-2.5 bg-emerald-500 text-white font-bold hover:bg-emerald-600 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center text-sm"
        >
          {loading === "APPROVED" ? (
            <>
              <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
              Menyetujui...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Setujui
            </>
          )}
        </button>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => handleStatus("REJECTED")}
        disabled={loading !== null}
        className="px-4 py-2 bg-white border-2 border-red-100 text-red-600 font-bold hover:bg-red-50 hover:border-red-200 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center text-sm"
        title="Tolak"
      >
        {loading === "REJECTED" ? (
          <>
            <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
            Menolak...
          </>
        ) : (
          "Tolak"
        )}
      </button>
      <button
        type="button"
        onClick={() => handleStatus("APPROVED")}
        disabled={loading !== null}
        className="flex items-center px-5 py-2 bg-emerald-500 text-white font-bold hover:bg-emerald-600 rounded-xl transition-all shadow-sm disabled:opacity-50 text-sm"
        title="Setujui"
      >
        {loading === "APPROVED" ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Menyetujui...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Setujui
          </>
        )}
      </button>
    </>
  );
}
