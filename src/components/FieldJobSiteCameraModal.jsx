import React, { useState, useRef, useEffect } from "react";
import { 
  Camera, X, RefreshCw, Sparkles, CheckCircle2, AlertTriangle, 
  Layers, Ruler, ShieldAlert, Plus, Upload, Loader2, Image as ImageIcon, 
  SwitchCamera, Zap, ArrowRight, FileText, Check
} from "lucide-react";

export default function FieldJobSiteCameraModal({
  isOpen,
  onClose,
  activeJob,
  onPhotoCaptured,
  onAddChecklistItem,
  onAddMaterialRequest,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Camera stream state
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); // "environment" | "user"
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [workerNotes, setWorkerNotes] = useState("");

  // AI Multimodal analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [attachedSuccess, setAttachedSuccess] = useState(false);
  const [addedTasksSuccess, setAddedTasksSuccess] = useState(false);

  // Sample presets for quick testing or fallback when camera is restricted
  const SAMPLE_FIELD_PHOTOS = [
    {
      title: "200A Electrical Service Panel",
      trade: "Electrical",
      url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop",
      notes: "Main service disconnect and busbar inspection."
    },
    {
      title: "Roof Framing & Rafter Joint",
      trade: "Roofing",
      url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop",
      notes: "Checking joist span and moisture barrier."
    },
    {
      title: "Plumbing Supply Line Rough-in",
      trade: "Plumbing",
      url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop",
      notes: "PEX supply line pressure test."
    }
  ];

  // Start / Stop Camera Stream
  useEffect(() => {
    if (isOpen && !capturedPhoto) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, capturedPhoto]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Webcam access is not supported by this browser.");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn("Camera start warning:", err.message);
      setCameraError("Camera stream not available. You can upload or select a job site photo below.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const handleSnapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedPhoto(dataUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setCapturedPhoto(evt.target?.result);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectSample = (sample) => {
    setCapturedPhoto(sample.url);
    if (sample.notes) setWorkerNotes(sample.notes);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setAttachedSuccess(false);
    setAddedTasksSuccess(false);
    startCamera();
  };

  const handleAnalyzePhoto = async () => {
    if (!capturedPhoto) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await fetch("/api/analyze-blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: [capturedPhoto],
          trade: activeJob?.trade || "General Construction",
          userNotes: workerNotes || `Field photo snapshot for job: ${activeJob?.title || "Site Inspection"}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Multimodal Vision Analysis failed.");

      setAnalysisResult(data.analysis);
    } catch (err) {
      console.error("Gemini Vision Error:", err);
      setAnalysisError(err.message || "Failed to complete AI site photo analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAttachToLog = () => {
    if (!capturedPhoto) return;
    if (onPhotoCaptured) {
      onPhotoCaptured(capturedPhoto, analysisResult, workerNotes);
      setAttachedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  const handleAddSafetyCodeTasks = () => {
    if (!analysisResult?.codeFlags) return;
    if (onAddChecklistItem) {
      analysisResult.codeFlags.forEach((flag) => {
        onAddChecklistItem(`[AI Code Check] ${flag}`);
      });
      setAddedTasksSuccess(true);
    }
  };

  const handleImportMaterialsToRequisition = () => {
    if (!analysisResult?.materials) return;
    if (onAddMaterialRequest) {
      const matSummary = analysisResult.materials.join(", ");
      onAddMaterialRequest({
        item: matSummary,
        qty: "1 lot",
        urgency: "Normal",
        notes: `Extracted via Gemini Vision camera snapshot for ${activeJob?.title}`,
      });
      alert("Material requirements exported to Material Requisition Form!");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto text-slate-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Field Worker Job Site Camera
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold uppercase">
                  Gemini Multimodal Vision
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Snap live site photos to analyze structural details, material specs, & code requirements.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Active Job Context Bar */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Active Job: <strong className="text-white">{activeJob?.title || "Site Inspection"}</strong></span>
            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">{activeJob?.trade || "Electrical"}</span>
          </div>

          {/* Camera Viewfinder OR Snapped Photo Preview */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center">
            {!capturedPhoto ? (
              /* Live Stream View */
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                {stream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="p-6 text-center space-y-3">
                    <Camera className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 max-w-sm">
                      {cameraError || "Initializing camera stream..."}
                    </p>
                  </div>
                )}

                {/* Shutter Overlay Controls */}
                <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 px-4">
                  {stream && (
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 transition backdrop-blur-md cursor-pointer"
                      title="Switch Camera (Front/Back)"
                    >
                      <SwitchCamera className="w-5 h-5" />
                    </button>
                  )}

                  {stream && (
                    <button
                      type="button"
                      onClick={handleSnapPhoto}
                      className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition transform active:scale-95 cursor-pointer border-4 border-slate-950"
                      title="Snap Photo"
                    >
                      <div className="w-6 h-6 rounded-full border-2 border-slate-950" />
                    </button>
                  )}

                  <label className="p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 transition backdrop-blur-md cursor-pointer">
                    <Upload className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              /* Snapped Image Preview */
              <div className="relative w-full h-full bg-black flex items-center justify-center">
                <img
                  src={capturedPhoto}
                  alt="Captured Job Site"
                  className="w-full h-full object-contain"
                />

                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-xs font-mono flex items-center gap-1.5 backdrop-blur-md hover:bg-slate-900 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Retake Photo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Fallback Sample Presets (When camera stream is blocked or testing) */}
          {!capturedPhoto && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">
                Or Select Sample Job Site Snapshots:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {SAMPLE_FIELD_PHOTOS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSample(sample)}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-left transition text-xs flex items-center gap-2 cursor-pointer group"
                  >
                    <img src={sample.url} alt={sample.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-200 group-hover:text-emerald-400 truncate">{sample.title}</p>
                      <p className="text-[10px] text-slate-500 font-mono truncate">{sample.trade}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Technician Notes Field */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1 font-semibold">
              Field Technician Observations / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Inspect main disconnect, check panel bus copper corrosion, note ceiling height..."
              value={workerNotes}
              onChange={(e) => setWorkerNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Action Button: Run Gemini AI Multimodal Vision Analysis */}
          {capturedPhoto && (
            <div className="space-y-4">
              <button
                disabled={isAnalyzing}
                onClick={handleAnalyzePhoto}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gemini AI Analyzing Site Photo Multimodal Data...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze Photo for Structural & Material Specs (Gemini AI Vision)</span>
                  </>
                )}
              </button>

              {analysisError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{analysisError}</span>
                </div>
              )}

              {/* Gemini Vision Findings Report */}
              {analysisResult && (
                <div className="p-5 bg-slate-950 rounded-2xl border border-emerald-500/30 space-y-5 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">Gemini Multimodal Visual Report</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {analysisResult.detectedTitle}
                    </span>
                  </div>

                  {/* Dimensions & Structural Findings */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Estimated Area</span>
                      <span className="font-bold text-amber-400">{analysisResult.dimensions?.estimatedArea}</span>
                    </div>
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Length x Width</span>
                      <span className="font-bold text-white">{analysisResult.dimensions?.lengthWidth}</span>
                    </div>
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Clearance / Span</span>
                      <span className="font-bold text-white">{analysisResult.dimensions?.heightOrClearance}</span>
                    </div>
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Spec Rating</span>
                      <span className="font-bold text-emerald-400">{analysisResult.dimensions?.specRating}</span>
                    </div>
                  </div>

                  {/* Material Specs */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-mono uppercase text-slate-400 font-semibold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" /> Detected Material & Hardware Requirements:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.materials?.map((mat, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 font-medium">
                          • {mat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Safety & Municipal Code Flags */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-mono uppercase text-slate-400 font-semibold flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> Building Code Safety Standards:
                    </span>
                    <div className="space-y-1">
                      {analysisResult.codeFlags?.map((flag, i) => (
                        <div key={i} className="text-xs p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          <span>{flag}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed">
                    {analysisResult.summary}
                  </div>

                  {/* 1-Click Integration Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={handleAddSafetyCodeTasks}
                      disabled={addedTasksSuccess}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-mono transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {addedTasksSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{addedTasksSuccess ? "Code Flags Added!" : "Add Code Flags to Checklist"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleImportMaterialsToRequisition}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-mono transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Send Materials to Requisition</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAttachToLog}
                      disabled={attachedSuccess}
                      className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs font-mono transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      {attachedSuccess ? <Check className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                      <span>{attachedSuccess ? "Attached!" : "Attach to Daily Field Log"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
