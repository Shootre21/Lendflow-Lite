import React, { useState, useEffect } from "react";
import { db, calculatePricingScenarios, formatDateOnly } from "../db";
import { Loan, LoanStage, LoanLead, LoanTask, ConditionStatus } from "../types";
import { 
  Layers, Search, Filter, ArrowUpDown, Plus, HelpCircle, 
  Lock, Unlock, Clock, Phone, Send, PlusCircle, CheckCircle2, 
  UserPlus, Mail, AlertTriangle, TrendingUp, TrendingDown, ClipboardList
} from "lucide-react";

interface LODashboardProps {
  onRefreshDB: () => void;
}

export const LODashboard: React.FC<LODashboardProps> = ({ onRefreshDB }) => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [leads, setLeads] = useState<LoanLead[]>([]);
  const [tasks, setTasks] = useState<LoanTask[]>([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState<"pipeline" | "crm" | "rate" | "tasks">("pipeline");
  const [viewType, setViewType] = useState<"kanban" | "list">("kanban");
  
  // Filtering & Sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState<"close" | "credit" | "amount">("close");

  // Selected Loan File details drawer modal
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  
  // CRM Forms
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    phone: "",
    type: "Conventional" as const,
    amount: 350000,
    source: "Realtor Referral" as const,
    partner: "",
    notes: ""
  });

  // Call logger
  const [callNotes, setCallNotes] = useState("");
  const [callLoggerLoanId, setCallLoggerLoanId] = useState("");

  // Rate sheet inputs
  const [pricingClient, setPricingClient] = useState<Loan | null>(null);
  const [customPrice, setCustomPrice] = useState({ price: 350000, down: 70000, credit: 720, income: 8000, debt: 1000 });

  useEffect(() => {
    fetchData();
    const handleUpdate = () => fetchData();
    window.addEventListener("lendflow_db_updated", handleUpdate);
    return () => window.removeEventListener("lendflow_db_updated", handleUpdate);
  }, []);

  const fetchData = () => {
    setLoans(db.getLoans());
    setLeads(db.getLeads());
    setTasks(db.getTasks());
  };

  // Drag and Drop (or Click to Move) Simulation
  const handleMoveStage = (loanId: string, targetStage: LoanStage) => {
    const allLoans = db.getLoans();
    const idx = allLoans.findIndex(l => l.id === loanId);
    if (idx !== -1) {
      const oldStage = allLoans[idx].stage;
      allLoans[idx].stage = targetStage;
      db.saveLoans(allLoans);
      
      db.addAudit(
        loanId,
        "Marcus Brooks",
        "LO",
        "Milestone Stage Transitioned",
        `Moved loan file from '${oldStage}' status to '${targetStage}'. Action automatically triggered review worksheets.`
      );
      
      fetchData();
      if (selectedLoan?.id === loanId) {
        setSelectedLoan(allLoans[idx]);
      }
      onRefreshDB();
    }
  };

  // Rate lock trigger
  const handleLockRate = (loanId: string) => {
    const allLoans = db.getLoans();
    const idx = allLoans.findIndex(l => l.id === loanId);
    if (idx !== -1) {
      allLoans[idx].rateLockLocked = true;
      allLoans[idx].rateLockDate = formatDateOnly(new Date());
      allLoans[idx].rateLockExpires = formatDateOnly(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      db.saveLoans(allLoans);

      db.addAudit(
        loanId,
        "Marcus Brooks",
        "LO",
        "Interest Rate Locked",
        `Confirmed rate block for client ${allLoans[idx].borrower.firstName} ${allLoans[idx].borrower.lastName}. Expiring in 30 days.`
      );
      
      fetchData();
      if (selectedLoan?.id === loanId) {
        setSelectedLoan(allLoans[idx]);
      }
      alert("Rate Lock confirmed for 30 days! Disclosure records have been timestamped for TRID compliance.");
      onRefreshDB();
    }
  };

  // Create CRM Lead
  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name) return;

    const nextLeadId = "LD-" + Math.floor(Math.random() * 900 + 100);
    const leadRecord: LoanLead = {
      id: nextLeadId,
      borrowerName: newLead.name,
      email: newLead.email,
      phone: newLead.phone,
      loanType: newLead.type,
      estimatedAmount: newLead.amount,
      leadSource: newLead.source,
      referralPartner: newLead.partner,
      status: "New",
      notes: newLead.notes,
      createdDate: formatDateOnly(new Date()),
      followUpSequences: ["Day 1 Prompt sequence triggered"]
    };

    const allLeads = db.getLeads();
    allLeads.unshift(leadRecord);
    db.saveLeads(allLeads);

    db.addAudit(
      undefined,
      "Marcus Brooks",
      "LO",
      "Lead Logged in CRM",
      `New prospect '${newLead.name}' added from source '${newLead.source}'. Referral partner: '${newLead.partner}'.`
    );

    alert(`Lead logged in pipeline! System has initiated automatic follow-up sequence.`);
    setNewLead({ name: "", email: "", phone: "", type: "Conventional", amount: 350000, source: "Realtor Referral", partner: "", notes: "" });
    setShowAddLead(false);
    fetchData();
    onRefreshDB();
  };

  // Trigger conversion from Lead to Guided Application
  const handleConvertLead = (lead: LoanLead) => {
    const allLoans = db.getLoans();
    const newId = "LF-" + Math.floor(Math.random() * 9000 + 1000);
    
    const [first, ...rest] = lead.borrowerName.split(" ");
    const last = rest.join(" ") || "Prospect";

    const convertedLoan: Loan = {
      id: newId,
      borrower: {
        firstName: first,
        lastName: last,
        email: lead.email,
        phone: lead.phone,
        ssn: "Pending Verification",
        dob: "1990-01-01",
        address: "Address Pending",
        monthlyIncome: 6500, // placeholder default
        monthlyDebts: 800,
        creditScore: 700
      },
      stage: LoanStage.Lead,
      loanType: lead.loanType as any,
      purchasePrice: lead.estimatedAmount * 1.2, // rough estimation
      downPayment: lead.estimatedAmount * 0.2,
      loanAmount: lead.estimatedAmount,
      ltv: 80,
      dti: 28.0,
      interestRate: 6.5,
      termMonths: 360,
      estimatedCloseDate: formatDateOnly(new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)),
      rateLockLocked: false,
      qmEligible: true,
      redFlagAlerts: []
    };

    allLoans.push(convertedLoan);
    db.saveLoans(allLoans);

    // Update lead status
    const allLeads = db.getLeads();
    const lIdx = allLeads.findIndex(ld => ld.id === lead.id);
    if (lIdx !== -1) {
      allLeads[lIdx].status = "Converted";
      db.saveLeads(allLeads);
    }

    db.addAudit(
      newId,
      "Marcus Brooks",
      "LO",
      "CRM Lead Converted",
      `Converted Lead '${lead.borrowerName}' into active loan application pipeline, tracking as file '${newId}'.`
    );

    alert(`Successfully converted! Created new active stage application client file: ${newId}.`);
    fetchData();
    onRefreshDB();
  };

  // Submit Logger
  const handleLogCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!callNotes.trim()) return;

    db.addAudit(
      callLoggerLoanId || undefined,
      "Marcus Brooks",
      "LO",
      "Phone Call Registered",
      `Logged outbound telephone call with notes: "${callNotes}"`
    );

    setCallNotes("");
    fetchData();
    alert("Call log notes committed successfully to file history.");
    onRefreshDB();
  };

  // Filtering & Sorting calculations
  const filteredLoans = loans.filter((l) => {
    const term = searchTerm.toLowerCase();
    const matchName = `${l.borrower.firstName} ${l.borrower.lastName}`.toLowerCase().includes(term);
    const matchId = l.id.toLowerCase().includes(term);
    
    if (!matchName && !matchId) return false;

    if (filterType === "all") return true;
    if (filterType === "conventional") return l.loanType === "Conventional";
    if (filterType === "fha") return l.loanType === "FHA";
    if (filterType === "locked") return l.rateLockLocked;
    if (filterType === "stalled") return l.ausRunStatus === "Not Run";
    
    return true;
  }).sort((a, b) => {
    if (sortBy === "close") {
      return new Date(a.estimatedCloseDate).getTime() - new Date(b.estimatedCloseDate).getTime();
    }
    if (sortBy === "credit") {
      return b.borrower.creditScore - a.borrower.creditScore;
    }
    if (sortBy === "amount") {
      return b.loanAmount - a.loanAmount;
    }
    return 0;
  });

  // Scenarios for designated loan or custom sliders
  const activeScenData = pricingClient 
    ? calculatePricingScenarios(pricingClient.purchasePrice, pricingClient.downPayment, pricingClient.borrower.creditScore, pricingClient.borrower.monthlyIncome, pricingClient.borrower.monthlyDebts)
    : calculatePricingScenarios(customPrice.price, customPrice.down, customPrice.credit, customPrice.income, customPrice.debt);

  // CRM Statistics
  const leadSourceCounts = leads.reduce((acc, lead) => {
    acc[lead.leadSource] = (acc[lead.leadSource] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const closedAmtTotal = loans.filter(l => l.stage === LoanStage.Closed).reduce((s, l) => s + l.loanAmount, 0);
  const activeVolume = loans.filter(l => l.stage !== LoanStage.Closed).reduce((s, l) => s + l.loanAmount, 0);

  // Real-time stats calculations for the top-level summary strip
  const totalPipelineValue = loans.reduce((sum, l) => sum + l.loanAmount, 0);
  const lockedLoans = loans.filter(l => l.rateLockLocked && l.stage !== LoanStage.Closed);
  const lockedLoansCount = lockedLoans.length;
  const lockedLoansValue = lockedLoans.reduce((sum, l) => sum + l.loanAmount, 0);
  const uwLoans = loans.filter(l => l.stage === LoanStage.Underwriting);
  const uwLoansCount = uwLoans.length;
  const uwLoansValue = uwLoans.reduce((sum, l) => sum + l.loanAmount, 0);
  const activeLoansCount = loans.filter(l => l.stage !== LoanStage.Closed).length;

  return (
    <div className="space-y-6">
      
      {/* Real-Time Pipeline Summary Strip */}
      <div id="live-pipeline-summary-strip" className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/50 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
            </span>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest font-mono">Real-Time Pipeline Monitor</h3>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 font-bold">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Updated Live</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card: Total Pipeline Value */}
          <div id="metric-total-pipeline" className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 flex items-center justify-between transition-all shadow-xs group">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Total Pipeline Value</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 font-sans tracking-tight">
                  ${(totalPipelineValue / 1000000).toFixed(2)}M
                </span>
                <span className="text-xs font-bold text-slate-500 font-mono">
                  (${totalPipelineValue.toLocaleString()})
                </span>
              </div>
              <span className="block text-[10px] text-slate-500 font-bold">
                {activeLoansCount} active folder(s) current pool
              </span>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl group-hover:bg-blue-100/50 transition-colors">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>

          {/* Card: Locked Loans */}
          <div id="metric-locked-loans" className="bg-white border border-slate-200 hover:border-green-300 rounded-xl p-4 flex items-center justify-between transition-all shadow-xs group">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Locked Loans</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 font-sans tracking-tight">
                  {lockedLoansCount} File{lockedLoansCount !== 1 ? 's' : ''}
                </span>
                <span className="text-xs font-bold text-green-600 font-mono">
                  (${(lockedLoansValue / 1000000).toFixed(2)}M)
                </span>
              </div>
              <span className="block text-[10px] text-slate-500 font-bold">
                Secured rate lock commitments
              </span>
            </div>
            <div className="p-3 bg-green-50 border border-green-100 rounded-xl group-hover:bg-green-100/50 transition-colors">
              <Lock className="w-5 h-5 text-green-600" />
            </div>
          </div>

          {/* Card: Loans in Underwriting */}
          <div id="metric-uw-loans" className="bg-white border border-slate-200 hover:border-amber-300 rounded-xl p-4 flex items-center justify-between transition-all shadow-xs group">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Loans in Underwriting</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 font-sans tracking-tight">
                  {uwLoansCount} File{uwLoansCount !== 1 ? 's' : ''}
                </span>
                <span className="text-xs font-semibold text-amber-700 font-mono">
                  (${(uwLoansValue / 1000).toFixed(0)}k)
                </span>
              </div>
              <span className="block text-[10px] text-slate-500 font-bold">
                Active clinical reviewer evaluation
              </span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl group-hover:bg-amber-100/50 transition-colors">
              <Layers className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Top board summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Pipeline Volume", val: `$${(activeVolume / 1000000).toFixed(2)}M`, subtitle: `${loans.filter(l => l.stage !== LoanStage.Closed).length} active files`, desc: "LO personal book" },
          { label: "Month-to-Date Closed", val: `$${(closedAmtTotal / 1000).toFixed(0)}k`, subtitle: "Commission Tier: Lead LO", desc: "100% pull-through tier" },
          { label: "Open CRM Leads", val: leads.filter(l => l.status !== "Converted").length, subtitle: `${leads.filter(l => l.status === "New").length} untouched leads`, desc: "Incentive campaign active" },
          { label: "Avg Cycle Closed", val: "18.5 Days", subtitle: "Branch Target: 24 Days", desc: "Processor benchmark high" }
        ].map((k, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{k.label}</span>
            <div className="my-2">
              <span className="text-2xl font-black text-slate-900 font-sans tracking-tight">{k.val}</span>
              <span className="block text-[11px] font-mono text-slate-400 mt-0.5 font-bold">{k.subtitle}</span>
            </div>
            <span className="text-[10px] bg-indigo-50 border border-indigo-100/50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold self-start">
              {k.desc}
            </span>
          </div>
        ))}
      </div>

      {/* Primary tabs */}
      <div className="border-b border-slate-200 flex gap-4">
        {[
          { id: "pipeline", label: "Pipeline Visualizer", icon: <Layers className="w-4 h-4" /> },
          { id: "crm", label: "CRM & Referrals", icon: <UserPlus className="w-4 h-4" /> },
          { id: "rate", label: "Rate sheets & LLPA Matrix", icon: <Lock className="w-4 h-4" /> },
          { id: "tasks", label: "Task List Countdown", icon: <ClipboardList className="w-4 h-4" /> }
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

      {/* TAB A: Pipeline view */}
      {activeTab === "pipeline" && (
        <div className="space-y-4 font-sans">
          
          {/* Controls toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
            
            {/* Search/ Filters */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input 
                  type="text"
                  placeholder="Search client first/last..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs w-[180px] sm:w-[220px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 font-medium font-sans"
                />
              </div>

              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2.5">
                <Filter className="w-3 text-slate-400" />
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="text-xs border border-slate-250 bg-slate-50 rounded-lg py-1 px-1.5 focus:outline-none font-bold"
                >
                  <option value="all">All File Formats</option>
                  <option value="conventional">Conventional Only</option>
                  <option value="fha">FHA Only</option>
                  <option value="locked">Rate Locked</option>
                  <option value="stalled">Needs AUS Pull</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2.5">
                <ArrowUpDown className="w-3 text-slate-400" />
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs border border-slate-250 bg-slate-50 rounded-lg py-1 px-1.5 focus:outline-none font-bold"
                >
                  <option value="close">Close Date</option>
                  <option value="credit">Credit Score</option>
                  <option value="amount">Loan Amount</option>
                </select>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setViewType("kanban")}
                className={`text-xs px-3 py-1 rounded-lg cursor-pointer transition-all ${viewType === "kanban" ? "bg-white font-bold shadow-sm text-blue-600" : "text-slate-500"}`}
              >
                Kanban
              </button>
              <button 
                onClick={() => setViewType("list")}
                className={`text-xs px-3 py-1 rounded-lg cursor-pointer transition-all ${viewType === "list" ? "bg-white font-bold shadow-sm text-blue-600" : "text-slate-500"}`}
              >
                List View
              </button>
            </div>
          </div>

          {/* Kanban Board View */}
          {viewType === "kanban" ? (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3 overflow-x-auto pb-4">
              {[
                { stage: LoanStage.Lead, title: "Lead Intake" },
                { stage: LoanStage.Application, title: "Application" },
                { stage: LoanStage.Processing, title: "Processing" },
                { stage: LoanStage.Underwriting, title: "Underwriting" },
                { stage: LoanStage.Approval, title: "UW Approved" },
                { stage: LoanStage.CTC, title: "Clear to Close" },
                { stage: LoanStage.Closed, title: "Closed & Funded" },
              ].map((lane) => {
                const laneLoans = filteredLoans.filter(l => l.stage === lane.stage);
                return (
                  <div key={lane.stage} className="bg-slate-55 border border-slate-200/60 rounded-2xl p-2.5 min-w-[210px] flex flex-col h-[520px]">
                    <div className="flex justify-between items-center mb-2.5 border-b border-slate-200/60 pb-1.5 px-0.5">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-widest truncate">{lane.title}</span>
                      <span className="bg-slate-200 text-slate-700 font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">{laneLoans.length}</span>
                    </div>

                    <div className="space-y-2.5 overflow-y-auto flex-1 pr-0.5">
                      {laneLoans.length === 0 ? (
                        <div className="h-24 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] text-slate-400 font-medium">
                          No folders
                        </div>
                      ) : (
                        laneLoans.map((l) => {
                          const isHighCloseRisk = new Date(l.estimatedCloseDate).getTime() < Date.now() + 12 * 24 * 60 * 60 * 1000;
                          return (
                            <div
                              key={l.id}
                              onClick={() => setSelectedLoan(l)}
                              className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer space-y-2 font-medium"
                            >
                              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                                <span className="font-extrabold text-slate-800">{l.id}</span>
                                <span className="bg-slate-100 text-slate-700 px-1 py-0.2 rounded text-[9px] uppercase font-bold">{l.loanType}</span>
                              </div>

                              <div className="space-y-0.5">
                                <h4 className="text-xs font-bold text-slate-900 truncate">
                                  {l.borrower.firstName} {l.borrower.lastName}
                                </h4>
                                <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                                  <span>LTV: {l.ltv}%</span>
                                  <span>DTI: {l.dti}%</span>
                                </div>
                              </div>

                              <div className="flex justify-between text-[10px] text-slate-900 font-mono font-bold pt-1.5 border-t border-slate-100/80">
                                <span>${(l.loanAmount / 1000).toFixed(0)}k</span>
                                <span className={isHighCloseRisk ? "text-red-600 font-black flex items-center gap-0.5" : "text-slate-500"}>
                                  {isHighCloseRisk && <AlertTriangle className="w-2.5 h-2.5" />}
                                  {l.estimatedCloseDate.substring(5)}
                                </span>
                              </div>

                              {/* Lock status pill */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${l.rateLockLocked ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                  {l.rateLockLocked ? "🔒 Locked" : "🔓 Floating"}
                                </span>
                                {l.ausRunStatus && l.ausRunStatus !== "Not Run" && (
                                  <span className="text-[9px] bg-blue-50 text-blue-700 px-1 py-0.2 border border-blue-200 rounded font-mono font-bold">
                                    AUS: {l.ausRunStatus.slice(0, 3)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View Grid */
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <th className="py-3 px-4">File ID</th>
                    <th className="py-3 px-4">Borrower Name</th>
                    <th className="py-3 px-4">LTV/DTI Ratio</th>
                    <th className="py-3 px-4">Credit Score</th>
                    <th className="py-3 px-4">Milestone</th>
                    <th className="py-3 px-4">Loan Amount</th>
                    <th className="py-3 px-4">Rate Lock Status</th>
                    <th className="py-3 px-4 text-right">Estimated Close</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {filteredLoans.map((l) => (
                    <tr 
                      key={l.id} 
                      onClick={() => setSelectedLoan(l)}
                      className="hover:bg-slate-50/50 cursor-pointer text-slate-800"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{l.id}</td>
                      <td className="py-3 px-4 font-bold">
                        {l.borrower.firstName} {l.borrower.lastName}
                        <span className="block text-[10px] text-slate-400 font-mono font-normal">Term: 360 mos</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-600">
                        LTV: {l.ltv}% / DTI: {l.dti}%
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded font-bold font-mono text-[11px] ${
                          l.borrower.creditScore >= 740 ? 'bg-green-100 text-green-800' :
                          l.borrower.creditScore >= 660 ? 'bg-amber-100/80 text-amber-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {l.borrower.creditScore}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 border border-slate-200 rounded-full font-bold font-mono text-[10px]">
                          {l.stage.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold font-mono">${l.loanAmount.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold font-mono text-[11px] ${l.rateLockLocked ? 'text-green-600' : 'text-slate-450'}`}>
                          {l.rateLockLocked ? `🔒 Locked` : "🔓 Floating"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{l.estimatedCloseDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* INSPECTION DRAWER MODAL */}
          {selectedLoan && (
            <div className="fixed inset-0 bg-black/45 z-50 flex items-center justify-end">
              <div className="bg-white w-full max-w-lg h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
                <div className="space-y-6 font-sans">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-mono font-black text-blue-600 uppercase tracking-widest">DETAILED ACTIVE DISCO</span>
                      <h3 className="text-lg font-bold text-slate-900">File Summary {selectedLoan.id}</h3>
                    </div>
                    <button 
                      onClick={() => setSelectedLoan(null)}
                      className="text-slate-400 hover:text-slate-900 border border-slate-200 font-mono p-1 rounded-lg"
                    >
                      Close
                    </button>
                  </div>

                  {/* General Profile */}
                  <div className="bg-slate-50 border border-slate-250 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1">BORROWER CORE PROSPECTION</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block">Name</span>
                        <span className="font-bold text-slate-900">{selectedLoan.borrower.firstName} {selectedLoan.borrower.lastName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Email</span>
                        <span className="font-mono text-[11px] truncate block">{selectedLoan.borrower.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Credit Profile (FICO)</span>
                        <span className="font-mono font-bold text-indigo-700">{selectedLoan.borrower.creditScore}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Target Address</span>
                        <span className="text-slate-800 truncate block">{selectedLoan.borrower.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Overview */}
                  <div className="bg-slate-50 border border-slate-250 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1">FINANCING DETAILS</h4>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block">Purchase price</span>
                        <span className="font-mono font-bold">${selectedLoan.purchasePrice.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Down payment</span>
                        <span className="font-mono font-bold">${selectedLoan.downPayment.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Loan amount</span>
                        <span className="font-mono font-bold">${selectedLoan.loanAmount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">DTI ratio</span>
                        <span className={`font-mono font-bold ${selectedLoan.dti > 43 ? 'text-red-600' : 'text-slate-800'}`}>{selectedLoan.dti}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">LTV ratio</span>
                        <span className="font-mono font-bold">{selectedLoan.ltv}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Interest Sheet</span>
                        <span className="font-mono font-bold text-blue-600">{selectedLoan.interestRate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Manual transition controls */}
                  <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <h4 className="text-xs font-bold text-slate-900">PIPELINE MILESTONE ACTIONS</h4>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { level: LoanStage.Processing, label: "Processing" },
                        { level: LoanStage.Underwriting, label: "Underwriting" },
                        { level: LoanStage.Approval, label: "Set Approved" },
                        { level: LoanStage.CTC, label: "Clear to Close" }
                      ].map((item) => {
                        const active = selectedLoan.stage === item.level;
                        return (
                          <button
                            key={item.level}
                            onClick={() => handleMoveStage(selectedLoan.id, item.level)}
                            className={`border px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                              active ? "bg-blue-600 border-blue-700 text-white shadow-sm" : "bg-white text-slate-800 hover:bg-slate-100"
                            }`}
                          >
                            Stage: {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer rate lock triggers */}
                <div className="border-t border-slate-100 pt-4 flex gap-10 items-center justify-between font-sans">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Rate Lock desk</span>
                    <span className={`text-xs font-bold ${selectedLoan.rateLockLocked ? 'text-green-600' : 'text-red-500'}`}>
                      {selectedLoan.rateLockLocked ? `LOCKED: expires ${selectedLoan.rateLockExpires}` : "FLOATED (Risk warning)"}
                    </span>
                  </div>

                  {!selectedLoan.rateLockLocked ? (
                    <button
                      onClick={() => handleLockRate(selectedLoan.id)}
                      className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all font-sans cursor-pointer flex items-center gap-1.5 shadow"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock Rate Now</span>
                    </button>
                  ) : (
                    <span className="text-green-600 bg-green-50 px-3 py-1.5 border border-green-200 text-xs font-bold rounded-lg font-mono flex items-center gap-1.5">
                      ✓ LOCKED APPROVED
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB B: Leads CRM */}
      {activeTab === "crm" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
          
          {/* Intake Leads list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
              <div>
                <h3 className="text-base font-bold text-slate-900">CRM Prospect Intake Pipeline</h3>
                <p className="text-slate-400 text-xs mt-0.5">Automated SMS/Email sequences actively running in background.</p>
              </div>
              <button 
                onClick={() => setShowAddLead(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow"
              >
                <PlusCircle className="w-4 h-4 text-white" />
                <span>Log New Prospect</span>
              </button>
            </div>

            {/* List Loop */}
            <div className="space-y-3">
              {leads.map((ld) => {
                return (
                  <div key={ld.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 border border-slate-200 rounded font-mono">
                          {ld.id}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 border border-slate-200 rounded font-mono">
                          {ld.leadSource}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                          ld.status === "Converted" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {ld.status}
                        </span>
                        {ld.referralPartner && (
                          <span className="text-[10px] text-amber-700 font-bold font-mono">
                            Partner: {ld.referralPartner}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900">{ld.borrowerName}</h4>
                      <p className="text-xs text-slate-500">{ld.notes}</p>
                      
                      <div className="grid grid-cols-2 text-[10px] text-slate-400 font-mono pt-1">
                        <span>Email: {ld.email}</span>
                        <span>Phone: {ld.phone}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 items-stretch sm:items-end justify-between self-end sm:self-stretch">
                      <div>
                        <span className="text-xs block text-slate-400 font-mono text-right">Estimated Amount</span>
                        <span className="text-sm font-bold text-slate-900 font-mono text-right block">${ld.estimatedAmount.toLocaleString()}</span>
                      </div>

                      {ld.status !== "Converted" ? (
                        <button
                          onClick={() => handleConvertLead(ld)}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all text-center flex items-center gap-1 shadow"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Convert to Loan</span>
                        </button>
                      ) : (
                        <span className="text-green-600 bg-green-50 px-2.5 py-1 text-center font-mono text-xs font-bold rounded border border-green-200">
                          CONVERTED ✓
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CRM Add Lead Panel & Partner Analytics */}
          <div className="space-y-6">
            
            {/* Log form (Slide transition fallback) */}
            {showAddLead && (
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-lg space-y-4 text-slate-800">
                <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                  <h4 className="font-bold text-sm text-slate-900">CRM Prospect Intake Form</h4>
                  <button 
                    onClick={() => setShowAddLead(false)} 
                    className="text-xs font-mono text-red-500 hover:underline"
                  >
                    Close
                  </button>
                </div>

                <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs font-medium">
                  <div>
                    <label className="block text-slate-700 mb-0.5">Prospect Name</label>
                    <input 
                      type="text" 
                      required
                      value={newLead.name}
                      onChange={(e) => setNewLead(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Jane Doe"
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 mb-0.5">Email</label>
                      <input 
                        type="email" 
                        value={newLead.email}
                        onChange={(e) => setNewLead(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="jane@outlook.com"
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-0.5">Phone</label>
                      <input 
                        type="text" 
                        value={newLead.phone}
                        onChange={(e) => setNewLead(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="(555) 012-3492"
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 mb-0.5">Lead Source</label>
                      <select 
                        value={newLead.source}
                        onChange={(e) => setNewLead(prev => ({ ...prev, source: e.target.value as any }))}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50"
                      >
                        <option value="Realtor Referral">Realtor Referral</option>
                        <option value="Builder Partner">Builder Partner</option>
                        <option value="Online Inbound">Online Inbound</option>
                        <option value="Cold Walk-in">Cold Walk-in</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-0.5">Referral Partner</label>
                      <input 
                        type="text" 
                        value={newLead.partner}
                        onChange={(e) => setNewLead(prev => ({ ...prev, partner: e.target.value }))}
                        placeholder="e.g. Jane Wright"
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-0.5">Intake Notes</label>
                    <textarea 
                      value={newLead.notes}
                      onChange={(e) => setNewLead(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                      placeholder="Pricing Conventional 30Y..."
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl cursor-pointer"
                  >
                    Commit Lead Log
                  </button>
                </form>
              </div>
            )}

            {/* Realtor referrals leaderboards */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-widest font-mono">Referral Partners ROI</h4>
              
              <div className="space-y-3 text-xs font-semibold">
                {[
                  { name: "Jane Wright (Elite Realty)", score: 4, label: "Top Referring Broker" },
                  { name: "Sundance Home Construction", score: 2, label: "Preferred Integration" },
                  { name: "Austin Metro Real Estate", score: 1, label: "Nurture sequence" }
                ].map((item, index) => (
                  <div key={index} className="border-b border-slate-100 pb-2.5">
                    <div className="flex justify-between items-center text-slate-900 mb-1">
                      <span>{item.name}</span>
                      <span className="font-mono text-indigo-700 font-black">{item.score} submitted</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full" style={{ width: `${item.score * 25}%` }}></div>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB C: Rate sheets & matrices */}
      {activeTab === "rate" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
          
          {/* Slider input sheet creator */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest block font-mono">LLPA pricing comparator</h4>
            <p className="text-slate-400 text-xs">Run comparison matrices using either sliders or choosing any live active pipeline file.</p>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Load Pipeline File:</label>
              <select 
                onChange={(e) => {
                  const client = loans.find(l => l.id === e.target.value);
                  setPricingClient(client || null);
                }}
                className="w-full border border-slate-205 rounded-xl py-1.5 px-3 bg-slate-50 text-xs font-bold focus:outline-none"
              >
                <option value="">-- Or use manual sliders --</option>
                {loans.map(l => (
                  <option key={l.id} value={l.id}>{l.id} - {l.borrower.firstName} {l.borrower.lastName}</option>
                ))}
              </select>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3.5">
              {!pricingClient ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Purchase ($)</label>
                    <input 
                      type="number" 
                      value={customPrice.price}
                      onChange={(e) => setCustomPrice(p => ({ ...p, price: +e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Down Payment ($)</label>
                    <input 
                      type="number" 
                      value={customPrice.down}
                      onChange={(e) => setCustomPrice(p => ({ ...p, down: +e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">FICO Credit Score: <span className="text-blue-600 font-mono font-bold">{customPrice.credit}</span></label>
                    <input 
                      type="range" 
                      min="580" 
                      max="850" 
                      value={customPrice.credit}
                      onChange={(e) => setCustomPrice(p => ({ ...p, credit: +e.target.value }))}
                      className="w-full h-1 bg-slate-100 rounded-lg accent-blue-500 cursor-pointer mt-1"
                    />
                  </div>
                </>
              ) : (
                <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1 bg-slate-50/60 border border-slate-200 font-medium">
                  <span className="font-bold text-slate-950 uppercase text-[10px] tracking-wider block mb-1">Loaded Active Variables:</span>
                  <div>• Buyer Name: <span className="font-bold">{pricingClient.borrower.firstName} {pricingClient.borrower.lastName}</span></div>
                  <div>• Credit Rating: <span className="font-bold font-mono text-indigo-700">{pricingClient.borrower.creditScore}</span></div>
                  <div>• Price: <span className="font-bold font-mono">${pricingClient.purchasePrice.toLocaleString()}</span></div>
                  <div>• LTV: <span className="font-bold font-mono">{pricingClient.ltv}%</span></div>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Rates matrix readout */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-950 mb-3 border-b border-indigo-50 pb-2.5">
                Side-by-Side Product Comparison
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: "conventional", name: "Conventional 30Y Fixed", p: activeScenData.scenarios.conventional },
                  { key: "fha", name: "FHA 30Y Fixed", p: activeScenData.scenarios.fha },
                  { key: "arm", name: "5/1 Hybrid ARM", p: activeScenData.scenarios.arm }
                ].map((item) => (
                  <div key={item.key} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/30">
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800 block uppercase tracking-wider">{item.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">360 Amortization Schedule</p>
                    </div>

                    <div className="space-y-1.5 text-xs font-semibold">
                      <div className="flex justify-between items-center text-slate-700 border-b border-dashed border-slate-150 pb-1">
                        <span>Lender Rate:</span>
                        <span className="font-mono text-sm font-bold text-blue-600">{item.p.rate}%</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700 pb-1">
                        <span>P&I + Escrow:</span>
                        <span className="font-mono text-slate-900">${item.p.payment}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700">
                        <span>Estimated Cash-Close:</span>
                        <span className="font-mono text-slate-900">${item.p.cashToClose}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Base rate static grid showing score impact */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-300">
              <span className="text-[10px] font-mono font-bold text-amber-400 block uppercase tracking-widest mb-2.5">LLPA Base adjustments sheets</span>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px] divide-y divide-slate-800">
                  <thead>
                    <tr className="text-slate-400 font-bold text-[10px]">
                      <th className="pb-2">FICO Limits</th>
                      <th className="pb-2">LTV &gt; 95%</th>
                      <th className="pb-2">LTV 90%-95%</th>
                      <th className="pb-2">LTV 80%-90%</th>
                      <th className="pb-2">LTV &le; 80%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                    {[
                      { range: "740+", l95: "+0.375%", l90: "+0.250%", l80: "+0.125%", l79: "0.000%" },
                      { range: "700-739", l95: "+0.750%", l90: "+0.500%", l80: "+0.250%", l79: "+0.125%" },
                      { range: "660-699", l95: "+1.250%", l90: "+0.750%", l80: "+0.500%", l79: "+0.375%" },
                      { range: "620-659", l95: "+1.750%", l90: "+1.125%", l80: "+0.750%", l79: "+0.625%" }
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2 text-slate-100 font-bold">{row.range}</td>
                        <td className="py-2 text-amber-500">{row.l95}</td>
                        <td className="py-2">{row.l90}</td>
                        <td className="py-2">{row.l80}</td>
                        <td className="py-2 text-green-400">{row.l79}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB D: Operational tasks list */}
      {activeTab === "tasks" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
          
          {/* Dynamic tasks checklists */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                Pipeline Critical Tasks Countdown
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">Tasks generated programmatically at milestone entries.</p>
            </div>

            <div className="space-y-3">
              {tasks.map((tsk) => {
                const daysLeft = tsk.countdownDays ?? 3;
                const isUrgent = daysLeft <= 2;
                return (
                  <div key={tsk.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:border-slate-350 transition-all">
                    <div className="space-y-1 text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded font-mono">
                          FILE ID: {tsk.loanId}
                        </span>
                        <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-mono font-bold">
                          Owner: {tsk.assignedRole}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-950">{tsk.title}</h4>
                      <p className="text-xs text-slate-500 font-medium">{tsk.description}</p>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs font-mono font-bold block ${isUrgent ? 'text-red-600 animate-pulse' : 'text-slate-550'}`}>
                        {daysLeft} days remaining
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block">Due: {tsk.dueDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Call Log Notes */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-slate-800 space-y-4 font-sans h-fit">
            <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-emerald-500 animate-bounce" />
              LO TELEPHONE CALL TRACKER
            </h4>
            <p className="text-xs text-slate-500">Log conversations with borrowers or referral partners to store in the compliance audit registry.</p>

            <form onSubmit={handleLogCall} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-0.5">Link to Active File ID</label>
                <select 
                  value={callLoggerLoanId}
                  onChange={(e) => setCallLoggerLoanId(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-2.5 py-1.5 font-bold focus:outline-none"
                >
                  <option value="">-- No linked file (General CRM notation) --</option>
                  {loans.map(l => (
                    <option key={l.id} value={l.id}>{l.id} - {l.borrower.firstName} {l.borrower.lastName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-0.5">Outbound Call Log Notes</label>
                <textarea 
                  required
                  rows={4}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Spoke with borrower, hazard quotes will be uploaded this evening..."
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 focus:outline-none text-xs font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save Call Registry</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
