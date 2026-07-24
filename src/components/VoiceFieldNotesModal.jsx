import React, { useState, useRef } from "react";
import { 
  Mic, Square, Loader2, CheckCircle, Sparkles, HardHat, FileText, 
  ListPlus, Zap, Wrench, ShieldCheck, WifiOff, X, ArrowRight 
} from "lucide-react";
import { saveOfflineFieldNote, useOfflineStatus } from "../lib/offlineSync";

export default function VoiceFieldNotesModal({ isOpen, onClose, trade = "Electrical", onImportToProposal }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState("");
  
  const timerRef = useRef(null);
  const { isOnline } = useOfflineStatus();

  if (!isOpen) return null;

  const startRecording = async () => {
    setError("");
    setExtractedData(null);
    try {
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError("Microphone access failed. Please type or select a preset narration below.");
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    // Default mock transcript if using simulated voice narration
    if (!noteText.trim()) {
      setNoteText("Looks like a 100-amp panel, needs upgrading to 200, house is from the 1970s with legacy cloth wiring.");
    }
  };

  const handlePresetSelect = (presetText) => {
    setNoteText(presetText);
    setExtractedData(null);
    setError("");
  };

  const handleProcessNotes = async () => {
    if (!noteText.trim()) {
      setError("Please dictate or type a site condition narration first.");
      return;
    }

    setIsProcessing(true);
    setError("");

    if (!isOnline) {
      // Offline mode caching
      saveOfflineFieldNote({
        text: noteText,
        trade,
        transcription: noteText,
      });
      setIsProcessing(false);
      setExtractedData({
        transcription: noteText,
        extractedParameters: {
          status: "Saved Offline",
          note: "Cached locally. Will automatically process when cell connection is restored.",
        },
        suggestedScope: noteText,
        suggestedLineItems: [
          { description: "Offline Field Survey Note Cached", category: "Labor", estimatedCost: 0 }
        ],
      });
      return;
    }

    try {
      const res = await fetch("/api/voice-notes/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteText, trade }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setExtractedData(data);
    } catch (err) {
      setError(`Voice note extraction failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyToProposal = () => {
    if (onImportToProposal && extractedData) {
      onImportToProposal(extractedData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative text-left">
        {/* Modal Header */}
        <div className="p-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Voice-Operated Field Notes AI
                {!isOnline && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    <WifiOff className="w-3 h-3" /> Offline Mode
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Hands-free audio condition logger for field technicians in vehicles or wearing gloves.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Voice Recorder Control */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
            <div className="flex items-center justify-center">
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 text-red-400 flex items-center justify-center animate-pulse shadow-xl shadow-red-500/20 cursor-pointer hover:scale-105 transition"
                >
                  <Square className="w-8 h-8 fill-current" />
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500 text-amber-400 flex items-center justify-center shadow-xl shadow-amber-500/20 cursor-pointer hover:scale-105 transition"
                >
                  <Mic className="w-8 h-8" />
                </button>
              )}
            </div>

            <div>
              <p className="text-xs font-mono uppercase font-bold text-slate-300">
                {isRecording ? `Recording Audio... (${recordingTime}s)` : "Tap Microphone to Speak"}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Narrate site conditions e.g., "100-amp panel, needs 200A upgrade, 1970s house."
              </p>
            </div>

            {/* Quick Sample Presets */}
            <div className="pt-2 border-t border-slate-800/80">
              <p className="text-[10px] font-mono text-slate-500 uppercase mb-2">Or Click Quick Sample Field Narration:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => handlePresetSelect("100-amp panel needs upgrading to 200, house built 1970s with legacy cloth braided wiring.")}
                  className="text-[11px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  ⚡ 200A Electrical Upgrade
                </button>
                <button
                  onClick={() => handlePresetSelect("3-ton heat pump condenser unit leaking R-410A refrigerant, ductwork needs R-8 insulation overhaul.")}
                  className="text-[11px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  ❄️ HVAC Condenser Leak
                </button>
                <button
                  onClick={() => handlePresetSelect("Corroded galvanized main water service line, low pressure, requires 3/4 inch PEX-a re-pipe.")}
                  className="text-[11px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  🚰 Plumbing Re-Pipe
                </button>
              </div>
            </div>
          </div>

          {/* Transcript / Input Editor */}
          <div className="space-y-2">
            <label className="block text-xs font-mono text-slate-400 uppercase font-semibold">
              Narrated Site Conditions Text:
            </label>
            <textarea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Spoken or typed field conditions..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 resize-none font-sans"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Process Button */}
          <button
            onClick={handleProcessNotes}
            disabled={isProcessing || !noteText.trim()}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-lg shadow-amber-500/10"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Extracting Technical Parameters via Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Process Field Note with Gemini AI</span>
              </>
            )}
          </button>

          {/* Extracted Data Result */}
          {extractedData && (
            <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-5 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-amber-400 font-mono uppercase flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-amber-400" />
                  AI Extracted Technical Parameters
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase">Ready for Proposal</span>
              </div>

              {/* Technical Key-Values */}
              {extractedData.extractedParameters && (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(extractedData.extractedParameters).map(([key, val]) => (
                    <div key={key} className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-xl font-mono text-xs">
                      <span className="text-[10px] text-slate-500 uppercase block">{key.replace(/([A-Z])/g, " $1")}</span>
                      <span className="text-slate-200 font-semibold">{String(val)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggested Scope */}
              {extractedData.suggestedScope && (
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Formal Scope Statement:</span>
                  <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800 font-sans">
                    {extractedData.suggestedScope}
                  </p>
                </div>
              )}

              {/* Suggested Line Items */}
              {extractedData.suggestedLineItems && extractedData.suggestedLineItems.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Extracted Line Items:</span>
                  <div className="space-y-1.5">
                    {extractedData.suggestedLineItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl text-xs border border-slate-800">
                        <span className="text-slate-300">{item.description}</span>
                        <span className="font-mono text-amber-400 font-bold">${item.estimatedCost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleApplyToProposal}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/10"
              >
                <span>Import Parameters into Proposal Builder</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
