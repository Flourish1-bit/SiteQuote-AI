import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Briefcase, MessageSquare, FileText, CheckCircle, Clock, LayoutDashboard, 
  HelpCircle, Settings as SettingsIcon, Wrench, Zap, Globe, Sparkles, AlertCircle,
  User, LogIn, LogOut, ShieldCheck, ChevronDown, Loader2, HardHat
} from "lucide-react";
import ContractorDashboard from "./components/ContractorDashboard";
import EmployeeDashboard from "./components/EmployeeDashboard";
import LeadPrescreenWidget from "./components/LeadPrescreenWidget";
import ProposalViewer from "./components/ProposalViewer";
import SimulatedStripeCheckout from "./components/SimulatedStripeCheckout";
import AuthModal from "./components/AuthModal";
import AuthGate from "./components/AuthGate";
import AdminDashboard from "./components/AdminDashboard";
import Preloader from "./components/Preloader";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [selectedProposalId, setSelectedProposalId] = useState(null);
  const [contractorTrade, setContractorTrade] = useState("electrical");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { user, userProfile, loading, logout } = useAuth();

  useEffect(() => {
    // Role-based view initialization
    if (userProfile?.role === "employee") {
      setCurrentView("employee-dashboard");
    } else if (userProfile?.role === "admin") {
      setCurrentView("admin-dashboard");
    } else if (userProfile?.role === "contractor" && (currentView === "employee-dashboard" || currentView === "admin-dashboard")) {
      setCurrentView("dashboard");
    }
  }, [userProfile?.role]);

  useEffect(() => {
    // 1. Fetch initial settings to align trade theme
    fetch("/api/settings")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data && data.trade) {
          setContractorTrade(data.trade);
        }
      })
      .catch((err) => console.warn("Notice: Trade configuration settings unavailable, using default theme."));

    // 2. Parse initial query parameters for Stripe simulation redirect loops
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");
    const proposalIdParam = params.get("id");
    const simProposalParam = params.get("proposalId");

    if (window.location.pathname === "/simulated-payment" && simProposalParam) {
      setSelectedProposalId(simProposalParam);
      setCurrentView("simulated-payment");
    } else if (viewParam === "proposal" && proposalIdParam) {
      setSelectedProposalId(proposalIdParam);
      setCurrentView("client-proposal");
    }
  }, []);

  const triggerDataRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleProposalGenerated = (proposalId) => {
    setSelectedProposalId(proposalId);
    triggerDataRefresh();
    setCurrentView("client-proposal");
  };

  // Loading state while checking Firebase authentication
  if (loading) {
    return <Preloader message="Verifying Contractor Credentials & Firebase Auth..." fullScreen={true} duration={1500} />;
  }

  // Enforce Sign-Up / Authentication Gate
  if (!user) {
    return <AuthGate />;
  }

  if (currentView === "simulated-payment" && selectedProposalId) {
    return (
      <SimulatedStripeCheckout
        proposalId={selectedProposalId}
        onPaymentSuccess={() => {
          // Go back to proposal with payment success flag
          window.location.href = `/?view=proposal&id=${selectedProposalId}&payment=success`;
        }}
        onCancel={() => {
          window.location.href = `/?view=proposal&id=${selectedProposalId}&payment=cancel`;
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Top Professional Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800/80 sticky top-0 z-50 px-3 sm:px-6 py-3.5 flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-amber-600 to-amber-500 text-slate-950 p-2 rounded-xl shadow-lg shadow-amber-600/10">
              <Wrench className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-sans font-extrabold text-white tracking-tight">SiteQuote AI</h1>
                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] uppercase tracking-wider font-mono font-bold px-2 py-0.5 rounded">
                  SaaS Beta v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans hidden sm:block">Autonomous Front Office for Trade Contractors</p>
            </div>
          </div>

          {/* User Account Controls on mobile header right */}
          {user && (
            <div className="relative md:hidden">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 hover:border-amber-500/50 px-2.5 py-1.5 rounded-xl transition cursor-pointer text-xs"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-xs">
                  {(userProfile?.displayName || user.email || "U").charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-60 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 text-xs text-slate-300"
                    >
                      <div className="p-2 border-b border-slate-800">
                        <p className="font-semibold text-white truncate">
                          {userProfile?.displayName || "Contractor Account"}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded text-[10px] font-mono font-bold">
                            {userProfile?.role === "admin" ? "Platform Admin" : "Contractor"}
                          </span>
                          {userProfile?.trade && (
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono">
                              {userProfile.trade}
                            </span>
                          )}
                        </div>
                      </div>

                      {userProfile?.role === "admin" && (
                        <button
                          onClick={() => {
                            setCurrentView("admin-dashboard");
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full mt-1 flex items-center gap-2 px-2.5 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition text-xs font-mono"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-400" />
                          <span>Admin Hub</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setCurrentView("dashboard");
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition text-xs font-mono"
                      >
                        <LayoutDashboard className="w-4 h-4 text-amber-400" />
                        <span>Contractor Dashboard</span>
                      </button>

                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full mt-1 flex items-center gap-2 px-2.5 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition text-xs cursor-pointer font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Navigation Tabs & Account Actions */}
        <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-2 max-w-full pb-1 md:pb-0">
          <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl w-full sm:w-auto justify-stretch sm:justify-start overflow-x-auto max-w-full">
            {userProfile?.role === "admin" && (
              <button
                onClick={() => setCurrentView("admin-dashboard")}
                className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-mono uppercase tracking-wider transition duration-200 cursor-pointer whitespace-nowrap ${
                  currentView === "admin-dashboard"
                    ? "bg-slate-900 border border-slate-800 text-amber-500 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
                <span>Admin Hub</span>
              </button>
            )}

            {(userProfile?.role === "employee" || userProfile?.role === "admin") && (
              <button
                onClick={() => setCurrentView("employee-dashboard")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-mono uppercase tracking-wider transition duration-200 cursor-pointer whitespace-nowrap ${
                  currentView === "employee-dashboard"
                    ? "bg-slate-900 border border-slate-800 text-emerald-400 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <HardHat className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                <span>Field Worker</span>
              </button>
            )}

            {(userProfile?.role === "contractor" || userProfile?.role === "admin") && (
              <button
                onClick={() => setCurrentView("dashboard")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-mono uppercase tracking-wider transition duration-200 cursor-pointer whitespace-nowrap ${
                  currentView === "dashboard"
                    ? "bg-slate-900 border border-slate-800 text-amber-500 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Contractor Owner</span>
              </button>
            )}

            <button
              onClick={() => setCurrentView("widget-playground")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-mono uppercase tracking-wider transition duration-200 cursor-pointer whitespace-nowrap ${
                currentView === "widget-playground"
                  ? "bg-slate-900 border border-slate-800 text-amber-500 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Public </span>Preview
            </button>
          </div>

          {/* Desktop User Account Controls */}
          {user ? (
            <div className="relative hidden md:block shrink-0">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 bg-slate-950 border border-slate-800 hover:border-amber-500/50 px-3 py-1.5 rounded-xl transition cursor-pointer text-xs"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-xs">
                  {(userProfile?.displayName || user.email || "U").charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-semibold text-white leading-none">
                    {userProfile?.displayName || user.email.split("@")[0]}
                  </p>
                  <p className="text-[10px] text-amber-500 font-mono leading-none mt-1">
                    {userProfile?.companyName || "Contractor Account"}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-60 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 text-xs text-slate-300"
                    >
                      <div className="p-2.5 border-b border-slate-800">
                        <p className="font-semibold text-white truncate">
                          {userProfile?.displayName || "Contractor Account"}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded text-[10px] font-mono font-bold">
                            {userProfile?.role === "admin" ? "Platform Admin" : "Contractor"}
                          </span>
                          {userProfile?.trade && (
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono">
                              {userProfile.trade}
                            </span>
                          )}
                        </div>
                      </div>

                      {userProfile?.role === "admin" && (
                        <button
                          onClick={() => {
                            setCurrentView("admin-dashboard");
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full mt-1 flex items-center gap-2 px-2.5 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition text-xs font-mono"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-400" />
                          <span>Admin Hub</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setCurrentView("dashboard");
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition text-xs font-mono"
                      >
                        <LayoutDashboard className="w-4 h-4 text-amber-400" />
                        <span>Contractor Dashboard</span>
                      </button>

                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full mt-1 flex items-center gap-2 px-2.5 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition text-xs cursor-pointer font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs shadow-lg shadow-amber-500/10 transition cursor-pointer shrink-0"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Sign Up</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-3 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
        <AnimatePresence mode="wait">
          {currentView === "admin-dashboard" && (
            <motion.div
              key="admin-dashboard-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {userProfile?.role === "admin" ? (
                <AdminDashboard
                  onSelectProposal={(proposalId) => {
                    setSelectedProposalId(proposalId);
                    setCurrentView("client-proposal");
                  }}
                />
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 max-w-md mx-auto my-12 shadow-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-white">Admin Access Restricted</h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      You are signed in as <span className="text-white font-medium">{userProfile?.displayName || user?.email}</span> ({userProfile?.role || "user"}). Admin Headquarters is strictly reserved for platform administrators.
                    </p>
                  </div>
                  <button
                    onClick={logout}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs rounded-xl transition shadow-lg cursor-pointer"
                  >
                    Sign Out & Sign In as Admin
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {currentView === "employee-dashboard" && (
            <motion.div
              key="employee-dashboard-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <EmployeeDashboard />
            </motion.div>
          )}

          {currentView === "dashboard" && (
            <motion.div
              key="dashboard-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <ContractorDashboard
                refreshTrigger={refreshTrigger}
                onSelectClientView={(proposalId) => {
                  setSelectedProposalId(proposalId);
                  setCurrentView("client-proposal");
                }}
              />
            </motion.div>
          )}

          {currentView === "widget-playground" && (
            <motion.div
              key="widget-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Simulated Customer Landing Website on the left */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl text-left">
                {/* Simulated Web Header */}
                <div className="bg-slate-950 border-b border-slate-800 p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2 font-sans font-extrabold text-xs text-white">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                    APEX SPECIALTY TRADE SERVICES
                  </div>
                  <span className="text-[10px] font-mono uppercase text-slate-500">Live Client Website Mockup</span>
                </div>

                {/* Hero section */}
                <div className="p-8 space-y-6">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-mono">
                      <Sparkles className="w-3.5 h-3.5" />
                      Instant Bidding Integration
                    </div>
                    <h2 className="text-3xl font-sans font-bold text-white leading-tight">
                      Premium local building & utility infrastructure.
                    </h2>
                    <p className="text-sm text-slate-400 leading-relaxed font-sans max-w-xl">
                      Apex Trades specializes in code-compliant residential installations. We partner with SiteQuote AI to completely eliminate weeks of waiting for surveyors. Qualify your estimate below in less than 2 minutes.
                    </p>
                  </div>

                  {/* Bullet points benefits */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2 font-sans">
                    <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/60">
                      <strong className="text-white text-xs block mb-1">⚡ Instant AI Chat</strong>
                      <span className="text-slate-400 text-[11px] leading-relaxed block">Autonomous qualification walks you through project scopes step-by-step.</span>
                    </div>
                    <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/60">
                      <strong className="text-white text-xs block mb-1">🔍 Search Grounding</strong>
                      <span className="text-slate-400 text-[11px] leading-relaxed block">Cross-references city-specific municipal permit indices and trade rates.</span>
                    </div>
                    <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/60">
                      <strong className="text-white text-xs block mb-1">💳 Stripe Secure</strong>
                      <span className="text-slate-400 text-[11px] leading-relaxed block">Accept itemized bids and lock down schedules securely with 20% commitment deposits.</span>
                    </div>
                  </div>

                  {/* Integration Callout */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-slate-400 leading-relaxed">
                      <strong>How to test:</strong> Message the front-office chatbot on the right. Once you satisfy the pre-screening prompts (budget, timeline, scope, ZIP code), you will unlock the contact uploader to construct a complete invoice proposal.
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat qualification widget on the right */}
              <div className="lg:col-span-5">
                <LeadPrescreenWidget 
                  trade={contractorTrade} 
                  onProposalGenerated={handleProposalGenerated}
                />
              </div>
            </motion.div>
          )}

          {currentView === "client-proposal" && selectedProposalId && (
            <motion.div
              key="proposal-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <ProposalViewer
                proposalId={selectedProposalId}
                onBack={() => setCurrentView("dashboard")}
                onPaymentSuccess={triggerDataRefresh}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Sleek aesthetic footer */}
      <footer className="py-6 border-t border-slate-800/80 bg-slate-900/40 text-center font-mono text-[10px] text-slate-600 mt-12 flex flex-col sm:flex-row justify-between items-center px-8 gap-3">
        <span>© 2026 SiteQuote AI Inc. Autonomous Construction Ingress Operations.</span>
        <div className="flex gap-4">
          <span className="hover:text-slate-400 cursor-pointer">Compliance Registries</span>
          <span>•</span>
          <span className="hover:text-slate-400 cursor-pointer">Stripe Verified Gateway</span>
          <span>•</span>
          <span className="hover:text-slate-400 cursor-pointer">Antigravity AI Platform</span>
        </div>
      </footer>
    </div>
  );
}
