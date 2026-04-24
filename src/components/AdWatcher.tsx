"use client";
import { useState, useRef, useEffect } from "react";

// Set NEXT_PUBLIC_ADSCEND_ZONE_HASH in Vercel after signing up at adscendmedia.com
const ZONE_HASH = process.env.NEXT_PUBLIC_ADSCEND_ZONE_HASH ?? "";

interface AdWatcherProps {
  watchedToday: boolean;
  poolDrawn: boolean;
  onAdWatched: () => void;
  loading: boolean;
  userId: string;
}

type WatchState = "idle" | "watching" | "done" | "error";

export default function AdWatcher({ watchedToday, poolDrawn, onAdWatched, loading, userId }: AdWatcherProps) {
  const [state, setState] = useState<WatchState>("idle");
  const [message, setMessage] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  function startWatching() {
    if (!ZONE_HASH) {
      setState("error");
      setMessage("Ad network not configured yet. Check back soon!");
      return;
    }

    const url = `https://wall.adscendmedia.com/rev.php?hash=${ZONE_HASH}&subid=${encodeURIComponent(userId)}`;
    popupRef.current = window.open(url, "adscend_wall", "width=900,height=700,scrollbars=yes,resizable=yes");

    if (!popupRef.current) {
      setState("error");
      setMessage("Popup was blocked. Please allow popups for this site and try again.");
      return;
    }

    setState("watching");
    let polls = 0;

    pollRef.current = setInterval(async () => {
      polls++;
      try {
        const res = await fetch("/api/lottery/stats");
        if (res.ok) {
          const data = await res.json();
          if (data.watchedToday) {
            stopPolling();
            setState("done");
            setMessage(`🎉 You're in! Today's pool: $${(data.todayPool ?? 0).toFixed(4)} | ${data.watchersToday} entries`);
            onAdWatched();
            return;
          }
        }
      } catch {}

      if (polls > 150) {
        stopPolling();
        setState("error");
        setMessage("Timed out. If you finished the video, refresh the page.");
      }
    }, 2000);
  }

  if (loading) return (
    <div className="bg-white rounded-2xl p-8 mb-6 text-center">
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mx-auto mb-4" />
        <div className="h-4 bg-gray-200 rounded w-64 mx-auto mb-6" />
        <div className="h-12 bg-gray-200 rounded-xl w-48 mx-auto" />
      </div>
    </div>
  );

  if (state === "watching") return (
    <div className="bg-white rounded-2xl p-8 mb-6 text-center">
      <div className="text-5xl mb-4 animate-pulse">🎬</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Ad Window Open</h2>
      <p className="text-gray-500 text-sm mb-4">Watch the full video in the popup to earn your lottery entry</p>
      <div className="p-4 bg-purple-50 rounded-xl mb-4">
        <p className="text-purple-600 text-sm">📺 Complete the video in the ad window — your entry will be recorded automatically when it finishes.</p>
      </div>
      <button onClick={() => { stopPolling(); setState("idle"); }} className="text-gray-400 text-sm underline hover:text-gray-600">
        Cancel
      </button>
    </div>
  );

  if (state === "done" || (state === "idle" && watchedToday)) return (
    <div className="bg-white rounded-2xl p-8 mb-6 text-center fade-in">
      <div className="text-5xl mb-4">🏟️</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">You&apos;re Entered!</h2>
      {message && <p className="text-purple-600 font-medium mb-3 text-sm">{message}</p>}
      <p className="text-gray-600 text-sm mb-2">
        {poolDrawn ? "Today's lottery has been drawn! Check your earnings above." : "You're in today's lottery! Winners are announced at midnight."}
      </p>
      <p className="text-gray-400 text-xs">Come back tomorrow to watch another ad</p>
      <div className="mt-4 p-4 bg-purple-50 rounded-xl">
        <p className="text-purple-700 text-sm">💡 <strong>How winners are selected:</strong> At the end of each day, random winners from all entrants split 70% of the day&apos;s ad revenue pool.</p>
      </div>
    </div>
  );

  if (state === "error") return (
    <div className="bg-white rounded-2xl p-8 mb-6 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
      <p className="text-red-500 text-sm mb-6">{message}</p>
      <button onClick={() => setState("idle")} className="px-6 py-3 text-white font-semibold rounded-xl" style={{ background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)" }}>Try Again</button>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl p-8 mb-6 text-center">
      <div className="text-4xl mb-3">🎬</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Watch a video ad</h2>
      <p className="text-gray-500 mb-6">Watch one short video ad per day and get entered into the daily lottery to win real money!</p>
      {poolDrawn ? (
        <><div className="text-5xl mb-3">🔒</div><p className="text-gray-600 mb-2">Today&apos;s lottery has already been drawn.</p><p className="text-gray-400 text-sm">Come back tomorrow!</p></>
      ) : (
        <button onClick={startWatching} className="px-8 py-4 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95" style={{ background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)" }}>
          ▶ Watch Video Ad Now
        </button>
      )}
    </div>
  );
}
