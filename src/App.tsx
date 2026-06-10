import React, { useState } from "react";
import { Navigation } from "./components/Navigation";
import { BorrowerPortal } from "./components/BorrowerPortal";
import { LODashboard } from "./components/LODashboard";
import { LOAWorkflow } from "./components/LOAWorkflow";
import { ComplianceCenter } from "./components/ComplianceCenter";
import { DocumentVault } from "./components/DocumentVault";
import { db } from "./db";
import { 
  Building, ShieldCheck, HardDrive, Cpu, 
  HelpCircle, UserCheck, MessageSquare, ClipboardCheck, LayoutGrid 
} from "lucide-react";

export default function App() {
  const [role, setRole] = useState<"Borrower" | "LO" | "LOA" | "Processor">("LO");
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Staff internal tabs
  const [staffTab, setStaffTab] = useState<"workspace" | "vault" | "compliance">("workspace");

  const handleRefreshDB = () => {
    setRefreshCounter(prev => prev + 1);
  };

  const handleResetSystem = () => {
    if (window.confirm("Restore LendFlow database back to pre-populated baseline simulation data?")) {
      db.resetAll();
      handleRefreshDB();
      alert("Database reset completed successfully. Active timelines cleared.");
    }
  };

  const isStaff = role !== "Borrower";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col antialiased">
      {/* Visual Role Switcher Head Panel */}
      <Navigation 
        currentRole={role} 
        onRoleChange={(newRole) => {
          setRole(newRole);
          // Set to primary workspace when role shifts
          setStaffTab("workspace");
        }} 
        onReset={handleResetSystem}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Borrower Viewboard: Clean focused layout */}
        {!isStaff && (
          <div className="max-w-4xl mx-auto">
            <BorrowerPortal onRefreshDB={handleRefreshDB} />
          </div>
        )}

        {/* Staff Viewboard: Unified corporate workspace */}
        {isStaff && (
          <div className="space-y-6">
            
            {/* Header row details */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-4 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 font-bold px-2 py-0.5 rounded-lg font-mono uppercase">
                    ROLE: {role === "LO" ? "Loan Officer Marcus" : role === "LOA" ? "Lending Assistant Sarah" : "Processor Desk Lynn"}
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-lg border border-slate-200 font-mono">
                    BRANCH_ID: Austin Main #042
                  </span>
                </div>
                <h1 className="text-2xl font-extrabold font-sans tracking-tight text-slate-900 mt-2">
                  {role === "LO" ? "LendFlow Pipeline Dashboard" : role === "LOA" ? "LOA Operations & Conditions Workspace" : "Conforming Processing Deck"}
                </h1>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Conforming lending rules strictly enforced. Standard turn averages currently at 18.5 business days.
                </p>
              </div>

              {/* Staff Sub-Tabs Navigation */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                {[
                  { id: "workspace", label: "My Operational Desk", icon: <LayoutGrid className="w-4 h-4" /> },
                  { id: "vault", label: "Document Vault SECURE", icon: <HardDrive className="w-4 h-4" /> },
                  { id: "compliance", label: "Continuous Audit logs", icon: <ShieldCheck className="w-4 h-4" /> }
                ].map((st) => {
                  const active = staffTab === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => setStaffTab(st.id as any)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        active 
                          ? "bg-white text-blue-600 shadow-sm border border-slate-200/40"
                          : "text-slate-600 hover:text-slate-950 hover:bg-slate-50/50"
                      }`}
                    >
                      {st.icon}
                      <span>{st.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-Tab content routing */}
            <div className="min-h-[450px]">
              {staffTab === "workspace" && (
                <>
                  {role === "LO" && <LODashboard onRefreshDB={handleRefreshDB} />}
                  {role === "LOA" && <LOAWorkflow onRefreshDB={handleRefreshDB} />}
                  {role === "Processor" && <LOAWorkflow onRefreshDB={handleRefreshDB} />}
                </>
              )}

              {staffTab === "vault" && (
                <DocumentVault onRefreshDB={handleRefreshDB} />
              )}

              {staffTab === "compliance" && (
                <ComplianceCenter onRefreshDB={handleRefreshDB} />
              )}
            </div>

          </div>
        )}

      </main>

      {/* Elegant minimalist footer */}
      <footer className="bg-slate-100 border-t border-slate-200 text-slate-500 py-3.5 px-6 shrink-0 font-mono text-[11px] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              LendFlow Platform System Online
            </span>
            <span className="border-l border-slate-300 pl-3">v4.12.0</span>
            <span className="hidden md:inline border-l border-slate-300 pl-3">AES-256 Secure Encryption</span>
          </div>
          <div className="italic text-slate-450 font-sans text-xs">
            "Efficiency is doing things right; effectiveness is doing the right things."
          </div>
        </div>
      </footer>
    </div>
  );
}
