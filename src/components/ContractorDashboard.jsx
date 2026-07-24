import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Briefcase, MessageSquare, ShieldCheck, DollarSign, Settings as SettingsIcon, Users, 
  FileText, CheckCircle, Clock, AlertTriangle, ArrowRight, Loader2, Image as ImageIcon,
  Check, Phone, Mail, MapPin, RefreshCw, Layers, ShieldAlert, Zap, Mic, ShoppingBag, Send
} from "lucide-react";
import { OfflineBanner } from "../lib/offlineSync";
import VoiceFieldNotesModal from "./VoiceFieldNotesModal";
import MaterialOrderModal from "./MaterialOrderModal";
import SmartFollowUpModal from "./SmartFollowUpModal";
import BlueprintAnalyzerModal from "./BlueprintAnalyzerModal";
import GoogleMapsDispatch from "./GoogleMapsDispatch";
import { SkeletonBox, LeadCardSkeleton } from "./SkeletonPreloader";

export default function ContractorDashboard({ onSelectClientView, refreshTrigger }) {
  // Lists data states
  const [leads, setLeads] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [settings, setSettings] = useState(null);
  
  // Selection and navigation states
  const [activeTab, setActiveTab] = useState("leads");
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [selectedProposalId, setSelectedProposalId] = useState(null);

  // Operations loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobProgressStep, setJobProgressStep] = useState("");
  const [jobProgressPct, setJobProgressPct] = useState(0);
  const [isApproving, setIsApproving] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Modal visibility states
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [leadsRes, proposalsRes, settingsRes] = await Promise.all([
        fetch("/api/leads"),
        fetch("/api/proposals"),
        fetch("/api/settings")
      ]);

      const leadsData = leadsRes.ok ? await leadsRes.json() : [];
      const proposalsData = proposalsRes.ok ? await proposalsRes.json() : [];
      const settingsData = settingsRes.ok ? await settingsRes.json() : null;

      const safeLeads = Array.isArray(leadsData) ? leadsData : [];
      const safeProposals = Array.isArray(proposalsData) ? proposalsData : [];

      setLeads(safeLeads);
      setProposals(safeProposals);
      if (settingsData) setSettings(settingsData);

      // Auto-select first elements if list is populated
      if (safeLeads.length > 0 && !selectedLeadId) {
        setSelectedLeadId(safeLeads[0].id);
      }
      if (safeProposals.length > 0 && !selectedProposalId) {
        setSelectedProposalId(safeProposals[0].id);
      }
    } catch (err) {
      console.warn("Notice: Dashboard data fetch delayed or offline:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateProposal = async (leadId) => {
    setIsGenerating(true);
    setJobProgressStep("Initializing asynchronous AI job queue...");
    setJobProgressPct(15);
    try {
      // Create async job
      const res = await fetch("/api/jobs/create-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId })
      });
      const jobData = await res.json();
      if (jobData.error) throw new Error(jobData.error);
      
      const jobId = jobData.jobId;

      // Poll job status every 1.5 seconds until completed
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/jobs/${jobId}`);
          const statusData = await statusRes.json();

          if (statusData.step) {
            setJobProgressStep(statusData.step);
            setJobProgressPct(statusData.progress || 50);
          }

          if (statusData.status === "completed") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            setProposals((prev) => [statusData.result, ...prev]);
            setSelectedProposalId(statusData.result.id);
            setActiveTab("proposals");
            fetchData();
          } else if (statusData.status === "failed") {
            clearInterval(pollInterval);
            setIsGenerating(false);
            alert(`Proposal Generation Error: ${statusData.error}`);
          }
        } catch (err) {
          console.warn("Polling error:", err);
        }
      }, 1500);

    } catch (err) {
      console.error("AI estimation job failed:", err);
      alert(`AI proposal generation failed: ${err.message}`);
      setIsGenerating(false);
    }
  };

  const handleApproveProposal = async (proposalId) => {
    setIsApproving(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/approve`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Update state locally
      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, status: "approved" } : p))
      );
    } catch (err) {
      console.error("Proposal approval failed:", err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!settings) return;
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Compute stats metrics
  const totalBidsVal = proposals.reduce((acc, p) => acc + p.totalEstimatedCost, 0);
  const securedDepositsVal = proposals
    .filter((p) => p.status === "paid")
    .reduce((acc, p) => acc + p.depositAmount, 0);
  const pendingBidsCount = proposals.filter((p) => p.status === "pending").length;
  const activeLeadsCount = leads.length;

  const selectedLead = leads.find((l) => l.id === selectedLeadId);
  const selectedProposal = proposals.find((p) => p.id === selectedProposalId);

  return (
    <div className="space-y-6">
      {/* Offline Status & Sync Banner */}
      <OfflineBanner />

      {/* Quick Action Bar for Field Techs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Contractor Master Workstation</h2>
            <p className="text-xs text-slate-400">Trade estimating, offline voice field notes, material orders, and follow-ups.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsBlueprintModalOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold py-2.5 px-3.5 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/10"
          >
            <Zap className="w-4 h-4 text-slate-950" />
            <span>📐 AI Blueprint & Photo Vision</span>
          </button>

          <button
            onClick={() => setActiveTab("dispatch")}
            className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold py-2.5 px-3.5 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>🗺️ Maps Dispatch & Routes</span>
          </button>

          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold py-2.5 px-3.5 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer"
          >
            <Mic className="w-4 h-4 text-amber-400" />
            <span>🎙️ Voice Field Notes</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Value */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Active Pipeline Value</p>
            <p className="text-xl font-sans font-bold text-white mt-1">${totalBidsVal.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-1">{proposals.length} estimates generated</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-amber-500">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Secured Deposits */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Secured Revenue</p>
            <p className="text-xl font-sans font-bold text-emerald-400 mt-1">${securedDepositsVal.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-1">From settled 20% deposits</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Active Inbound Leads */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Inbound Leads Intake</p>
            <p className="text-xl font-sans font-bold text-white mt-1">{activeLeadsCount}</p>
            <p className="text-[10px] text-slate-400 mt-1">Pre-screened via chatbot</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg text-blue-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Draft Estimates */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Draft Bids (Draft)</p>
            <p className="text-xl font-sans font-bold text-amber-500 mt-1">{pendingBidsCount}</p>
            <p className="text-[10px] text-slate-400 mt-1">Awaiting review & dispatch</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-lg text-purple-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Operational Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Feed navigation & lists */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-auto min-h-[380px] lg:h-[520px]">
          {/* Tabs header */}
          <div className="bg-slate-950 border-b border-slate-800 p-2 flex gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab("leads")}
              className={`flex-1 py-2 px-2 rounded-lg text-[11px] font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === "leads"
                  ? "bg-amber-600 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Leads ({leads.length})
            </button>
            <button
              onClick={() => setActiveTab("proposals")}
              className={`flex-1 py-2 px-2 rounded-lg text-[11px] font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === "proposals"
                  ? "bg-amber-600 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Bids ({proposals.length})
            </button>
            <button
              onClick={() => setActiveTab("dispatch")}
              className={`flex-1 py-2 px-2 rounded-lg text-[11px] font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === "dispatch"
                  ? "bg-amber-600 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Maps Dispatch
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-3 py-2 rounded-lg text-xs font-mono transition cursor-pointer ${
                activeTab === "settings"
                  ? "bg-amber-600 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>

          {/* List views scroll zone */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-950/40">
            {isLoading ? (
              <div className="space-y-3 p-1">
                <LeadCardSkeleton />
                <LeadCardSkeleton />
                <LeadCardSkeleton />
              </div>
            ) : activeTab === "leads" ? (
              leads.length === 0 ? (
                <div className="text-center py-20 text-slate-500 text-xs">
                  No leads qualified yet. Use the website widget to qualify a lead!
                </div>
              ) : (
                leads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                      selectedLeadId === lead.id
                        ? "bg-slate-900 border-amber-500/40 shadow-lg shadow-amber-500/[0.02]"
                        : "bg-slate-900/50 border-slate-800/80 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-sans font-semibold text-white">{lead.name}</span>
                      <span className="text-[9px] font-mono uppercase text-slate-500">ZIP {lead.zip}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1 italic">"{lead.scope || "Walk-in conversation"}"</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[9px] font-mono text-slate-500 uppercase">
                      <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        Qualified via Front Office
                      </span>
                    </div>
                  </div>
                ))
              )
            ) : activeTab === "proposals" ? (
              proposals.length === 0 ? (
                <div className="text-center py-20 text-slate-500 text-xs">
                  No estimates generated yet. Select a qualified lead to build one!
                </div>
              ) : (
                proposals.map((prop) => (
                  <div
                    key={prop.id}
                    onClick={() => setSelectedProposalId(prop.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                      selectedProposalId === prop.id
                        ? "bg-slate-900 border-amber-500/40 shadow-lg shadow-amber-500/[0.02]"
                        : "bg-slate-900/50 border-slate-800/80 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-sans font-semibold text-white truncate max-w-[190px]">{prop.projectTitle}</span>
                      <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                        prop.status === "paid"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
                          : prop.status === "approved"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/15"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}>
                        {prop.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-400">
                      <span>TOTAL: <strong className="text-white">${prop.totalEstimatedCost.toLocaleString()}</strong></span>
                      <span>DEP: <strong className="text-amber-500">${prop.depositAmount.toLocaleString()}</strong></span>
                    </div>
                  </div>
                ))
              )
            ) : (
              settings && (
                <form onSubmit={handleSaveSettings} className="p-2 space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Company Branding Name</label>
                    <input
                      type="text"
                      required
                      value={settings.companyName}
                      onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Lead Contact Engineer</label>
                    <input
                      type="text"
                      required
                      value={settings.contactName}
                      onChange={(e) => setSettings({ ...settings, contactName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Office Dispatch Email</label>
                    <input
                      type="email"
                      required
                      value={settings.email}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Base Hourly Rate</label>
                      <input
                        type="number"
                        required
                        value={settings.hourlyRate}
                        onChange={(e) => setSettings({ ...settings, hourlyRate: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Required Deposit %</label>
                      <input
                        type="number"
                        required
                        max={100}
                        min={5}
                        value={settings.depositPercentage}
                        onChange={(e) => setSettings({ ...settings, depositPercentage: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-sans font-semibold rounded-lg text-xs py-2.5 transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : "Save Profile Configuration"}
                  </button>
                </form>
              )
            )}
          </div>
        </div>

        {/* Right column: Action Board Detail Frame */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-auto min-h-[400px] lg:h-[520px]">
          <div className="bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between">
            <h3 className="font-sans font-semibold text-white tracking-wide text-xs uppercase flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
              AI Execution Workspace
            </h3>
            <span className="font-mono text-[9px] uppercase text-slate-500">Live Workspace Stream</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-gradient-to-b from-slate-950 to-slate-900">
            {activeTab === "leads" && selectedLead ? (
              <div className="space-y-5 text-left">
                {/* Lead Contact Info Block */}
                <div className="space-y-2 border-b border-slate-800/80 pb-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-sans font-bold text-white">{selectedLead.name}</h2>
                    <span className="text-xs font-mono text-slate-500">Intake Dossier</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-sans text-slate-400">
                    <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800/60 truncate"><Mail className="w-4 h-4 text-amber-500 shrink-0" /> <span className="truncate">{selectedLead.email || "No email submitted"}</span></div>
                    <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800/60 truncate"><Phone className="w-4 h-4 text-amber-500 shrink-0" /> <span className="truncate">{selectedLead.phone || "No phone submitted"}</span></div>
                  </div>
                </div>

                {/* AI Extracted parameters */}
                <div className="space-y-3">
                  <h4 className="font-sans font-bold text-slate-300 text-xs uppercase tracking-wider">AI Extracted Parameters</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px]">
                    <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-lg"><span className="text-slate-500 block uppercase mb-1">ZIP Area</span><strong className="text-white">{selectedLead.zip || "Not collected"}</strong></div>
                    <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-lg"><span className="text-slate-500 block uppercase mb-1">Urgency</span><strong className="text-white truncate block">{selectedLead.timeline || "Not collected"}</strong></div>
                    <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-lg"><span className="text-slate-500 block uppercase mb-1">Indicative Budget</span><strong className="text-emerald-400">{selectedLead.budget || "Not collected"}</strong></div>
                    <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-lg"><span className="text-slate-500 block uppercase mb-1">Specialty Trade</span><strong className="text-amber-500">{selectedLead.trade.toUpperCase()}</strong></div>
                  </div>
                </div>

                {/* Scope */}
                <div className="space-y-1.5">
                  <h4 className="font-sans font-bold text-slate-300 text-xs uppercase tracking-wider">AI Extracted Scope</h4>
                  <p className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed break-words">
                    {selectedLead.scope || "Lead was pre-screened but did not supply detailed scope text."}
                  </p>
                </div>

                {/* Photos */}
                {selectedLead.images && selectedLead.images.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-sans font-bold text-slate-300 text-xs uppercase tracking-wider">Job Site Visual Evidence ({selectedLead.images.length})</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {selectedLead.images.map((img, idx) => (
                        <div key={idx} className="border border-slate-800 rounded-lg overflow-hidden aspect-square bg-slate-950">
                          <img src={`data:${img.mimeType};base64,${img.data}`} alt="Job Site Evidence" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generate Trigger */}
                <div className="pt-4 border-t border-slate-800/80 space-y-3">
                  {isGenerating && (
                    <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 space-y-2 animate-pulse">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-amber-400 font-bold flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                          {jobProgressStep || "Processing Async Agent Queue..."}
                        </span>
                        <span className="text-slate-400">{jobProgressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" 
                          style={{ width: `${jobProgressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleGenerateProposal(selectedLead.id)}
                    disabled={isGenerating || !selectedLead.name || selectedLead.name === "Anonymous Prospect"}
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-sans font-bold text-xs py-3.5 rounded-lg shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-40 cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber-900" />
                        Generating Code-Compliant Estimate...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-slate-950 fill-slate-950 animate-pulse" />
                        Run AI Compliance & Generate Itemized Bid
                      </>
                    )}
                  </button>
                  {(!selectedLead.name || selectedLead.name === "Anonymous Prospect") && (
                    <p className="text-[10px] text-slate-500 text-center mt-2 font-mono uppercase">⚠ Complete step 2 inside the website chat widget first to unlock bid generation</p>
                  )}
                </div>
              </div>
            ) : activeTab === "proposals" && selectedProposal ? (
              <div className="space-y-5 text-left">
                {/* Proposal Detail Panel */}
                <div className="space-y-1 pb-4 border-b border-slate-800/80 flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-sans font-bold text-white leading-snug">{selectedProposal.projectTitle}</h2>
                    <p className="text-[10px] font-mono text-slate-500 uppercase">PROPOSAL ID: {selectedProposal.id.toUpperCase()}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-2.5 py-0.5 rounded border ${
                    selectedProposal.status === "paid"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : selectedProposal.status === "approved"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}>
                    {selectedProposal.status}
                  </span>
                </div>

                {/* Agent Action Buttons Toolbar */}
                <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <button
                    onClick={() => setIsMaterialModalOpen(true)}
                    className="p-2.5 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                    <span>Pre-Order Materials</span>
                  </button>
                  <button
                    onClick={() => setIsFollowUpModalOpen(true)}
                    className="p-2.5 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-amber-400" />
                    <span>Send Smart Follow-Up</span>
                  </button>
                </div>

                {/* Price indicators */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl text-left">
                    <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Total Bid Value</p>
                    <p className="text-xl font-sans font-bold text-white mt-1">${selectedProposal.totalEstimatedCost.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl text-left border-l-2 border-l-amber-500/40">
                    <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">20% Client Commitment Deposit</p>
                    <p className="text-xl font-sans font-bold text-amber-500 mt-1">${selectedProposal.depositAmount.toLocaleString()}</p>
                  </div>
                </div>

                {/* Compliance alert banner */}
                {selectedProposal.complianceNotes && selectedProposal.complianceNotes.length > 0 && (
                  <div className="bg-amber-500/[0.02] border border-amber-500/15 rounded-xl p-3.5 flex gap-3 text-xs text-slate-300 leading-relaxed font-sans">
                    <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <strong className="text-amber-500 font-mono text-[10px] uppercase block mb-1">Grounding Code Compliance Alert</strong>
                      <p className="text-slate-300 font-sans text-xs">This contract includes {selectedProposal.complianceNotes.length} active regulatory parameters fetched directly from local municipal registries. Direct compliance and permit line-items have been integrated into pricing.</p>
                    </div>
                  </div>
                )}

                {/* Dashboard Dispatch Trigger */}
                <div className="pt-4 border-t border-slate-800/80 flex flex-col md:flex-row gap-3">
                  {selectedProposal.status === "pending" ? (
                    <button
                      onClick={() => handleApproveProposal(selectedProposal.id)}
                      disabled={isApproving}
                      className="flex-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-sans font-bold text-xs py-3.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/5"
                    >
                      {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-slate-950 stroke-[3]" />}
                      One-Click Approve & Dispatch to Client
                    </button>
                  ) : (
                    <div className="flex-1 bg-slate-950 border border-slate-800 font-mono text-xs text-slate-500 text-center py-3.5 rounded-lg uppercase flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                      Already Dispatched to Customer
                    </div>
                  )}

                  <button
                    onClick={() => onSelectClientView(selectedProposal.id)}
                    className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-white font-sans font-semibold text-xs py-3.5 px-5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    Open Client Portal
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
                <Layers className="w-10 h-10 text-slate-700 mb-3" />
                <p className="text-xs">Select a lead or proposal from the left panel to execute trade office workflows.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Agent Modals */}
      <VoiceFieldNotesModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSaveNote={(note) => {
          fetchData(); // refresh leads/proposals after field note processing
        }}
      />

      <MaterialOrderModal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        proposal={selectedProposal}
      />

      <SmartFollowUpModal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        proposal={selectedProposal}
      />
    </div>
  );
}
