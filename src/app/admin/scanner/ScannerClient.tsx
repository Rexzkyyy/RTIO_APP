"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  CameraOff,
  RotateCcw,
  User,
  Calendar,
  Tag,
  Clock,
  Keyboard,
  ChevronLeft,
  Loader2,
  Zap,
  ScanLine,
  History,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ScanStatus = "idle" | "scanning" | "loading" | "valid" | "already" | "invalid" | "error";

interface ScanResult {
  status: ScanStatus;
  message: string;
  ticket?: {
    holderName?: string;
    eventTitle?: string;
    category?: string;
    checkedInAt?: string;
    txStatus?: string;
  };
}

interface HistoryItem {
  id: string;
  barcodeString: string;
  status: "valid" | "already" | "invalid";
  holderName: string;
  eventTitle?: string;
  time: Date;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ScannerClient({ adminRole }: { adminRole?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastScanRef = useRef<string>("");
  const cooldownRef = useRef<boolean>(false);
  const readerRef = useRef<any>(null);

  const [isActive, setIsActive] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [fps, setFps] = useState<number>(0);
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });

  // ─── Init ZXing ────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    import("@zxing/browser").then(({ BrowserQRCodeReader }) => {
      if (isMounted) readerRef.current = new BrowserQRCodeReader();
    });
    return () => { isMounted = false; };
  }, []);

  // ─── Start Camera ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          frameRate: { ideal: 60, min: 30 },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities?.() as any;
      setHasFlash(!!(caps?.torch));
      setIsActive(true);
      startDecodeLoop();
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setCameraError("Izin kamera ditolak. Mohon izinkan akses kamera di pengaturan browser.");
      } else if (err.name === "NotFoundError") {
        setCameraError("Kamera tidak ditemukan di perangkat ini.");
      } else {
        setCameraError("Gagal mengakses kamera. Gunakan input manual.");
      }
    }
  }, []);

  // ─── Stop Camera ───────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsActive(false);
    setIsFlashOn(false);
  }, []);

  // ─── Toggle Flash ──────────────────────────────────────────────────────────
  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !isFlashOn } as any] });
      setIsFlashOn((v) => !v);
    } catch {}
  }, [isFlashOn]);

  // ─── Verify Ticket ─────────────────────────────────────────────────────────
  const verifyTicket = useCallback(async (barcodeString: string) => {
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    setIsLoading(true);
    setScanResult({ status: "loading", message: "Memverifikasi tiket..." });
    if (navigator.vibrate) navigator.vibrate(50);

    try {
      const res = await fetch("/api/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcodeString }),
      });
      const data = await res.json();

      let status: ScanStatus = "invalid";
      if (data.status === "VALID") status = "valid";
      else if (data.status === "ALREADY_CHECKED_IN") status = "already";
      else if (data.status === "ERROR") status = "error";

      setScanResult({ status, message: data.message, ticket: data.ticket });

      if (status !== "error") {
        const histStatus = status === "valid" ? "valid" : status === "already" ? "already" : "invalid";
        setHistory((prev) => [
          {
            id: Date.now().toString(),
            barcodeString,
            status: histStatus,
            holderName: data.ticket?.holderName || barcodeString,
            eventTitle: data.ticket?.eventTitle,
            time: new Date(),
          },
          ...prev.slice(0, 9),
        ]);
      }

      if (navigator.vibrate) {
        if (status === "valid") navigator.vibrate([80, 40, 80]);
        else if (status === "already") navigator.vibrate([200, 100, 200]);
        else navigator.vibrate(400);
      }

      setTimeout(() => {
        setScanResult(null);
        lastScanRef.current = "";
        cooldownRef.current = false;
        setIsLoading(false);
      }, 3000);
    } catch {
      setScanResult({ status: "error", message: "Gagal terhubung ke server." });
      setTimeout(() => {
        setScanResult(null);
        lastScanRef.current = "";
        cooldownRef.current = false;
        setIsLoading(false);
      }, 2000);
    }
  }, []);

  // ─── 60fps Decode Loop ─────────────────────────────────────────────────────
  const startDecodeLoop = useCallback(() => {
    if (!readerRef.current) return;
    const decode = async () => {
      const now = Date.now();
      fpsCounterRef.current.frames++;
      if (now - fpsCounterRef.current.lastTime >= 1000) {
        setFps(fpsCounterRef.current.frames);
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastTime = now;
      }

      if (videoRef.current && canvasRef.current && !cooldownRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            try {
              const { HTMLCanvasElementLuminanceSource, BinaryBitmap, HybridBinarizer } =
                await import("@zxing/library");
              const ls = new HTMLCanvasElementLuminanceSource(canvas);
              const bb = new BinaryBitmap(new HybridBinarizer(ls));
              const result = readerRef.current.decodeBitmap(bb);
              const text = result.getText();
              if (text && text !== lastScanRef.current) {
                lastScanRef.current = text;
                verifyTicket(text);
              }
            } catch {}
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(decode);
    };
    animFrameRef.current = requestAnimationFrame(decode);
  }, [verifyTicket]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ─── Manual Submit ─────────────────────────────────────────────────────────
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    verifyTicket(manualInput.trim());
    setManualInput("");
  };

  // ─── Result Config ─────────────────────────────────────────────────────────
  const RESULT_CFG = {
    valid:   { gradient: "from-emerald-500/20 to-emerald-600/10", border: "border-emerald-500/50", icon: <CheckCircle2 className="w-8 h-8 text-emerald-400" />, badge: "bg-emerald-500", label: "VALID ✓", textColor: "text-emerald-300", glow: "shadow-emerald-500/20" },
    already: { gradient: "from-amber-500/20 to-amber-600/10",   border: "border-amber-500/50",   icon: <AlertTriangle className="w-8 h-8 text-amber-400" />, badge: "bg-amber-500",   label: "SUDAH CHECK-IN",  textColor: "text-amber-300",  glow: "shadow-amber-500/20" },
    invalid: { gradient: "from-red-500/20 to-red-600/10",       border: "border-red-500/50",     icon: <XCircle className="w-8 h-8 text-red-400" />,         badge: "bg-red-500",     label: "TIDAK VALID ✗",   textColor: "text-red-300",    glow: "shadow-red-500/20" },
    error:   { gradient: "from-slate-600/20 to-slate-700/10",   border: "border-slate-500/50",   icon: <XCircle className="w-8 h-8 text-slate-400" />,        badge: "bg-slate-600",   label: "ERROR",            textColor: "text-slate-300",  glow: "" },
    loading: { gradient: "from-blue-500/20 to-blue-600/10",     border: "border-blue-500/50",    icon: <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />, badge: "bg-blue-500", label: "MEMVERIFIKASI", textColor: "text-blue-300", glow: "shadow-blue-500/20" },
    idle:    { gradient: "", border: "", icon: null, badge: "", label: "", textColor: "", glow: "" },
    scanning:{ gradient: "", border: "", icon: null, badge: "", label: "", textColor: "", glow: "" },
  };
  const cfg = scanResult ? RESULT_CFG[scanResult.status] : null;

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 4rem)", background: "linear-gradient(160deg, #0a0f1e 0%, #0d1829 50%, #091420 100%)" }}>

      {/* ── Animated background orbs ───────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-white/5 backdrop-blur-sm">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">Kembali</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
               style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
            <ScanLine className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-white font-bold text-base tracking-tight">Scanner Tiket</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* History button */}
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory(true)}
              className="relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-400">{history.length}</span>
            </button>
          )}
          {/* FPS badge */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <Zap className="w-3 h-3 text-yellow-400" />
            <span className="text-xs font-mono text-yellow-300 tabular-nums">
              {isActive ? `${fps}` : "--"}<span className="text-yellow-500/60 ml-0.5">fps</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start px-5 pt-6 pb-6 overflow-y-auto max-w-md mx-auto w-full gap-5">

        {/* ── Viewfinder Card ───────────────────────────────────────────── */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            borderRadius: "24px",
            aspectRatio: "4/3",
            background: "linear-gradient(135deg, #111827, #0d1520)",
            boxShadow: isActive
              ? "0 0 0 1px rgba(16,185,129,0.3), 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(16,185,129,0.08)"
              : "0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5)",
            transition: "box-shadow 0.4s ease",
          }}
        >
          {/* Video feed */}
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted autoPlay />
          <canvas ref={canvasRef} className="hidden" />

          {/* Vignette overlay */}
          {isActive && (
            <div className="absolute inset-0 pointer-events-none"
                 style={{ background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.7) 100%)" }} />
          )}

          {/* ── Idle state ─────────────────────────────────────────────── */}
          {!isActive && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              {/* Camera icon with glow */}
              <div className="relative">
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-emerald-500/10 blur-xl" />
                <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center border border-white/10"
                     style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08))" }}>
                  <Camera className="w-9 h-9 text-emerald-400/80" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-white/70 font-medium text-sm">Siap untuk scan</p>
                <p className="text-white/30 text-xs mt-1">Aktifkan kamera untuk mulai</p>
              </div>
            </div>
          )}

          {/* ── Camera error ──────────────────────────────────────────── */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-red-500/10 border border-red-500/20">
                <CameraOff className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-red-300 text-sm text-center leading-relaxed">{cameraError}</p>
              <button
                onClick={() => { setCameraError(null); setManualMode(true); }}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-white/10 hover:bg-white/15 text-white/80 border border-white/10 transition-all"
              >
                Gunakan Input Manual
              </button>
            </div>
          )}

          {/* ── Active scanning overlay ────────────────────────────────── */}
          {isActive && !scanResult && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Corner frame */}
              <div className="relative w-56 h-56">
                {[
                  "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-2xl",
                  "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-2xl",
                  "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-2xl",
                  "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-2xl",
                ].map((cls, i) => (
                  <div key={i} className={`absolute w-10 h-10 border-emerald-400/80 ${cls}`} />
                ))}
                {/* Scan line */}
                <div className="absolute left-3 right-3"
                     style={{ height: "2px", background: "linear-gradient(90deg, transparent, #34d399, #10b981, #34d399, transparent)", animation: "scanLine 2s ease-in-out infinite" }} />
                {/* Center dot */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-400/60" style={{ animation: "pulse 2s ease-in-out infinite" }} />
                </div>
              </div>
              {/* Label */}
              <div className="absolute bottom-5 left-0 right-0 flex justify-center">
                <div className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-emerald-300 tracking-widest"
                     style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  ARAHKAN KE QR TIKET
                </div>
              </div>
            </div>
          )}

          {/* CSS Animations */}
          <style>{`
            @keyframes scanLine {
              0%   { top: 20%; opacity: 0.3; }
              50%  { top: 80%; opacity: 1; }
              100% { top: 20%; opacity: 0.3; }
            }
            @keyframes pulse {
              0%, 100% { opacity: 0.4; transform: scale(1); }
              50%       { opacity: 1;   transform: scale(1.5); }
            }
            @keyframes resultIn {
              from { opacity: 0; transform: translateY(12px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          {/* Flash badge */}
          {isFlashOn && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                 style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.3)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" style={{ animation: "pulse 1s infinite" }} />
              <span className="text-yellow-300 text-[10px] font-bold tracking-wider">FLASH</span>
            </div>
          )}
        </div>

        {/* ── Result Card ────────────────────────────────────────────────── */}
        {scanResult && cfg && (
          <div
            className={`w-full rounded-2xl border p-5 ${cfg.border} shadow-xl ${cfg.glow}`}
            style={{
              background: `linear-gradient(135deg, ${cfg.gradient.replace("from-", "").replace("to-", "")})`,
              backdropFilter: "blur(12px)",
              animation: "resultIn 0.25s ease-out forwards",
            }}
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 mt-0.5">{cfg.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`text-[10px] font-black tracking-widest px-2.5 py-1 rounded-lg ${cfg.badge} text-white`}>
                    {cfg.label}
                  </span>
                </div>
                <p className={`text-sm font-semibold ${cfg.textColor} leading-snug`}>
                  {scanResult.message}
                </p>
                {scanResult.ticket && (
                  <div className="mt-3.5 space-y-2">
                    {scanResult.ticket.holderName && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-white/60" />
                        </div>
                        <span className="text-white font-bold text-sm">{scanResult.ticket.holderName}</span>
                      </div>
                    )}
                    {scanResult.ticket.eventTitle && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                          <Calendar className="w-3.5 h-3.5 text-white/60" />
                        </div>
                        <span className="text-white/80 text-sm truncate">{scanResult.ticket.eventTitle}</span>
                      </div>
                    )}
                    {scanResult.ticket.category && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                          <Tag className="w-3.5 h-3.5 text-white/60" />
                        </div>
                        <span className="text-white/80 text-sm">{scanResult.ticket.category}</span>
                      </div>
                    )}
                    {scanResult.ticket.checkedInAt && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                          <Clock className="w-3.5 h-3.5 text-white/60" />
                        </div>
                        <span className="text-white/60 text-xs">
                          {new Date(scanResult.ticket.checkedInAt).toLocaleString("id-ID", {
                            dateStyle: "short", timeStyle: "short",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Camera Action Buttons ──────────────────────────────────────── */}
        <div className="flex items-center gap-3 w-full">
          {!isActive ? (
            <button
              onClick={startCamera}
              className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                boxShadow: "0 4px 20px rgba(16,185,129,0.35), 0 1px 0 rgba(255,255,255,0.1) inset",
              }}
            >
              <Camera className="w-4.5 h-4.5" />
              Aktifkan Kamera
            </button>
          ) : (
            <>
              <button
                onClick={stopCamera}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white/70 hover:text-white transition-all active:scale-95 border border-white/10"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <CameraOff className="w-4 h-4" />
                Matikan
              </button>

              {hasFlash && (
                <button
                  onClick={toggleFlash}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-95 border"
                  style={{
                    background: isFlashOn ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.05)",
                    borderColor: isFlashOn ? "rgba(234,179,8,0.4)" : "rgba(255,255,255,0.1)",
                    color: isFlashOn ? "#fbbf24" : "rgba(255,255,255,0.5)",
                  }}
                >
                  ⚡
                </button>
              )}

              {scanResult && (
                <button
                  onClick={() => {
                    setScanResult(null);
                    lastScanRef.current = "";
                    cooldownRef.current = false;
                    setIsLoading(false);
                  }}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-95 border border-white/10"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Manual Input ────────────────────────────────────────────────── */}
        <div className="w-full">
          <button
            onClick={() => setManualMode((v) => !v)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs transition-colors mb-3 w-full justify-center"
          >
            <Keyboard className="w-3.5 h-3.5" />
            {manualMode ? "Sembunyikan input manual" : "Input kode tiket manual"}
            <div className={`ml-1 w-1.5 h-1.5 rounded-full transition-colors ${manualMode ? "bg-emerald-500" : "bg-slate-600"}`} />
          </button>

          {manualMode && (
            <form onSubmit={handleManualSubmit} className="flex gap-2.5"
                  style={{ animation: "resultIn 0.2s ease-out forwards" }}>
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Ketik atau paste kode QR tiket..."
                autoFocus
                className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  caretColor: "#10b981",
                }}
                onFocus={(e) => e.target.style.borderColor = "rgba(16,185,129,0.5)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
              <button
                type="submit"
                disabled={!manualInput.trim() || isLoading}
                className="px-5 py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
              >
                Cek
              </button>
            </form>
          )}
        </div>

        {/* Bottom spacing */}
        <div className="h-2" />
      </div>

      {/* ── History Modal ──────────────────────────────────────────────────── */}
      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowHistory(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #111827, #0d1520)",
              border: "1px solid rgba(255,255,255,0.08)",
              animation: "resultIn 0.25s ease-out forwards",
              maxHeight: "70vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4 text-emerald-400" />
                <h2 className="text-white font-bold text-sm">Riwayat Scan</h2>
                <span className="text-xs text-slate-500 font-medium">({history.length} tiket)</span>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* History list */}
            <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 64px)" }}>
              {history.map((item, i) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3.5 px-5 py-3.5 border-b border-white/5 hover:bg-white/3 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    item.status === "valid" ? "bg-emerald-500/15" :
                    item.status === "already" ? "bg-amber-500/15" : "bg-red-500/15"
                  }`}>
                    {item.status === "valid"
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      : item.status === "already"
                      ? <AlertTriangle className="w-4 h-4 text-amber-400" />
                      : <XCircle className="w-4 h-4 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{item.holderName}</p>
                    {item.eventTitle && (
                      <p className="text-slate-500 text-xs truncate">{item.eventTitle}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-slate-500 text-xs tabular-nums">
                      {item.time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </p>
                    <p className={`text-[10px] font-bold mt-0.5 ${
                      item.status === "valid" ? "text-emerald-500" :
                      item.status === "already" ? "text-amber-500" : "text-red-500"
                    }`}>
                      {item.status === "valid" ? "CHECK-IN" : item.status === "already" ? "DUPLIKAT" : "INVALID"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
