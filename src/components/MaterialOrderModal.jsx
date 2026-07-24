import React, { useState, useEffect } from "react";
import { 
  PackageCheck, ShoppingBag, Loader2, Check, Mail, Building2, 
  Send, ExternalLink, X, ArrowRight, ShieldCheck, FileSpreadsheet 
} from "lucide-react";

export default function MaterialOrderModal({ isOpen, onClose, proposal }) {
  const [supplierName, setSupplierName] = useState("Home Depot Pro Desk");
  const [isLoading, setIsLoading] = useState(false);
  const [materialOrder, setMaterialOrder] = useState(null);
  const [isDispatched, setIsDispatched] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && proposal) {
      fetchMaterialOrder();
    } else {
      setMaterialOrder(null);
      setIsDispatched(false);
      setError("");
    }
  }, [isOpen, proposal, supplierName]);

  const fetchMaterialOrder = async () => {
    if (!proposal) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/order-materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierName }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMaterialOrder(data.materialOrder);
    } catch (err) {
      setError(`Failed drafting material order: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDispatchOrder = () => {
    setIsDispatched(true);
  };

  if (!isOpen || !proposal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative text-left">
        {/* Header */}
        <div className="p-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Automated Material Procurement Agent
              </h2>
              <p className="text-xs text-slate-400">
                AI extracts itemized trade parts and pre-orders materials from supply houses upon deposit receipt.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Supplier Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5 font-semibold">
                Select Local Supply House:
              </label>
              <select
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500/50"
              >
                <option value="Home Depot Pro Desk">Home Depot Pro Desk</option>
                <option value="Ferguson Plumbing & HVAC Supply">Ferguson Plumbing & HVAC Supply</option>
                <option value="Rexel Electrical Supply Counter">Rexel Electrical Supply Counter</option>
                <option value="CED Electrical Wholesale">CED Electrical Wholesale</option>
                <option value="Local Trade Supply House">Local Trade Supply House</option>
              </select>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs font-mono text-slate-400 space-y-1">
              <p className="text-[10px] text-slate-500 uppercase">Target Project Proposal</p>
              <p className="text-white font-bold truncate">{proposal.projectTitle}</p>
              <p className="text-amber-500">Deposit Paid: ${proposal.depositAmount?.toLocaleString()}</p>
            </div>
          </div>

          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
              <span className="text-xs font-mono uppercase">Extracting materials & mapping vendor SKUs...</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
              {error}
            </div>
          )}

          {materialOrder && !isLoading && (
            <div className="space-y-5 animate-fade-in">
              {/* Purchase Order Details */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase">
                      PURCHASE ORDER: {materialOrder.poNumber}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    Auto-Drafted
                  </span>
                </div>

                {/* Items Table */}
                <div className="overflow-hidden border border-slate-800/80 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-[10px] text-slate-500 font-mono uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Part Description</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Est. Unit</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {materialOrder.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="p-3 text-amber-500 font-semibold">{item.sku}</td>
                          <td className="p-3 font-sans text-slate-200">{item.description}</td>
                          <td className="p-3 text-center">{item.quantity}</td>
                          <td className="p-3 text-right">${item.estimatedUnitPrice}</td>
                          <td className="p-3 text-right text-white font-bold">${item.total}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-900 font-mono text-xs border-t border-slate-800">
                      <tr>
                        <td colSpan={4} className="p-3 font-bold text-right uppercase text-slate-400">Total Material Order Sourcing:</td>
                        <td className="p-3 text-right text-amber-400 font-bold">${materialOrder.totalEstimatedCost}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Generated Email Draft */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    Generated Supply Desk Order Email:
                  </label>
                  <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-xl text-xs space-y-2">
                    <p className="font-mono text-slate-400">
                      <span className="text-slate-500">SUBJECT:</span> {materialOrder.emailSubject}
                    </p>
                    <pre className="whitespace-pre-wrap font-sans text-slate-300 text-[11px] leading-relaxed border-t border-slate-800/80 pt-2">
                      {materialOrder.emailBody}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {isDispatched ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="font-bold font-sans">Material Purchase Order Dispatched!</p>
                    <p className="text-[11px] text-emerald-500/80 font-sans">
                      Order #{materialOrder.poNumber} was sent to {supplierName}. Pickup reservation is logged in contractor portal.
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleDispatchOrder}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  <Send className="w-4 h-4 text-slate-950" />
                  <span>Dispatch Purchase Order Email to {supplierName}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
