import React, { useState, useEffect } from "react";
import { db, calculatePricingScenarios, genId, formatDateOnly } from "../db";
import { Loan, LoanCondition, LoanStage, ConditionStatus } from "../types";
import { 
  Calculator, UploadCloud, MessageSquare, Send, CheckCircle2, 
  HelpCircle, Sparkles, Languages, ChevronRight, FileText, Check 
} from "lucide-react";

interface BorrowerPortalProps {
  onRefreshDB: () => void;
}

export const BorrowerPortal: React.FC<BorrowerPortalProps> = ({ onRefreshDB }) => {
  const [lang, setLang] = useState<"EN" | "ES">("EN");
  const [activeTab, setActiveTab] = useState<"tracker" | "apply" | "calculator">("tracker");
  
  // Guided wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "Alex",
    lastName: "Johnson",
    email: "alex.johnson@example.com",
    phone: "(555) 019-2834",
    dob: "1988-04-12",
    ssn: "666-23-4928",
    address: "1428 Elm Dr, Austin TX 78701",
    purchasePrice: 420000,
    downPayment: 84000,
    creditScore: 745,
    monthlyIncome: 8500,
    monthlyDebts: 650,
    loanType: "Conventional" as "Conventional" | "FHA" | "VA" | "ARM"
  });

  // Load primary demo loan for Alex
  const [currLoan, setCurrLoan] = useState<Loan | null>(null);
  const [conditions, setConditions] = useState<LoanCondition[]>([]);
  
  // Drag and drop / file simulation states
  const [uploadTask, setUploadTask] = useState<string | null>(null);
  const [fileInputName, setFileInputName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "borrower" | "lo"; text: string; time: string }>>([
    { sender: "lo", text: "Hi Alex! Underwriter reviewed your income. Looks great! We just need your Homeowner's Insurance Quote file to proceed.", time: "10:15 AM" },
    { sender: "borrower", text: "Got it! State Farm is sending me the quote now, in-app shortly.", time: "10:30 AM" },
  ]);

  useEffect(() => {
    fetchActiveLoan();
    // Listen for external updates
    const handleUpdate = () => fetchActiveLoan();
    window.addEventListener("lendflow_db_updated", handleUpdate);
    return () => window.removeEventListener("lendflow_db_updated", handleUpdate);
  }, []);

  const fetchActiveLoan = () => {
    const allLoans = db.getLoans();
    // Find Alex's conventional loan
    const alexLoan = allLoans.find(l => l.borrower.email === "alex.johnson@example.com") || allLoans[0];
    if (alexLoan) {
      setCurrLoan(alexLoan);
      const allConds = db.getConditions();
      setConditions(allConds.filter(c => c.loanId === alexLoan.id));
    }
  };

  // Live Scenario Calculations
  const calcResult = calculatePricingScenarios(
    formData.purchasePrice,
    formData.downPayment,
    formData.creditScore,
    formData.monthlyIncome,
    formData.monthlyDebts
  );

  // Handle guided form edits
  const handleFormChange = (key: string, val: any) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  // Submit guided application to the Pipeline DB
  const handleWizardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = "LF-" + Math.floor(Math.random() * 9000 + 1000);
    const calculated = calculatePricingScenarios(
      formData.purchasePrice,
      formData.downPayment,
      formData.creditScore,
      formData.monthlyIncome,
      formData.monthlyDebts
    );

    const newLoan: Loan = {
      id: newId,
      borrower: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        ssn: "***-**-" + formData.ssn.slice(-4),
        dob: formData.dob,
        address: formData.address,
        monthlyIncome: formData.monthlyIncome,
        monthlyDebts: formData.monthlyDebts,
        creditScore: formData.creditScore
      },
      stage: LoanStage.Application,
      loanType: formData.loanType,
      purchasePrice: formData.purchasePrice,
      downPayment: formData.downPayment,
      loanAmount: calculated.metrics.loanAmount,
      ltv: calculated.metrics.ltv,
      dti: calculated.metrics.dti,
      interestRate: calculated.scenarios[formData.loanType.toLowerCase() as "conventional" | "fha" | "arm"].rate,
      termMonths: 360,
      estimatedCloseDate: formatDateOnly(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      rateLockLocked: false,
      qmEligible: calculated.metrics.dti < 43 && calculated.metrics.ltv <= 97,
      redFlagAlerts: ["OFAC Screen Initiated", "SSN Check Status: Good"]
    };

    // Save
    const allLoans = db.getLoans();
    allLoans.push(newLoan);
    db.saveLoans(allLoans);

    // Dynamic custom tasks and conditions
    const allConds = db.getConditions();
    const condId1 = "C-" + genId().toUpperCase();
    const condId2 = "C-" + genId().toUpperCase();
    
    allConds.push({
      id: condId1,
      loanId: newId,
      title: "Verify W-2 Tax Statements",
      description: "Auto-generated verification of employment history.",
      category: "Income",
      status: ConditionStatus.Outstanding,
      assignedTo: "Borrower",
      dueDate: formatDateOnly(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
      versionCount: 0
    });
    
    allConds.push({
      id: condId2,
      loanId: newId,
      title: "Provide Proof of Reserves (1 Month Bank Statement)",
      description: "Asset reserves checklist verified automatically.",
      category: "Asset",
      status: ConditionStatus.Outstanding,
      assignedTo: "Borrower",
      dueDate: formatDateOnly(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      versionCount: 0
    });
    
    db.saveConditions(allConds);

    // Logging
    db.addAudit(
      newId,
      `${formData.firstName} ${formData.lastName}`,
      "Borrower",
      "Application Submitted",
      `New conversional intake application created for purchase of $${formData.purchasePrice} with $${formData.downPayment} down.`
    );

    alert(`Application submitted successfully! Loan ID: ${newId}. Head back to 'My Active Loan' to track its progress.`);
    setActiveTab("tracker");
    fetchActiveLoan();
    onRefreshDB();
  };

  // Simulate Document Upload with AI auto-categorization
  const handleFileUploadSim = (conditionId: string, customName?: string) => {
    const fileName = customName || fileInputName || "Doc_Upload_Draft.pdf";
    if (!fileName) return;

    // Detect file type / Auto-categorization
    let detectCategory: "Asset" | "Income" | "Property" | "Legal" | "Credit" = "Asset";
    let detectedCleanType = "Asset Verification";
    const lower = fileName.toLowerCase();

    if (lower.includes("w2") || lower.includes("tax") || lower.includes("paystub") || lower.includes("income") || lower.includes("w-2")) {
      detectCategory = "Income";
      detectedCleanType = "W-2 Income Form";
    } else if (lower.includes("bank") || lower.includes("reserve") || lower.includes("statement") || lower.includes("chase") || lower.includes("savings")) {
      detectCategory = "Asset";
      detectedCleanType = "Bank Reserves Statement";
    } else if (lower.includes("insur") || lower.includes("hazard") || lower.includes("farm") || lower.includes("quote") || lower.includes("binder")) {
      detectCategory = "Property";
      detectedCleanType = "Home Hazard Insurance Quote";
    } else if (lower.includes("driver") || lower.includes("passport") || lower.includes("id")) {
      detectCategory = "Legal";
      detectedCleanType = "Regulatory ID Document";
    }

    const allConds = db.getConditions();
    const targetIdx = allConds.findIndex(c => c.id === conditionId);
    if (targetIdx !== -1) {
      allConds[targetIdx].status = ConditionStatus.Submitted;
      allConds[targetIdx].uploadedDocumentName = fileName;
      allConds[targetIdx].uploadedDocumentDate = formatDateOnly(new Date());
      allConds[targetIdx].uploadedDocumentUrl = "/vault/" + fileName;
      allConds[targetIdx].category = detectCategory;
      allConds[targetIdx].versionCount = (allConds[targetIdx].versionCount || 0) + 1;
      db.saveConditions(allConds);

      db.addAudit(
        currLoan?.id,
        "Alex Johnson",
        "Borrower",
        "Document Uploaded",
        `Uploaded '${fileName}' for condition: '${allConds[targetIdx].title}'. System auto-categorized file type as: ${detectedCleanType}.`
      );

      setSuccessMsg(`Uploaded successfully! Auto-categorized as: ${detectedCleanType}`);
      setTimeout(() => setSuccessMsg(""), 4500);
      setFileInputName("");
      setUploadTask(null);
      fetchActiveLoan();
      onRefreshDB();
    }
  };

  // Simulated live message chat
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsgs = [...chatMessages, { sender: "borrower" as const, text: chatInput, time: "Just Now" }];
    setChatMessages(newMsgs);
    const currentMsg = chatInput;
    setChatInput("");

    // Simulate instant response within 2 seconds
    setTimeout(() => {
      let responseText = "Thanks for verifying! Let me sync with the Processing desk right away.";
      if (currentMsg.toLowerCase().includes("rate") || currentMsg.toLowerCase().includes("lock")) {
        responseText = "Your rate is currently locked at 6.375% until July 10th. I'll watch for lower floats!";
      } else if (currentMsg.toLowerCase().includes("insurance") || currentMsg.toLowerCase().includes("state farm")) {
        responseText = "Splendid! I see you uploaded the hazard file. I am reviewing the coverage details right now!";
      }

      setChatMessages(prev => [...prev, {
        sender: "lo",
        text: responseText,
        time: "Just Now"
      }]);

      db.addAudit(
        currLoan?.id || undefined,
        "Marcus Brooks",
        "LO",
        "In-App Message Dispatched",
        `Automated LO responder dispatched chat sync back to client: "${responseText}"`
      );
    }, 1200);
  };

  // Multi-Language translations helper
  const t = (en: string, es: string) => (lang === "EN" ? en : es);

  return (
    <div className="space-y-6">
      {/* Mini App Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200 p-4 rounded-2xl gap-3 shadow-sm">
        <div>
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest flex items-center gap-1.5 font-mono">
            <Sparkles className="w-3.5 h-3.5 fill-blue-600" />
            {t("Borrower Portal Dashboard", "Panel del Portal del Prestatario")}
          </span>
          <h1 className="text-2xl font-bold font-sans tracking-tight text-slate-900 mt-1">
            {t("Welcome Back, Alex", "Bienvenido de nuevo, Alex")}
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-0.5">
            {t("Active Loan File: ", "Expediente de Préstamo Activo: ")}
            <span className="text-slate-800 font-bold">{currLoan?.id || "N/A"}</span>
          </p>
        </div>

        {/* Translation Trigger */}
        <button
          onClick={() => setLang(l => (l === "EN" ? "ES" : "EN"))}
          className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 px-3 py-2 rounded-xl text-slate-700 cursor-pointer font-bold self-start sm:self-center font-mono"
        >
          <Languages className="w-4 h-4 text-slate-400" />
          <span>{lang === "EN" ? "ESPAÑOL" : "ENGLISH"}</span>
        </button>
      </div>

      {/* Primary tabs */}
      <div className="border-b border-slate-200 flex gap-4">
        {[
          { id: "tracker", label: t("My Active Loan Tracker", "Seguimiento de Préstamo"), count: conditions.filter(c => c.status === ConditionStatus.Outstanding).length },
          { id: "apply", label: t("New Conversational Application", "Nueva Solicitud Guiada") },
          { id: "calculator", label: t("Scenario Payment Calculator", "Calculadora de Escenarios") }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === tab.id
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-950"
            }`}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* TAB A: Tracker View */}
      {activeTab === "tracker" && currLoan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Status Lane */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Progress Tracker */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5 mb-4">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                {t("Real-Time Application Status", "Estado de Solicitud en Tiempo Real")}
              </h2>

              {/* Status Graphic Tracker */}
              <div className="relative mt-8 mb-4">
                {/* Connector gray line */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 z-0 rounded-full" />
                
                {/* Active blue fill line to active status */}
                <div 
                  className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-500 rounded-full"
                  style={{
                    width: currLoan.stage === LoanStage.Application ? "16.6%" :
                           currLoan.stage === LoanStage.Processing ? "49.9%" :
                           currLoan.stage === LoanStage.Underwriting ? "66.6%" :
                           currLoan.stage === LoanStage.Approval ? "83.3%" : "100%"
                  }}
                />

                <div className="grid grid-cols-5 relative z-10 text-center font-mono">
                  {[
                    { stg: LoanStage.Application, label: t("Received", "Recibido") },
                    { stg: LoanStage.Processing, label: t("Processing", "Procesamiento") },
                    { stg: LoanStage.Underwriting, label: t("Underwriting", "Underwriting") },
                    { stg: LoanStage.Approval, label: t("Approval", "Aprobación") },
                    { stg: LoanStage.CTC, label: t("Closed", "Cierre") }
                  ].map((item, idx) => {
                    const stages = [LoanStage.Application, LoanStage.Processing, LoanStage.Underwriting, LoanStage.Approval, LoanStage.CTC, LoanStage.Closed];
                    const activeIdx = stages.indexOf(currLoan.stage);
                    const itemIdx = stages.indexOf(item.stg);
                    const isPassed = itemIdx < activeIdx || currLoan.stage === LoanStage.Closed;
                    const isCurrent = currLoan.stage === item.stg;

                    return (
                      <div key={item.stg} className="flex flex-col items-center">
                        <div 
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow ${
                            isPassed ? "bg-green-600 text-white" :
                            isCurrent ? "bg-blue-600 text-white ring-4 ring-blue-100" :
                            "bg-white text-slate-400 border border-slate-200"
                          }`}
                        >
                          {isPassed ? <Check className="w-4 h-4" /> : idx + 1}
                        </div>
                        <span className={`text-[11px] font-bold mt-2 truncate max-w-full ${isCurrent ? 'text-blue-700' : 'text-slate-500'}`}>
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Estimated turn note */}
              <div className="bg-blue-50/50 border border-blue-100/80 rounded-xl px-4 py-3.5 flex items-start gap-3 mt-4 text-xs text-blue-900 font-medium">
                <span className="text-base select-none">💡</span>
                <p>
                  {t(
                    `Your loan is currently under ${currLoan.stage.toUpperCase()} review. Estimated Close Date remains on target for ${currLoan.estimatedCloseDate} (12 business days). No active roadblocks.`,
                    `Su préstamo está actualmente bajo revisión de ${currLoan.stage.toUpperCase()}. La fecha estimada de cierre sigue agendada para el ${currLoan.estimatedCloseDate}.`
                  )}
                </p>
              </div>
            </div>

            {/* Document Collection Panel */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                    <UploadCloud className="w-5 h-5 text-blue-600" />
                    {t("Document & Condition Checklist", "Lista de Documentos Requeridos")}
                  </h2>
                  <p className="text-slate-500 text-xs mt-0.5 font-mono">
                    {t("Clear outstanding items to expedite scheduling final escrow.", "Resuelva las condiciones pendientes para acelerar el cierre.")}
                  </p>
                </div>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full font-mono">
                  {conditions.filter(c => c.status === ConditionStatus.Cleared).length} / {conditions.length} Cleared
                </span>
              </div>

              {/* Upload Success Alert */}
              {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-xl text-xs font-medium font-mono mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Condition checklist loop */}
              <div className="space-y-4">
                {conditions.map((cond) => {
                  return (
                    <div 
                      key={cond.id}
                      className="border border-slate-100 rounded-xl p-4 hover:border-slate-300 transition-all bg-slate-50/30 font-sans"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1 max-w-lg">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                              {cond.category.toUpperCase()}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                              cond.status === ConditionStatus.Cleared ? "bg-green-100 text-green-800" :
                              cond.status === ConditionStatus.Submitted ? "bg-amber-100 text-amber-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {cond.status}
                            </span>
                            {cond.uploadedDocumentName && (
                              <span className="text-[10px] text-slate-500 font-mono italic max-w-[120px] truncate">
                                📁 {cond.uploadedDocumentName}
                              </span>
                            )}
                          </div>
                          
                          <h3 className="text-sm font-bold text-slate-900">{cond.title}</h3>
                          <p className="text-xs text-slate-500 font-medium">{cond.description}</p>
                          <p className="text-[10px] font-mono text-slate-400">Due: {cond.dueDate}</p>
                        </div>

                        {/* Interactive upload trigger */}
                        <div className="self-end sm:self-start">
                          {cond.status === ConditionStatus.Cleared ? (
                            <span className="text-green-600 font-mono text-xs font-bold flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                              <Check className="w-3.5 h-3.5" /> CLEARED
                            </span>
                          ) : uploadTask === cond.id ? (
                            <div className="flex flex-col gap-2 min-w-[200px] bg-white border border-slate-200 p-2.5 rounded-xl shadow-lg">
                              <label className="text-[10px] font-bold font-mono text-slate-500">SIMULATE FILE SELECTION:</label>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button 
                                  onClick={() => handleFileUploadSim(cond.id, "Binder_Quote_Completed.pdf")}
                                  className="text-[10px] font-mono bg-blue-50 border border-blue-200 hover:bg-blue-100 py-1 rounded font-bold cursor-pointer transition-all"
                                >
                                  Insurance_Quote.pdf
                                </button>
                                <button 
                                  onClick={() => handleFileUploadSim(cond.id, "W2_Tax_Summary_2025.pdf")}
                                  className="text-[10px] font-mono bg-blue-50 border border-blue-200 hover:bg-blue-100 py-1 rounded font-bold cursor-pointer transition-all"
                                >
                                  W2_Tax_2025.pdf
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 border-t border-slate-100 pt-1.5">
                                <input 
                                  type="text"
                                  placeholder="Or write file name..."
                                  value={fileInputName}
                                  onChange={(e) => setFileInputName(e.target.value)}
                                  className="text-[10px] font-mono border border-slate-200 rounded px-1.5 py-1 w-full bg-slate-50"
                                />
                                <button
                                  onClick={() => handleFileUploadSim(cond.id)}
                                  className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded hover:bg-blue-500 cursor-pointer"
                                >
                                  Go
                                </button>
                              </div>
                              <button 
                                onClick={() => setUploadTask(null)}
                                className="text-[9px] font-mono text-red-500 hover:underline text-right mt-1"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setUploadTask(cond.id);
                                setFileInputName("");
                              }}
                              className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>{cond.status === ConditionStatus.Submitted ? "RE-UPLOAD" : "UPLOAD"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* LO Contact Card & Quick Help Tooltips */}
          <div className="space-y-6">
            {/* LO Representative Message center */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 bg-blue-105 rounded-full flex items-center justify-center text-base font-bold text-blue-700">
                  MB
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Marcus Brooks</h3>
                  <span className="text-[10px] text-blue-600 font-bold tracking-wider font-mono">YOUR ASSIGNED LO</span>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="h-56 overflow-y-auto my-3 space-y-2.5 pr-1 text-xs">
                {chatMessages.map((msg, i) => {
                  const isLO = msg.sender === "lo";
                  return (
                    <div key={i} className={`flex flex-col ${isLO ? "items-start" : "items-end"}`}>
                      <div className={`p-2.5 rounded-2xl max-w-[85%] font-sans font-medium line-clamp-5 ${
                        isLO ? "bg-slate-100 text-slate-800 rounded-tl-sm" : "bg-blue-600 text-white rounded-tr-sm"
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5 px-1">{msg.time}</span>
                    </div>
                  );
                })}
              </div>

              {/* Send Form */}
              <form onSubmit={handleSendChat} className="flex gap-1.5 border-t border-slate-100 pt-3">
                <input 
                  type="text"
                  placeholder={t("Type message...", "Escriba un mensaje...")}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 font-medium"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg cursor-pointer flex items-center justify-center"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Plain-Language Explanations */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-300">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5 mb-3 font-mono">
                <HelpCircle className="w-4 h-4 text-blue-500" />
                {t("Plain-Language Explainer", "Glosario Resumido")}
              </h3>
              
              <div className="space-y-3.5 text-xs">
                <div>
                  <h4 className="font-bold text-slate-100">📌 {t("What is DTI (Debt-to-Income)?", "¿Qué es el DTI (Deuda a Ingreso)?")}</h4>
                  <p className="text-slate-400 mt-1">
                    {t(
                      "It's the percentage of your pre-tax monthly income that goes toward paying monthly debts (car, student loans, cards + estimated mortgage). Underwriters prefer this under 43% for a standard Qualified Mortgage.",
                      "Es la proporción de sus ingresos mensuales brutos que se destina al pago de deudas. Los analistas lo prefieren por debajo del 43%."
                    )}
                  </p>
                </div>

                <div className="border-t border-slate-800 pt-3">
                  <h4 className="font-bold text-slate-100">📌 {t("What is LTV (Loan-to-Value)?", "¿Qué es el LTV (Préstamo a Valor)?")}</h4>
                  <p className="text-slate-400 mt-1">
                    {t(
                      "Refers to the ratio of your home loan amount relative to the purchase price. Keeping LTV at 80% or below removes the requirement for private mortgage insurance (PMI).",
                      "El porcentaje de la vivienda que está financiando con deuda. Un LTV de 80% o menor evita pagar seguro privado de hipoteca (PMI)."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB B: Guided Conversational Application Wizard */}
      {activeTab === "apply" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden font-sans max-w-3xl mx-auto">
          {/* Progress bar */}
          <div className="bg-slate-900 p-4 text-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-400 text-xs font-bold">STEP {wizardStep} OF 4</span>
              <span className="text-slate-400 text-xs hidden sm:inline">|</span>
              <span className="text-xs font-semibold">
                {wizardStep === 1 ? t("Borrower Personal Identity", "Identidad Personal del Prestatario") :
                 wizardStep === 2 ? t("Property & Value Details", "Detalles de la Propiedad") :
                 wizardStep === 3 ? t("Asset & Income Assessment", "Evaluación de Ingresos") :
                 t("Scenario Review & Consent", "Revisión e Inicio")}
              </span>
            </div>
            <div className="text-right text-[11px] text-slate-400 font-mono">
              <span>{wizardStep * 25}% {t("Done (Est. 3 mins remaining)", "Completado (3 min restantes)")}</span>
            </div>
          </div>

          <div className="w-full bg-slate-800 h-1">
            <div 
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${wizardStep * 25}%` }}
            />
          </div>

          <form onSubmit={handleWizardSubmit} className="p-6 sm:p-8 space-y-6">
            
            {/* Step 1: Identity */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="text-slate-900 mb-2">
                  <h3 className="text-lg font-bold">{t("Provide core identifier details", "Proporcione sus detalles identificatorios")}</h3>
                  <p className="text-xs text-slate-500 font-medium">{t("All information is encrypted in transit using TLS 1.3.", "Toda la información es encriptada con niveles de seguridad bancarios.")}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">First Name</label>
                    <input 
                      type="text" 
                      required
                      value={formData.firstName}
                      onChange={(e) => handleFormChange("firstName", e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-blue-500 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                    <input 
                      type="text" 
                      required
                      value={formData.lastName}
                      onChange={(e) => handleFormChange("lastName", e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-blue-500 bg-slate-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Primary Email</label>
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => handleFormChange("email", e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-blue-500 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                    <input 
                      type="text" 
                      required
                      value={formData.phone}
                      onChange={(e) => handleFormChange("phone", e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-blue-500 bg-slate-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                    <input 
                      type="date" 
                      required
                      value={formData.dob}
                      onChange={(e) => handleFormChange("dob", e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-blue-500 bg-slate-50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Social Security Number (Encrypted)</label>
                    <input 
                      type="text" 
                      placeholder="XXX-XX-XXXX"
                      required
                      value={formData.ssn}
                      onChange={(e) => handleFormChange("ssn", e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-blue-500 bg-slate-50 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Property details */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div className="text-slate-900 mb-2">
                  <h3 className="text-lg font-bold">{t("Tell us about your target property", "Cuéntenos sobre la propiedad del préstamo")}</h3>
                  <p className="text-xs text-slate-500 font-medium">{t("Accurate numbers ensure the LTV ratio conforms closely to standard pricing.", "Números precisos garantizan que la tasa de financiación sea la adecuada.")}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Home Street Address</label>
                  <input 
                    type="text" 
                    required
                    value={formData.address}
                    onChange={(e) => handleFormChange("address", e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-blue-500 bg-slate-50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Price ($)</label>
                    <input 
                      type="number" 
                      required
                      value={formData.purchasePrice}
                      onChange={(e) => handleFormChange("purchasePrice", +e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-blue-500 bg-slate-50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Down Payment ($)</label>
                    <input 
                      type="number" 
                      required
                      value={formData.downPayment}
                      onChange={(e) => handleFormChange("downPayment", +e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-blue-500 bg-slate-50 font-mono"
                    />
                  </div>
                </div>

                {/* Plain-Language Tooltip Callout */}
                <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-slate-800 block flex items-center gap-1">
                    <HelpCircle className="w-4 h-4 text-slate-500" />
                    {t("Calculated Loan to Value: ", "Préstamo a Valor Estimado: ")}
                    <span className="text-blue-600 font-mono">{calcResult.metrics.ltv}%</span>
                  </span>
                  <p className="text-slate-500 font-medium">
                    {t("Your down payment represents ", "Su enganche representa el ")}
                    <span className="font-bold text-slate-700">{(formData.purchasePrice > 0 ? (formData.downPayment / formData.purchasePrice) * 100 : 0).toFixed(1)}%</span>
                    {t(" of the total price. Minimal standard for conventional is 3.0%-5.0%.", " del precio de compra. El estándar convencional es 3-5%.")}
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Income Assessment */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="text-slate-900 mb-2">
                  <h3 className="text-lg font-bold">{t("Verify income stability and credit eligibility", "Verifique su solvencia e ingresos")}</h3>
                  <p className="text-xs text-slate-500 font-medium">{t("Estimates of your monthly income and revolving liability payments.", "Estimados de ingresos y pagos mensuales fijos.")}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gross Monthly Income ($)</label>
                    <input 
                      type="number" 
                      value={formData.monthlyIncome}
                      onChange={(e) => handleFormChange("monthlyIncome", +e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-blue-500 bg-slate-50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Existing Monthly Debts ($)</label>
                    <span className="text-[10px] text-slate-400 block -mt-1 mb-1">(Credit card minimums, auto loans, studs)</span>
                    <input 
                      type="number" 
                      value={formData.monthlyDebts}
                      onChange={(e) => handleFormChange("monthlyDebts", +e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-blue-500 bg-slate-50 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Self-Reported Credit Score</label>
                  <input 
                    type="range" 
                    min="580" 
                    max="850" 
                    value={formData.creditScore}
                    onChange={(e) => handleFormChange("creditScore", +e.target.value)}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between items-center text-xs font-mono font-bold text-slate-600 mt-1">
                    <span>580 (Poor)</span>
                    <span className="text-blue-600 text-sm bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{formData.creditScore}</span>
                    <span>850 (Exceptional)</span>
                  </div>
                </div>

                {/* Inline Explainer */}
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-xs space-y-1.5 font-medium text-slate-600">
                  <div className="flex justify-between">
                    <span>🏠 Estimated P&I Payment:</span>
                    <span className="font-mono text-slate-900 font-bold">${calcResult.metrics.housingExpense.toFixed(2)} / mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span>📊 Estimated Debt-to-Income (DTI):</span>
                    <span className={`font-mono font-bold ${calcResult.metrics.dti > 43 ? 'text-red-600' : 'text-green-600'}`}>
                      {calcResult.metrics.dti}%
                    </span>
                  </div>
                  {calcResult.metrics.dti > 43 && (
                    <p className="text-[10px] text-blue-600 italic font-mono pt-1">
                      ⚠️ Note: Your DTI exceeds 43%. This might flag additional manual review and higher interest sheets.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Scenario Selection */}
            {wizardStep === 4 && (
              <div className="space-y-4 font-sans">
                <div className="text-slate-900 mb-2">
                  <h3 className="text-lg font-bold">{t("Select intake mortgage program", "Seleccione el producto de captación")}</h3>
                  <p className="text-xs text-slate-500 font-medium">{t("Review comparison options prepared automatically for your review.", "Revise las opciones preparadas según su perfil crediticio.")}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { key: "Conventional", label: "Conventional Fixed", data: calcResult.scenarios.conventional },
                    { key: "FHA", label: "FHA 30-Year Fixed", data: calcResult.scenarios.fha },
                    { key: "ARM", label: "5/1 Hybrid ARM", data: calcResult.scenarios.arm }
                  ].map((p) => {
                    const isSelected = formData.loanType === p.key;
                    return (
                      <button
                        type="button"
                        key={p.key}
                        onClick={() => handleFormChange("loanType", p.key)}
                        className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-950 shadow-lg scale-[1.02]"
                            : "bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-[10px] font-mono font-bold block opacity-70">30-YEAR LOAN</span>
                        <h4 className="font-bold text-sm truncate mt-0.5">{p.label}</h4>
                        
                        <div className="my-3 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Rate:</span>
                            <span className="font-mono font-bold text-blue-600">{p.data.rate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Payment:</span>
                            <span className="font-mono font-bold">${p.data.payment}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cash-to-Close:</span>
                            <span className="font-mono text-[11px]">${p.data.cashToClose}</span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold block text-center rounded py-1 ${
                          isSelected ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                        }`}>
                          {isSelected ? "✓ SELECTED PRODUCT" : "SELECT OPTION"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <input type="checkbox" required id="consent-check" className="mt-1 accent-blue-600 cursor-pointer" />
                    <label htmlFor="consent-check" className="text-xs text-slate-600 font-medium">
                      {t(
                        "I consent and authorize LendFlow to run a promotional soft credit pull for eligibility evaluation. I certify that all income statements provided are accurate to the best of my knowledge.",
                        "Doy mi consentimiento para que LendFlow ejecute una consulta de crédito blanda para evaluar mi elegibilidad."
                      )}
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-6">
              {wizardStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep(s => s - 1)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer font-sans"
                >
                  {t("Back", "Atrás")}
                </button>
              ) : (
                <div></div>
              )}

              {wizardStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep(s => s + 1)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2 rounded-md transition-all cursor-pointer font-sans inline-flex items-center gap-1.5 shadow"
                >
                  <span>{t("Continue Step", "Continuar")}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-500 text-white font-bold text-xs px-5 py-2 rounded-md transition-all cursor-pointer font-sans shadow"
                >
                  {t("Submit Application Now", "Enviar Solicitud de Préstamo")}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* TAB C: Scenario Payment Calculator */}
      {activeTab === "calculator" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          
          {/* Controls */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-slate-800 space-y-4">
            <h3 className="text-sm font-bold block text-slate-900 border-b border-slate-100 pb-2">
              🎛️ {t("Pricing Scenario Modifiers", "Modificadores de Escenario")}
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Price ($)</label>
              <input 
                type="number"
                step="5000"
                value={formData.purchasePrice}
                onChange={(e) => handleFormChange("purchasePrice", +e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-1 focus:ring-blue-500 bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Down Payment ($)</label>
              <input 
                type="number"
                step="2000"
                value={formData.downPayment}
                onChange={(e) => handleFormChange("downPayment", +e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-1 focus:ring-blue-500 bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                FICO Credit Score: <span className="text-blue-600 font-mono text-xs">{formData.creditScore}</span>
              </label>
              <input 
                type="range" 
                min="580" 
                max="850" 
                value={formData.creditScore}
                onChange={(e) => handleFormChange("creditScore", +e.target.value)}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-1"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs text-slate-600 space-y-1 font-medium">
              <div className="flex justify-between">
                <span>Calculated Loan Amount:</span>
                <span className="font-mono text-slate-900 font-bold">${calcResult.metrics.loanAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Calculated LTV Ratio:</span>
                <span className="font-mono text-slate-900 font-bold">{calcResult.metrics.ltv}%</span>
              </div>
            </div>
          </div>

          {/* Scenarios Grid */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: "conventional", title: "Conventional 30Y Fixed", badge: "Primary Choice", data: calcResult.scenarios.conventional, note: t("No upfront MI if LTV is below 80%. Optimized for prime credit ratings.", "Sin MI inicial si el LTV es inferior al 80%.") },
              { key: "fha", title: "FHA 30-Year Fixed", badge: "Low Down Option", data: calcResult.scenarios.fha, note: t("Includes upfront and monthly MIP premiums. Flexible credit criteria.", "Incluye primas de seguro de hipoteca MIP mensuales.") },
              { key: "arm", title: "5/1 Hybrid ARM", badge: "Under-market Rate", data: calcResult.scenarios.arm, note: t("Lower initial rate floats. Interest adjustments commence at year 5 annually.", "La tasa inicial flota. Comienza el reajuste en el año 5.") }
            ].map((scen) => {
              return (
                <div key={scen.key} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-mono font-bold bg-blue-105 text-blue-800 px-2 py-0.5 rounded">
                        {scen.badge}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">{scen.title}</h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">{scen.note}</p>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-3 text-xs font-medium">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Interest Rate:</span>
                      <span className="font-mono text-slate-900 text-sm font-bold text-blue-600">{scen.data.rate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Estimated Pmt:</span>
                      <span className="font-mono text-slate-900 font-bold">${scen.data.payment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Est. Cash to Close:</span>
                      <span className="font-mono text-slate-900 font-bold">${scen.data.cashToClose}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Origination Fees:</span>
                      <span className="font-mono">${scen.data.fee}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
