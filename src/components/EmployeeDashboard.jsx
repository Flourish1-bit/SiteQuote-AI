import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  HardHat, Clock, CheckCircle2, AlertCircle, MapPin, Phone, MessageSquare,
  FileText, Camera, Send, Play, Pause, Square, Shield, Wrench, Package,
  ChevronRight, Calendar, UserCheck, RefreshCw, Sparkles, CheckSquare, Zap, Layers, AlertTriangle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import FieldJobSiteCameraModal from "./FieldJobSiteCameraModal";

export default function EmployeeDashboard() {
  const { user, userProfile } = useAuth();

  // Shift & Clock-In State
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isOnBreak, setIsOnBreak] = useState(false);

  // Active Tab: 'assigned-jobs' | 'timesheet' | 'material-request'
  const [activeTab, setActiveTab] = useState("assigned-jobs");

  // Selected Job for Detailed Field Checklist & Progress Report
  const [selectedJobId, setSelectedJobId] = useState("job-101");

  // Field Camera Modal State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Material Requisition State
  const [matItem, setMatItem] = useState("");
  const [matQty, setMatQty] = useState("1");
  const [matUrgency, setMatUrgency] = useState("Normal");
  const [matNotes, setMatNotes] = useState("");
  const [matSent, setMatSent] = useState(false);

  // Field Notes & Photos state per job
  const [fieldNotes, setFieldNotes] = useState({});
  const [uploadedPhotos, setUploadedPhotos] = useState({});

  // Mock Assigned Jobs for Employed Staff
  const [assignedJobs, setAssignedJobs] = useState([
    {
      id: "job-101",
      title: "200A Main Service Panel & Subpanel Wiring",
      clientName: "David Miller",
      address: "1408 Oakridge Dr, Austin, TX 78704",
      phone: "(512) 883-9201",
      trade: "Electrical",
      scheduledTime: "8:00 AM - 12:30 PM",
      priority: "High",
      status: "In Progress", // "Assigned" | "In Progress" | "Completed"
      contractorEmployer: userProfile?.companyName || "Apex Electrical & Trade LLC",
      bossNotes: "Verify main feeder wire size before connecting to 200A bus. Ensure main disconnect is locked off before teardown.",
      checklist: [
        { id: "c1", text: "Site Arrival & Customer Greeting", done: true },
        { id: "c2", text: "Main Breaker Isolation & Safety Tagout", done: true },
        { id: "c3", text: "Old Panel Removal & Conduit Prep", done: true },
        { id: "c4", text: "Mount New 200A Enclosure & Busbar", done: false },
        { id: "c5", text: "Grounding Rod & Copper Bond Check", done: false },
        { id: "c6", text: "Label All Branch Circuits & Clean Up", done: false },
      ]
    },
    {
      id: "job-102",
      title: "EV Charger NEMA 14-50 Dedicated Circuit Install",
      clientName: "Sarah Jenkins",
      address: "704 Evergreen Ave, Austin, TX 78702",
      phone: "(512) 441-3902",
      trade: "Electrical",
      scheduledTime: "1:30 PM - 4:00 PM",
      priority: "Medium",
      status: "Assigned",
      contractorEmployer: userProfile?.companyName || "Apex Electrical & Trade LLC",
      bossNotes: "Customer requested heavy-duty industrial receptacle in garage. 50A 2-Pole breaker is in the service truck.",
      checklist: [
        { id: "c1", text: "Inspect Garage Layout & Panel Capacity", done: false },
        { id: "c2", text: "Run 6/3 Romex Conduit through Wall", done: false },
        { id: "c3", text: "Install NEMA 14-50 Enclosure Box", done: false },
        { id: "c4", text: "Connect 50A Double-Pole Breaker", done: false },
        { id: "c5", text: "Voltage & Continuity Test with Vehicle", done: false },
      ]
    },
    {
      id: "job-103",
      title: "Kitchen Remodel Recessed Lighting Rough-In",
      clientName: "Robert Taylor",
      address: "3201 Crestview Blvd, Austin, TX 78731",
      phone: "(512) 772-1088",
      trade: "Electrical",
      scheduledTime: "Completed Yesterday",
      priority: "Low",
      status: "Completed",
      contractorEmployer: userProfile?.companyName || "Apex Electrical & Trade LLC",
      bossNotes: "Passed rough-in building code inspection yesterday.",
      checklist: [
        { id: "c1", text: "Layout 8 Recessed LED Cans", done: true },
        { id: "c2", text: "Drill Joists & Pull 14/2 Wire", done: true },
        { id: "c3", text: "Wire 3-Way Lutron Dimmer Switches", done: true },
        { id: "c4", text: "Site Clean Up & Trash Disposal", done: true },
      ]
    }
  ]);

  // Timesheet Shift History
  const [shiftHistory, setShiftHistory] = useState([
    { id: "sh-1", date: "Yesterday (Jul 22)", start: "7:55 AM", end: "4:30 PM", totalHours: "8.5 hrs", status: "Approved by Employer" },
    { id: "sh-2", date: "Jul 21, 2026", start: "8:00 AM", end: "5:00 PM", totalHours: "9.0 hrs", status: "Approved by Employer" },
    { id: "sh-3", date: "Jul 20, 2026", start: "8:10 AM", end: "4:15 PM", totalHours: "8.1 hrs", status: "Approved by Employer" },
  ]);

  // Timer Effect for Clocked-In Shift
  useEffect(() => {
    let interval = null;
    if (isClockedIn && !isOnBreak) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isClockedIn, isOnBreak]);

  const handleClockToggle = () => {
    if (!isClockedIn) {
      setIsClockedIn(true);
      setClockInTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } else {
      // Clock out
      const totalHrs = (elapsedSeconds / 3600).toFixed(1);
      const newShift = {
        id: "sh-" + Date.now(),
        date: "Today (" + new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ")",
        start: clockInTime || "8:00 AM",
        end: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        totalHours: `${totalHrs} hrs`,
        status: "Pending Boss Review"
      };
      setShiftHistory([newShift, ...shiftHistory]);
      setIsClockedIn(false);
      setIsOnBreak(false);
      setElapsedSeconds(0);
    }
  };

  const formatTimer = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleChecklistItem = (jobId, itemId) => {
    setAssignedJobs((prevJobs) =>
      prevJobs.map((job) => {
        if (job.id !== jobId) return job;
        const updatedChecklist = job.checklist.map((item) =>
          item.id === itemId ? { ...item, done: !item.done } : item
        );
        const allDone = updatedChecklist.every((i) => i.done);
        return {
          ...job,
          checklist: updatedChecklist,
          status: allDone ? "Completed" : "In Progress"
        };
      })
    );
  };

  const handleAddChecklistItem = (newItemText) => {
    if (!selectedJobId || !newItemText) return;
    setAssignedJobs((prevJobs) =>
      prevJobs.map((job) => {
        if (job.id !== selectedJobId) return job;
        const newItem = {
          id: "c-" + Date.now() + Math.random().toString(36).substr(2, 4),
          text: newItemText,
          done: false,
        };
        return {
          ...job,
          checklist: [...job.checklist, newItem],
        };
      })
    );
  };

  const handlePhotoCaptured = (photoUrl, analysis, notes) => {
    if (!selectedJobId) return;
    setUploadedPhotos((prev) => ({
      ...prev,
      [selectedJobId]: [
        ...(prev[selectedJobId] || []),
        { url: photoUrl, analysis, notes, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ],
    }));

    if (notes) {
      setFieldNotes((prev) => ({
        ...prev,
        [selectedJobId]: (prev[selectedJobId] ? prev[selectedJobId] + "\n" : "") + `[Camera Log]: ${notes}`,
      }));
    }
  };

  const handleAddMaterialRequest = (req) => {
    setMatItem(req.item || "");
    setMatQty(req.qty || "1");
    setMatUrgency(req.urgency || "Normal");
    setMatNotes(req.notes || "");
    setActiveTab("material-request");
  };

  const handleMaterialSubmit = (e) => {
    e.preventDefault();
    if (!matItem) return;
    setMatSent(true);
    setTimeout(() => {
      setMatItem("");
      setMatQty("1");
      setMatNotes("");
      setMatSent(false);
    }, 2500);
  };

  const activeJob = assignedJobs.find((j) => j.id === selectedJobId) || assignedJobs[0];

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner for Employed Staff / Field Crew */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-400 text-xs font-mono font-bold">
              <HardHat className="w-3.5 h-3.5" />
              <span>FIELD EMPLOYEE WORKSPACE</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">{userProfile?.companyName || "Apex Electrical & Trade LLC"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {userProfile?.displayName || user.email?.split("@")[0] || "Field Specialist"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Clean field interface for employed technicians: log job site progress, view assigned schedules, track shift hours, and request site materials directly from your contractor.
            </p>
          </div>

          {/* Punch Clock Widget */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl shrink-0 space-y-3 min-w-[260px] text-center sm:text-left">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <span className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Shift Timer
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                isClockedIn ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-400"
              }`}>
                {isClockedIn ? (isOnBreak ? "On Lunch Break" : "CLOCKED IN") : "CLOCKED OUT"}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="font-mono text-2xl font-black text-white tracking-wider">
                {formatTimer(elapsedSeconds)}
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {clockInTime ? `Since ${clockInTime}` : "Ready for shift"}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleClockToggle}
                className={`flex-1 py-2 px-3 rounded-lg font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                  isClockedIn
                    ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40"
                    : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                }`}
              >
                {isClockedIn ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isClockedIn ? "Clock Out" : "Clock In to Shift"}</span>
              </button>

              {isClockedIn && (
                <button
                  onClick={() => setIsOnBreak(!isOnBreak)}
                  className={`px-3 py-2 rounded-lg font-mono text-xs font-bold transition flex items-center gap-1 border cursor-pointer ${
                    isOnBreak
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>{isOnBreak ? "Resume" : "Break"}</span>
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono justify-center sm:justify-start">
              <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>GPS Verified Site Attendance Active</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-t border-slate-800/80 pt-4 mt-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("assigned-jobs")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === "assigned-jobs"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Assigned Jobs & Field Checklist ({assignedJobs.filter((j) => j.status !== "Completed").length} Active)</span>
          </button>

          <button
            onClick={() => setActiveTab("material-request")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === "material-request"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Request Materials / Supplies</span>
          </button>

          <button
            onClick={() => setActiveTab("timesheet")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === "timesheet"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>My Shift Log & Timesheet</span>
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      <AnimatePresence mode="wait">
        {activeTab === "assigned-jobs" && (
          <motion.div
            key="assigned-jobs-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
          >
            {/* Left Column: Assigned Jobs List */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono uppercase tracking-wider font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>Today's Field Schedule</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {assignedJobs.length} Jobs Total
                </span>
              </div>

              <div className="space-y-3">
                {assignedJobs.map((job) => {
                  const isSelected = job.id === selectedJobId;
                  const completedCount = job.checklist.filter((i) => i.done).length;
                  const totalCount = job.checklist.length;
                  const progressPct = Math.round((completedCount / totalCount) * 100);

                  return (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition relative overflow-hidden ${
                        isSelected
                          ? "bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/30 shadow-lg"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          job.status === "In Progress"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : job.status === "Completed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}>
                          {job.status}
                        </span>

                        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {job.scheduledTime}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white leading-snug mb-1">
                        {job.title}
                      </h4>

                      <div className="space-y-1 text-xs text-slate-400 mb-3 font-sans">
                        <p className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                          <span>Client: {job.clientName}</span>
                        </p>
                        <p className="flex items-start gap-1.5 text-slate-400 text-[11px]">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{job.address}</span>
                        </p>
                      </div>

                      {/* Checklist Progress Bar */}
                      <div className="space-y-1 pt-2 border-t border-slate-800/80">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>Progress ({completedCount}/{totalCount} Steps)</span>
                          <span className="font-bold text-white">{progressPct}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-emerald-500 h-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Detailed Field Workspace & Checklist */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6 text-left shadow-2xl">
              {activeJob ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                          Assigned Job #{activeJob.id}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          Trade: {activeJob.trade}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-white leading-tight">
                        {activeJob.title}
                      </h2>
                    </div>

                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(activeJob.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-white rounded-xl text-xs font-mono transition shrink-0"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Google Maps Directions</span>
                    </a>
                  </div>

                  {/* Employer / Boss Notes for Worker */}
                  {activeJob.bossNotes && (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 font-mono uppercase">
                        <Shield className="w-4 h-4" />
                        <span>Contractor Instructions & Safety Briefing</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        "{activeJob.bossNotes}"
                      </p>
                    </div>
                  )}

                  {/* Client Contact Actions */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Property Contact</span>
                      <span className="font-bold text-white block">{activeJob.clientName}</span>
                      <span className="text-slate-400 text-[11px] font-mono">{activeJob.phone}</span>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <a
                        href={`tel:${activeJob.phone}`}
                        className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 rounded-lg flex items-center gap-1.5 font-mono text-xs font-bold transition"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Client</span>
                      </a>
                    </div>
                  </div>

                  {/* Interactive Field Tasks Checklist */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                        <span>Job Site Task Checklist</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsCameraModalOpen(true)}
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-500/10"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>📷 Snap Site Photo & Gemini AI Vision</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {activeJob.checklist.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => toggleChecklistItem(activeJob.id, item.id)}
                          className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                            item.done
                              ? "bg-emerald-500/5 border-emerald-500/20 text-slate-400"
                              : "bg-slate-950 border-slate-800 hover:border-slate-700 text-white"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                            item.done
                              ? "bg-emerald-500 border-emerald-500 text-slate-950"
                              : "border-slate-700 bg-slate-900"
                          }`}>
                            {item.done && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
                          </div>
                          <span className={`text-xs font-sans ${item.done ? "line-through text-slate-500" : "font-medium"}`}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attached Field Photos Gallery (from Gemini Camera) */}
                  {uploadedPhotos[activeJob.id] && uploadedPhotos[activeJob.id].length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-slate-800">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-emerald-400" />
                        <span>Attached Site Photos & AI Multimodal Logs ({uploadedPhotos[activeJob.id].length})</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {uploadedPhotos[activeJob.id].map((photo, pIdx) => (
                          <div key={pIdx} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden text-xs">
                            <div className="relative aspect-video bg-black">
                              <img src={photo.url} alt={`Site photo ${pIdx + 1}`} className="w-full h-full object-cover" />
                              <span className="absolute bottom-2 right-2 bg-slate-950/80 text-[10px] font-mono text-slate-300 px-2 py-0.5 rounded backdrop-blur-md">
                                {photo.timestamp}
                              </span>
                            </div>
                            {photo.analysis && (
                              <div className="p-3 space-y-1.5 bg-slate-900/60 border-t border-slate-800">
                                <p className="font-bold text-amber-400 text-[11px]">{photo.analysis.detectedTitle}</p>
                                <p className="text-[10px] text-slate-300 truncate">
                                  Specs: {photo.analysis.dimensions?.specRating}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Field Site Notes & Photos Logger */}
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>Log Daily Site Notes & Photos</span>
                    </h3>

                    <textarea
                      rows={3}
                      value={fieldNotes[activeJob.id] || ""}
                      onChange={(e) => setFieldNotes({ ...fieldNotes, [activeJob.id]: e.target.value })}
                      placeholder="e.g. Completed service disconnect. Verified voltage is 240V across L1-L2. Passed site cleanup inspection."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-sans"
                    />

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCameraModalOpen(true)}
                          className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-emerald-400 rounded-lg text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Snap Photo with Camera</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => alert(`Saved site progress report for Job #${activeJob.id}!`)}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Daily Field Log to Contractor</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs font-mono">
                  Select a job from your list to open the field workspace.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Material & Tool Request View */}
        {activeTab === "material-request" && (
          <motion.div
            key="material-request-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-left shadow-xl"
          >
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 uppercase bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                <Package className="w-3.5 h-3.5" />
                <span>FIELD REQUISITION</span>
              </div>
              <h2 className="text-xl font-bold text-white">Request Site Materials or Special Tools</h2>
              <p className="text-xs text-slate-400">
                Need extra wire, breakers, conduit fittings, or specialized tools brought to the job site? Submit a request to your master contractor warehouse manager.
              </p>
            </div>

            {matSent ? (
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="text-sm font-bold text-white">Material Request Dispatched!</h4>
                <p className="text-xs text-slate-300">
                  Your contractor office has been notified. Warehouse runner will drop off the items at your active site.
                </p>
              </div>
            ) : (
              <form onSubmit={handleMaterialSubmit} className="space-y-4 font-sans">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                    Material / Tool Item Required *
                  </label>
                  <input
                    type="text"
                    required
                    value={matItem}
                    onChange={(e) => setMatItem(e.target.value)}
                    placeholder="e.g. 50ft of 2-2-2-4 Aluminum SER Cable, 50A Double Pole Eaton Breaker"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                      Quantity Needed
                    </label>
                    <input
                      type="text"
                      value={matQty}
                      onChange={(e) => setMatQty(e.target.value)}
                      placeholder="e.g. 2 rolls / 1 unit"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                      Urgency Level
                    </label>
                    <select
                      value={matUrgency}
                      onChange={(e) => setMatUrgency(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition font-mono"
                    >
                      <option value="Normal">Normal Delivery (Next Runner Route)</option>
                      <option value="Urgent">Urgent (Needed within 1 Hour)</option>
                      <option value="Critical">Critical (Job Blocked)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                    Job Site Location & Notes
                  </label>
                  <textarea
                    rows={3}
                    value={matNotes}
                    onChange={(e) => setMatNotes(e.target.value)}
                    placeholder="e.g. Deliver to rear garage work zone at 1408 Oakridge Dr."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono py-3 rounded-xl shadow-lg transition cursor-pointer text-xs flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Material Requisition</span>
                </button>
              </form>
            )}
          </motion.div>
        )}

        {/* Timesheet & Shift Log View */}
        {activeTab === "timesheet" && (
          <motion.div
            key="timesheet-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 text-left shadow-xl"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400" />
                  <span>Weekly Field Hours & Shift Log</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verified timesheet log synced with {userProfile?.companyName || "Apex Electrical LLC"} payroll.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs text-slate-300">
                <span>Week Total:</span>
                <span className="font-bold text-emerald-400">25.6 Hours</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Clock In</th>
                    <th className="py-2.5 px-3">Clock Out</th>
                    <th className="py-2.5 px-3">Total Time</th>
                    <th className="py-2.5 px-3">Employer Approval Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {shiftHistory.map((shift) => (
                    <tr key={shift.id} className="hover:bg-slate-950/40 transition">
                      <td className="py-3 px-3 font-semibold text-white">{shift.date}</td>
                      <td className="py-3 px-3 font-mono text-slate-300">{shift.start}</td>
                      <td className="py-3 px-3 font-mono text-slate-300">{shift.end}</td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">{shift.totalHours}</td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          {shift.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Field Job Site Camera & Gemini Multimodal Vision Modal */}
      <FieldJobSiteCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        activeJob={activeJob}
        onPhotoCaptured={(url, analysis, notes) => handlePhotoCaptured(activeJob.id, url, analysis, notes)}
        onAddChecklistItem={(itemText) => handleAddChecklistItem(itemText)}
        onAddMaterialRequest={(req) => handleAddMaterialRequest(req)}
      />
    </div>
  );
}
