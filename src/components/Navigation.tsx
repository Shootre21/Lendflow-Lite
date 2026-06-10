import React from "react";
import { User, ShieldCheck, FileCheck2, Activity, RefreshCw } from "lucide-react";

interface NavigationProps {
  currentRole: "Borrower" | "LO" | "LOA" | "Processor";
  onRoleChange: (role: "Borrower" | "LO" | "LOA" | "Processor") => void;
  onReset: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentRole, onRoleChange, onReset }) => {
  return (
    <header className="bg-white border-b border-slate-200 text-slate-900 py-3 px-4 sm:px-6 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand Block */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/10">
                <div className="w-3.5 h-3.5 bg-white rounded-sm transform rotate-45"></div>
              </div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900">
                LENDFLOW <span className="text-blue-600 uppercase text-xs font-bold tracking-wider ml-1">LOS</span>
              </span>
            </div>
            <div className="hidden sm:block border-l border-slate-200 pl-3">
              <span className="text-[10px] text-emerald-600 flex items-center gap-1.5 font-mono font-bold tracking-wide">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                LIVE BRANCH SYNC
              </span>
            </div>
          </div>

          <button
            onClick={onReset}
            title="Reset system database state"
            className="sm:hidden text-slate-400 hover:text-red-500 p-1 hover:bg-slate-50 rounded-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Account Switcher Bar (Segmented Control style from design HTML) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-500 px-2 flex items-center gap-1 select-none py-1 sm:py-0 font-bold uppercase tracking-wider font-mono">
            <User className="w-3.5 h-3.5 text-slate-400" />
            SIM PORTAL:
          </span>
          <div className="grid grid-cols-4 gap-1 sm:flex sm:items-center sm:gap-1">
            {[
              { id: "Borrower", label: "Borrower", icon: "👤" },
              { id: "LO", label: "Loan Officer", icon: "💼" },
              { id: "LOA", label: "Assistant", icon: "📋" },
              { id: "Processor", label: "Processor", icon: "⚙️" }
            ].map((role) => {
              const active = currentRole === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => onRoleChange(role.id as any)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                    active
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-[11px] sm:text-xs">{role.icon}</span>
                  <span>{role.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Utility Reset Block */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="text-right text-xs">
            <span className="text-slate-400 block text-[9.5px] uppercase font-bold tracking-wider font-mono">System Clock UTC</span>
            <span className="text-slate-700 font-mono font-medium text-[11px]">2026-06-10 17:13 UTC</span>
          </div>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-red-650 hover:text-white text-slate-200 border border-slate-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer font-bold shadow-sm"
            title="Reset system to pre-populated base data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>RESET CORE STATE</span>
          </button>
        </div>
      </div>
    </header>
  );
};
