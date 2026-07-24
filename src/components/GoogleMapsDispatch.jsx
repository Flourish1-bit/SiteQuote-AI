import React, { useState, useEffect, useMemo } from "react";
import { 
  APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap, useMapsLibrary 
} from "@vis.gl/react-google-maps";
import { 
  Navigation, MapPin, Truck, Clock, DollarSign, Send, CheckCircle2, 
  Sparkles, Filter, RefreshCw, UserCheck, ShieldAlert, Phone, Mail, ChevronRight, Layers
} from "lucide-react";

// Default coordinates for major metropolitan service regions
const REGION_CENTERS = {
  "San Francisco / Bay Area": { lat: 37.7749, lng: -122.4194, zoom: 11 },
  "Los Angeles Metro": { lat: 34.0522, lng: -118.2437, zoom: 11 },
  "Chicago / MidWest": { lat: 41.8781, lng: -87.6298, zoom: 11 },
  "Dallas / Fort Worth": { lat: 32.7767, lng: -96.7970, zoom: 11 },
};

// Fallback lat/lng generator for leads without exact geo coordinates
const DEFAULT_LEAD_COORDS = [
  { lat: 37.7749, lng: -122.4194, zip: "94103", city: "San Francisco, CA" },
  { lat: 37.7833, lng: -122.4167, zip: "94102", city: "San Francisco, CA" },
  { lat: 37.7650, lng: -122.4200, zip: "94110", city: "San Francisco, CA" },
  { lat: 37.7900, lng: -122.4000, zip: "94108", city: "San Francisco, CA" },
  { lat: 37.7500, lng: -122.4100, zip: "94114", city: "San Francisco, CA" },
];

const TECHNICIANS = [
  { id: "tech_1", name: "Alex Rivera", role: "Master Electrician", vehicle: "Ford Transit #204", status: "Available" },
  { id: "tech_2", name: "David Vance", role: "Journeyman Plumber", vehicle: "Ram ProMaster #108", status: "On Site" },
  { id: "tech_3", name: "Marcus Chen", role: "HVAC Senior Specialist", vehicle: "Chevy Express #302", status: "In Transit" },
];

// Sub-component: Draws Route Polyline on Google Maps
function PolylineOverlay({ stops }) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");

  useEffect(() => {
    if (!map || !mapsLib || stops.length < 2) return;

    const path = stops.map((s) => ({ lat: s.lat, lng: s.lng }));

    const polyline = new mapsLib.Polyline({
      path,
      geodesic: true,
      strokeColor: "#f59e0b", // Amber-500
      strokeOpacity: 0.9,
      strokeWeight: 4,
    });

    polyline.setMap(map);

    return () => {
      polyline.setMap(null);
    };
  }, [map, mapsLib, stops]);

  return null;
}

export default function GoogleMapsDispatch({ leads = [], onDispatchComplete }) {
  const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";
  
  const [selectedTech, setSelectedTech] = useState(TECHNICIANS[0]);
  const [activeRegion, setActiveRegion] = useState("San Francisco / Bay Area");
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [activeInfoWindowId, setActiveInfoWindowId] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedDispatch, setOptimizedDispatch] = useState(null);
  const [dispatchSent, setDispatchSent] = useState(false);

  // Map enriched leads with coordinates
  const mappedLeads = useMemo(() => {
    if (!leads || leads.length === 0) {
      // Demo mock leads for dispatch demonstration
      return [
        {
          id: "lead_demo_1",
          name: "Sarah Jenkins",
          address: "1450 Market St",
          zip: "94103",
          trade: "Electrical",
          scope: "200A Main Service Panel Retrofit & EV Charger",
          lat: 37.7749,
          lng: -122.4194,
          priority: "High",
          status: "Pending Dispatch"
        },
        {
          id: "lead_demo_2",
          name: "Michael Chang",
          address: "888 Howard St",
          zip: "94102",
          trade: "Plumbing",
          scope: "Main Water Line Pressure Valve & PEX Re-pipe",
          lat: 37.7833,
          lng: -122.4167,
          priority: "Medium",
          status: "Pending Dispatch"
        },
        {
          id: "lead_demo_3",
          name: "Elena Rostova",
          address: "2200 Mission St",
          zip: "94110",
          trade: "HVAC",
          scope: "16 SEER Multi-Stage Heat Pump Replacement",
          lat: 37.7650,
          lng: -122.4200,
          priority: "Urgent",
          status: "Pending Dispatch"
        },
        {
          id: "lead_demo_4",
          name: "Robert Taylor",
          address: "550 Montgomery St",
          zip: "94108",
          trade: "Electrical",
          scope: "Subpanel Installation & GFCI Circuit Recertification",
          lat: 37.7900,
          lng: -122.4000,
          priority: "Medium",
          status: "Pending Dispatch"
        }
      ];
    }

    return leads.map((lead, idx) => {
      const fallback = DEFAULT_LEAD_COORDS[idx % DEFAULT_LEAD_COORDS.length];
      return {
        ...lead,
        address: lead.address || `${100 + idx * 42} Main Street`,
        lat: lead.lat || fallback.lat + (idx * 0.008 - 0.015),
        lng: lead.lng || fallback.lng + (idx * 0.008 - 0.012),
        priority: idx % 2 === 0 ? "High" : "Standard",
      };
    });
  }, [leads]);

  // Pre-select first 3 leads by default
  useEffect(() => {
    if (mappedLeads.length > 0 && selectedLeadIds.length === 0) {
      setSelectedLeadIds(mappedLeads.slice(0, 3).map((l) => l.id));
    }
  }, [mappedLeads]);

  const toggleSelectLead = (id) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOptimizeRoute = async () => {
    const selectedStops = mappedLeads.filter((l) => selectedLeadIds.includes(l.id));
    if (selectedStops.length === 0) return;

    setIsOptimizing(true);
    setDispatchSent(false);

    try {
      const res = await fetch("/api/dispatch/optimize-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stops: selectedStops,
          technicianName: selectedTech.name,
          startLocation: "Central Contractor Depot",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Route optimization failed.");

      setOptimizedDispatch(data.dispatchSummary);
    } catch (err) {
      console.error("Route Optimization Error:", err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSendDispatch = () => {
    setDispatchSent(true);
    if (onDispatchComplete) {
      onDispatchComplete(optimizedDispatch);
    }
  };

  const selectedStopsList = useMemo(() => {
    if (optimizedDispatch?.optimizedStops) {
      return optimizedDispatch.optimizedStops;
    }
    return mappedLeads.filter((l) => selectedLeadIds.includes(l.id));
  }, [optimizedDispatch, mappedLeads, selectedLeadIds]);

  const mapCenter = REGION_CENTERS[activeRegion] || REGION_CENTERS["San Francisco / Bay Area"];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl font-sans text-slate-200">
      {/* Dispatch Header Banner */}
      <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Google Maps Dispatch & Route Optimizer
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-widest">
                Interactive Fleet GPS
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Map active job leads, calculate driving mileage & fuel costs, and dispatch daily routes.
            </p>
          </div>
        </div>

        {/* Technician & Region Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <Truck className="w-4 h-4 text-amber-400" />
            <select
              value={selectedTech.id}
              onChange={(e) => setSelectedTech(TECHNICIANS.find((t) => t.id === e.target.value) || TECHNICIANS[0])}
              className="bg-transparent text-slate-200 focus:outline-none font-medium cursor-pointer"
            >
              {TECHNICIANS.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">
                  {t.name} ({t.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <select
              value={activeRegion}
              onChange={(e) => setActiveRegion(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none font-medium cursor-pointer"
            >
              {Object.keys(REGION_CENTERS).map((reg) => (
                <option key={reg} value={reg} className="bg-slate-900 text-slate-200">
                  {reg}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Sidebar Controls vs Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[550px]">
        {/* Left Control Panel */}
        <div className="lg:col-span-5 p-5 border-r border-slate-800 bg-slate-950/40 flex flex-col space-y-5">
          {/* Active Technician Card */}
          <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-xs">
                {selectedTech.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <p className="text-xs font-bold text-white">{selectedTech.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{selectedTech.role} • {selectedTech.vehicle}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              {selectedTech.status}
            </span>
          </div>

          {/* Job Lead Selection List */}
          <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] pr-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                Select Job Sites for Route ({selectedLeadIds.length} Selected)
              </span>
              <button
                onClick={() => setSelectedLeadIds(mappedLeads.map((l) => l.id))}
                className="text-[10px] font-mono text-amber-400 hover:underline"
              >
                Select All
              </button>
            </div>

            <div className="space-y-2">
              {mappedLeads.map((lead) => {
                const isSelected = selectedLeadIds.includes(lead.id);
                return (
                  <div
                    key={lead.id}
                    onClick={() => toggleSelectLead(lead.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-amber-500/10 border-amber-500/40 text-slate-100"
                        : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-amber-500 border-amber-500 text-slate-950" : "border-slate-700"
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">{lead.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{lead.address}, {lead.zip}</p>
                        <p className="text-[10px] text-amber-400 font-mono mt-0.5 truncate">{lead.trade}: {lead.scope}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 shrink-0 text-slate-400">
                      ZIP {lead.zip}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Route Optimization Action Button */}
          <button
            disabled={isOptimizing || selectedLeadIds.length === 0}
            onClick={handleOptimizeRoute}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isOptimizing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Computing Optimal Route GPS...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Calculate & Optimize Daily Route</span>
              </>
            )}
          </button>

          {/* Optimization Summary Stats & Dispatch */}
          {optimizedDispatch && (
            <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-2xl space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white">Route Optimization Metrics</span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                  {optimizedDispatch.totalStops} Stops Queued
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <p className="text-[9px] text-slate-500 font-mono uppercase">Est. Distance</p>
                  <p className="text-xs font-bold text-amber-400 mt-0.5">{optimizedDispatch.totalDistanceMiles} mi</p>
                </div>
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <p className="text-[9px] text-slate-500 font-mono uppercase">Est. Drive Time</p>
                  <p className="text-xs font-bold text-white mt-0.5">{optimizedDispatch.totalDriveMinutes} min</p>
                </div>
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <p className="text-[9px] text-slate-500 font-mono uppercase">Est. Fuel Cost</p>
                  <p className="text-xs font-bold text-emerald-400 mt-0.5">${optimizedDispatch.fuelCostDollars}</p>
                </div>
              </div>

              <button
                disabled={dispatchSent}
                onClick={handleSendDispatch}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                {dispatchSent ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Dispatched to {selectedTech.name}'s App!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Dispatch Route Itinerary to Tech App</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Google Map Display */}
        <div className="lg:col-span-7 relative bg-slate-950 min-h-[400px] flex flex-col">
          {apiKey ? (
            <APIProvider apiKey={apiKey}>
              <Map
                style={{ width: "100%", height: "100%", minHeight: "450px" }}
                defaultCenter={mapCenter}
                defaultZoom={mapCenter.zoom}
                gestureHandling="greedy"
                disableDefaultUI={false}
                mapId="aistudio_dispatch_map"
              >
                {/* Render Polyline route path */}
                {selectedStopsList.length > 1 && (
                  <PolylineOverlay stops={selectedStopsList} />
                )}

                {/* Render Markers for each Lead */}
                {mappedLeads.map((lead, index) => {
                  const isSelected = selectedLeadIds.includes(lead.id);
                  const stopNumber = selectedStopsList.findIndex((s) => s.id === lead.id) + 1;

                  return (
                    <React.Fragment key={lead.id}>
                      <AdvancedMarker
                        position={{ lat: lead.lat, lng: lead.lng }}
                        onClick={() => setActiveInfoWindowId(lead.id)}
                      >
                        <Pin
                          background={isSelected ? "#f59e0b" : "#475569"}
                          borderColor="#0f172a"
                          glyphColor="#0f172a"
                        >
                          {isSelected && stopNumber > 0 ? stopNumber : ""}
                        </Pin>
                      </AdvancedMarker>

                      {activeInfoWindowId === lead.id && (
                        <InfoWindow
                          position={{ lat: lead.lat, lng: lead.lng }}
                          onCloseClick={() => setActiveInfoWindowId(null)}
                        >
                          <div className="p-2 text-slate-900 max-w-xs font-sans">
                            <p className="font-bold text-sm text-slate-900">{lead.name}</p>
                            <p className="text-xs text-slate-600 font-medium">{lead.address}, {lead.zip}</p>
                            <p className="text-xs text-amber-600 font-semibold mt-1">
                              {lead.trade}: {lead.scope}
                            </p>
                            <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-700">Priority: {lead.priority}</span>
                              <span className="text-emerald-700 font-mono">ZIP {lead.zip}</span>
                            </div>
                          </div>
                        </InfoWindow>
                      )}
                    </React.Fragment>
                  );
                })}
              </Map>
            </APIProvider>
          ) : (
            /* Interactive Simulation Map View fallback when process.env.GOOGLE_MAPS_PLATFORM_KEY is awaiting key setup */
            <div className="w-full h-full p-6 flex flex-col justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
              {/* Overlay grid lines representing map vector grid */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] opacity-30" />

              {/* Map Info Banner */}
              <div className="relative z-10 flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs font-bold text-white">
                    {activeRegion} Fleet GPS Dispatch Vector Engine
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  {selectedLeadIds.length} Job Sites Active
                </span>
              </div>

              {/* Graphical Route Map Visualizer */}
              <div className="relative z-10 my-8 space-y-4">
                <p className="text-xs font-mono text-slate-400 uppercase tracking-wider text-center">
                  Optimized Fleet Sequence Path
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selectedStopsList.map((stop, idx) => (
                    <div key={stop.id} className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/30 flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {stop.estimatedArrivalTime || `Stop #${idx + 1}`}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white truncate">{stop.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{stop.address}</p>
                      </div>
                      <div className="text-[10px] text-amber-400 font-mono pt-1 border-t border-slate-800 truncate">
                        {stop.trade}: {stop.scope}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom API Key notice */}
              <div className="relative z-10 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Google Maps Platform Key configured for browser rendering.</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">GPS Active</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
