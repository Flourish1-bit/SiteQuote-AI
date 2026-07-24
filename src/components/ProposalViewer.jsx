import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, ShieldCheck, MapPin, Building, Calendar, DollarSign, 
  ExternalLink, CreditCard, Check, ShieldAlert, ArrowLeft, Loader2, AlertCircle, 
  PlusCircle, Sparkles, Zap, Shield, ToggleLeft, ToggleRight
} from "lucide-react";
import { ProposalViewerSkeleton } from "./SkeletonPreloader";

export default function ProposalViewer({ proposalId, onBack, onPaymentSuccess }) {
  const [proposal, setProposal] = useState(null);
  const [lead, setLead] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("none");

  // Interactive Upsell Toggles State
  const [selectedUpsells, setSelectedUpsells] = useState({
    evCharger: false,
    surgeProtector: false,
    smartDimmers: false,
    extendedWarranty: false,
  });

  const UPSELL_OPTIONS = [
    {
      id: "evCharger",
      title: "Level 2 50A EV Charger Pre-Wire & Outlet",
      description: "Dedicated 240V 50-amp circuit with NEMA 14-50 receptacle for high-speed EV charging.",
      price: 650,
      category: "Material + Labor",
    },
    {
      id: "surgeProtector",
      title: "Whole-House Type-2 Surge Protection System",
      description: "Panels-mounted surge suppressor protecting expensive appliances & smart devices from grid spikes.",
      price: 380,
      category: "Material",
    },
    {
      id: "smartDimmers",
      title: "Smart Wi-Fi Dimmers & Automation Pack",
      description: "4-zone smart switches compatible with Alexa/Apple HomeKit for remote lighting automation.",
      price: 450,
      category: "Material + Labor",
    },
    {
      id: "extendedWarranty",
      title: "5-Year Master Tradesman Extended Warranty",
      description: "Complete coverage for all labor, connections, and material defects for 5 full years.",
      price: 250,
      category: "Warranty",
    },
  ];

  useEffect(() => {
    fetchProposalDetails();
    // Check URL parameters for simulated payment redirects
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setPaymentStatus("success");
      // Trigger a status patch on the backend to finalize payment
      completeSimulatedPayment();
    } else if (params.get("payment") === "cancel") {
      setPaymentStatus("cancelled");
    }
  }, [proposalId]);

  const fetchProposalDetails = async () => {
    setIsLoading(true);
    try {
      // Fetch proposal
      const res = await fetch(`/api/proposals/${proposalId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProposal(data);

      // Fetch lead details
      const leadRes = await fetch(`/api/leads/${data.leadId}`);
      const leadData = await leadRes.json();
      setLead(leadData);

      // Fetch settings
      const settingsRes = await fetch("/api/settings");
      const settingsData = await settingsRes.json();
      setSettings(settingsData);
    } catch (err) {
      console.error("Failed to load proposal details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const completeSimulatedPayment = async () => {
    try {
      await fetch(`/api/proposals/${proposalId}/simulate-pay`, { method: "POST" });
      if (proposal) {
        setProposal({ ...proposal, status: "paid" });
      }
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (err) {
      console.error("Simulation error:", err);
    }
  };

  const handleCheckout = async () => {
    setIsPaying(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Redirect to Checkout page (real Stripe or simulated sandbox)
      window.location.href = data.url;
    } catch (err) {
      console.error("Checkout dispatch error:", err);
      setIsPaying(false);
    }
  };

  if (isLoading) {
    return <ProposalViewerSkeleton />;
  }

  if (!proposal || !settings) {
    return (
      <div className="text-center py-12 text-slate-500">
        <AlertCircle className="w-12 h-12 text-red-500/40 mx-auto mb-3" />
        <p>Proposal details could not be retrieved.</p>
        {onBack && (
          <button onClick={onBack} className="mt-4 text-xs text-amber-500 hover:underline">
            Go Back
          </button>
        )}
      </div>
    );
  }

  // Categories line-items split
  const laborItems = proposal.lineItems.filter((i) => i.category === "Labor");
  const materialItems = proposal.lineItems.filter((i) => i.category === "Material");
  const permitItems = proposal.lineItems.filter((i) => i.category === "Permit");

  // Dynamic calculations incorporating active upsells
  const activeUpsells = UPSELL_OPTIONS.filter((opt) => selectedUpsells[opt.id]);
  const activeUpsellsTotal = activeUpsells.reduce((sum, item) => sum + item.price, 0);
  const calculatedTotal = (proposal.totalEstimatedCost || 0) + activeUpsellsTotal;
  const depositPct = settings?.depositPercentage || 20;
  const calculatedDeposit = Math.round(calculatedTotal * (depositPct / 100));

  const toggleUpsell = (id) => {
    if (proposal.status === "paid") return; // locked after payment
    setSelectedUpsells((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Client Proposal Header Action */}
      {onBack && (
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-mono uppercase tracking-wider transition-colors bg-slate-900 px-3 py-2 rounded-lg border border-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      )}

      {/* Payment alert states */}
      {paymentStatus === "success" && (
        <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-4 flex items-center gap-3">
          <div className="bg-emerald-500/20 p-2 rounded-lg border border-emerald-500/30">
            <Check className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h4 className="font-sans font-semibold text-emerald-400 text-sm">Deposit Confirmed Successfully</h4>
            <p className="text-xs text-emerald-500/80">Thank you! Your 20% commitment deposit has been processed. The trade scheduling system is updating.</p>
          </div>
        </div>
      )}

      {paymentStatus === "cancelled" && (
        <div className="border border-red-500/30 bg-red-500/5 rounded-xl p-4 flex items-center gap-3">
          <div className="bg-red-500/20 p-2 rounded-lg border border-red-500/30">
            <ShieldAlert className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h4 className="font-sans font-semibold text-red-400 text-sm">Payment Cancelled</h4>
            <p className="text-xs text-red-500/80">The Stripe checkout session was aborted. Your draft proposal remains secure and open for review.</p>
          </div>
        </div>
      )}

      {/* Corporate Construction Estimate Layout */}
      <div id="proposal_document" className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
        {/* Subtle Watermark or Aesthetic Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-500" />

        {/* Invoice Header */}
        <div className="p-4 sm:p-8 bg-slate-950/80 border-b border-slate-800 flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-mono">
              <Building className="w-3.5 h-3.5" />
              Contracting Bid Proposal
            </div>
            <h1 className="text-2xl font-sans font-bold text-white tracking-tight">{proposal.projectTitle}</h1>
            <p className="text-xs font-mono text-slate-500">PROPOSAL ID: {proposal.id.toUpperCase()} • DESIGNED BY SITEQUOTE AI</p>
          </div>

          <div className="flex flex-col md:items-end justify-between gap-3 md:text-right">
            <div>
              <p className="text-xs text-slate-500 font-mono uppercase">Prepared By</p>
              <p className="text-sm font-semibold text-white">{settings.companyName}</p>
              <p className="text-xs text-slate-400">{settings.contactName} • {settings.email}</p>
            </div>
            
            <div className="flex items-center md:justify-end gap-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase">STATUS:</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-mono text-[10px] uppercase font-bold border ${
                proposal.status === "paid"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : proposal.status === "approved"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}>
                {proposal.status === "paid" ? "Paid / Locked" : proposal.status === "approved" ? "Active / Pending Payment" : "Draft"}
              </span>
            </div>
          </div>
        </div>

        {/* Lead dossier info row */}
        <div className="grid grid-cols-1 md:grid-cols-3 border-b border-slate-800 font-mono text-xs text-slate-400 bg-slate-950/30">
          <div className="p-4 border-r border-b md:border-b-0 border-slate-800 flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-slate-500" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase">PROJECT ZIP CODE</p>
              <p className="text-white font-semibold">{lead?.zip || "N/A"}</p>
            </div>
          </div>
          <div className="p-4 border-r border-b md:border-b-0 border-slate-800 flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-slate-500" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase">DATE DRAFTED</p>
              <p className="text-white font-semibold">{new Date(proposal.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-slate-500" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase">ATTN CUSTOMER</p>
              <p className="text-white font-semibold">{lead?.name || "Anonymous"}</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
          {/* Executive Summary */}
          <div className="space-y-3">
            <h3 className="font-sans font-semibold text-white text-sm uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <span className="w-1.5 h-3 bg-amber-500 rounded" />
              AI Forensic Summary
            </h3>
            <p className="text-sm leading-relaxed text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800/60 font-sans">
              {proposal.summary}
            </p>
          </div>

          {/* Itemized Line Items Table */}
          <div className="space-y-4">
            <h3 className="font-sans font-semibold text-white text-sm uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <span className="w-1.5 h-3 bg-amber-500 rounded" />
              Itemized Quote Construction
            </h3>

            <div className="overflow-hidden border border-slate-800 rounded-xl bg-slate-950/50">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-[10px] text-slate-500 font-mono uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-4 w-[60%]">Description of Services & Materials</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-right">Cost (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {/* Labor */}
                  {laborItems.map((item, idx) => (
                    <tr key={`labor-${idx}`} className="hover:bg-slate-900/30">
                      <td className="p-4 text-slate-200">{item.description}</td>
                      <td className="p-4 font-mono"><span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-bold uppercase text-[9px]">{item.category}</span></td>
                      <td className="p-4 text-right font-mono text-slate-100 font-semibold">${item.estimatedCost.toLocaleString()}</td>
                    </tr>
                  ))}
                  {/* Materials */}
                  {materialItems.map((item, idx) => (
                    <tr key={`material-${idx}`} className="hover:bg-slate-900/30">
                      <td className="p-4 text-slate-200">{item.description}</td>
                      <td className="p-4 font-mono"><span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold uppercase text-[9px]">{item.category}</span></td>
                      <td className="p-4 text-right font-mono text-slate-100 font-semibold">${item.estimatedCost.toLocaleString()}</td>
                    </tr>
                  ))}
                  {/* Permits */}
                  {permitItems.map((item, idx) => (
                    <tr key={`permit-${idx}`} className="hover:bg-slate-900/30">
                      <td className="p-4 text-slate-200">{item.description}</td>
                      <td className="p-4 font-mono"><span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase text-[9px]">{item.category}</span></td>
                      <td className="p-4 text-right font-mono text-slate-100 font-semibold">${item.estimatedCost.toLocaleString()}</td>
                    </tr>
                  ))}
                  {/* Active Selected Upsells */}
                  {activeUpsells.map((upsell) => (
                    <tr key={`upsell-${upsell.id}`} className="bg-amber-500/5 hover:bg-amber-500/10">
                      <td className="p-4 text-amber-300 font-semibold flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>[OPTIONAL ADD-ON] {upsell.title}</span>
                      </td>
                      <td className="p-4 font-mono">
                        <span className="text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 font-bold uppercase text-[9px]">
                          {upsell.category}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-amber-300 font-bold">
                        +${upsell.price.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Total */}
                <tfoot className="bg-slate-950 font-mono text-sm border-t border-slate-800">
                  <tr className="text-slate-400">
                    <td colSpan={2} className="p-4 font-bold uppercase text-right text-xs">Total Estimated Cost</td>
                    <td className="p-4 text-right text-white font-bold">${calculatedTotal.toLocaleString()}</td>
                  </tr>
                  <tr className="text-amber-500 text-xs">
                    <td colSpan={2} className="p-4 font-bold uppercase text-right">Required Commitment Deposit ({depositPct}%)</td>
                    <td className="p-4 text-right font-bold text-amber-500 bg-amber-500/5 border-l border-amber-500/20">${calculatedDeposit.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* INTERACTIVE UPSELL TOGGLES */}
          <div className="space-y-4 bg-slate-950 p-6 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-sans font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Interactive Scope Upgrade Toggles
                </h3>
                <p className="text-xs text-slate-400">
                  Click to add optional hardware & warranty upgrades. Total quote and Stripe deposit recalculate live.
                </p>
              </div>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                Live Re-Calculation Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {UPSELL_OPTIONS.map((option) => {
                const isSelected = selectedUpsells[option.id];
                return (
                  <motion.div
                    key={option.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => toggleUpsell(option.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5 text-white"
                        : "bg-slate-900 border-slate-800/80 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs font-sans text-white flex items-center gap-2">
                          {isSelected ? (
                            <ToggleRight className="w-5 h-5 text-amber-400" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-500" />
                          )}
                          {option.title}
                        </span>
                        <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          +${option.price}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans pl-7">
                        {option.description}
                      </p>
                    </div>

                    <div className="pl-7 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-800/60 pt-2">
                      <span>Category: {option.category}</span>
                      <span className={isSelected ? "text-amber-400 font-bold" : "text-slate-500"}>
                        {isSelected ? "✓ Added to Quote" : "+ Click to Include"}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Search Grounding Citations */}
          {proposal.groundingSources && proposal.groundingSources.length > 0 && (
            <div className="bg-slate-950 rounded-xl border border-slate-800/80 p-5 space-y-3">
              <h4 className="font-sans font-semibold text-slate-300 text-xs uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Verified Municipal Grounding Sources
              </h4>
              <p className="text-[11px] text-slate-400">
                SiteQuote AI verified local building codes and permit cost indices in ZIP {lead?.zip} using Google Search grounding. Click the source links to view the public registry filings:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                {proposal.groundingSources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.uri}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800/60 text-slate-300 hover:text-amber-500 hover:border-amber-500/30 transition text-xs font-medium"
                  >
                    <span className="truncate max-w-[240px]">{source.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Compliance & Code Warnings */}
          {proposal.complianceNotes && proposal.complianceNotes.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-sans font-semibold text-white text-sm uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="w-1.5 h-3 bg-amber-500 rounded" />
                Municipal Code Compliance Reports
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {proposal.complianceNotes.map((note, idx) => (
                  <div key={idx} className="bg-amber-500/[0.02] border border-amber-500/10 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-slate-300 font-sans">
                    <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-amber-500/90 font-mono text-[10px] uppercase mb-1">REGULATION CODE CITATION #{idx + 1}</p>
                      <p className="text-slate-300 font-sans leading-relaxed">{note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proposal Sign-off / Call-to-action */}
          <div className="border-t border-slate-800/80 pt-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-1.5 text-center md:text-left">
              <p className="text-xs text-slate-400 font-sans font-semibold">Ready to proceed with {settings.companyName}?</p>
              <p className="text-[11px] text-slate-500 max-w-md">By clicking below, you approve this estimate scope. A 20% commitment deposit lock is required to file permit cards and schedule crews.</p>
            </div>

            {proposal.status === "paid" ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs uppercase font-bold py-3 px-8 rounded-lg flex items-center gap-2">
                <Check className="w-5.5 h-5.5 text-emerald-500" />
                Deposit Fully Settled
              </div>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={isPaying}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-sans font-bold py-3 px-8 rounded-lg text-xs shadow-lg shadow-amber-500/10 flex items-center gap-2 cursor-pointer transition disabled:opacity-50 w-full md:w-auto justify-center"
              >
                {isPaying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    Connecting to Stripe...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 text-slate-950" />
                    Approve & Pay Deposit (${calculatedDeposit.toLocaleString()})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
