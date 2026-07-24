import fs from "fs";
import path from "path";

// Ensure data folder exists
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  trade: string;
  scope: string;
  budget: string;
  timeline: string;
  zip: string;
  chatHistory: { role: "user" | "model"; parts: { text: string }[] }[];
  images: { mimeType: string; data: string }[];
  createdAt: string;
}

export interface Proposal {
  id: string;
  leadId: string;
  projectTitle: string;
  summary: string;
  lineItems: {
    description: string;
    category: "Labor" | "Material" | "Permit";
    estimatedCost: number;
  }[];
  complianceNotes: string[];
  totalEstimatedCost: number;
  depositAmount: number;
  groundingSources?: { title: string; uri: string }[];
  status: "pending" | "approved" | "paid" | "declined";
  stripeSessionId?: string;
  stripePaymentLink?: string;
  createdAt: string;
}

export interface ContractorSettings {
  companyName: string;
  contactName: string;
  email: string;
  trade: string;
  hourlyRate: number;
  depositPercentage: number;
}

interface DatabaseSchema {
  leads: Lead[];
  proposals: Proposal[];
  settings: ContractorSettings;
}

const DEFAULT_SETTINGS: ContractorSettings = {
  companyName: "Vanguard Trade Systems",
  contactName: "Marcus Vance",
  email: "marcus@vanguardtrades.com",
  trade: "electrical",
  hourlyRate: 125,
  depositPercentage: 20,
};

const INITIAL_DB: DatabaseSchema = {
  leads: [
    {
      id: "lead-1",
      name: "Eleanor Sterling",
      email: "eleanor.sterling@gmail.com",
      phone: "(555) 234-5678",
      trade: "electrical",
      scope: "Upgrade a legacy knob-and-tube panel to a 200A service. Add car charger circuit in garage.",
      budget: "$5,000 - $7,000",
      timeline: "Next 2 weeks",
      zip: "94110",
      chatHistory: [
        { role: "user", parts: [{ text: "Hi, I have an old electrical panel." }] },
        { role: "model", parts: [{ text: "Hello! I can definitely help with that. What kind of trade work is it?" }] },
      ],
      images: [],
      createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    },
    {
      id: "lead-2",
      name: "Arthur Pendelton",
      email: "arthur.p@outlook.com",
      phone: "(555) 987-6543",
      trade: "plumbing",
      scope: "Fix burst copper pipe in basement and replace rusted water heater.",
      budget: "$1,500 - $2,500",
      timeline: "Emergency / Immediate",
      zip: "10001",
      chatHistory: [],
      images: [],
      createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    }
  ],
  proposals: [
    {
      id: "prop-1",
      leadId: "lead-1",
      projectTitle: "200A Electrical Service Upgrade & EV Charger Installation",
      summary: "Forensic image inspection identifies an aging Federal Pacific panel with circuit crowding. Proposal includes complete demolition of existing panel, wiring a new Eaton 200-Amp main breaker, installing grounding rods conforming to NEC Article 250, and pulling a dedicated 50A circuit to the garage for a Level 2 EV charging station.",
      lineItems: [
        { description: "Demolish legacy electrical service panel and recycle parts safely", category: "Labor", estimatedCost: 850 },
        { description: "Eaton 200-Amp 40-Space Outdoor Main Breaker Load Center & panel assembly", category: "Material", estimatedCost: 650 },
        { description: "Labor for service drop attachment, grounding rod driving, and neutral binding", category: "Labor", estimatedCost: 1800 },
        { description: "NEMA 14-50 heavy-duty outlet, 50A dual-pole breaker, and 50ft of #6/3 MC cable", category: "Material", estimatedCost: 450 },
        { description: "Labor to route MC cable from panel to garage and assemble car charger link", category: "Labor", estimatedCost: 950 },
        { description: "San Francisco Department of Building Inspection Electrical Permit & compliance filing fees", category: "Permit", estimatedCost: 310 }
      ],
      complianceNotes: [
        "NEC Section 110.26 requires a minimum workspace depth of 3 feet and width of 30 inches in front of the service panel.",
        "NEC Article 250 mandates two driven copper-clad ground rods spaced at least 6 feet apart unless local codes specify concrete-encased electrodes.",
        "CEC Title 24 compliance requires dedicated AFCI protection on all newly added 15A and 20A branch circuits."
      ],
      totalEstimatedCost: 5010,
      depositAmount: 1002,
      groundingSources: [
        { title: "National Electrical Code (NEC) Workspace Clearances", uri: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70" },
        { title: "San Francisco Department of Building Inspection - Permit Fees", uri: "https://sf.gov/get-building-permit-fees" }
      ],
      status: "approved",
      createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    }
  ],
  settings: DEFAULT_SETTINGS,
};

function ensureDbExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), "utf8");
  }
}

export function readDb(): DatabaseSchema {
  ensureDbExists();
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data) as DatabaseSchema;
  } catch (err) {
    console.error("Error reading database file, returning initial database state", err);
    return INITIAL_DB;
  }
}

export function writeDb(db: DatabaseSchema) {
  ensureDbExists();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing to database file:", err);
  }
}

// Database Actions
export const db = {
  getLeads: () => readDb().leads,
  
  getLead: (id: string) => readDb().leads.find((l) => l.id === id),
  
  createLead: (lead: Omit<Lead, "id" | "createdAt">) => {
    const database = readDb();
    const newLead: Lead = {
      ...lead,
      id: `lead-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    database.leads.push(newLead);
    writeDb(database);
    return newLead;
  },

  updateLeadHistory: (id: string, history: Lead["chatHistory"]) => {
    const database = readDb();
    const leadIndex = database.leads.findIndex((l) => l.id === id);
    if (leadIndex > -1) {
      database.leads[leadIndex].chatHistory = history;
      writeDb(database);
      return database.leads[leadIndex];
    }
    return null;
  },

  getProposals: () => readDb().proposals,

  getProposal: (id: string) => readDb().proposals.find((p) => p.id === id),

  createProposal: (proposal: Omit<Proposal, "id" | "createdAt">) => {
    const database = readDb();
    const newProposal: Proposal = {
      ...proposal,
      id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    database.proposals.push(newProposal);
    writeDb(database);
    return newProposal;
  },

  updateProposalStatus: (id: string, status: Proposal["status"], stripeSessionId?: string, stripePaymentLink?: string) => {
    const database = readDb();
    const proposalIndex = database.proposals.findIndex((p) => p.id === id);
    if (proposalIndex > -1) {
      database.proposals[proposalIndex].status = status;
      if (stripeSessionId) database.proposals[proposalIndex].stripeSessionId = stripeSessionId;
      if (stripePaymentLink) database.proposals[proposalIndex].stripePaymentLink = stripePaymentLink;
      writeDb(database);
      return database.proposals[proposalIndex];
    }
    return null;
  },

  getSettings: () => readDb().settings,

  updateSettings: (settings: Partial<ContractorSettings>) => {
    const database = readDb();
    database.settings = { ...database.settings, ...settings };
    writeDb(database);
    return database.settings;
  },

  deleteLead: (id: string) => {
    const database = readDb();
    database.leads = database.leads.filter((l) => l.id !== id);
    database.proposals = database.proposals.filter((p) => p.leadId !== id);
    writeDb(database);
    return true;
  },

  deleteProposal: (id: string) => {
    const database = readDb();
    database.proposals = database.proposals.filter((p) => p.id !== id);
    writeDb(database);
    return true;
  }
};
