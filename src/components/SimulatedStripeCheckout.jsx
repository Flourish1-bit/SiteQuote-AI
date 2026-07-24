import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CreditCard, Shield, Lock, Loader2, ArrowLeft, Building, HelpCircle, CheckCircle } from "lucide-react";

export default function SimulatedStripeCheckout({ proposalId, onPaymentSuccess, onCancel }) {
  const [proposal, setProposal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("424");

  useEffect(() => {
    fetch(`/api/proposals/${proposalId}`)
      .then((res) => res.json())
      .then((data) => {
        setProposal(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [proposalId]);

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Complete payment simulation on server
      const res = await fetch(`/api/proposals/${proposalId}/simulate-pay`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Artificially wait to simulate banking gateways
      setTimeout(() => {
        setIsProcessing(false);
        onPaymentSuccess();
      }, 2000);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      alert("Simulated transaction failed. Check database health.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-xs font-mono uppercase tracking-wider text-slate-500">Initiating Stripe Handshake...</span>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="text-center py-12 text-slate-500 font-sans">
        <p>Could not initialize Stripe Session.</p>
        <button onClick={onCancel} className="mt-4 text-xs text-indigo-500 hover:underline">
          Return
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2">
        
        {/* Left Side: Invoice Summary */}
        <div className="bg-slate-950/70 p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div className="space-y-6">
            <button 
              onClick={onCancel}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs font-mono uppercase tracking-wider transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Cancel Checkout
            </button>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs uppercase font-bold tracking-wider">
                <Building className="w-4 h-4" />
                Vanguard Partner Network
              </div>
              <h2 className="text-xl font-sans font-bold text-white leading-snug">{proposal.projectTitle}</h2>
              <p className="text-xs text-slate-500 font-mono">Billed on behalf of SiteQuote AI Client Services</p>
            </div>

            <div className="space-y-3 pt-6 border-t border-slate-800/80">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Contract Bid Total value:</span>
                <span className="font-mono">${proposal.totalEstimatedCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Required Commitment Lock (20%):</span>
                <span className="font-mono">${proposal.depositAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-end pt-3 border-t border-slate-800">
                <span className="text-sm font-semibold text-white">Amount Due Now</span>
                <span className="text-2xl font-sans font-bold text-indigo-400 font-mono">${proposal.depositAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-8">
            <Shield className="w-4 h-4 text-slate-600" />
            SECURED PORTAL BROKERED BY STRIPE
          </div>
        </div>

        {/* Right Side: Payment Form */}
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-sans font-bold text-white text-base">Debit / Credit Card</h3>
            <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-mono">
              Sandbox Link
            </span>
          </div>

          <form onSubmit={handleSubmitPayment} className="space-y-5 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-500 uppercase block">Cardholder Name</label>
              <input
                type="text"
                required
                placeholder="Jane Doe"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-500 uppercase block">Card Number</label>
              <div className="relative">
                <CreditCard className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pl-10 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase block">Expiration Date</label>
                <input
                  type="text"
                  required
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase block">CVC Security Code</label>
                <input
                  type="text"
                  required
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex gap-3 text-xs text-slate-400">
              <Lock className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              <p className="leading-relaxed">This is a sandbox checkout session created via SiteQuote AI. Transactions will simulate success states securely without charging real funds.</p>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-bold py-3.5 rounded-lg text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying Card Ledger...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirm & Pay Deposit (${proposal.depositAmount.toLocaleString()})
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
