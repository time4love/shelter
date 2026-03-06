"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, X, Info, LogOut } from "lucide-react";
import { usePlayerStore } from "@/store/player-store";

const APP_NAME = "מקלט משחקים";

export interface TopMenuProps {
  /** Optional short code to show in header (e.g. room identifier) */
  shortCode?: string;
}

/**
 * Sticky top menu that hides on scroll down and reappears on scroll up.
 * Hamburger opens a drawer with "About" and "Leave Room".
 */
export function TopMenu({ shortCode }: TopMenuProps) {
  const router = useRouter();
  const leaveRoom = usePlayerStore((s) => s.leaveRoom);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 50) {
          setHeaderVisible(true);
        } else if (y > lastScrollY.current) {
          setHeaderVisible(false);
        } else {
          setHeaderVisible(true);
        }
        lastScrollY.current = y;
        ticking.current = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLeaveRoom = () => {
    setDrawerOpen(false);
    leaveRoom();
    router.push("/");
  };

  const handleAboutClick = () => {
    setDrawerOpen(false);
    setAboutOpen(true);
  };

  return (
    <>
      <header
        dir="rtl"
        lang="he"
        className={`fixed top-0 left-0 w-full z-40 transition-transform duration-300 ${headerVisible ? "translate-y-0" : "-translate-y-full"}`}
        aria-label="תפריט עליון"
      >
        <div className="h-14 px-4 flex items-center justify-between bg-white/90 backdrop-blur-md border-b border-foreground/10">
          {/* Right (RTL start): Hamburger */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-xl text-foreground/80 hover:bg-foreground/10 hover:text-foreground transition focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-offset-2"
            aria-label="תפריט"
          >
            <Menu className="h-6 w-6" strokeWidth={2} />
          </button>

          {/* Center: App name */}
          <span className="font-bold text-lg text-foreground truncate mx-2">
            {APP_NAME}
          </span>

          {/* Left: Room short code pill or placeholder */}
          <div className="min-w-[2.5rem] flex justify-end">
            {shortCode ? (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-foreground/10 text-foreground/70">
                {shortCode}
              </span>
            ) : (
              <span className="w-10" aria-hidden />
            )}
          </div>
        </div>
      </header>

      {/* Drawer overlay */}
      <div
        role="presentation"
        aria-hidden={!drawerOpen}
        className={`fixed inset-0 z-50 bg-black/20 transition-opacity duration-300 ${drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Drawer panel (from right; in RTL this is the logical "start" side) */}
      <aside
        dir="rtl"
        lang="he"
        className={`fixed inset-y-0 right-0 w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-out ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
        aria-label="תפריט צד"
        aria-modal="true"
      >
        <div className="h-14 px-4 flex items-center justify-between border-b border-foreground/10">
          <span className="font-semibold text-foreground">תפריט</span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="p-2 rounded-xl text-foreground/70 hover:bg-foreground/10 hover:text-foreground transition focus:outline-none focus:ring-2 focus:ring-mint-green"
            aria-label="סגור"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
        <nav className="p-4 flex flex-col gap-1" aria-label="ניווט תפריט">
          <button
            type="button"
            onClick={handleAboutClick}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-right text-foreground hover:bg-foreground/5 transition focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-offset-2"
          >
            <Info className="h-5 w-5 text-foreground/70 shrink-0" strokeWidth={2} />
            <span>אודות המשחק</span>
          </button>
          <button
            type="button"
            onClick={handleLeaveRoom}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-right text-foreground hover:bg-foreground/5 transition focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-offset-2"
          >
            <LogOut className="h-5 w-5 text-foreground/70 shrink-0" strokeWidth={2} />
            <span>עזוב חדר</span>
          </button>
        </nav>
      </aside>

      {/* About modal */}
      <div
        role="presentation"
        aria-hidden={!aboutOpen}
        className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-300 ${aboutOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div
          className="absolute inset-0 bg-black/30"
          onClick={() => setAboutOpen(false)}
          aria-hidden
        />
        <div
          dir="rtl"
          lang="he"
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-title"
          className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-foreground/10 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 id="about-title" className="text-lg font-bold text-foreground">
              אודות המשחק
            </h2>
            <button
              type="button"
              onClick={() => setAboutOpen(false)}
              className="p-2 rounded-xl text-foreground/70 hover:bg-foreground/10 hover:text-foreground transition focus:outline-none focus:ring-2 focus:ring-mint-green"
              aria-label="סגור"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
          <p className="text-foreground/90 leading-relaxed">
            משחק זה נבנה באהבה כדי להעביר את הזמן בכיף ובצחוק, במיוחד כשנמצאים יחד
            בממ״ד. נוצר על ידי צוות מקלט ופותח בעזרת AI.
          </p>
        </div>
      </div>
    </>
  );
}
