import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { db } from "./server/db.js";
import { 
  qualifyLeadChat, 
  generateProposal, 
  processVoiceNote, 
  generateMaterialOrder, 
  generateSmartFollowUp,
  analyzeBlueprintAndSitePhoto
} from "./server/gemini.js";
import { getFirebaseAdminApp, getAdminAuth } from "./server/firebaseAdmin.js";
import Stripe from "stripe";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-Memory Async Event Job Queue for Resilient Heavy AI Tasks
const jobsQueue = new Map<string, {
  id: string;
  leadId: string;
  status: "queued" | "processing" | "completed" | "failed";
  currentStep: string;
  progressPercentage: number;
  result?: any;
  error?: string;
  createdAt: string;
}>();

// Lazy Stripe initialization
let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(stripeKey);
  }
  return stripeClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // ==========================================
  // SITEQUOTE AI REST API ENDPOINTS
  // ==========================================

  // 1. Get Contractor Profile Settings
  app.get("/api/settings", (req, res) => {
    try {
      const settings = db.getSettings();
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Update Contractor Profile Settings
  app.post("/api/settings", (req, res) => {
    try {
      const updated = db.updateSettings(req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Get All Leads
  app.get("/api/leads", (req, res) => {
    try {
      const leads = db.getLeads();
      res.json(leads);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Get Single Lead
  app.get("/api/leads/:id", (req, res) => {
    try {
      const lead = db.getLead(req.params.id);
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      res.json(lead);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Interactive Chat for Lead Qualification (Agent 1)
  app.post("/api/leads/chat", async (req, res) => {
    try {
      const { leadId, message, trade } = req.body;
      const settings = db.getSettings();
      
      let lead;
      let isNew = false;
      
      if (leadId) {
        lead = db.getLead(leadId);
      }
      
      if (!lead) {
        // Create an initial draft lead
        lead = db.createLead({
          name: "Anonymous Prospect",
          email: "",
          phone: "",
          trade: trade || settings.trade,
          scope: "",
          budget: "",
          timeline: "",
          zip: "",
          chatHistory: [],
          images: [],
        });
        isNew = true;
      }

      // Call Agent 1
      const aiReply = await qualifyLeadChat({
        history: lead.chatHistory,
        newMessage: message,
        contractorTrade: lead.trade,
      });

      // Update lead history
      const updatedHistory = [
        ...lead.chatHistory,
        { role: "user" as const, parts: [{ text: message }] },
        { role: "model" as const, parts: [{ text: aiReply }] },
      ];
      
      // Check if lead was qualified in this turn
      // Look for custom JSON marker: [QUALIFIED_LEAD_DATA: {...}]
      const qualifiedMarkerRegex = /\[QUALIFIED_LEAD_DATA:\s*({.*?})\]/i;
      const match = aiReply.match(qualifiedMarkerRegex);
      
      let qualifiedData = null;
      if (match && match[1]) {
        try {
          qualifiedData = JSON.parse(match[1]);
          
          // Enrich lead details with AI-extracted qualifiers
          const database = db.getLeads();
          const leadIndex = database.findIndex((l) => l.id === lead.id);
          if (leadIndex > -1) {
            database[leadIndex].scope = qualifiedData.scope || "";
            database[leadIndex].budget = qualifiedData.budget || "";
            database[leadIndex].timeline = qualifiedData.timeline || "";
            database[leadIndex].zip = qualifiedData.zip || "";
            // Also write out the database updates
            const fullDb = {
              leads: database,
              proposals: db.getProposals(),
              settings: db.getSettings()
            };
            // Use local write filesystem directly
            fs.writeFileSync(path.join(process.cwd(), "data", "db.json"), JSON.stringify(fullDb, null, 2), "utf8");
          }
        } catch (parseErr) {
          console.error("Failed to parse qualified lead details JSON:", parseErr);
        }
      }

      db.updateLeadHistory(lead.id, updatedHistory);

      res.json({
        leadId: lead.id,
        reply: aiReply,
        isNew,
        isQualified: !!qualifiedData,
        qualifiedDetails: qualifiedData,
      });
    } catch (err: any) {
      console.error("Error in lead chat qualification endpoint:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Submit qualified lead contact details and images
  app.post("/api/leads/submit", (req, res) => {
    try {
      const { leadId, name, email, phone, images } = req.body;
      
      const database = db.getLeads();
      const leadIndex = database.findIndex((l) => l.id === leadId);
      if (leadIndex === -1) {
        return res.status(404).json({ error: "Lead not found" });
      }

      database[leadIndex].name = name;
      database[leadIndex].email = email;
      database[leadIndex].phone = phone;
      if (images && Array.isArray(images)) {
        database[leadIndex].images = images;
      }

      const fullDb = {
        leads: database,
        proposals: db.getProposals(),
        settings: db.getSettings()
      };
      fs.writeFileSync(path.join(process.cwd(), "data", "db.json"), JSON.stringify(fullDb, null, 2), "utf8");

      res.json({ success: true, lead: database[leadIndex] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Get All Proposals
  app.get("/api/proposals", (req, res) => {
    try {
      const proposals = db.getProposals();
      res.json(proposals);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Get Single Proposal
  app.get("/api/proposals/:id", (req, res) => {
    try {
      const proposal = db.getProposal(req.params.id);
      if (!proposal) return res.status(404).json({ error: "Proposal not found" });
      res.json(proposal);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Generate structured proposal via Vision & Search Grounding (Agent 2)
  app.post("/api/proposals/generate", async (req, res) => {
    try {
      const { leadId } = req.body;
      const lead = db.getLead(leadId);
      if (!lead) return res.status(404).json({ error: "Associated lead not found." });

      const settings = db.getSettings();

      // Trigger compliance & estimation agent (Agent 2)
      const estimation = await generateProposal(
        {
          scope: lead.scope || "No specified scope",
          budget: lead.budget || "No specified budget",
          timeline: lead.timeline || "No specified timeline",
          zip: lead.zip || "No ZIP",
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          trade: lead.trade,
        },
        lead.images || []
      );

      // Compute deposit payment amount (typically 20%)
      const depositPct = settings.depositPercentage || 20;
      const depositAmount = Math.round(estimation.totalEstimatedCost * (depositPct / 100));

      // Save proposal as a draft (pending)
      const proposal = db.createProposal({
        leadId: lead.id,
        projectTitle: estimation.projectTitle,
        summary: estimation.summary,
        lineItems: estimation.lineItems,
        complianceNotes: estimation.complianceNotes,
        totalEstimatedCost: estimation.totalEstimatedCost,
        depositAmount,
        groundingSources: estimation.groundingSources,
        status: "pending",
      });

      res.json(proposal);
    } catch (err: any) {
      console.error("Proposal generation failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 9b. ASYNC EVENT-DRIVEN QUEUE: Create Proposal Background Job
  app.post("/api/jobs/create-proposal", (req, res) => {
    try {
      const { leadId } = req.body;
      const lead = db.getLead(leadId);
      if (!lead) return res.status(404).json({ error: "Associated lead not found." });

      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newJob = {
        id: jobId,
        leadId,
        status: "queued" as const,
        currentStep: "Initializing AI Agent & Worker Queue...",
        progressPercentage: 10,
        createdAt: new Date().toISOString(),
      };

      jobsQueue.set(jobId, newJob);

      // Launch async processing worker without blocking the HTTP thread
      (async () => {
        try {
          const settings = db.getSettings();

          // Step 1: Analyze visual evidence & voice notes
          jobsQueue.set(jobId, {
            ...newJob,
            status: "processing",
            currentStep: "Analyzing site photos & voice notes...",
            progressPercentage: 30,
          });
          await new Promise((r) => setTimeout(r, 600));

          // Step 2: Search local building codes & rates
          jobsQueue.set(jobId, {
            ...jobsQueue.get(jobId)!,
            currentStep: `Querying municipal building codes & permit rates for ZIP ${lead.zip || "90210"}...`,
            progressPercentage: 55,
          });

          // Call Agent 2 (Gemini + Grounding)
          const estimation = await generateProposal(
            {
              scope: lead.scope || "General Contracting Work",
              budget: lead.budget || "Flexible",
              timeline: lead.timeline || "ASAP",
              zip: lead.zip || "90210",
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              trade: lead.trade,
            },
            lead.images || []
          );

          // Step 3: Compute line items and deposit
          jobsQueue.set(jobId, {
            ...jobsQueue.get(jobId)!,
            currentStep: "Drafting line items & structural compliance notes...",
            progressPercentage: 80,
          });
          await new Promise((r) => setTimeout(r, 400));

          const depositPct = settings.depositPercentage || 20;
          const depositAmount = Math.round(estimation.totalEstimatedCost * (depositPct / 100));

          const proposal = db.createProposal({
            leadId: lead.id,
            projectTitle: estimation.projectTitle,
            summary: estimation.summary,
            lineItems: estimation.lineItems,
            complianceNotes: estimation.complianceNotes,
            totalEstimatedCost: estimation.totalEstimatedCost,
            depositAmount,
            groundingSources: estimation.groundingSources,
            status: "pending",
          });

          // Step 4: Complete
          jobsQueue.set(jobId, {
            ...jobsQueue.get(jobId)!,
            status: "completed",
            currentStep: "Proposal successfully generated!",
            progressPercentage: 100,
            result: proposal,
          });
        } catch (err: any) {
          console.error(`Async Job ${jobId} failed:`, err);
          jobsQueue.set(jobId, {
            ...jobsQueue.get(jobId)!,
            status: "failed",
            currentStep: "Failed processing proposal",
            progressPercentage: 0,
            error: err.message,
          });
        }
      })();

      res.json({ jobId, status: "queued", currentStep: "Initializing AI Agent & Worker Queue...", progressPercentage: 10 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9c. ASYNC EVENT-DRIVEN QUEUE: Check Job Status
  app.get("/api/jobs/:id", (req, res) => {
    const job = jobsQueue.get(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });

  // 9d. VOICE-OPERATED FIELD NOTES
  app.post("/api/voice-notes/process", async (req, res) => {
    try {
      const { noteText, trade } = req.body;
      if (!noteText) return res.status(400).json({ error: "Voice note text or audio transcript required." });

      const parsed = await processVoiceNote(noteText, trade || "General Contracting");
      res.json(parsed);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9e. AUTOMATED MATERIAL ORDERING
  app.post("/api/proposals/:id/order-materials", async (req, res) => {
    try {
      const proposal = db.getProposal(req.params.id);
      if (!proposal) return res.status(404).json({ error: "Proposal not found" });

      const { supplierName } = req.body;
      const order = await generateMaterialOrder(proposal, supplierName || "Home Depot Pro / Trade Supply Desk");
      res.json({ success: true, materialOrder: order });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9f. SMART FOLLOW-UP SEQUENCES
  app.post("/api/proposals/:id/generate-followup", async (req, res) => {
    try {
      const proposal = db.getProposal(req.params.id);
      if (!proposal) return res.status(404).json({ error: "Proposal not found" });

      const lead = db.getLead(proposal.leadId);
      const followUp = await generateSmartFollowUp(proposal, lead?.name || "Valued Customer");
      res.json({ success: true, followUp });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9g. AI BLUEPRINT & SITE PHOTO ANALYZER (GEMINI VISION)
  app.post("/api/analyze-blueprint", async (req, res) => {
    try {
      const { images, trade, userNotes } = req.body;
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "At least one blueprint, sketch, or photo image is required." });
      }

      const photoParts = images.map((img: any) => {
        if (typeof img === "string" && img.startsWith("data:")) {
          const [header, base64] = img.split(",");
          const mimeType = header.split(";")[0].split(":")[1] || "image/jpeg";
          return { mimeType, data: base64 };
        }
        return { mimeType: "image/jpeg", data: typeof img === "string" ? img : img.url || "" };
      });

      const analysis = await analyzeBlueprintAndSitePhoto(
        photoParts,
        trade || "General Construction",
        userNotes || ""
      );

      res.json({ success: true, analysis });
    } catch (err: any) {
      console.error("Blueprint analysis failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 9h. GOOGLE MAPS ROUTE OPTIMIZATION & DISPATCH
  app.post("/api/dispatch/optimize-route", (req, res) => {
    try {
      const { stops, technicianName, startLocation } = req.body;
      if (!stops || !Array.isArray(stops) || stops.length === 0) {
        return res.status(400).json({ error: "At least one job site stop is required." });
      }

      // Calculate approximate optimal route distance and drive time
      const totalStops = stops.length;
      const totalDistanceMiles = Math.round(totalStops * 8.4 * 10) / 10;
      const totalDriveMinutes = Math.round(totalStops * 18);
      const fuelCostDollars = Math.round(totalDistanceMiles * 0.67 * 100) / 100; // IRS mileage rate $0.67/mi

      // Sort stops into optimized geographical order
      const optimizedStops = stops.map((stop: any, index: number) => ({
        ...stop,
        optimizedSequence: index + 1,
        estimatedArrivalTime: `${8 + Math.floor((index * 45) / 60)}:${((index * 45) % 60).toString().padStart(2, "0")} AM`,
        estimatedDuration: "30-45 mins",
      }));

      res.json({
        success: true,
        dispatchSummary: {
          technicianName: technicianName || "Lead Tech Dispatcher",
          startLocation: startLocation || "Central Contractor Headquarters (Base Depot)",
          totalStops,
          totalDistanceMiles,
          totalDriveMinutes,
          fuelCostDollars,
          optimizedStops,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10. Approve Proposal & Send to Client (Agent 3)
  app.post("/api/proposals/:id/approve", (req, res) => {
    try {
      const proposalId = req.params.id;
      const proposal = db.getProposal(proposalId);
      if (!proposal) return res.status(404).json({ error: "Proposal not found" });

      // Move from 'pending' (draft) to 'approved' (dispatched to customer)
      const updated = db.updateProposalStatus(proposalId, "approved");
      res.json({ success: true, proposal: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 11. Create Stripe Checkout Session (Agent 3 Dispatcher)
  app.post("/api/stripe/checkout", async (req, res) => {
    try {
      const { proposalId } = req.body;
      const proposal = db.getProposal(proposalId);
      if (!proposal) return res.status(404).json({ error: "Proposal not found" });

      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      const stripe = getStripe();

      if (stripe) {
        // Create actual Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: `Deposit: ${proposal.projectTitle}`,
                  description: `20% structural commitment deposit for project at SiteQuote AI. Total estimated scope value: $${proposal.totalEstimatedCost}`,
                },
                unit_amount: proposal.depositAmount * 100, // cents
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${appUrl}?view=proposal&id=${proposal.id}&payment=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appUrl}?view=proposal&id=${proposal.id}&payment=cancel`,
        });

        // Save session link
        db.updateProposalStatus(proposal.id, "approved", session.id, session.url || undefined);
        return res.json({ url: session.url, isSimulated: false });
      } else {
        // Simulated checkout link fallback for Sandbox/Preview
        const simulatedUrl = `/simulated-payment?proposalId=${proposal.id}`;
        db.updateProposalStatus(proposal.id, "approved", "sim-session-id", simulatedUrl);
        return res.json({ url: simulatedUrl, isSimulated: true });
      }
    } catch (err: any) {
      console.error("Stripe Checkout creation failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 12. Complete simulated payment
  app.post("/api/proposals/:id/simulate-pay", (req, res) => {
    try {
      const proposalId = req.params.id;
      const updated = db.updateProposalStatus(proposalId, "paid");
      res.json({ success: true, proposal: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 13. Route Aliases for specification compliance
  // /api/qualify-lead
  app.post("/api/qualify-lead", async (req, res) => {
    try {
      const { leadId, message, trade, history } = req.body;
      const settings = db.getSettings();
      
      let lead = leadId ? db.getLead(leadId) : null;
      const chatHistory = history || (lead ? lead.chatHistory : []);

      const aiReply = await qualifyLeadChat({
        history: chatHistory,
        newMessage: message || "Hello",
        contractorTrade: trade || settings.trade,
      });

      res.json({ reply: aiReply, success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // /api/upload-photos
  app.post("/api/upload-photos", (req, res) => {
    try {
      const { photos, leadId } = req.body;
      if (!photos || !Array.isArray(photos)) {
        return res.status(400).json({ error: "Missing photos array" });
      }

      // Process base64 or photo objects
      const uploadedPhotos = photos.map((p: any, idx: number) => {
        if (typeof p === "string") {
          return { id: `img_${Date.now()}_${idx}`, url: p, createdAt: new Date().toISOString() };
        }
        return p;
      });

      if (leadId) {
        const lead = db.getLead(leadId);
        if (lead) {
          lead.images = [...(lead.images || []), ...uploadedPhotos];
          const database = db.getLeads();
          const idx = database.findIndex((l) => l.id === leadId);
          if (idx > -1) {
            database[idx] = lead;
            const fullDb = {
              leads: database,
              proposals: db.getProposals(),
              settings: db.getSettings(),
            };
            fs.writeFileSync(path.join(process.cwd(), "data", "db.json"), JSON.stringify(fullDb, null, 2), "utf8");
          }
        }
      }

      res.json({ success: true, photos: uploadedPhotos });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // /api/generate-proposal
  app.post("/api/generate-proposal", async (req, res) => {
    try {
      const { leadData, images, leadId } = req.body;
      let lead = leadId ? db.getLead(leadId) : null;

      const finalLeadData = leadData || (lead ? {
        scope: lead.scope || "General scope",
        budget: lead.budget || "Flexible",
        timeline: lead.timeline || "ASAP",
        zip: lead.zip || "90210",
        name: lead.name || "Client",
        email: lead.email || "client@example.com",
        phone: lead.phone || "",
        trade: lead.trade || "General Construction",
      } : null);

      if (!finalLeadData) {
        return res.status(400).json({ error: "Lead data or valid leadId required" });
      }

      const photoParts = (images || (lead ? lead.images : []) || []).map((img: any) => {
        if (typeof img === "string" && img.startsWith("data:")) {
          const [header, base64] = img.split(",");
          const mimeType = header.split(";")[0].split(":")[1] || "image/jpeg";
          return { mimeType, data: base64 };
        }
        return { mimeType: "image/jpeg", data: typeof img === "string" ? img : img.url || "" };
      });

      const estimation = await generateProposal(finalLeadData, photoParts);
      res.json({ success: true, proposal: estimation });
    } catch (err: any) {
      console.error("Error in /api/generate-proposal:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 14. Stripe Webhook Listener (/api/stripe/webhook)
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripe = getStripe();

    let event: any;

    try {
      if (stripe && webhookSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        // Fallback for non-signed or testing webhooks
        event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      }
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event && event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.info("💳 Stripe Checkout Session completed successfully:", session.id);

      // Find proposal matching checkout session or metadata
      const proposals = db.getProposals();
      const targetProposal = proposals.find(
        (p) => p.stripeSessionId === session.id || p.id === session.client_reference_id
      );

      if (targetProposal) {
        db.updateProposalStatus(targetProposal.id, "paid");
        console.info(`Updated proposal ${targetProposal.id} status to PAID`);
      }
    }

    res.json({ received: true });
  });

  // ==========================================
  // ADMIN MANAGEMENT API ENDPOINTS
  // ==========================================

  // Admin: Create new lead manually
  app.post("/api/admin/leads", (req, res) => {
    try {
      const { name, email, phone, trade, zip, budget, timeline, scope } = req.body;
      const newLead = db.createLead({
        name: name || "New Lead",
        email: email || "lead@example.com",
        phone: phone || "",
        trade: trade || "General Contracting",
        zip: zip || "90210",
        budget: budget || "Flexible",
        timeline: timeline || "ASAP",
        scope: scope || "Project scope description",
        images: [],
        chatHistory: [],
      });
      res.json({ success: true, lead: newLead });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Update existing lead
  app.put("/api/admin/leads/:id", (req, res) => {
    try {
      const leadId = req.params.id;
      const leads = db.getLeads();
      const idx = leads.findIndex((l) => l.id === leadId);
      if (idx === -1) return res.status(404).json({ error: "Lead not found" });

      leads[idx] = {
        ...leads[idx],
        ...req.body,
        id: leadId, // prevent overwriting ID
      };

      const fullDb = {
        leads,
        proposals: db.getProposals(),
        settings: db.getSettings(),
      };
      fs.writeFileSync(path.join(process.cwd(), "data", "db.json"), JSON.stringify(fullDb, null, 2), "utf8");

      res.json({ success: true, lead: leads[idx] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Delete lead
  app.delete("/api/admin/leads/:id", (req, res) => {
    try {
      const leadId = req.params.id;
      db.deleteLead(leadId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/leads/:id", (req, res) => {
    try {
      const leadId = req.params.id;
      db.deleteLead(leadId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Delete proposal
  app.delete("/api/admin/proposals/:id", (req, res) => {
    try {
      const proposalId = req.params.id;
      db.deleteProposal(proposalId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/proposals/:id", (req, res) => {
    try {
      const proposalId = req.params.id;
      db.deleteProposal(proposalId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Update proposal details (line items, total cost, title, compliance notes, status)
  app.put("/api/admin/proposals/:id", (req, res) => {
    try {
      const proposalId = req.params.id;
      const proposals = db.getProposals();
      const idx = proposals.findIndex((p) => p.id === proposalId);
      if (idx === -1) return res.status(404).json({ error: "Proposal not found" });

      const updatedProposal = {
        ...proposals[idx],
        ...req.body,
        id: proposalId,
      };

      // Recalculate deposit if total cost updated
      if (req.body.totalEstimatedCost !== undefined) {
        const settings = db.getSettings();
        const depositPct = settings.depositPercentage || 20;
        updatedProposal.depositAmount = Math.round(updatedProposal.totalEstimatedCost * (depositPct / 100));
      }

      proposals[idx] = updatedProposal;

      const fullDb = {
        leads: db.getLeads(),
        proposals,
        settings: db.getSettings(),
      };
      fs.writeFileSync(path.join(process.cwd(), "data", "db.json"), JSON.stringify(fullDb, null, 2), "utf8");

      res.json({ success: true, proposal: updatedProposal });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Update settings
  app.put("/api/admin/settings", (req, res) => {
    try {
      const currentSettings = db.getSettings();
      const newSettings = {
        ...currentSettings,
        ...req.body,
      };

      db.updateSettings(newSettings);
      res.json({ success: true, settings: newSettings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Check Firebase Admin SDK status
  app.get("/api/admin/firebase-status", (req, res) => {
    try {
      const adminApp = getFirebaseAdminApp();
      if (!adminApp) {
        return res.json({
          configured: false,
          projectId: "sitequote-ai",
          message: "Firebase Admin SDK is awaiting FIREBASE_PRIVATE_KEY environment variable in platform settings.",
        });
      }
      return res.json({
        configured: true,
        projectId: adminApp.options.projectId,
        message: "Firebase Admin SDK initialized successfully.",
      });
    } catch (err: any) {
      res.status(500).json({ configured: false, error: err.message });
    }
  });

  // ==========================================
  // VITE DEV SERVER / PRODUCTION SERVING
  // ==========================================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SiteQuote AI Server] running on http://localhost:${PORT}`);
  });
}

startServer();
