import React, { useState, useEffect } from "react";
import { db } from "../db";
import { LoanCondition, Loan } from "../types";
import { 
  FolderOpen, FileText, Search, Link, Share2, 
  Trash2, AlertTriangle, HelpCircle, History, Clock, RefreshCw 
} from "lucide-react";

interface DocumentVaultProps {
  onRefreshDB: () => void;
}

export const DocumentVault: React.FC<DocumentVaultProps> = ({ onRefreshDB }) => {
  const [conditions, setConditions] = useState<LoanCondition[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  
  // UI views
  const [folderCat, setFolderCat] = useState<"all" | "Asset" | "Income" | "Property" | "Legal">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Share link generator state
  const [shareDocName, setShareDocName] = useState("");
  const [shareDuration, setShareDuration] = useState("2 Hours");
  const [generatedShareUrl, setGeneratedShareUrl] = useState("");

  useEffect(() => {
    fetchData();
    const handleUpdate = () => fetchData();
    window.addEventListener("lendflow_db_updated", handleUpdate);
    return () => window.removeEventListener("lendflow_db_updated", handleUpdate);
  }, []);

  const fetchData = () => {
    setConditions(db.getConditions().filter(c => !!c.uploadedDocumentName));
    setLoans(db.getLoans());
  };

  // Generate secure time-limited URL callback
  const handleGenerateShareUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareDocName) return;

    const randomHash = Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 6);
    const mockUrl = `https://share.lendflow.com/v/disclose_${randomHash}?expires_in=${shareDuration.replace(" ", "")}`;
    setGeneratedShareUrl(mockUrl);

    db.addAudit(
      undefined,
      "Lynn Harris",
      "Processor",
      "Secure Link Exported",
      `Created temporary time-limited safe link for document '${shareDocName}' valid for ${shareDuration}.`
    );
  };

  const filteredDocs = conditions.filter((c) => {
    const matchCat = folderCat === "all" || c.category === folderCat;
    const matchQuery = c.uploadedDocumentName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       c.loanId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 font-sans">
      
      {/* File Tree Left Navigation Sidebar */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-slate-800 space-y-4">
        <h4 className="text-[10px] font-mono font-bold text-indigo-700 uppercase tracking-widest block">Vault Categories</h4>
        
        <div className="space-y-1 text-xs">
          {[
            { id: "all", label: "All Conforming Files", count: conditions.length },
            { id: "Income", label: "Income Verification (W-2)", count: conditions.filter(c => c.category === "Income").length },
            { id: "Asset", label: "Asset Reserve Statements", count: conditions.filter(c => c.category === "Asset").length },
            { id: "Property", label: "Property appraisal & insurance", count: conditions.filter(c => c.category === "Property").length },
            { id: "Legal", label: "Legal Identification Docs", count: conditions.filter(c => c.category === "Legal").length }
          ].map((fol) => {
            const active = fol.id === folderCat;
            return (
              <button
                key={fol.id}
                onClick={() => {
                  setFolderCat(fol.id as any);
                  setGeneratedShareUrl("");
                }}
                className={`w-full text-left px-3 py-2 rounded-xl transition-all font-semibold flex items-center justify-between cursor-pointer ${
                  active ? "bg-slate-900 text-white font-black" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <FolderOpen className={`w-4 h-4 ${active ? 'text-blue-450' : 'text-slate-400'}`} />
                  <span>{fol.label}</span>
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${active ? "bg-slate-850 text-blue-450" : "bg-slate-100 text-slate-500"}`}>
                  {fol.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main vault documents table view */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Header Toolbar */}
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input 
              type="text"
              placeholder="Search uploaded file names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs w-full focus:outline-none Focus:ring-1 focus:ring-blue-500 bg-slate-50"
            />
          </div>
          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider self-center text-right">
            Encryption: AES-256
          </span>
        </div>

        {/* Documents Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm font-sans">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                <th className="py-2.5 px-4">Document File Name</th>
                <th className="py-2.5 px-4">Origin File Category</th>
                <th className="py-2.5 px-4">Associated Loan ID</th>
                <th className="py-2.5 px-4">Version history</th>
                <th className="py-2.5 px-4 text-right">Action Gate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-400 font-mono">
                    No matching files located inside this compartment tree.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  return (
                    <tr key={doc.id} className="hover:bg-slate-55">
                      <td className="py-3 px-4 font-bold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                        <div>
                          <span className="block text-slate-900 truncate max-w-[150px]">{doc.uploadedDocumentName}</span>
                          <span className="text-[9px] text-slate-400 font-normal font-mono block">Scanned: {doc.uploadedDocumentDate}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 uppercase font-mono text-[10px] text-slate-550">{doc.category}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">{doc.loanId}</td>
                      <td className="py-3 px-4">
                        <span className="bg-indigo-50 border border-indigo-100 font-mono text-[10px] font-bold px-2 py-0.5 rounded text-indigo-700 flex items-center gap-1 w-fit">
                          <History className="w-3 h-3 text-indigo-650" /> v{doc.versionCount || 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setShareDocName(doc.uploadedDocumentName || "");
                            setGeneratedShareUrl("");
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-850 p-1.5 rounded-lg text-xs cursor-pointer transition-all inline-flex items-center gap-1 border border-slate-250 font-bold"
                          title="Generate Secure Share Link"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Export Link</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sharing Panel & 90/120 days expirations alerts */}
      <div className="space-y-6">
        
        {/* Secure Link Generator Box */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-slate-850 space-y-4">
          <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-widest font-mono flex items-center gap-1">
            <Link className="w-4 h-4 text-emerald-505" />
            Temporary Link builder
          </h4>
          <p className="text-slate-400 text-xs">Exports access-limited links to realtors or escrow agents without disclosing system DB logins.</p>

          <form onSubmit={handleGenerateShareUrl} className="space-y-3.5 text-xs font-semibold">
            <div>
              <label className="block text-slate-700 mb-0.5">Selected Target Document:</label>
              <input 
                type="text" 
                required
                readOnly
                placeholder="-- Select document file on left --"
                value={shareDocName}
                className="w-full border border-slate-200 bg-slate-100/60 rounded-xl px-3 py-1.5 font-bold cursor-not-allowed outline-none font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-0.5">Access Window Expiry:</label>
              <select
                value={shareDuration}
                onChange={(e) => setShareDuration(e.target.value)}
                className="w-full border border-slate-205 bg-slate-50 rounded-xl px-2.5 py-1.5 focus:outline-none"
              >
                <option value="2 Hours">2 Hours Only</option>
                <option value="24 Hours">24 Hours Only</option>
                <option value="7 Days">7 Conforming Business Days</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!shareDocName}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-2 rounded-xl transition-all cursor-pointer text-xs"
            >
              Generate Share Key
            </button>
          </form>

          {/* Share Url Readout */}
          {generatedShareUrl && (
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-2 text-[10px] font-mono text-emerald-300 select-all whitespace-pre-wrap leading-relaxed">
              <span className="text-[9px] text-slate-450 block uppercase font-bold">Secure time-limited Link Output:</span>
              <span>{generatedShareUrl}</span>
              <p className="text-[8px] text-blue-450 font-semibold pt-1">
                ⚠️ Secure verification parameters embedded. Token expires exactly {shareDuration} from creation.
              </p>
            </div>
          )}
        </div>

        {/* 90/120 Days Expirations Flags */}
        <div className="bg-blue-50/50 border border-blue-200 p-5 rounded-2xl text-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest font-mono flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-blue-700 animate-bounce" />
            90/120 DAY AGING ALERTS
          </h4>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed font-semibold">Credit bureau scores and salary payment paystubs become legally stale after 90 days. Red alert triggers warn processor personnel.</p>

          <div className="space-y-2 text-[11px] font-bold font-mono">
            <div className="bg-white border border-blue-200 p-2.5 rounded-lg flex justify-between items-center text-blue-900">
              <span>Tri-Merged Credit Report</span>
              <span className="text-red-600 animate-pulse font-black text-right text-[10px]">STALE IN 4 DAYS</span>
            </div>
            <div className="bg-white border border-blue-150 p-2.5 rounded-lg flex justify-between items-center text-slate-700">
              <span>W2 Tax Statements 2024</span>
              <span className="text-blue-600 text-right text-[10px]">108 DAYS VALID</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
