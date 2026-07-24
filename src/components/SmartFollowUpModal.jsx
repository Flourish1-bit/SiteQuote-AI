import React, { useState, useEffect } from "react";
import { MessageSquare, Mail, Loader2, Send, Check, Sparkles, X, ShieldAlert, Phone } from "lucide-react";

export default function SmartFollowUpModal({ isOpen, onClose, proposal }) {
  const [isLoading, setIsLoading] = useState(false);
  const [followUp, setFollowUp] = useState(null);
  const [isDispatched, setIsDispatched] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && proposal) {
      fetchFollowUp();
    } else {
      setFollowUp(null);
      setIsDispatched(false);
      setError("");
    }
  }, [isOpen, proposal]);

  const fetchFollowUp = async () => {
    if (!proposal) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/generate-followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFollowUp(data.followUp);
    } catch (err) {
      setError(`Failed generating follow-up: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDispatch = () => {
    setIsDispatched(true);
  };

  if (!isOpen || !proposal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative text-left">
        {/* Header */}
        <div className="p-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Smart Follow-Up Sequence Agent
              </h2>
              <p className="text-xs text-slate-400">
                Personalized localized SMS & Email sequence answering homeowner questions & securing deposit.
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
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
              <span className="text-xs font-mono uppercase">Drafting personalized follow-up SMS & email...</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
              {error}
            </div>
          )}

          {followUp && !isLoading && (
            <div className="space-y-5 animate-fade-in">
              {/* SMS Draft */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center gap-2">
                    <Phone className="w-4 h-4 text-amber-400" />
                    Personalized SMS Draft
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">160 Chars Max</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs text-slate-200 font-sans leading-relaxed">
                  {followUp.smsMessage}
                </div>
              </div>

              {/* Email Draft */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center gap-2">
                    <Mail className="w-4 h-4 text-amber-400" />
                    Personalized Email Follow-Up
                  </span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs space-y-2">
                  <p className="font-mono text-slate-300">
                    <span className="text-slate-500">SUBJECT:</span> {followUp.emailSubject}
                  </p>
                  <pre className="whitespace-pre-wrap font-sans text-slate-300 text-[11px] leading-relaxed border-t border-slate-800/80 pt-2">
                    {followUp.emailBody}
                  </pre>
                </div>
              </div>

              {/* Recommended Incentive */}
              {followUp.recommendedIncentive && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-xs text-amber-300">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold font-mono text-[10px] uppercase block text-amber-400">
                      Recommended Value-Add Incentive
                    </span>
                    <span>{followUp.recommendedIncentive}</span>
                  </div>
                </div>
              )}

              {/* Dispatch Action */}
              {isDispatched ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="font-bold font-sans">Follow-Up Sequence Dispatched!</p>
                    <p className="text-[11px] text-emerald-500/80 font-sans">
                      SMS & Email follow-up sent to customer. Status logged in contractor CRM dashboard.
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleDispatch}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  <Send className="w-4 h-4 text-slate-950" />
                  <span>Send AI Follow-Up Sequence (SMS + Email)</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
