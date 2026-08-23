"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

const ROUTES = ["/", "/my-tickets", "/profile"];

export default function Template({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchStart.x - touchEndX;
    const deltaY = Math.abs(touchStart.y - touchEndY);
    
    // Require a long horizontal swipe (>120px) and minimal vertical movement (<50px) to prevent accidental swipes while scrolling
    if (Math.abs(deltaX) > 120 && deltaY < 50) {
      const currentIndex = ROUTES.indexOf(pathname);
      
      if (currentIndex !== -1) {
        // Swipe Left (finger goes left) -> Go to Next Route
        if (deltaX > 0 && currentIndex < ROUTES.length - 1) {
          router.push(ROUTES[currentIndex + 1]);
        }
        // Swipe Right (finger goes right) -> Go to Prev Route
        else if (deltaX < 0 && currentIndex > 0) {
          router.push(ROUTES[currentIndex - 1]);
        }
      }
    }
    setTouchStart(null);
  };

  return (
    <div 
      className="animate-page-slide h-full w-full flex-1 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}
