import React, { useState, useEffect } from "react";
import { db, genId } from "../db";
import { Loan, LoanCondition, LoanTask, ConditionStatus, LoanStage } from "../types";
import { 
  CheckCircle2, AlertCircle, PlayCircle, RefreshCw, Send, 
  Layers, HardDrive, ShoppingBag, Radio, ClipboardList, Cpu, Calculator 
} from "lucide-react";

interface LOAWorkflowProps {
  onRefreshDB: () => void;
}

export const LOAWorkflow: React.FC<LOAWorkflowProps> = ({ onRefreshDB }) => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [conditions, setConditions] = useState<LoanCondition[]>([]);
  const [activeTab, setActiveTab] = useState<"conditions" | "vendors" | "aus" | "inkcalc">("conditions");
  
  // Selected Context File
  const [activeLoanId, setActiveLoanId] = useState("");
  
  // Underwriter response thread state
  const [selectedCondId, setSelectedCondId] = useState("");
  const [threadComments, setThreadComments] = useState<Record<string, Array<{ sender: string; text: string; time: string }>>>({
    "C-2": [
      { sender: "Underwriter", text: "Hazard quote page 3 premium page matches coverage limit check.", time: "2026-06-09 11:20" },
      { sender: "Processor", text: "Confirmed. Client state farm local agent verified binder.", time: "2026-06-09 13:40" }
    ]
  });
  const [newCommentText, setNewCommentText] = useState("");

  // Stacking order builder output view
  const [stackedOrderList, setStackedOrderList] = useState<string[]>([]);
  const [isStacking, setIsStacking] = useState(false);

  // Vendor simulator progress indicators
  const [vendorLoading, setVendorLoading] = useState<Record<string, boolean>>({});
  const [vendorStatuses, setVendorStatuses] = useState<Record<string, { status: string; date: string }>>({
    "LF-7294_appraisal": { status: "DELIVERED - Value $425,000", date: "2026-06-08" },
    "LF-7294_credit": { status: "COMPLETE - FICO 745", date: "2026-06-06" }
  });

  // AUS simulation running indicator
  const [runningAusId, setRunningAusId] = useState("");
  const [ausReportOutput, setAusReportOutput] = useState<string | null>(null);

  // Income Calculator Worksheet (W2 / self-employed)
  const [incomeType, setIncomeType] = useState<"w2" | "self">("w2");
  const [w2Calc, setW2Calc] = useState({ grossAnnual: 102000, secondaryBonus: 0, monthsHistory: 24 });
  const [selfCalc, setSelfCalc] = useState({ scheduleCLine31: 72000, depreciationAdd: 4800, mealsExclusion: 1200 });

  useEffect(() => {
    fetchData();
    const handleUpdate = () => fetchData();
    window.addEventListener("lendflow_db_updated", handleUpdate);
    return () => window.removeEventListener("lendflow_db_updated", handleUpdate);
  }, []);

  const fetchData = () => {
    const allLoans = db.getLoans();
    setLoans(allLoans);
    if (allLoans.length > 0 && !activeLoanId) {
      setActiveLoanId(allLoans[0].id);
    }
    setConditions(db.getConditions());
  };

  const handleActiveLoanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveLoanId(e.target.value);
    setAusReportOutput(null);
    setStackedOrderList([]);
  };

  // Condition Clearing actions
  const handleUpdateConditionStatus = (condId: string, newStatus: ConditionStatus) => {
    const allConds = db.getConditions();
    const idx = allConds.findIndex(c => c.id === condId);
    if (idx !== -1) {
      allConds[idx].status = newStatus;
      db.saveConditions(allConds);
      
      db.addAudit(
        allConds[idx].loanId,
        "Lynn Harris",
        "Processor",
        `Condition Status: ${newStatus}`,
        `Condition '${allConds[idx].title}' has been marked [${newStatus}] by the loan processing desk.`
      );

      fetchData();
      onRefreshDB();
    }
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedCondId) return;

    const timeStr = new Date().toISOString().replace("T", " ").substring(0, 16);
    const existing = threadComments[selectedCondId] || [];
    const updated = [...existing, { sender: "Processor", text: newCommentText, time: timeStr }];
    
    setThreadComments(prev => ({ ...prev, [selectedCondId]: updated }));
    setNewCommentText("");

    db.addAudit(
      activeLoanId,
      "Sarah Connor",
      "LOA",
      "Condition Comment Added",
      `Underwriting discussion comment registered for condition item: "${newCommentText.substring(0, 45)}"`
    );
  };

  // Compile stacking order package
  const handleBuildStackingPackage = () => {
    setIsStacking(true);
    setTimeout(() => {
      // Standard Fannie Mae stacking sequence:
      // 1. Uniform Loan Application (Form 1003)
      // 2. Experian Credit Report Merge
      // 3. W2 Statements / HR Truework VOE sheets
      // 4. Asset Statement Portfolio (Chase Reserves)
      // 5. Independent Escrow Appraisal Valuation
      // 6. Hazard Insurance Quote
      const fileConds = conditions.filter(c => c.loanId === activeLoanId);
      const sequence = [
        "1. Uniform Loan Application (Form 1003 Intake Summary)",
        "2. Merged Credit Bureau report (Tri-Merged FICO 742)",
      ];

      fileConds.forEach((c) => {
        if (c.status === ConditionStatus.Cleared || c.status === ConditionStatus.Submitted) {
          const detail = c.uploadedDocumentName ? ` (Verified File: ${c.uploadedDocumentName})` : "";
          sequence.push(`Attachment: [${c.category.toUpperCase()}] ${c.title}${detail}`);
        }
      });

      sequence.push("8. Final Title Certificate & Escrow Closing Escro Agent instructions (Qualia Resware)");
      
      setStackedOrderList(sequence);
      setIsStacking(false);

      db.addAudit(
        activeLoanId,
        "Lynn Harris",
        "Processor",
        "Stacking Package Built",
        `Compiled conformant mortgage package in stacking sequence with ${sequence.length} verified documents.`
      );
    }, 900);
  };

  // Simulation Webhook integration orders
  const handleTriggerVendorOrder = (vendorKey: string, providerName: string, docToProduceTitle: string, docCategory: any) => {
    const key = `${activeLoanId}_${vendorKey}`;
    setVendorLoading(prev => ({ ...prev, [vendorKey]: true }));

    setTimeout(() => {
      const generatedVal = vendorKey === "appraisal" ? "COMPLETE - Appraised $428,000 (LTV 78%)" :
                           vendorKey === "credit" ? "MERGED - FICO Score 722" :
                           vendorKey === "voe" ? "VERIFIED - Employer active. Income cert $7500/mo" : 
                           "VALIDATED - No flags, active policy confirmed";

      setVendorStatuses(prev => ({
        ...prev,
        [key]: { status: generatedVal, date: new Date().toISOString().split("T")[0] }
      }));
      setVendorLoading(prev => ({ ...prev, [vendorKey]: false }));

      // Inject dynamically as cleared/submitted condition
      const allConds = db.getConditions();
      const newCondId = "C-" + genId().toUpperCase();
      allConds.push({
        id: newCondId,
        loanId: activeLoanId,
        title: `Vendor Delivery: ${providerName} ${docToProduceTitle}`,
        description: `Delivered automatically via third-party digital callback interface. Status: ${generatedVal}.`,
        category: docCategory,
        status: ConditionStatus.Submitted,
        assignedTo: "Processor",
        dueDate: new Date().toISOString().split("T")[0],
        uploadedDocumentName: `Vendor_Callback_${vendorKey}.pdf`,
        uploadedDocumentDate: new Date().toISOString().split("T")[0],
        uploadedDocumentUrl: "#",
        versionCount: 1
      });
      db.saveConditions(allConds);

      db.addAudit(
        activeLoanId,
        "Lynn Harris",
        "Processor",
        `Vendor Webhook Success: ${providerName}`,
        `Ordered and imported vendor certified logs. Delivery response payload: [${generatedVal}]`
      );

      fetchData();
      onRefreshDB();
    }, 1500);
  };

  // Run Fannie Mae Desktop Underwriter (DU) / LPA
  const handleRunAusEngine = () => {
    if (!activeLoanId) return;
    setRunningAusId(activeLoanId);
    setAusReportOutput(null);

    setTimeout(() => {
      const allLoans = db.getLoans();
      const targetIdx = allLoans.findIndex(l => l.id === activeLoanId);
      if (targetIdx !== -1) {
        const dti = allLoans[targetIdx].dti;
        const ltv = allLoans[targetIdx].ltv;
        const score = allLoans[targetIdx].borrower.creditScore;

        let status: "DU Approved" | "LPA Approved" | "Refer with Caution" = "DU Approved";
        let reason = "Borrower variables reside within normal conforming thresholds.";

        if (dti > 45 || score < 620) {
          status = "Refer with Caution";
          reason = "Excessive debt ratio or sub-prime credit constraints require manual underwriter sign-off.";
        }

        allLoans[targetIdx].ausRunStatus = status;
        allLoans[targetIdx].ausRunDate = new Date().toISOString().split("T")[0];
        db.saveLoans(allLoans);

        db.addAudit(
          activeLoanId,
          "Lynn Harris",
          "Processor",
          "AUS Verification Completed",
          `Ran Fannie Mae DU. Evaluation result: [${status}] Conforming logic output: "${reason}"`
        );

        setAusReportOutput(`
--- FANNIE MAE DESKTOP UNDERWRITER (DU) EVALUATION ---
[RUN TIMESTAMP: ${new Date().toISOString().replace("T", " ").substring(0, 19)} UTC]
LOAN FILE REFERENCE: ${activeLoanId}
CREDIT PROFILE RATING: Merged bureau score [${score}]
METRICS ASSESSMENT: DTI ${dti}% (Requirement <=45%), LTV ${ltv}% (Requirement <=95%)

=======================================================
RECOMMENDATION OUTCOME: *** ${status.toUpperCase()} ***
EVALUATION FEEDBACK: ${reason}
ELIGIBLE FOR FNMA PURCHASE: ${status !== "Refer with Caution" ? "YES (Conforming)" : "NO (Needs Underwriter Review Window)"}
=======================================================
        `);

        setRunningAusId("");
        fetchData();
        onRefreshDB();
      }
    }, 1800);
  };

  // Simple Income calculations
  const calculatedW2Monthly = +(w2Calc.grossAnnual / 12).toFixed(2);
  const calculatedSelfMonthly = +((selfCalc.scheduleCLine31 + selfCalc.depreciationAdd - selfCalc.mealsExclusion) / 12).toFixed(2);

  const activeLoan = loans.find(l => l.id === activeLoanId);
  const activeLoanConds = conditions.filter(c => c.loanId === activeLoanId);

  return (
    <div className="space-y-6">
      
      {/* File Context Select Selector Header */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div>
          <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest font-mono">Operations Console</span>
          <h2 className="text-lg font-bold text-slate-950 font-sans tracking-tight">Processor Workspace</h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 font-mono">SELECTED CLIENT FILE ID:</span>
          <select
            value={activeLoanId}
            onChange={handleActiveLoanChange}
            className="border border-slate-250 bg-slate-50 text-xs font-bold py-1.5 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {loans.map(l => (
              <option key={l.id} value={l.id}>{l.id} - {l.borrower.firstName} {l.borrower.lastName} ({l.loanType})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-4">
        {[
          { id: "conditions", label: "Conditions & Stacking Queue", icon: <Layers className="w-4 h-4" /> },
          { id: "vendors", label: "Third-Party Order Integrations", icon: <Radio className="w-4 h-4" /> },
          { id: "aus", label: "Fannie Mae AUS (DU/LPA)", icon: <Cpu className="w-4 h-4" /> },
          { id: "inkcalc", label: "Income Worksheets Auditor", icon: <Calculator className="w-4 h-4" /> }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`pb-3 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === t.id
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-950"
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* TAB A: Conditions Clearing & Stacking Checklist */}
      {activeTab === "conditions" && activeLoan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List of active conditions */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Underwriting Conditions Drawer</h3>
                <p className="text-slate-400 text-xs mt-0.5">Clearing documents automatically indexes them in the vault.</p>
              </div>
              <span className="bg-emerald-100 text-emerald-850 px-2.5 py-1 text-xs rounded-full font-mono font-bold">
                {activeLoanConds.filter(c => c.status === ConditionStatus.Cleared).length} / {activeLoanConds.length} Done
              </span>
            </div>

            <div className="space-y-3 font-sans">
              {activeLoanConds.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-mono bg-white border border-slate-100 rounded-xl">
                  No registered conditions for this loan scenario yet.
                </div>
              ) : (
                activeLoanConds.map((cond) => {
                  return (
                    <div 
                      key={cond.id}
                      onClick={() => setSelectedCondId(cond.id)}
                      className={`border p-4 rounded-2xl transition-all cursor-pointer ${
                        selectedCondId === cond.id 
                          ? "bg-slate-50/80 border-emerald-500" 
                          : "bg-white border-slate-200 hover:border-slate-350"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-slate-200/80 text-slate-700 rounded">
                              {cond.category.toUpperCase()}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono ${
                              cond.status === ConditionStatus.Cleared ? "bg-green-100 text-green-800" :
                              cond.status === ConditionStatus.Submitted ? "bg-amber-100 text-amber-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {cond.status}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900">{cond.title}</h4>
                          <p className="text-xs text-slate-500">{cond.description}</p>
                          {cond.uploadedDocumentName && (
                            <span className="text-[10px] font-mono text-indigo-700 block bg-indigo-50 px-2.5 py-0.5 rounded w-fit italic">
                              📁 Submitted: {cond.uploadedDocumentName}
                            </span>
                          )}
                        </div>

                        {/* Fast clearing controls */}
                        <div className="flex flex-col sm:flex-row gap-1.5 self-end sm:self-start">
                          {cond.status !== ConditionStatus.Cleared && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateConditionStatus(cond.id, ConditionStatus.Cleared);
                              }}
                              className="text-[10px] bg-green-600 hover:bg-green-500 text-white font-bold px-2 py-1 rounded cursor-pointer"
                            >
                              CLEAR ✓
                            </button>
                          )}
                          {cond.status === ConditionStatus.Outstanding && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateConditionStatus(cond.id, ConditionStatus.Submitted);
                              }}
                              className="text-[10px] bg-slate-100 border border-slate-200 text-slate-750 font-bold px-2 py-1 rounded cursor-pointer"
                            >
                              SET SUBMITTED
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Underwriter thread discussions */}
          <div className="space-y-6">
            
            {/* Thread comments */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-slate-800 space-y-4 font-sans h-fit">
              <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-widest font-mono">Condition response thread</h4>
              <p className="text-slate-400 text-xs">Underwriter-Processor active log discussion per condition.</p>

              {selectedCondId ? (
                <>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-[11px] font-mono font-bold text-slate-800">
                    Active ID: {selectedCondId}
                  </div>

                  <div className="h-44 overflow-y-auto space-y-2.5 pr-1 border border-slate-100 p-2.5 rounded-xl">
                    {(threadComments[selectedCondId] || []).length === 0 ? (
                      <div className="text-[10px] text-slate-400 h-24 flex items-center justify-center font-mono">
                        No messages in queue. Begin by posting below.
                      </div>
                    ) : (
                      (threadComments[selectedCondId] || []).map((cmt, idx) => (
                        <div key={idx} className="border-b border-slate-100 pb-1.5 text-xs">
                          <div className="flex justify-between font-bold text-[10px] text-amber-700 mb-0.5">
                            <span>{cmt.sender}</span>
                            <span className="text-slate-450 font-normal">{cmt.time}</span>
                          </div>
                          <p className="text-slate-800 font-medium">{cmt.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleSendComment} className="flex gap-1">
                    <input 
                      type="text"
                      placeholder="Comment..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="bg-slate-900 text-white text-xs font-bold px-2.5 rounded hover:bg-slate-800 cursor-pointer"
                    >
                      Send
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-xs text-slate-400 text-center font-mono p-4 border border-dashed border-slate-200 rounded-xl">
                  Select a condition to open discussion thread logs.
                </div>
              )}
            </div>

            {/* Document Stacking compiler trigger */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-slate-200 space-y-4 font-sans">
              <div>
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">Stacking package builder</h4>
                <p className="text-slate-400 text-xs mt-0.5">Assembles conforming mortgage files in official Fannie Mae sequence order.</p>
              </div>

              {stackedOrderList.length > 0 ? (
                <div className="bg-slate-950 p-3 rounded-xl max-h-56 overflow-y-auto space-y-2 text-[11px] font-mono text-emerald-300">
                  {stackedOrderList.map((stk, idx) => (
                    <div key={idx} className="border-b border-slate-850 pb-1 flex items-start gap-1 pr-1">
                      <span>✓</span>
                      <span>{stk}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div></div>
              )}

              <button
                onClick={handleBuildStackingPackage}
                disabled={isStacking}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-slate-950 font-bold py-2 rounded-xl transition-all font-sans text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow"
              >
                <HardDrive className="w-4 h-4 text-slate-950" />
                <span>{isStacking ? "Compiling Pack..." : "Assemble Conformant Package"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB B: Third-Party Integrations */}
      {activeTab === "vendors" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 font-sans">
          <div>
            <h3 className="text-base font-bold text-slate-900">Partner & Vendor Integration Suite</h3>
            <p className="text-slate-400 text-xs mt-0.5">Secure external API callback triggers. Clicking "Order Services" simulates programmatic connection requests.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { 
                key: "appraisal", 
                title: "Property Valuation (Appraisal)", 
                desc: "Mercury Network & Reggora independent appraisers dispatcher.", 
                carrier: "Reggora API", 
                btn: "Order appraisal", 
                docName: "Appraisal Certificate", 
                cat: "Property" 
              },
              { 
                key: "credit", 
                title: "credit Reporting hard pull", 
                desc: "Tri-merged Experian, Equifax, TransUnion credit file merge.", 
                carrier: "Experian Credit API", 
                btn: "Pull Merged Bureau", 
                docName: "Tri-Merged Credit Report", 
                cat: "Credit" 
              },
              { 
                key: "voe", 
                title: "Employment & Income Verification", 
                desc: "Truework / The Work Number digitized employment certifications.", 
                carrier: "Truework Connect API", 
                btn: "Request Truework VOE", 
                docName: "HR Certified VOE logs", 
                cat: "Income" 
              },
              { 
                key: "hoi", 
                title: "Hazard Insurance Verification", 
                desc: "Solicits official declaration pages directly from carriers.", 
                carrier: "Matic Home Insurance API", 
                btn: "Verify Insurance Quote", 
                docName: "Hazard Insurance quote declarations", 
                cat: "Property" 
              },
            ].map((v) => {
              const loading = vendorLoading[v.key];
              const uniqueKey = `${activeLoanId}_${v.key}`;
              const activeStatus = vendorStatuses[uniqueKey];

              return (
                <div key={v.key} className="border border-slate-200 rounded-xl p-4 space-y-4 hover:border-slate-350 transition-all bg-slate-50/20">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 text-slate-800">
                      <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                        Integration API: {v.carrier}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-950 mt-1">{v.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">{v.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t border-slate-100 pt-3 flex-wrap">
                    <button
                      disabled={loading}
                      onClick={() => handleTriggerVendorOrder(v.key, v.carrier, v.docName, v.cat)}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all flex items-center gap-1.5 shadow"
                    >
                      {loading && <RefreshCw className="w-3 h-3 animate-spin text-slate-950" />}
                      <span>{loading ? "Ordering API..." : v.btn}</span>
                    </button>

                    {activeStatus ? (
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 font-bold truncate max-w-full">
                        ✓ {activeStatus.status} ({activeStatus.date})
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400">
                        Status: Out of sync
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB C: AUS DU/LPA Engine */}
      {activeTab === "aus" && activeLoan && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-200 space-y-6 font-sans">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-emerald-400 font-mono">Fannie Mae Desktop Underwriter (DU) Integration</h3>
              <p className="text-slate-400 text-xs mt-0.5">Programs eligibility scoring checks covering debt ratios, reserves, and loan criteria.</p>
            </div>
            <span className="bg-slate-950 text-amber-400 text-[10px] px-2.5 py-1 rounded font-mono font-bold">
              AUS status: {activeLoan.ausRunStatus || "Not Run"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl space-y-3 border border-slate-800 text-xs">
                <span className="font-bold text-slate-300 block uppercase tracking-wider text-[10px] mb-1">Pre-Check Scoring Attributes:</span>
                <div className="flex justify-between">
                  <span>Borrower FICO:</span>
                  <span className="font-mono text-slate-100 font-extrabold">{activeLoan.borrower.creditScore}</span>
                </div>
                <div className="flex justify-between">
                  <span>Housing Debt-to-Income:</span>
                  <span className="font-mono text-slate-100 font-extrabold">{activeLoan.dti}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Conforming Loan-to-Value:</span>
                  <span className="font-mono text-slate-100 font-extrabold">{activeLoan.ltv}%</span>
                </div>
              </div>

              <button
                onClick={handleRunAusEngine}
                disabled={runningAusId === activeLoanId}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                <Cpu className="w-4 h-4 text-slate-950" />
                <span>{runningAusId === activeLoanId ? "Running AUS Algorithms..." : "Execute Conforming AUS Recommendation"}</span>
              </button>
            </div>

            {/* Simulated terminal readout */}
            <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl max-h-72 overflow-y-auto">
              <span className="text-[10px] font-mono text-slate-500 block uppercase mb-1">Log Outputs:</span>
              
              {ausReportOutput ? (
                <pre className="text-[10px] font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed">
                  {ausReportOutput}
                </pre>
              ) : (
                <div className="text-[10px] text-slate-550 h-32 flex items-center justify-center font-mono text-center">
                  Click button to trigger FNMA Desktop Underwriter API check logs.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB D: Income Calculations Worksheet */}
      {activeTab === "inkcalc" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          
          {/* Form worksheets */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-slate-800 space-y-4">
            <h3 className="text-sm font-bold block text-slate-950 border-b border-indigo-50 pb-2 flex items-center gap-1.5">
              💡 Worksheets Type
            </h3>
            
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setIncomeType("w2")}
                className={`text-xs py-1.5 rounded-lg cursor-pointer ${incomeType === "w2" ? "bg-white font-bold shadow text-indigo-700" : "text-slate-500"}`}
              >
                Standard W-2 Form
              </button>
              <button
                onClick={() => setIncomeType("self")}
                className={`text-xs py-1.5 rounded-lg cursor-pointer ${incomeType === "self" ? "bg-white font-bold shadow text-indigo-700" : "text-slate-500"}`}
              >
                Self-Employed P&L
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold pt-2">
              {incomeType === "w2" ? (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-slate-700 mb-0.5">W2 box 1 base Annual Gross ($)</label>
                    <input 
                      type="number" 
                      value={w2Calc.grossAnnual}
                      onChange={(e) => setW2Calc(prev => ({ ...prev, grossAnnual: +e.target.value }))}
                      className="w-full border border-slate-205 rounded-xl px-2.5 py-1.5 bg-slate-50 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-0.5">secondary Bonus/Commission Overtime ($)</label>
                    <input 
                      type="number" 
                      value={w2Calc.secondaryBonus}
                      onChange={(e) => setW2Calc(prev => ({ ...prev, secondaryBonus: +e.target.value }))}
                      className="w-full border border-slate-205 rounded-xl px-2.5 py-1.5 bg-slate-50 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-0.5">Employment History History months</label>
                    <input 
                      type="number" 
                      value={w2Calc.monthsHistory}
                      onChange={(e) => setW2Calc(prev => ({ ...prev, monthsHistory: +e.target.value }))}
                      className="w-full border border-slate-205 rounded-xl px-2.5 py-1.5 bg-slate-50 font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-slate-700 mb-0.5">Schedule C (Form 1040) Line 31 Net Profit ($)</label>
                    <input 
                      type="number" 
                      value={selfCalc.scheduleCLine31}
                      onChange={(e) => setSelfCalc(prev => ({ ...prev, scheduleCLine31: +e.target.value }))}
                      className="w-full border border-slate-205 rounded-xl px-2.5 py-1.5 bg-slate-50 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-0.5">Depreciation Add-back ($)</label>
                    <input 
                      type="number" 
                      value={selfCalc.depreciationAdd}
                      onChange={(e) => setSelfCalc(prev => ({ ...prev, depreciationAdd: +e.target.value }))}
                      className="w-full border border-slate-205 rounded-xl px-2.5 py-1.5 bg-slate-50 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-0.5">Meals & Entertainment Exclusion Reduction ($)</label>
                    <input 
                      type="number" 
                      value={selfCalc.mealsExclusion}
                      onChange={(e) => setSelfCalc(prev => ({ ...prev, mealsExclusion: +e.target.value }))}
                      className="w-full border border-slate-205 rounded-xl px-2.5 py-1.5 bg-slate-50 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Verification Results Panel */}
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between font-sans">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-3 border-b border-indigo-50 pb-2.5">
                Earnings Verified Outcomes
              </h3>

              <div className="space-y-4 text-xs font-semibold">
                <div className="flex justify-between items-center text-slate-700">
                  <span>Gross Adjusted Annual Total:</span>
                  <span className="font-mono text-slate-900 font-extrabold text-sm">
                    ${incomeType === "w2" 
                      ? (w2Calc.grossAnnual + w2Calc.secondaryBonus).toLocaleString()
                      : (selfCalc.scheduleCLine31 + selfCalc.depreciationAdd - selfCalc.mealsExclusion).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-700 border-t border-slate-100 pt-3">
                  <span>Processor Certified Monthly Cashflow:</span>
                  <span className="font-mono text-lg font-black text-emerald-600">
                    ${incomeType === "w2" ? calculatedW2Monthly : calculatedSelfMonthly} / mo
                  </span>
                </div>

                <div className="bg-slate-50 p-4 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500 leading-relaxed font-semibold">
                  <span>📊 Note: Standard Fannie Mae single-family guidelines restrict the DTI ratio. With monthly qualifying income of <span className="font-bold text-slate-900">${incomeType === "w2" ? calculatedW2Monthly : calculatedSelfMonthly}</span>, target payments should reside below 43% of this sum.</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                alert(`Qualifying income of $${incomeType === "w2" ? calculatedW2Monthly : calculatedSelfMonthly} has been locked to file metrics register.`);
              }}
              className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs cursor-pointer mt-6"
            >
              Lock Qualified Income metrics Register
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
