import React, { useState } from "react";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { 
  Wrench, Mail, Lock, User, Building, Briefcase, LogIn, UserPlus, 
  AlertCircle, Loader2, Sparkles, CheckCircle, ShieldCheck, Zap, Globe, HardHat, Eye, EyeOff
} from "lucide-react";

export default function AuthGate() {
  const { login, signup, loginWithGoogle, loginAsDemoUser } = useAuth();
  const [isSignUp, setIsSignUp] = useState(true); // Default to Sign Up

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [trade, setTrade] = useState("General Contracting");
  const [role, setRole] = useState("contractor"); // contractor | homeowner | admin

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");
    setLoading(true);

    try {
      if (isSignUp) {
        if (!email || !password || !displayName) {
          throw new Error("Please fill in all required fields.");
        }
        await signup(email, password, displayName, companyName, trade, role);
      } else {
        if (!email || !password) {
          throw new Error("Please enter your email and password.");
        }
        await login(email, password);
      }
    } catch (err) {
      console.error("Auth error:", err);
      let msg = err.message || "Authentication failed.";
      if (
        msg.includes("auth/user-not-found") ||
        msg.includes("auth/wrong-password") ||
        msg.includes("invalid-credential") ||
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        msg = "Invalid email or password.";
      } else if (msg.includes("auth/email-already-in-use") || err.code === "auth/email-already-in-use") {
        if (loginAsDemoUser) {
          loginAsDemoUser(email, displayName || email, companyName, trade, role);
          return;
        } else {
          msg = "An account with this email address already exists. Attempting sign in...";
          setIsSignUp(false);
          try {
            await login(email, password);
            return;
          } catch (e) {
            msg = "An account with this email address already exists. Please check your password and sign in.";
          }
        }
      } else if (msg.includes("auth/weak-password") || err.code === "auth/weak-password") {
        msg = "Password should be at least 6 characters long.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user" || err.message?.includes("popup-closed-by-user")) {
        console.info("Google sign-in popup closed by user.");
      } else {
        console.error("Google sign in error:", err);
        setError(err.message || "Google sign-in failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdminPreset = () => {
    setError("");
    setEmail("flourishokafor13@gmail.com");
    setPassword("admin123");
    setRole("admin");
    setDisplayName("Flourish Okafor (Admin)");
    setCompanyName("SiteQuote HQ & Operations");
    setTrade("Platform Administration");
    setInfoMsg("Admin details loaded into form! Review your information below and click Sign In or Create Account.");
  };

  const handleEmployeePreset = () => {
    setError("");
    setEmail("employee@sitequote.ai");
    setPassword("fieldworker123");
    setRole("employee");
    setDisplayName("Alex Rivera (Field Crew)");
    setCompanyName("Apex Electrical & Trade LLC");
    setTrade("Electrical Services");
    setInfoMsg("Field Worker details loaded into form! Review your information below and click Sign In or Create Account.");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Left Column: Branding & Features */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SiteQuote AI • Sign Up Required</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-amber-600 to-amber-500 text-slate-950 p-2.5 rounded-2xl shadow-xl shadow-amber-500/20">
                <Wrench className="w-7 h-7 stroke-[2.5]" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                SiteQuote AI
              </h1>
            </div>
            <p className="text-lg text-slate-300 font-medium leading-snug">
              Autonomous Front Office & Bidding SaaS for Trade Contractors
            </p>
            <p className="text-sm text-slate-400 leading-relaxed">
              Create an account to manage your AI pre-screening widgets, check local municipal building codes automatically, and send itemized Stripe deposit links to homeowners.
            </p>
          </div>

          {/* Key Value Prop List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
              <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Autonomous Pre-Screening
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gemini-powered chatbot qualifies lead budget, timeline, and ZIP code 24/7.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
              <Globe className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Municipal Search Grounding
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cross-references city building codes & permit requirements automatically.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Integrated Stripe Deposits
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Accept 20% commitment deposits with instant proposal checkout links.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sign Up / Sign In Form */}
        <div className="lg:col-span-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md text-left"
          >
            {/* Security Notice */}
            <div className="mb-5 p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Protected Account Authentication Required</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase">SSL Encrypted</span>
            </div>

            {/* Toggle Sign Up / Sign In Header */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setError("");
                }}
                className={`flex-1 py-2 text-xs font-mono uppercase tracking-wider font-bold rounded-lg transition ${
                  isSignUp
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setError("");
                }}
                className={`flex-1 py-2 text-xs font-mono uppercase tracking-wider font-bold rounded-lg transition ${
                  !isSignUp
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Sign In
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2 text-red-400 text-xs">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{error}</span>
                </div>
                {(error.includes("already exists") || error.includes("email-already-in-use")) && isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setError("");
                    }}
                    className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Switch to Sign In Mode</span>
                  </button>
                )}
              </div>
            )}

            {/* Info Message */}
            {infoMsg && (
              <div className="mb-5 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2.5 text-amber-300 text-xs shadow-lg shadow-amber-500/5">
                <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="flex-1 font-medium">{infoMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <>
                  {/* Account Role Selector */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
                      I am signing up as *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole("contractor")}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                          role === "contractor"
                            ? "bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/30"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <Wrench className="w-4 h-4 text-amber-400" />
                          {role === "contractor" && <CheckCircle className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">Master Contractor</p>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Business owner & quote manager</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole("employee")}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                          role === "employee"
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/30"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <HardHat className="w-4 h-4 text-emerald-400" />
                          {role === "employee" && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">Employed Worker</p>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Field staff / site technician</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole("homeowner")}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                          role === "homeowner"
                            ? "bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/30"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <User className="w-4 h-4 text-amber-400" />
                          {role === "homeowner" && <CheckCircle className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">Homeowner / Client</p>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">I need work done on property</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole("admin")}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                          role === "admin"
                            ? "bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/30"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          {role === "admin" && <CheckCircle className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">Platform Admin</p>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Manage platform & rates</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. John Miller"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                  </div>

                  {(role === "contractor" || role === "employee") && (
                    <>
                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                          {role === "employee" ? "Employing Contractor / Business" : "Company / Contracting Name"}
                        </label>
                        <div className="relative">
                          <Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                          <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="e.g. Apex Electrical LLC"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                          {role === "employee" ? "Field Specialization" : "Primary Trade"}
                        </label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                          <select
                            value={trade}
                            onChange={(e) => setTrade(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition"
                          >
                            <option value="Electrical Services">Electrical Services</option>
                            <option value="Plumbing & HVAC">Plumbing & HVAC</option>
                            <option value="Roofing & Exterior">Roofing & Exterior</option>
                            <option value="General Contracting">General Contracting</option>
                            <option value="Landscaping">Landscaping & Hardscaping</option>
                            <option value="Painting & Remodeling">Painting & Remodeling</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {role === "homeowner" && (
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                        Property / City Location
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Austin, TX (78701)"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                        />
                      </div>
                    </div>
                  )}

                  {role === "admin" && (
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                        Admin Organization Title
                      </label>
                      <div className="relative">
                        <Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="SiteQuote Central Operations"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contractor@company.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition focus:outline-none cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 text-sm mt-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isSignUp ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Contractor Account</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to Dashboard</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
                <span className="bg-slate-900 px-3 text-slate-500">Or continue with</span>
              </div>
            </div>

            {/* Google & One-Click Auth */}
            <div className="space-y-2">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAdminPreset}
                  disabled={loading}
                  className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 text-xs font-mono"
                  title="Prefill Admin Account Information"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Prefill Admin Info</span>
                </button>

                <button
                  type="button"
                  onClick={handleEmployeePreset}
                  disabled={loading}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 text-xs font-mono"
                  title="Prefill Field Worker Account Information"
                >
                  <HardHat className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Prefill Worker Info</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
