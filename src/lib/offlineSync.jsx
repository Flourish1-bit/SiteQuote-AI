import React, { useState, useEffect } from "react";
import { WifiOff, RefreshCw, CheckCircle, HardHat } from "lucide-react";

const OFFLINE_STORAGE_KEY = "sitequote_offline_field_notes";

export function getOfflineFieldNotes() {
  try {
    const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed reading offline storage:", e);
    return [];
  }
}

export function saveOfflineFieldNote(noteData) {
  try {
    const existing = getOfflineFieldNotes();
    const updated = [
      ...existing,
      {
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toISOString(),
        ...noteData,
      },
    ];
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updated));
    // Dispatch custom event to update UI
    window.dispatchEvent(new Event("offline_storage_updated"));
    return true;
  } catch (e) {
    console.error("Failed saving offline note:", e);
    return false;
  }
}

export function clearOfflineFieldNotes() {
  try {
    localStorage.removeItem(OFFLINE_STORAGE_KEY);
    window.dispatchEvent(new Event("offline_storage_updated"));
  } catch (e) {
    console.error("Failed clearing offline notes:", e);
  }
}

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(getOfflineFieldNotes().length);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleStorageUpdate = () => setPendingCount(getOfflineFieldNotes().length);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("offline_storage_updated", handleStorageUpdate);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline_storage_updated", handleStorageUpdate);
    };
  }, []);

  return { isOnline, pendingCount };
}

export function OfflineBanner({ onSyncComplete }) {
  const { isOnline, pendingCount } = useOfflineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const handleSyncNow = async () => {
    const notes = getOfflineFieldNotes();
    if (notes.length === 0) return;

    setIsSyncing(true);
    try {
      for (const note of notes) {
        // Send to backend
        await fetch("/api/voice-notes/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteText: note.text || note.transcription, trade: note.trade || "Electrical" }),
        });
      }
      clearOfflineFieldNotes();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0 && !syncSuccess) return null;

  return (
    <div className={`p-3.5 px-5 rounded-2xl border text-xs font-mono shadow-xl transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
      !isOnline
        ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
    }`}>
      <div className="flex items-center gap-3">
        {!isOnline ? (
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <WifiOff className="w-4 h-4 animate-pulse" />
          </div>
        ) : (
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
            <HardHat className="w-4 h-4" />
          </div>
        )}

        <div>
          <p className="font-bold tracking-tight text-sm">
            {!isOnline
              ? "Field Tech Offline Mode Active"
              : pendingCount > 0
              ? `${pendingCount} Offline Notes Saved`
              : "Field Sync Restored"}
          </p>
          <p className="text-[11px] opacity-80 font-sans">
            {!isOnline
              ? "Cell service interrupted. Site photos & voice notes are safely cached locally and will sync when reconnected."
              : pendingCount > 0
              ? "Reconnected to network. Click below to sync cached field notes to backend AI engines."
              : "All local field inspection notes have been synced successfully!"}
          </p>
        </div>
      </div>

      {pendingCount > 0 && (
        <button
          onClick={handleSyncNow}
          disabled={isSyncing || !isOnline}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50 shrink-0 shadow-md shadow-emerald-500/20"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Syncing Notes...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Sync {pendingCount} Pending Notes Now</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
