import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, Users, FileText, DollarSign, Settings, Plus, Edit2, Trash2, 
  CheckCircle, AlertTriangle, RefreshCw, Search, ArrowUpRight, Sparkles, 
  Building, Wrench, Globe, Check, X, Save, Eye, Send, Lock, ChevronRight, Briefcase, Mail, Phone, MapPin
} from "lucide-react";
import { collection, getDocs, doc, setDoc } from "../lib/firebase";
import { db as firebaseDb } from "../lib/firebase";
import { TableRowSkeleton, StatsCardSkeleton } from "./SkeletonPreloader";

export default function AdminDashboard({ onSelectProposal }) {
  const [activeTab, setActiveTab] = useState("leads"); // leads | proposals | rates | users
  const [leads, setLeads] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [settings, setSettings] = useState({
    companyName: "SiteQuote AI Operations",
    trade: "General Construction",
    depositPercentage: 20,
    autoApprovalThreshold: 2500,
    hourlyRateCard: {
      "Electrical Services": 115,
      "Plumbing & HVAC": 125,
      "Roofing & Exterior": 95,
      "General Contracting": 85,
      "Landscaping": 75,
      "Painting & Remodeling": 70,
    }
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState("");

  // Modals & Editing state
  const [editingLead, setEditingLead] = useState(null);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    email: "",
    phone: "",
    trade: "General Contracting",
    zip: "90210",
    budget: "$3,000 - $5,000",
    timeline: "ASAP",
    scope: "",
  });

  const [editingProposal, setEditingProposal] = useState(null);
  const [editingLineItem, setEditingLineItem] = useState(null);
  const [newLineItem, setNewLineItem] = useState({
    description: "",
    category: "Labor",
    estimatedCost: 150,
  });
  const [newComplianceNote, setNewComplianceNote] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [tradeFilter, setTradeFilter] = useState("ALL");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch server DB
      const [leadsRes, proposalsRes, settingsRes] = await Promise.all([
        fetch("/api/leads"),
        fetch("/api/proposals"),
        fetch("/api/settings"),
      ]);

      const leadsData = leadsRes.ok ? await leadsRes.json() : [];
      const proposalsData = proposalsRes.ok ? await proposalsRes.json() : [];
      const settingsData = settingsRes.ok ? await settingsRes.json() : null;

      setLeads(Array.isArray(leadsData) ? leadsData : []);
      setProposals(Array.isArray(proposalsData) ? proposalsData : []);
      if (settingsData && !settingsData.error) {
        setSettings((prev) => ({
          ...prev,
          ...settingsData,
          hourlyRateCard: settingsData.hourlyRateCard || prev.hourlyRateCard,
        }));
      }

      // Fetch users from Firestore
      try {
        const usersSnap = await getDocs(collection(firebaseDb, "users"));
        const userList = [];
        usersSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data?.deleted) {
            userList.push({ id: docSnap.id, ...data });
          }
        });
        if (userList.length > 0) {
          setUsers(userList);
        } else {
          setUsers([
            { id: "admin-1", displayName: "SiteQuote Platform Admin", email: "admin@sitequote.ai", role: "admin", companyName: "SiteQuote Operations", trade: "Platform Operations" },
            { id: "contractor-1", displayName: "Apex Electrical LLC", email: "contractor@sitequote.ai", role: "contractor", companyName: "Apex Electrical LLC", trade: "Electrical Services" },
            { id: "contractor-2", displayName: "Pro Plumbing Services", email: "plumbing@sitequote.ai", role: "contractor", companyName: "Pro Plumbing LLC", trade: "Plumbing & HVAC" },
            { id: "homeowner-1", displayName: "Jane Miller", email: "jane@example.com", role: "homeowner", companyName: "Homeowner", trade: "Residential Client" }
          ]);
        }
      } catch (err) {
        console.warn("Firestore users query notice:", err?.message || err);
        setUsers([
          { id: "admin-1", displayName: "SiteQuote Platform Admin", email: "admin@sitequote.ai", role: "admin", companyName: "SiteQuote Operations", trade: "Platform Operations" },
          { id: "contractor-1", displayName: "Apex Electrical LLC", email: "contractor@sitequote.ai", role: "contractor", companyName: "Apex Electrical LLC", trade: "Electrical Services" },
          { id: "contractor-2", displayName: "Pro Plumbing Services", email: "plumbing@sitequote.ai", role: "contractor", companyName: "Pro Plumbing LLC", trade: "Plumbing & HVAC" },
          { id: "homeowner-1", displayName: "Jane Miller", email: "jane@example.com", role: "homeowner", companyName: "Homeowner", trade: "Residential Client" }
        ]);
      }
    } catch (err) {
      console.warn("Notice: Admin data fetch delayed or offline:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- DELETE CONFIRMATION STATE ---
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type, id, title, subtitle }

  const requestDeleteLead = (lead) => {
    setDeleteConfirm({
      type: "lead",
      id: lead.id,
      title: lead.name || `Lead #${lead.id}`,
      subtitle: `Email: ${lead.email || "N/A"} | Trade: ${lead.trade || "General"}`,
    });
  };

  const requestDeleteProposal = (proposal) => {
    setDeleteConfirm({
      type: "proposal",
      id: proposal.id,
      title: proposal.projectTitle || `Proposal #${proposal.id}`,
      subtitle: `Total: ${proposal.totalEstimatedCost?.toLocaleString() || "0"} | Status: ${proposal.status}`,
    });
  };

  const requestDeleteUser = (user) => {
    setDeleteConfirm({
      type: "user",
      id: user.id,
      title: user.displayName || user.email || `User #${user.id}`,
      subtitle: `Role: ${user.role || "contractor"}`,
    });
  };

  const requestDeleteRate = (tradeName) => {
    setDeleteConfirm({
      type: "rate",
      id: tradeName,
      title: `${tradeName} Hourly Rate`,
      subtitle: `Current rate: ${settings.hourlyRateCard?.[tradeName] || 0}/hr`,
    });
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    setDeleteConfirm(null);

    try {
      if (type === "lead") {
        const res = await fetch(`/api/admin/leads/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success || res.ok) {
          setLeads((prev) => prev.filter((l) => l.id !== id));
          setProposals((prev) => prev.filter((p) => p.leadId !== id));
          if (editingLead?.id === id) setEditingLead(null);
          showSuccess("Lead deleted successfully.");
        }
      } else if (type === "proposal") {
        const res = await fetch(`/api/admin/proposals/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success || res.ok) {
          setProposals((prev) => prev.filter((p) => p.id !== id));
          if (editingProposal?.id === id) setEditingProposal(null);
          showSuccess("Proposal deleted successfully.");
        }
      } else if (type === "user") {
        try {
          const userRef = doc(firebaseDb, "users", id);
          await setDoc(userRef, { deleted: true }, { merge: true });
        } catch (e) {
          console.warn("Firestore user removal warning:", e);
        }
        setUsers((prev) => prev.filter((u) => u.id !== id));
        showSuccess("User record removed.");
      } else if (type === "rate") {
        const updatedRateCard = { ...settings.hourlyRateCard };
        delete updatedRateCard[id];
        const newSettings = { ...settings, hourlyRateCard: updatedRateCard };
        setSettings(newSettings);
        await fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSettings),
        });
        showSuccess(`Rate card for ${id} removed.`);
      }
    } catch (err) {
      console.error("Delete operation failed:", err);
      showSuccess("Deletion processed.");
    }
  };

  // --- LEAD HANDLERS ---
  const handleAddLead = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLeadForm),
      });
      const data = await res.json();
      if (data.success) {
        setLeads((prev) => [data.lead, ...prev]);
        setIsAddLeadOpen(false);
        setNewLeadForm({
          name: "",
          email: "",
          phone: "",
          trade: "General Contracting",
          zip: "90210",
          budget: "$3,000 - $5,000",
          timeline: "ASAP",
          scope: "",
        });
        showSuccess("New lead successfully added!");
      }
    } catch (err) {
      showSuccess("Error adding lead: " + err.message);
    }
  };

  const handleUpdateLead = async (e) => {
    e.preventDefault();
    if (!editingLead) return;
    try {
      const res = await fetch(`/api/admin/leads/${editingLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingLead),
      });
      const data = await res.json();
      if (data.success) {
        setLeads((prev) => prev.map((l) => (l.id === editingLead.id ? data.lead : l)));
        setEditingLead(null);
        showSuccess("Lead details updated successfully!");
      }
    } catch (err) {
      showSuccess("Error updating lead: " + err.message);
    }
  };

  // --- PROPOSAL HANDLERS ---
  const handleSaveProposal = async () => {
    if (!editingProposal) return;
    try {
      // Recalculate subtotal
      const totalCost = editingProposal.lineItems.reduce(
        (sum, item) => sum + (Number(item.estimatedCost) || 0),
        0
      );

      const payload = {
        ...editingProposal,
        totalEstimatedCost: totalCost,
      };

      const res = await fetch(`/api/admin/proposals/${editingProposal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setProposals((prev) => prev.map((p) => (p.id === editingProposal.id ? data.proposal : p)));
        setEditingProposal(data.proposal);
        showSuccess("Proposal & Line Items saved!");
      }
    } catch (err) {
      showSuccess("Error saving proposal: " + err.message);
    }
  };

  const handleAddLineItem = () => {
    if (!editingProposal || !newLineItem.description) return;
    const item = {
      description: newLineItem.description,
      category: newLineItem.category,
      estimatedCost: Number(newLineItem.estimatedCost) || 0,
    };
    const updatedLineItems = [...(editingProposal.lineItems || []), item];
    const totalCost = updatedLineItems.reduce((sum, i) => sum + (Number(i.estimatedCost) || 0), 0);

    setEditingProposal({
      ...editingProposal,
      lineItems: updatedLineItems,
      totalEstimatedCost: totalCost,
    });

    setNewLineItem({ description: "", category: "Labor", estimatedCost: 150 });
  };

  const handleRemoveLineItem = (index) => {
    if (!editingProposal) return;
    const updatedLineItems = editingProposal.lineItems.filter((_, i) => i !== index);
    const totalCost = updatedLineItems.reduce((sum, i) => sum + (Number(i.estimatedCost) || 0), 0);

    setEditingProposal({
      ...editingProposal,
      lineItems: updatedLineItems,
      totalEstimatedCost: totalCost,
    });
  };

  const handleAddComplianceNote = () => {
    if (!editingProposal || !newComplianceNote) return;
    setEditingProposal({
      ...editingProposal,
      complianceNotes: [...(editingProposal.complianceNotes || []), newComplianceNote],
    });
    setNewComplianceNote("");
  };

  const handleRemoveComplianceNote = (index) => {
    if (!editingProposal) return;
    setEditingProposal({
      ...editingProposal,
      complianceNotes: editingProposal.complianceNotes.filter((_, i) => i !== index),
    });
  };

  // --- SETTINGS HANDLERS ---
  const handleSaveSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("Admin platform settings saved!");
      }
    } catch (err) {
      showSuccess("Error saving settings: " + err.message);
    }
  };

  const handleUserRoleChange = async (userId, newRole) => {
    try {
      const userRef = doc(firebaseDb, "users", userId);
      await setDoc(userRef, { role: newRole }, { merge: true });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      showSuccess(`Updated user role to ${newRole}`);
    } catch (err) {
      showSuccess("Failed to update user role: " + err.message);
    }
  };

  const showSuccess = (msg) => {
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(""), 3500);
  };

  // Calculations
  const totalRevenue = proposals
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.totalEstimatedCost || 0), 0);

  const totalDepositsPaid = proposals
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.depositAmount || 0), 0);

  const filteredLeads = leads.filter((lead) => {
    const matchesTrade = tradeFilter === "ALL" || lead.trade === tradeFilter;
    const matchesSearch =
      !searchTerm ||
      lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.zip?.includes(searchTerm);
    return matchesTrade && matchesSearch;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/20 rounded-2xl p-5 sm:p-8 shadow-2xl relative overflow-hidden max-w-full">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-3 max-w-full">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">SiteQuote Central • System Admin Control Panel</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight break-words">
              Administrative Control Hub
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Manage contractor leads, edit AI-generated proposals, tweak labor rate cards, configure municipal code grounding parameters, and manage user roles.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              onClick={fetchData}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-2 transition cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
              <span>Refresh Data</span>
            </button>
            <button
              onClick={() => setIsAddLeadOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/10 shrink-0 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add New Lead</span>
            </button>
          </div>
        </div>
      </div>

      {/* Save Success Banner */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-400 text-xs font-mono"
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{saveSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Total Pipeline Value</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">${totalRevenue.toLocaleString()}</div>
          <p className="text-[10px] text-slate-500 mt-1">Paid Deposits: ${totalDepositsPaid.toLocaleString()}</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Total Inbound Leads</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">{leads.length}</div>
          <p className="text-[10px] text-slate-500 mt-1">
            {leads.filter((l) => l.scope).length} AI-Qualified Leads
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Active Proposals</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">{proposals.length}</div>
          <p className="text-[10px] text-slate-500 mt-1">
            {proposals.filter((p) => p.status === "paid").length} Paid & Confirmed
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Registered Users</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">{users.length || 1}</div>
          <p className="text-[10px] text-slate-500 mt-1">Contractors & Property Owners</p>
        </div>
      </div>

      {/* Main Admin Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-1 sm:space-x-4 overflow-x-auto whitespace-nowrap pb-0.5">
        <button
          onClick={() => setActiveTab("leads")}
          className={`pb-3 px-3 sm:px-4 text-xs font-mono font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeTab === "leads"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Leads & Inquiries ({leads.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("proposals")}
          className={`pb-3 px-3 sm:px-4 text-xs font-mono font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeTab === "proposals"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Proposals & Editor ({proposals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("rates")}
          className={`pb-3 px-3 sm:px-4 text-xs font-mono font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeTab === "rates"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Rate Card & AI Rules</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 px-3 sm:px-4 text-xs font-mono font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeTab === "users"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users & Roles ({users.length})</span>
        </button>
      </div>

      {/* TAB 1: LEADS & INQUIRIES MANAGEMENT */}
      {activeTab === "leads" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search leads by name, email, zip..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] font-mono text-slate-400">Trade:</span>
              <select
                value={tradeFilter}
                onChange={(e) => setTradeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Trades</option>
                <option value="Electrical Services">Electrical Services</option>
                <option value="Plumbing & HVAC">Plumbing & HVAC</option>
                <option value="Roofing & Exterior">Roofing & Exterior</option>
                <option value="General Contracting">General Contracting</option>
                <option value="Landscaping">Landscaping</option>
                <option value="Painting & Remodeling">Painting & Remodeling</option>
              </select>
            </div>
          </div>

          {/* Lead List Table / Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Client / Contact</th>
                    <th className="p-3">Trade & Location</th>
                    <th className="p-3">Budget & Urgency</th>
                    <th className="p-3">Scope Overview</th>
                    <th className="p-3">Site Photos</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <>
                      <TableRowSkeleton cols={6} />
                      <TableRowSkeleton cols={6} />
                      <TableRowSkeleton cols={6} />
                    </>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-mono">
                        No leads found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3">
                          <div className="font-bold text-white">{lead.name || "Anonymous Lead"}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{lead.email || "No email"}</span>
                          </div>
                          {lead.phone && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              <span>{lead.phone}</span>
                            </div>
                          )}
                        </td>

                        <td className="p-3">
                          <span className="inline-block px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded text-[10px] font-mono">
                            {lead.trade || "General"}
                          </span>
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>ZIP: {lead.zip || "N/A"}</span>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="text-emerald-400 font-mono font-bold">{lead.budget || "Flexible"}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{lead.timeline || "ASAP"}</div>
                        </td>

                        <td className="p-3 max-w-xs">
                          <p className="text-slate-300 line-clamp-2 text-[11px]">
                            {lead.scope || "Inbound inquiry awaiting details."}
                          </p>
                        </td>

                        <td className="p-3">
                          {lead.images && lead.images.length > 0 ? (
                            <div className="flex items-center gap-1">
                              {lead.images.slice(0, 3).map((img, i) => (
                                <img
                                  key={i}
                                  src={typeof img === "string" ? img : img.url}
                                  alt="Site"
                                  className="w-8 h-8 rounded object-cover border border-slate-700"
                                />
                              ))}
                              {lead.images.length > 3 && (
                                <span className="text-[10px] text-slate-500 font-mono">+{lead.images.length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 font-mono text-[10px]">No photos</span>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingLead({ ...lead })}
                              title="Edit Lead"
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                requestDeleteLead(lead);
                              }}
                              title="Delete Lead"
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROPOSALS & LINE ITEM EDITOR */}
      {activeTab === "proposals" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Proposal Selection List */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Select Proposal to Edit
            </h3>

            {proposals.length === 0 ? (
              <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-500 text-xs font-mono">
                No draft or generated proposals found.
              </div>
            ) : (
              proposals.map((prop) => (
                <div
                  key={prop.id}
                  onClick={() => setEditingProposal({ ...prop })}
                  className={`p-4 rounded-xl border transition cursor-pointer text-left ${
                    editingProposal?.id === prop.id
                      ? "bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/30"
                      : "bg-slate-900 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white truncate max-w-[180px]">
                      {prop.projectTitle || "Draft Proposal"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                          prop.status === "paid"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : prop.status === "approved"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {prop.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDeleteProposal(prop);
                        }}
                        title="Delete Proposal"
                        className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className="text-slate-400 font-mono">Total Estimate:</span>
                    <span className="font-bold text-amber-400 font-mono">${prop.totalEstimatedCost?.toLocaleString()}</span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">
                    {prop.summary}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Detailed Proposal & Line Items Editor */}
          <div className="lg:col-span-7">
            {editingProposal ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-left shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-amber-400 tracking-wider">
                      Editing Proposal #{editingProposal.id}
                    </span>
                    <h2 className="text-xl font-bold text-white">{editingProposal.projectTitle}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => requestDeleteProposal(editingProposal)}
                      title="Delete Proposal"
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-red-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                    <button
                      onClick={handleSaveProposal}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/10"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save All Changes</span>
                    </button>
                  </div>
                </div>

                {/* Status & Title Editor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      Project Title
                    </label>
                    <input
                      type="text"
                      value={editingProposal.projectTitle || ""}
                      onChange={(e) =>
                        setEditingProposal({ ...editingProposal, projectTitle: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      Proposal Status
                    </label>
                    <select
                      value={editingProposal.status || "pending"}
                      onChange={(e) =>
                        setEditingProposal({ ...editingProposal, status: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="pending">Draft / Pending</option>
                      <option value="approved">Approved & Sent</option>
                      <option value="paid">Paid Deposit ($)</option>
                    </select>
                  </div>
                </div>

                {/* Summary Editor */}
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Executive Scope Summary
                  </label>
                  <textarea
                    rows={2}
                    value={editingProposal.summary || ""}
                    onChange={(e) =>
                      setEditingProposal({ ...editingProposal, summary: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Line Items Management */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono uppercase font-bold text-amber-400">
                      Itemized Line Items ({editingProposal.lineItems?.length || 0})
                    </h4>
                    <span className="text-xs font-mono font-bold text-white">
                      Subtotal: ${editingProposal.totalEstimatedCost?.toLocaleString()}
                    </span>
                  </div>

                  {/* Existing Line Items */}
                  <div className="space-y-2">
                    {editingProposal.lineItems?.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs"
                      >
                        <div className="flex-1 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono">
                              {item.category}
                            </span>
                            <span className="font-medium text-white">{item.description}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            value={item.estimatedCost}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const updated = [...editingProposal.lineItems];
                              updated[idx].estimatedCost = val;
                              const totalCost = updated.reduce((s, i) => s + (Number(i.estimatedCost) || 0), 0);
                              setEditingProposal({ ...editingProposal, lineItems: updated, totalEstimatedCost: totalCost });
                            }}
                            className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-xs text-amber-400 font-mono font-bold"
                          />
                          <button
                            onClick={() => handleRemoveLineItem(idx)}
                            className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Line Item Form */}
                  <div className="p-3 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl space-y-2">
                    <span className="text-[11px] font-mono text-slate-400 block">Add Line Item to Proposal</span>
                    <div className="grid grid-cols-12 gap-2">
                      <input
                        type="text"
                        placeholder="Description (e.g. 200A Main Breaker Panel)"
                        value={newLineItem.description}
                        onChange={(e) => setNewLineItem({ ...newLineItem, description: e.target.value })}
                        className="col-span-6 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                      <select
                        value={newLineItem.category}
                        onChange={(e) => setNewLineItem({ ...newLineItem, category: e.target.value })}
                        className="col-span-3 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-white"
                      >
                        <option value="Labor">Labor</option>
                        <option value="Material">Material</option>
                        <option value="Permit">Permit</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Cost $"
                        value={newLineItem.estimatedCost}
                        onChange={(e) => setNewLineItem({ ...newLineItem, estimatedCost: e.target.value })}
                        className="col-span-2 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-amber-400 font-mono"
                      />
                      <button
                        onClick={handleAddLineItem}
                        type="button"
                        className="col-span-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded flex items-center justify-center font-bold transition cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Compliance Notes & Municipal Warnings */}
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <h4 className="text-xs font-mono uppercase font-bold text-amber-400">
                    Municipal Grounded Compliance Notes ({editingProposal.complianceNotes?.length || 0})
                  </h4>

                  <div className="space-y-1.5">
                    {editingProposal.complianceNotes?.map((note, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300"
                      >
                        <span>{note}</span>
                        <button
                          onClick={() => handleRemoveComplianceNote(i)}
                          className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add municipal code note or required permit standard..."
                      value={newComplianceNote}
                      onChange={(e) => setNewComplianceNote(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                    <button
                      onClick={handleAddComplianceNote}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                    >
                      Add Note
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500 font-mono text-xs">
                Select a proposal from the left list to edit its itemized breakdown.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RATE CARD & AI RULES */}
      {activeTab === "rates" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-left shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Trade Rate Card & AI Parameters</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                These rates feed directly into Gemini 2.5 Pro when estimating labor hours and materials.
              </p>
            </div>
            <button
              onClick={handleSaveSettings}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/10"
            >
              <Save className="w-4 h-4" />
              <span>Save System Settings</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hourly Rates Per Trade */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase font-bold text-amber-400">
                Hourly Labor Rate Card ($/hour)
              </h3>

              {Object.entries(settings.hourlyRateCard || {}).map(([tradeName, rate]) => (
                <div key={tradeName} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs font-medium text-white">{tradeName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">$</span>
                    <input
                      type="number"
                      value={rate}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSettings({
                          ...settings,
                          hourlyRateCard: {
                            ...settings.hourlyRateCard,
                            [tradeName]: val,
                          },
                        });
                      }}
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-right text-xs text-amber-400 font-mono font-bold"
                    />
                    <span className="text-xs font-mono text-slate-500">/hr</span>
                    <button
                      type="button"
                      onClick={() => requestDeleteRate(tradeName)}
                      title={`Delete ${tradeName} rate`}
                      className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Deposit & Approval Thresholds */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase font-bold text-amber-400">
                Stripe Deposit & Auto-Approval Settings
              </h3>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Stripe Commitment Deposit (%)
                  </label>
                  <input
                    type="number"
                    value={settings.depositPercentage}
                    onChange={(e) =>
                      setSettings({ ...settings, depositPercentage: Number(e.target.value) })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Calculated automatically from total proposal estimate for client deposit links.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Auto-Approval Threshold ($)
                  </label>
                  <input
                    type="number"
                    value={settings.autoApprovalThreshold}
                    onChange={(e) =>
                      setSettings({ ...settings, autoApprovalThreshold: Number(e.target.value) })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Estimates under this amount auto-approve and generate Stripe links instantly.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Platform Headquarters Organization
                  </label>
                  <input
                    type="text"
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: USERS & ROLES */}
      {activeTab === "users" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-left shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Registered User Profiles & Roles</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage account authorization levels across contractors, homeowners, and administrators.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">User Name & Email</th>
                  <th className="p-3">Organization / Property</th>
                  <th className="p-3">Trade Specialization</th>
                  <th className="p-3">Current Role</th>
                  <th className="p-3 text-right">Role Authorization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-mono">
                      No external users registered yet in Firestore.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3">
                        <div className="font-bold text-white">{u.displayName || "User"}</div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                      </td>

                      <td className="p-3 text-slate-300">
                        {u.companyName || "N/A"}
                      </td>

                      <td className="p-3 text-slate-300">
                        {u.trade || "General"}
                      </td>

                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                            u.role === "admin"
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                              : u.role === "homeowner"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {u.role || "contractor"}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={u.role || "contractor"}
                            onChange={(e) => handleUserRoleChange(u.id, e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                          >
                            <option value="contractor">Trade Contractor</option>
                            <option value="homeowner">Homeowner / Client</option>
                            <option value="admin">Platform Admin</option>
                          </select>
                          <button
                            onClick={() => requestDeleteUser(u)}
                            title="Delete User"
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD LEAD MODAL */}
      <AnimatePresence>
        {isAddLeadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl text-left space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Manually Register Inbound Lead</span>
                </h3>
                <button
                  onClick={() => setIsAddLeadOpen(false)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddLead} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Client Name *</label>
                    <input
                      type="text"
                      required
                      value={newLeadForm.name}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                      placeholder="e.g. Marcus Vance"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={newLeadForm.email}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                      placeholder="marcus@example.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Phone</label>
                    <input
                      type="text"
                      value={newLeadForm.phone}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                      placeholder="555-0199"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">ZIP Code</label>
                    <input
                      type="text"
                      value={newLeadForm.zip}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, zip: e.target.value })}
                      placeholder="90210"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Trade</label>
                    <select
                      value={newLeadForm.trade}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, trade: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-white"
                    >
                      <option value="Electrical Services">Electrical</option>
                      <option value="Plumbing & HVAC">Plumbing</option>
                      <option value="Roofing & Exterior">Roofing</option>
                      <option value="General Contracting">General</option>
                      <option value="Landscaping">Landscaping</option>
                      <option value="Painting & Remodeling">Painting</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Scope Description</label>
                  <textarea
                    rows={3}
                    value={newLeadForm.scope}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, scope: e.target.value })}
                    placeholder="Describe project requirements..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddLeadOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-mono font-bold hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
                  >
                    Save Lead
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT LEAD MODAL */}
      <AnimatePresence>
        {editingLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl text-left space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-400" />
                  <span>Edit Lead Details (#{editingLead.id})</span>
                </h3>
                <button
                  onClick={() => setEditingLead(null)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateLead} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Client Name</label>
                    <input
                      type="text"
                      value={editingLead.name || ""}
                      onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={editingLead.email || ""}
                      onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Phone</label>
                    <input
                      type="text"
                      value={editingLead.phone || ""}
                      onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">ZIP Code</label>
                    <input
                      type="text"
                      value={editingLead.zip || ""}
                      onChange={(e) => setEditingLead({ ...editingLead, zip: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Budget</label>
                    <input
                      type="text"
                      value={editingLead.budget || ""}
                      onChange={(e) => setEditingLead({ ...editingLead, budget: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Project Scope</label>
                  <textarea
                    rows={3}
                    value={editingLead.scope || ""}
                    onChange={(e) => setEditingLead({ ...editingLead, scope: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingLead(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-mono font-bold hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
                  >
                    Update Lead
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl text-left space-y-4"
            >
              <div className="flex items-center gap-3 text-red-400">
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Confirm Deletion</h3>
                  <p className="text-xs text-slate-400 mt-0.5">This action will remove the record from system data.</p>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <p className="text-xs font-bold text-slate-200">{deleteConfirm.title}</p>
                {deleteConfirm.subtitle && (
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{deleteConfirm.subtitle}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-red-600/20"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
