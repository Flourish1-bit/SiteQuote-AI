import React, { useState } from "react";
import { 
  Ruler, Sparkles, AlertTriangle, FileCheck, Layers, Upload, 
  X, Check, ArrowRight, Loader2, Image as ImageIcon, ShieldAlert,
  Cpu, Wrench, FileText, Plus
} from "lucide-react";

const SAMPLE_PRESETS = [
  {
    title: "Electrical Panel Photo / Sketch",
    trade: "Electrical",
    notes: "200A main service panel upgrade with solar interconnect.",
    url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Roof Framing & Pitch Blueprint",
    trade: "Roofing",
    notes: "Architectural shingle replacement over damaged valley OSB.",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Plumbing Rough-in Diagram",
    trade: "Plumbing",
    notes: "Bathroom PEX-A supply line & PVC drain-waste-vent.",
    url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop"
  }
];

export default function BlueprintAnalyzerModal({ isOpen, onClose, onImportLineItems, defaultLead }) {
  const [images, setImages] = useState([]);
  const [trade, setTrade] = useState(defaultLead?.trade || "General Construction");
  const [userNotes, setUserNotes] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImages((prev) => [...prev, event.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePresetSelect = (preset) => {
    setTrade(preset.trade);
    setUserNotes(preset.notes);
    setImages([preset.url]);
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRunAnalysis = async () => {
    if (images.length === 0) {
      setError("Please upload at least one blueprint, site sketch, or job site photo.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    setImportSuccess(false);

    try {
      const res = await fetch("/api/analyze-blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images,
          trade,
          userNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");

      setAnalysisResult(data.analysis);
    } catch (err) {
      console.error("Blueprint Vision Analysis Error:", err);
      setError(err.message || "Failed to complete AI Vision analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImport = () => {
    if (!analysisResult?.autoPopulatedLineItems) return;
    if (onImportLineItems) {
      onImportLineItems(analysisResult.autoPopulatedLineItems, analysisResult);
      setImportSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                AI Blueprint & Site Photo Analyzer
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-widest font-semibold">
                  Gemini Vision
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Extract dimensions, specs, municipal code risks, and auto-populate line items.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* Top Form Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5 font-semibold">
                Trade Specialty
              </label>
              <select
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="Electrical">Electrical (NEC Code)</option>
                <option value="Roofing">Roofing & Structural Framing</option>
                <option value="Plumbing">Plumbing & DVW (IPC Code)</option>
                <option value="HVAC">HVAC & Climate Control</option>
                <option value="General Construction">General Construction & Remodel</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5 font-semibold">
                Job Context / Technician Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Inspect panel amperage, check roof slope, bathroom DWV..."
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Preset Quick Select */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Or Try Sample Blueprint / Photo Presets:
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {SAMPLE_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetSelect(p)}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition-all text-xs flex items-center gap-2 group"
                >
                  <img src={p.url} alt={p.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 group-hover:text-amber-400 truncate">{p.title}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{p.trade}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Upload Zone */}
          <div className="space-y-3">
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">
              Upload Blueprint, Job Photo, or Hand Sketch
            </label>
            <div className="border-2 border-dashed border-slate-800 hover:border-amber-500/50 bg-slate-950/60 rounded-2xl p-6 text-center transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="blueprint-upload-input"
              />
              <label htmlFor="blueprint-upload-input" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    Click to browse or drop blueprint/photos here
                  </p>
                  <p className="text-[11px] text-slate-500">Supports PNG, JPG, WEBP, or site sketches</p>
                </div>
              </label>
            </div>

            {/* Uploaded Images Preview Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video">
                    <img src={img} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-slate-950/80 text-slate-300 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <button
              disabled={isAnalyzing || images.length === 0}
              onClick={handleRunAnalysis}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gemini Vision Extracting Specs...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Visual Evidence with AI</span>
                </>
              )}
            </button>
          </div>

          {/* Analysis Results Display */}
          {analysisResult && (
            <div className="mt-6 p-5 sm:p-6 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Header Title */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-wider font-semibold">
                    <FileCheck className="w-4 h-4" /> AI Vision Report Generated
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{analysisResult.detectedTitle}</h3>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                  Precision Engine v2.5
                </span>
              </div>

              {/* Grid: Extracted Dimensions */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-semibold">
                  <Ruler className="w-3.5 h-3.5 text-amber-400" /> Extracted Dimensions & Spec Ratings
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-mono">Estimated Area</p>
                    <p className="text-sm font-bold text-amber-400 mt-0.5">{analysisResult.dimensions?.estimatedArea || "N/A"}</p>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-mono">Length x Width</p>
                    <p className="text-sm font-bold text-white mt-0.5">{analysisResult.dimensions?.lengthWidth || "N/A"}</p>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-mono">Working Clearance</p>
                    <p className="text-sm font-bold text-white mt-0.5">{analysisResult.dimensions?.heightOrClearance || "N/A"}</p>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-mono">Main Spec Rating</p>
                    <p className="text-sm font-bold text-emerald-400 mt-0.5">{analysisResult.dimensions?.specRating || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Identified Materials */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-semibold">
                  <Layers className="w-3.5 h-3.5 text-amber-400" /> Identified Material Specifications
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.materials?.map((mat, i) => (
                    <span key={i} className="text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {mat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Municipal Code Flags */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> Municipal Code Flags & Safety Standards
                </h4>
                <div className="space-y-1.5">
                  {analysisResult.codeFlags?.map((flag, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{flag}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Summary */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Technical Summary
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                  {analysisResult.summary}
                </p>
              </div>

              {/* Auto-Populated Line Items */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-semibold">
                    <FileText className="w-3.5 h-3.5 text-amber-400" /> Vision-Derived Estimate Line Items
                  </h4>
                  <span className="text-xs font-bold text-amber-400">
                    Est. Total: ${analysisResult.autoPopulatedLineItems?.reduce((a, b) => a + (b.estimatedCost || 0), 0).toLocaleString()}
                  </span>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                      <tr>
                        <th className="p-3">Description</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Estimated Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {analysisResult.autoPopulatedLineItems?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-medium text-slate-200">{item.description}</td>
                          <td className="p-3 font-mono">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              item.category === "Labor"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : item.category === "Material"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            }`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-white">${item.estimatedCost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Import Action Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleImport}
                    disabled={importSuccess}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {importSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Line Items Imported to Proposal!</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Auto-Populate Line Items into Estimate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
