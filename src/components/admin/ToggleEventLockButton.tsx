"use client";

import { useState } from "react";
import { toggleEventLock } from "@/app/admin/events/actions";
import { Lock, Unlock } from "lucide-react";

export function ToggleEventLockButton({ id, isLocked, className }: { id: string, isLocked: boolean, className?: string }) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async () => {
    const actionText = isLocked ? "membuka kunci" : "mengunci";
    if (confirm(`Apakah Anda yakin ingin ${actionText} event ini?`)) {
      setIsUpdating(true);
      const res = await toggleEventLock(id, !isLocked);
      if (res?.error) {
        alert(`Gagal ${actionText} event: ` + res.error);
      }
      setIsUpdating(false);
    }
  };

  return (
    <button 
      onClick={handleToggle}
      disabled={isUpdating}
      className={`${className || "flex items-center text-orange-600 hover:text-orange-900 ml-4 font-medium"} ${isUpdating ? "opacity-50 cursor-wait pointer-events-none" : ""}`}
      title={isLocked ? "Buka Kunci Event" : "Kunci Event"}
    >
      {isLocked ? (
        <>
          <Unlock className="w-4 h-4 mr-1 inline-block" />
          <span>Buka Kunci</span>
        </>
      ) : (
        <>
          <Lock className="w-4 h-4 mr-1 inline-block" />
          <span>Kunci</span>
        </>
      )}
    </button>
  );
}
