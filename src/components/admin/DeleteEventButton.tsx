"use client";

import { useState } from "react";
import { deleteEvent } from "@/app/admin/events/actions";

export function DeleteEventButton({ id, className }: { id: string, className?: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirm("Apakah Anda yakin ingin menghapus event ini? Semua data tiket dan pendaftaran akan ikut terhapus.")) {
      setIsDeleting(true);
      const res = await deleteEvent(id);
      if (res?.error) {
        alert("Gagal menghapus event: " + res.error);
      }
      setIsDeleting(false);
    }
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={isDeleting}
      className={className || `text-red-600 hover:text-red-900 ml-4 font-medium ${isDeleting ? "opacity-50 cursor-wait" : ""}`}
    >
      {isDeleting ? "Menghapus..." : "Hapus"}
    </button>
  );
}
