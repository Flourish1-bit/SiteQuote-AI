import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, Send, Upload, User, Mail, Phone, MapPin, 
  CheckCircle, FileText, ArrowRight, Loader2, Image as ImageIcon, Trash2, ShieldCheck,
  Camera, X, RefreshCw, Sparkles, Plus, Check
} from "lucide-react";

export default function LeadPrescreenWidget({ trade, onProposalGenerated }) {
  // Chat States
  const [messages, setMessages] = useState([
    {
      role: "model",
      text: `Hello! Welcome to our automated quote portal. I'm your digital front-office assistant. To help get your ${trade} project estimated accurately, could you tell me a little bit about the scope of work you need done? You can also snap or upload photos of whatever needs fixing!`,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [leadId, setLeadId] = useState(null);
  
  // Qualification States
  const [isQualified, setIsQualified] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  
  // Form submission & Image States
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isSubmittingDetails, setIsSubmittingDetails] = useState(false);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);

  // Live Camera Viewfinder States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); // "environment" | "user"
  const [isCapturing, setIsCapturing] = useState(false);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const nativeCameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Clean up web stream on unmount
  useEffect(() => {
    return () => {
      if (window.activeCameraStream) {
        window.activeCameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const openCamera = async (mode = facingMode) => {
    setIsCameraOpen(true);
    setCameraError(null);
    try {
      if (window.activeCameraStream) {
        window.activeCameraStream.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      window.activeCameraStream = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera streaming error:", err);
      setCameraError("Browser camera stream could not be started. You can use native camera capture below.");
    }
  };

  const closeCamera = () => {
    if (window.activeCameraStream) {
      window.activeCameraStream.getTracks().forEach((track) => track.stop());
      window.activeCameraStream = null;
    }
    setIsCameraOpen(false);
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    openCamera(nextMode);
  };

  const takeCameraSnapshot = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const matches = dataUrl.match(/^data:(image\/[a-z]+);base64,(.*)$/);
      if (matches) {
        const newImg = {
          mimeType: matches[1],
          data: matches[2],
          name: `Fix_Photo_${Date.now()}.jpg`,
          preview: dataUrl,
          isCamera: true,
        };
        setUploadedImages((prev) => [...prev, newImg]);

        // Post visual feedback message in chat
        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            text: "📷 Attached photo of item needing repair/fix",
            imagePreview: dataUrl,
          },
        ]);

        // Acknowledge automatically
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: "model",
              text: "Photo received! I can see the issue clearly. Could you tell me a bit more about what happened or when you need this fixed?",
            },
          ]);
        }, 700);
      }
    }
    setTimeout(() => {
      setIsCapturing(false);
      closeCamera();
    }, 300);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userMsg = inputText.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInputText("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/leads/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          message: userMsg,
          trade,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (data.leadId) setLeadId(data.leadId);
      
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: "model", text: data.reply }]);

      if (data.isQualified) {
        setIsQualified(true);
        setExtractedData(data.qualifiedDetails);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "I'm having a bit of trouble connecting to our system right now. Let's try that again in a second." },
      ]);
    }
  };

  const handleImageUpload = (e) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        const matches = base64String.match(/^data:(image\/[a-z]+);base64,(.*)$/);
        if (matches) {
          const newImg = {
            mimeType: matches[1],
            data: matches[2],
            name: file.name,
            preview: base64String,
            isCamera: file.name.includes("Camera") || file.name.includes("Fix_Photo"),
          };
          setUploadedImages((prev) => [...prev, newImg]);

          // Add image preview card to chat feed
          setMessages((prev) => [
            ...prev,
            {
              role: "user",
              text: `📷 Attached image: ${file.name}`,
              imagePreview: base64String,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !phone || !leadId) return;

    setIsSubmittingDetails(true);
    try {
      // 1. Submit contact info & photos
      const submitRes = await fetch("/api/leads/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          name: fullName,
          email,
          phone,
          images: uploadedImages.map((img) => ({ mimeType: img.mimeType, data: img.data })),
        }),
      });
      const submitData = await submitRes.json();
      if (submitData.error) throw new Error(submitData.error);

      // 2. Trigger Agent 2 Proposal Generation
      setIsSubmittingDetails(false);
      setIsGeneratingProposal(true);

      const proposalRes = await fetch("/api/proposals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const proposalData = await proposalRes.json();
      if (proposalData.error) throw new Error(proposalData.error);

      setIsGeneratingProposal(false);
      onProposalGenerated(proposalData.id);
    } catch (err) {
      console.error("Submission error:", err);
      setIsSubmittingDetails(false);
      setIsGeneratingProposal(false);
      alert("Something went wrong during proposal generation. Please check your network connection and API key settings.");
    }
  };

  return (
    <div id="lead_qualifier_widget" className="relative bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[550px] sm:h-[650px] w-full max-w-lg mx-auto">
      {/* Hidden inputs for camera & file upload */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      <input
        type="file"
        ref={nativeCameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Live Camera Viewfinder Modal Overlay */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/95 flex flex-col justify-between p-4"
          >
            {/* Camera Header */}
            <div className="flex items-center justify-between text-white z-10">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">Snap Repair Item</span>
              </div>
              <button
                type="button"
                onClick={closeCamera}
                className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewfinder Frame */}
            <div className="relative flex-1 my-3 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
              {cameraError ? (
                <div className="p-6 text-center space-y-3">
                  <Camera className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-lg inline-flex items-center gap-2 transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Launch Device Camera App
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {/* Framing Reticle */}
                  <div className="absolute inset-8 border-2 border-dashed border-amber-400/60 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] font-mono text-amber-300/80 bg-slate-950/80 px-2 py-1 rounded backdrop-blur-sm">
                      Align damage / fix item inside frame
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Camera Controls Footer */}
            <div className="flex items-center justify-between px-6 py-2 z-10">
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-3 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title="Switch Camera Lens"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={takeCameraSnapshot}
                disabled={isCapturing || !!cameraError}
                className="p-1 rounded-full border-4 border-amber-500 hover:scale-105 active:scale-95 transition cursor-pointer disabled:opacity-40"
              >
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg">
                  {isCapturing && <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="p-3 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title="Use Direct File/Camera"
              >
                <Upload className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget Header */}
      <div className="bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
            <MessageSquare className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-sans font-semibold text-white tracking-wide text-sm flex items-center gap-2">
              SiteQuote AI Front Office
              {isQualified && (
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-mono">
                  Qualified
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">Autonomous Pre-Screening & Photo Intake</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono uppercase bg-slate-900 px-2 py-1 rounded border border-slate-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          A.I. Dispatch
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-950 to-slate-900">
        <AnimatePresence initial={false}>
          {/* Chat Logs */}
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl p-3.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-amber-600 text-white rounded-br-none font-sans font-medium border border-amber-500"
                    : "bg-slate-900 text-slate-100 rounded-bl-none border border-slate-800/80"
                }`}
              >
                {/* Parse JSON Qualified Message text elegantly to omit the raw JSON marker block from displaying */}
                {msg.text.split("[QUALIFIED_LEAD_DATA:")[0].trim()}

                {/* Optional Image Preview inside Chat */}
                {msg.imagePreview && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-amber-400/40 max-w-[200px] aspect-video bg-black">
                    <img src={msg.imagePreview} alt="Captured Fix Area" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="bg-slate-900 text-slate-400 rounded-xl rounded-bl-none border border-slate-800 p-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500">Front Office is drafting...</span>
              </div>
            </motion.div>
          )}

          {/* Locked Contact & Upload Step (Revealed when Qualified) */}
          {isQualified && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-6 border border-amber-500/30 bg-amber-500/5 rounded-xl p-4 space-y-4"
            >
              <div className="flex items-center gap-2 text-amber-500 font-sans font-semibold text-sm border-b border-amber-500/20 pb-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                Step 2: Structural Intake Form
              </div>
              <p className="text-xs text-slate-300">
                Congratulations! Based on our chat, your project is inside our core scope. Please verify your contact info and snap/upload photos of what you need fixed.
              </p>

              {/* Qualification summaries parsed from AI */}
              {extractedData && (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 space-y-1.5 font-mono text-[10px]">
                  <div className="flex justify-between"><span className="text-slate-500 uppercase">Est. Scope:</span> <span className="text-white text-right truncate max-w-[180px]">{extractedData.scope}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 uppercase">Target ZIP:</span> <span className="text-amber-500 font-bold">{extractedData.zip}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 uppercase">Urgency:</span> <span className="text-white">{extractedData.timeline}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 uppercase">Target Budget:</span> <span className="text-emerald-500">{extractedData.budget}</span></div>
                </div>
              )}

              <form onSubmit={handleFinalSubmit} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Full Contact Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="jane@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="tel"
                        required
                        placeholder="(555) 000-0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Job Site Image & Camera Intake */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Take Photos of Stuff to Fix (Highly Recommended)
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openCamera()}
                      className="p-3 bg-slate-950 hover:bg-slate-800 border border-amber-500/40 rounded-xl text-center flex flex-col items-center justify-center gap-1 transition cursor-pointer group"
                    >
                      <Camera className="w-5 h-5 text-amber-400 group-hover:scale-110 transition" />
                      <span className="text-[11px] font-bold text-white">Snap Live Photo</span>
                      <span className="text-[9px] text-slate-400">Use device camera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-center flex flex-col items-center justify-center gap-1 transition cursor-pointer group"
                    >
                      <Upload className="w-5 h-5 text-slate-400 group-hover:scale-110 transition" />
                      <span className="text-[11px] font-bold text-slate-300">Choose Files</span>
                      <span className="text-[9px] text-slate-500">JPG, PNG photos</span>
                    </button>
                  </div>

                  {/* Image Previews */}
                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                      {uploadedImages.map((img, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-800 bg-slate-900 aspect-square">
                          <img 
                            src={img.preview || `data:${img.mimeType};base64,${img.data}`} 
                            alt={img.name} 
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white rounded p-1 shadow transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <span className="absolute bottom-1 left-1 bg-slate-950/80 text-[8px] font-mono text-amber-400 px-1 rounded backdrop-blur-sm">
                            {img.isCamera ? "📷 Camera" : "📁 File"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Trigger */}
                <button
                  type="submit"
                  disabled={isSubmittingDetails || isGeneratingProposal}
                  className="w-full mt-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-sans font-semibold rounded-lg text-xs py-3 shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingDetails ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Logging contact dossier...
                    </>
                  ) : isGeneratingProposal ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-900" />
                      Grounding compliance & municipal rates...
                    </>
                  ) : (
                    <>
                      Submit Intake & Generate Proposal
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      {/* Chat Footer Input (Disabled when qualified) */}
      {!isQualified && (
        <form onSubmit={handleSendMessage} className="bg-slate-950 p-2.5 border-t border-slate-800 flex items-center gap-2">
          {/* Quick Snap Camera Button in Chat */}
          <button
            type="button"
            onClick={() => openCamera()}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg border border-slate-800 transition cursor-pointer flex items-center gap-1 shrink-0"
            title="Snap a photo of the item needing fix"
          >
            <Camera className="w-4 h-4" />
            <span className="text-[10px] font-bold hidden sm:inline">Snap Photo</span>
          </button>

          <input
            type="text"
            disabled={isTyping}
            placeholder="Type your message or describe what needs fixing..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none disabled:opacity-50 min-w-0"
          />

          <button
            type="submit"
            disabled={isTyping || !inputText.trim()}
            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-semibold rounded-lg p-2 text-xs transition cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      )}
    </div>
  );
}
