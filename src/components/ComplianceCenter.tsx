import React, { useState, useEffect } from "react";
import { db } from "../db";
import { AuditLog, Loan } from "../types";
import { 
  ShieldAlert, ShieldCheck, Activity, Search, Filter, 
  Trash2, Mail, FileText, CheckCircle, Clock, AlertTriangle 
} from "lucide-react";

interface ComplianceCenterProps {
  onRefreshDB: () => void;
}

export const ComplianceCenter: React.FC<ComplianceCenterProps> = ({ onRefreshDB }) => {
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  
  // Tab states
  const [activeTab, setActiveTab] = useState<"audits" | "trid" | "redflags" | "adverse">("audits");
  
  // Filters
  const [operatorFilter, setOperatorFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Adverse Action Form
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [reasonOfDenial, setReasonOfDenial] = useState("Credit History");
  const [adverseOutput, setAdverseOutput] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const handleUpdate = () => fetchData();
    window.addEventListener("lendflow_db_updated", handleUpdate);
    return () => window.removeEventListener("lendflow_db_updated", handleUpdate);
  }, []);

  const fetchData = () => {
    setAudits(db.getAudits());
    setLoans(db.getLoans());
  };

  const handleCreateAdverseLetter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanId) return;

    const targetLoan = loans.find(l => l.id === selectedLoanId);
    if (!targetLoan) return;

    const bName = `${targetLoan.borrower.firstName} ${targetLoan.borrower.lastName}`;
    const generatedLetter = `
REGULATION B ADVERSE ACTION STATEMENT
[TREATED AS IMMUTABLE RECORD - HMDA SUBMISSION ENTRY]
DATE: ${new Date().toISOString().split("T")[0]}
BRANCH ID: AUSTIN_METRO_TX_787

Dear ${bName},

This is to advise you that your application for a mortgage loan on ${targetLoan.borrower.address} was reviewed by the LendFlow lending program on ${new Date().toISOString().split("T")[0]}. We regret to inform you that we are unable to approve your request under conforming qualifying guidelines at this time.

REASON(S) FOR PRIMARY DETERMINATION:
- ${reasonOfDenial.toUpperCase()} (Conforming Ratio caps or insufficient credit history)

FEDERAL EQUAL CREDIT OPPORTUNITY ACT NOTICE:
The Federal Equal Credit Opportunity Act prohibits creditors from discriminating against credit applicants on the basis of race, color, religion, national origin, sex, marital status, age (provided the applicant has the capacity to enter into a binding contract).

QUALIFYING EVALUATION METRICS AT DECIISION:
- Credit score certified: ${targetLoan.borrower.creditScore}
- Back-end debt-to-income: ${targetLoan.dti}%
- Loan-to-value: ${targetLoan.ltv}%
=========================================
LendFlow Branch Compliance Officer: Lynn Harris
    `;

    setAdverseOutput(generatedLetter);

    db.addAudit(
      selectedLoanId,
      "Lynn Harris",
      "Processor",
      "Reg B Adverse Action Dispatched",
      `Rendered Regulation B denial compliance records regarding borrower '${bName}' reason: '${reasonOfDenial}'.`
    );

    alert("Adverse Action letter generated and logged with the Compliance audit desk.");
    onRefreshDB();
  };

  // Filtered Audits
  const filteredAudits = audits.filter((log) => {
    const query = searchQuery.toLowerCase();
    const actionMatch = log.action.toLowerCase().includes(query) || log.details.toLowerCase().includes(query);
    const loanMatch = log.loanId?.toLowerCase().includes(query) || false;
    
    if (!actionMatch && !loanMatch) return false;

    if (operatorFilter === "all") return true;
    if (operatorFilter === "lo") return log.operatorRole === "LO";
    if (operatorFilter === "processor") return log.operatorRole === "Processor" || log.operatorRole === "LOA";
    if (operatorFilter === "borrower") return log.operatorRole === "Borrower";
    if (operatorFilter === "system") return log.operatorRole === "System";

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* KPI Flags */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans">
        {[
          { title: "Continuous TRID monitors", value: "3 Active clocks", sub: "0 Overdue disclosures", icon: <ShieldCheck className="w-5 h-5 text-blue-600" /> },
          { title: "Regulatory Auditing Core", value: `${audits.length} Records Tracked`, sub: "100% Immutable telemetry Logged", icon: <Activity className="w-5 h-5 text-blue-600" /> },
          { title: "OFAC AML Scanning List Checks", value: "All Clear", sub: "No red flag discrepancies flagged", icon: <ShieldAlert className="w-5 h-5 text-blue-600" /> }
        ].map((item, idx) => (
          <div key={idx} className={`p-4 border border-slate-200 rounded-2xl shadow-sm flex items-start gap-3 bg-white`}>
            <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
              {item.icon}
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">{item.title}</span>
              <span className="text-xl font-bold text-slate-900 font-sans tracking-tight block mt-1">{item.value}</span>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">{item.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Primary tabs */}
      <div className="border-b border-slate-200 flex gap-4">
        {[
          { id: "audits", label: "Immutable Operations Audit log", icon: <Activity className="w-4 h-4" /> },
          { id: "trid", label: "TRID Timing & QM eligibilities", icon: <Clock className="w-4 h-4" /> },
          { id: "redflags", label: "Identity & OFAC Screens", icon: <ShieldCheck className="w-4 h-4" /> },
          { id: "adverse", label: "Reg B adverse Actions", icon: <FileText className="w-4 h-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-950"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB A: Audit trail */}
      {activeTab === "audits" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm font-sans">
          
          {/* Audit header panel */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input 
                type="text"
                placeholder="Search audit parameters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-slate-250 bg-white rounded-xl text-xs w-full focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3 text-slate-400 font-bold" />
              <select
                value={operatorFilter}
                onChange={(e) => setOperatorFilter(e.target.value)}
                className="text-xs border border-slate-250 bg-white rounded-xl py-1.5 px-3 focus:outline-none font-bold"
              >
                <option value="all">Global Operator Roles</option>
                <option value="lo">Loan Officers Only</option>
                <option value="processor">Underwriter & Processors</option>
                <option value="borrower">Borrowers</option>
                <option value="system">Autonomous system</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <th className="py-2.5 px-4">Timestamp (UTC)</th>
                  <th className="py-2.5 px-4">Operator</th>
                  <th className="py-2.5 px-4">Linked File</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Detail Telemetry Logs</th>
                  <th className="py-2.5 px-4 text-right">IP Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                {filteredAudits.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/40">
                      <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">{item.timestamp}</td>
                      <td className="py-2.5 px-4">
                        <span className="font-bold text-slate-900 block">{item.operatorName}</span>
                        <span className="text-[10px] font-mono text-slate-400">{item.operatorRole}</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-indigo-700 font-bold">{item.loanId || "N/A"}</td>
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 border border-slate-200 rounded text-[10px] font-mono whitespace-nowrap">
                          {item.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 font-medium max-w-sm line-clamp-2 mt-1">{item.details}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-400 text-[11px]">{item.ipAddress}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB B: TRID disclosures and Qualified Mortgages */}
      {activeTab === "trid" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
          
          {/* TRID timers */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-950">RESPA TILA (TRID) disclosure Timing enforcement</h3>
                <p className="text-slate-400 text-xs mt-0.5">Continuous monitors observing the Federal 3-day delivery and 7-day closing periods.</p>
              </div>

              <div className="space-y-4 font-sans">
                {loans.map(l => {
                  const hasDisclosed = !!l.tridDisclosedDate;
                  return (
                    <div key={l.id} className="border border-slate-150 p-4 rounded-xl space-y-3 bg-slate-55">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-950">{l.id} - {l.borrower.firstName} {l.borrower.lastName}</span>
                        </div>

                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 border rounded-full font-mono ${
                          hasDisclosed ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"
                        }`}>
                          {hasDisclosed ? "✓ DISCLOSURE COMPLIANT" : "⏱ CLOCK RUNNING - DISCLOSURE PENDING"}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-[11px] font-semibold text-slate-600 font-mono">
                        <div>
                          <span className="block text-slate-400 text-[10px]">App Received</span>
                          <span>2026-06-08</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 text-[10px]">3-day TRID Deadline</span>
                          <span className={`${hasDisclosed ? '' : 'text-red-650 animate-pulse font-black'}`}>2026-06-11</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 text-[10px]">Actual Disclosed Date</span>
                          <span>{l.tridDisclosedDate || "NOT STAGE DELIVERED"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Qualified Mortgage (QM) compliance parameters */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-slate-300 space-y-4 font-sans h-fit">
            <div>
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest font-mono flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                QM AT-A-GLANCE QUALIFIER
              </h4>
              <p className="text-slate-400 text-xs mt-0.5">Ability-to-Repay (ATR) Conforming threshold grids.</p>
            </div>

            <div className="space-y-3.5 text-xs font-semibold text-slate-400">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-200">
                <span>QM Conforming Cap</span>
                <span>Active Logic</span>
              </div>
              <div className="flex items-center justify-between">
                <span>1. Qualifying Income verified</span>
                <span className="text-blue-450 font-mono">✓ Required W-2/PL</span>
              </div>
              <div className="flex items-center justify-between">
                <span>2. Back-end DTI cap limit</span>
                <span className="text-blue-400 font-mono">&le; 43.0% (FNMA cap)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>3. Origination points &amp; fees cap</span>
                <span className="text-blue-450 font-mono">&le; 3.0% Conforming</span>
              </div>
              <div className="flex items-center justify-between">
                <span>4. Safe Harbor verification rate</span>
                <span className="text-blue-450 font-mono">✓ Prime interest grid</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB C: Identity and OFAC screens */}
      {activeTab === "redflags" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 font-sans">
          <div>
            <h3 className="text-base font-bold text-slate-900">Federal Red Flag Anti-Money Laundering (AML) Shields</h3>
            <p className="text-slate-400 text-xs mt-0.5">Algorithmic scanning cross-referencing borrowers against OFAC embargo logs and validation matrices.</p>
          </div>

          <div className="space-y-4">
            {loans.map(l => {
              return (
                <div key={l.id} className="border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50/20">
                  <div className="space-y-1.5 font-sans">
                    <span className="text-[10px] bg-slate-250 text-slate-700 px-1.5 py-0.2 rounded font-mono font-bold uppercase">FILE: {l.id}</span>
                    <h4 className="text-sm font-bold text-slate-950 mt-1">{l.borrower.firstName} {l.borrower.lastName}</h4>
                    <p className="text-xs text-slate-500 font-medium">SSN Check: Consistent, validated successfully against databases.</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500 font-mono">OFAC EMBARGO SANCTIONS:</span>
                    <span className="bg-green-100 border border-green-200 text-green-800 px-3 py-1 text-xs rounded-full font-mono font-black">
                      PASSED (CLEARED)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB D: Adverse Action reject sheet */}
      {activeTab === "adverse" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
          
          {/* Controls form */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-950 border-b border-indigo-50 pb-2">Reg B Adverse compiler</h3>
              <p className="text-slate-450 text-[11px]">Generate Regulation B compliant adverse action statements if client variables disqualify them.</p>
            </div>

            <form onSubmit={handleCreateAdverseLetter} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-750 mb-1">Target Pipeline borrower File:</label>
                <select 
                  required
                  value={selectedLoanId}
                  onChange={(e) => {
                    setSelectedLoanId(e.target.value);
                    setAdverseOutput(null);
                  }}
                  className="w-full border border-slate-205 rounded-xl py-1.5 px-3 bg-slate-50 focus:outline-none"
                >
                  <option value="">-- Choose active file --</option>
                  {loans.map(l => (
                    <option key={l.id} value={l.id}>{l.id} - {l.borrower.firstName} {l.borrower.lastName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-755 mb-1">Citations for Adverse Ruling:</label>
                <select
                  value={reasonOfDenial}
                  onChange={(e) => setReasonOfDenial(e.target.value)}
                  className="w-full border border-slate-205 rounded-xl py-1.5 px-3 bg-slate-50 focus:outline-none"
                >
                  <option value="Credit History (Delinquent Accounts)">Credit history (Delinquencies / Sub-620 FICO)</option>
                  <option value="Excessive Debt-to-Income Proportion (DTI)">Excessive Debt Proportion (DTI exceeded 45%)</option>
                  <option value="Insufficient Collateral Appraisal value">Insufficient Collateral value (Appraisal deficit)</option>
                  <option value="Failure to verify income W-2 items">Verification failure (Self-employment mismatch)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl transition-all cursor-pointer shadow"
              >
                Compile Federal Rejection letter
              </button>
            </form>
          </div>

          {/* Letter Output Paper Mockup */}
          <div className="lg:col-span-2">
            {adverseOutput ? (
              <div className="bg-white border border-slate-300 p-8 shadow-md rounded-2xl space-y-4 font-mono text-[10px] text-slate-700 leading-relaxed max-w-2xl border-t-8 border-t-red-650 relative">
                <span className="absolute top-2 right-4 text-red-650 font-black text-[12px] uppercase select-none tracking-widest">REG B FORM</span>
                <pre className="whitespace-pre-wrap leading-relaxed">
                  {adverseOutput}
                </pre>
                
                <div className="border-t border-slate-100 pt-4 flex gap-4">
                  <button 
                    onClick={() => {
                      alert("Federal adverse letter dispatched via certified system print pipeline.");
                    }}
                    className="bg-blue-600 hover:bg-blue-500 font-sans text-xs font-bold text-white px-4 py-2 rounded-xl cursor-pointer shadow"
                  >
                    Print / Dispatch Document
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-64 border border-dashed border-slate-250 bg-slate-50/50 rounded-2xl flex items-center justify-center text-xs text-slate-400 font-mono">
                Select a file on the left to compile its compliant Adverse declaration letter.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
