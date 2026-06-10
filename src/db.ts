import { Loan, LoanCondition, LoanTask, LoanLead, AuditLog, LoanStage, ConditionStatus } from "./types";

// Helper to generate IDs
const genId = () => Math.random().toString(36).substring(2, 11);

// Helper to get formatted date
export const formatDateOnly = (d: Date) => d.toISOString().split("T")[0];
export const formatDateTime = (d: Date) => {
  return d.toISOString().replace("T", " ").substring(0, 19) + " UTC";
};

// Pricing LLPA Calculator Mock
export function calculatePricingScenarios(
  purchasePrice: number,
  downPayment: number,
  creditScore: number,
  monthlyIncome: number,
  monthlyDebts: number
) {
  const loanAmount = purchasePrice - downPayment;
  const ltv = (loanAmount / purchasePrice) * 100;
  
  // Calculate DTI
  const principalAndInterestFactor = 0.00537; // rough equivalent to 5% rate standard
  const estimatedPAndI = loanAmount * principalAndInterestFactor;
  const estimatedTaxesAndInsurance = (purchasePrice * 0.012) / 12 + 150; // 1.2% tax / year + $150 premium
  const housingExpense = estimatedPAndI + estimatedTaxesAndInsurance;
  const totalDebts = monthlyDebts + housingExpense;
  const dti = monthlyIncome > 0 ? (totalDebts / monthlyIncome) * 100 : 0;

  // Base interest rates
  let baseConv = 6.625;
  let baseFha = 6.125;
  let baseArm = 5.875;

  // Credit Score LLPA adjustments (pricing adjustments translates to rate ticks in our pricing)
  let rateAdj = 0.0;
  if (creditScore < 620) rateAdj = 1.25;
  else if (creditScore < 660) rateAdj = 0.75;
  else if (creditScore < 700) rateAdj = 0.375;
  else if (creditScore < 740) rateAdj = 0.125;
  else rateAdj = -0.125;

  // LTV adjustments
  let ltvAdj = 0.0;
  if (ltv > 95) ltvAdj = 0.5;
  else if (ltv > 90) ltvAdj = 0.25;
  else if (ltv > 80) ltvAdj = 0.125;

  const convRate = +(baseConv + rateAdj + ltvAdj).toFixed(3);
  const fhaRate = +(baseFha + rateAdj * 0.5 + 0.125).toFixed(3); // FHA is less credit-sensitive
  const armRate = +(baseArm + rateAdj + ltvAdj + 0.25).toFixed(3);

  // Payments using actual amortization math: PMT = r * PV / (1 - (1 + r)^-n)
  const calculatePmt = (rate: number, pAmount: number) => {
    const monthlyRate = rate / 100 / 12;
    const numPayments = 360; // 30-year fixed
    if (monthlyRate === 0) return pAmount / numPayments;
    return (monthlyRate * pAmount) / (1 - Math.pow(1 + monthlyRate, -numPayments));
  };

  const pmtConv = +(calculatePmt(convRate, loanAmount) + estimatedTaxesAndInsurance).toFixed(2);
  const pmtFha = +(calculatePmt(fhaRate, loanAmount) + estimatedTaxesAndInsurance + (loanAmount * 0.0085) / 12).toFixed(2); // with MIP
  const pmtArm = +(calculatePmt(armRate, loanAmount) + estimatedTaxesAndInsurance).toFixed(2);

  // Cash to Close (Estimated: Down Payment + 3% Closing Fees)
  const basicFees = loanAmount * 0.02 + 1850;
  const cashConv = +(downPayment + basicFees).toFixed(2);
  const cashFha = +(downPayment + basicFees + loanAmount * 0.0175).toFixed(2); // upfront MIP rolled or included
  const cashArm = +(downPayment + basicFees - 500).toFixed(2); // ARM credit sometimes offered

  return {
    metrics: { ltv: +ltv.toFixed(2), dti: +dti.toFixed(2), loanAmount, housingExpense },
    scenarios: {
      conventional: { rate: convRate, payment: pmtConv, cashToClose: cashConv, fee: +(basicFees).toFixed(2) },
      fha: { rate: fhaRate, payment: pmtFha, cashToClose: cashFha, fee: +(basicFees + loanAmount * 0.0175).toFixed(2) },
      arm: { rate: armRate, payment: pmtArm, cashToClose: cashArm, fee: +(basicFees - 500).toFixed(2) }
    }
  };
}

// Initial Sample Data
const INITIAL_LOANS: Loan[] = [
  {
    id: "LF-7294",
    borrower: {
      firstName: "Alex",
      lastName: "Johnson",
      email: "alex.johnson@example.com",
      phone: "(555) 019-2834",
      ssn: "***-**-4928",
      dob: "1988-04-12",
      address: "1428 Elm Dr, Austin TX 78701",
      monthlyIncome: 8500,
      monthlyDebts: 650,
      creditScore: 745
    },
    stage: LoanStage.Processing,
    loanType: "Conventional",
    purchasePrice: 420000,
    downPayment: 84000,
    loanAmount: 336000,
    ltv: 80,
    dti: 28.5,
    interestRate: 6.375,
    termMonths: 360,
    estimatedCloseDate: formatDateOnly(new Date(Date.now() + 22 * 24 * 60 * 60 * 1000)),
    rateLockDate: formatDateOnly(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
    rateLockExpires: formatDateOnly(new Date(Date.now() + 27 * 24 * 60 * 60 * 1000)),
    rateLockLocked: true,
    tridDisclosedDate: formatDateOnly(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)),
    tridDisclosuresAcked: true,
    qmEligible: true,
    redFlagAlerts: [],
    ausRunStatus: "DU Approved",
    ausRunDate: formatDateOnly(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))
  },
  {
    id: "LF-3082",
    borrower: {
      firstName: "Maria",
      lastName: "Gomez",
      email: "maria.gomez@example.com",
      phone: "(555) 482-1920",
      ssn: "***-**-8219",
      dob: "1991-09-24",
      address: "892 Pine Ave, San Antonio TX 78209",
      monthlyIncome: 5500,
      monthlyDebts: 920,
      creditScore: 655
    },
    stage: LoanStage.Underwriting,
    loanType: "FHA",
    purchasePrice: 280000,
    downPayment: 14000,
    loanAmount: 266000,
    ltv: 95.0,
    dti: 41.2,
    interestRate: 6.875,
    termMonths: 360,
    estimatedCloseDate: formatDateOnly(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)),
    rateLockDate: formatDateOnly(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
    rateLockExpires: formatDateOnly(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
    rateLockLocked: true,
    tridDisclosedDate: formatDateOnly(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)),
    tridDisclosuresAcked: true,
    qmEligible: true,
    redFlagAlerts: ["OFAC Screening Cleared", "SSN Validated Successfully"],
    ausRunStatus: "Not Run",
    ausRunDate: undefined
  },
  {
    id: "LF-8841",
    borrower: {
      firstName: "Derrick",
      lastName: "Vance",
      email: "d.vance@example.com",
      phone: "(555) 762-9901",
      ssn: "***-**-1033",
      dob: "1982-11-02",
      address: "712 Highland Ct, Dallas TX 75201",
      monthlyIncome: 12500,
      monthlyDebts: 2200,
      creditScore: 785
    },
    stage: LoanStage.Approval,
    loanType: "Conventional",
    purchasePrice: 650000,
    downPayment: 130000,
    loanAmount: 520000,
    ltv: 80.0,
    dti: 35.8,
    interestRate: 6.25,
    termMonths: 360,
    estimatedCloseDate: formatDateOnly(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
    rateLockDate: formatDateOnly(new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)),
    rateLockExpires: formatDateOnly(new Date(Date.now() + 18 * 24 * 60 * 60 * 1000)),
    rateLockLocked: true,
    tridDisclosedDate: formatDateOnly(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)),
    tridDisclosuresAcked: true,
    qmEligible: true,
    redFlagAlerts: [],
    ausRunStatus: "LPA Approved",
    ausRunDate: formatDateOnly(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
  }
];

const INITIAL_CONDITIONS: LoanCondition[] = [
  {
    id: "C-1",
    loanId: "LF-7294",
    title: "Most Recent 2 Years W-2 Statements",
    description: "Provide complete, signed, and dated W-2 tax forms for 2024 and 2025 to verify consistent income history.",
    category: "Income",
    status: ConditionStatus.Cleared,
    assignedTo: "Borrower",
    dueDate: formatDateOnly(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
    uploadedDocumentName: "W2-Tax-Forms-Combined.pdf",
    uploadedDocumentUrl: "#",
    uploadedDocumentDate: "2026-06-08",
    versionCount: 1
  },
  {
    id: "C-2",
    loanId: "LF-7294",
    title: "30 Days Homeowner's Insurance Quote",
    description: "A quote or binder representing comprehensive home hazard insurance coverage naming LendFlow as loss payee.",
    category: "Property",
    status: ConditionStatus.Submitted,
    assignedTo: "Borrower",
    dueDate: formatDateOnly(new Date(Date.now() + 8 * 24 * 60 * 60 * 1000)),
    uploadedDocumentName: "Hazard_Quote_StateFarm_Draft.pdf",
    uploadedDocumentUrl: "#",
    uploadedDocumentDate: "2026-06-09",
    versionCount: 1
  },
  {
    id: "C-3",
    loanId: "LF-3082",
    title: "30-Day Consecutive Bank Statements",
    description: "Submit all pages of Chase Bank statements showing adequate cash reserves for closing.",
    category: "Asset",
    status: ConditionStatus.Outstanding,
    assignedTo: "Borrower",
    dueDate: formatDateOnly(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)),
    versionCount: 0
  },
  {
    id: "C-4",
    loanId: "LF-3082",
    title: "Verification of Employment (VOE)",
    description: "Verify active employment at San Antonio Medical Group. Need official VOE from HR.",
    category: "Income",
    status: ConditionStatus.Submitted,
    assignedTo: "Processor",
    dueDate: formatDateOnly(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)),
    uploadedDocumentName: "SAMedical_Truework_Verification.pdf",
    uploadedDocumentUrl: "#",
    uploadedDocumentDate: "2026-06-09",
    versionCount: 1
  }
];

const INITIAL_TASKS: LoanTask[] = [
  {
    id: "T-1",
    loanId: "LF-7294",
    title: "Review State Farm Insurance Binder",
    description: "Ensure policy coverage limit matches the loan amount of $336,000.",
    dueDate: formatDateOnly(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)),
    completed: false,
    assignedRole: "LOA",
    countdownDays: 1
  },
  {
    id: "T-2",
    loanId: "LF-7294",
    title: "Draft Final TRID Closing Disclosure (CD)",
    description: "Required 3 days prior to closing date to start consumer cooling period.",
    dueDate: formatDateOnly(new Date(Date.now() + 18 * 24 * 60 * 60 * 1000)),
    completed: false,
    assignedRole: "Processor",
    countdownDays: 18
  },
  {
    id: "T-3",
    loanId: "LF-3082",
    title: "Order Independent Appraisal",
    description: "Appraisal to verify purchase price of $280,000 reflects market value.",
    dueDate: formatDateOnly(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)),
    completed: false,
    assignedRole: "Processor",
    countdownDays: 2
  }
];

const INITIAL_LEADS: LoanLead[] = [
  {
    id: "LD-902",
    borrowerName: "Emily Parker",
    email: "emily.parker@outlook.com",
    phone: "(555) 233-8891",
    loanType: "Conventional",
    estimatedAmount: 385000,
    leadSource: "Realtor Referral",
    referralPartner: "Jane Wright (Elite Realty)",
    status: "New",
    notes: "FICO around 760, looking at a 15% down payment. Wants to compare rates.",
    createdDate: "2026-06-08",
    followUpSequences: ["Day 1 Quick Call", "Rate Sheet Email Program"]
  },
  {
    id: "LD-511",
    borrowerName: "David Kim",
    email: "david.kim@gmail.com",
    phone: "(555) 902-8877",
    loanType: "FHA",
    estimatedAmount: 215000,
    leadSource: "Online Inbound",
    referralPartner: "",
    status: "Contacted",
    notes: "First time buyer, interested in FHA 3.5% down option. Understood credit score is ~640.",
    createdDate: "2026-06-09",
    followUpSequences: ["Welcome SMS Sequence", "FHA Resource Guide Sheet"]
  }
];

const INITIAL_AUDITS: AuditLog[] = [
  {
    id: "A-101",
    loanId: "LF-7294",
    timestamp: "2026-06-06 14:22:15 UTC",
    operatorName: "Marcus Brooks",
    operatorRole: "LO",
    action: "Rate Lock Confirmed",
    details: "Locked Conventional 30Y Fixed rate of 6.375% for 30 days.",
    ipAddress: "192.168.1.105"
  },
  {
    id: "A-102",
    loanId: "LF-7294",
    timestamp: "2026-06-07 09:15:30 UTC",
    operatorName: "Sarah Connor",
    operatorRole: "LOA",
    action: "Condition Cleared",
    details: "Reviewed and cleared 'Most Recent 2 Years W-2 Statements'. Verified borrower earnings match application.",
    ipAddress: "192.168.1.112"
  },
  {
    id: "A-103",
    loanId: "LF-3082",
    timestamp: "2026-06-08 17:45:00 UTC",
    operatorName: "Maria Gomez",
    operatorRole: "Borrower",
    action: "Application Submitted",
    details: "Initial guided application submitted from Borrower Portal. Generated TRID 3-day clock alert.",
    ipAddress: "172.56.21.3"
  }
];

// Database CRUD class wrapper
class Database {
  private get<T>(key: string, defaults: T): T {
    const data = localStorage.getItem(`lendflow_${key}`);
    return data ? JSON.parse(data) : defaults;
  }

  private set(key: string, data: any) {
    localStorage.setItem(`lendflow_${key}`, JSON.stringify(data));
    // Dispatch event to notify state listeners
    window.dispatchEvent(new Event("lendflow_db_updated"));
  }

  getLoans(): Loan[] {
    return this.get<Loan[]>("loans", INITIAL_LOANS);
  }

  saveLoans(loans: Loan[]) {
    this.set("loans", loans);
  }

  getConditions(): LoanCondition[] {
    return this.get<LoanCondition[]>("conditions", INITIAL_CONDITIONS);
  }

  saveConditions(conditions: LoanCondition[]) {
    this.set("conditions", conditions);
  }

  getTasks(): LoanTask[] {
    return this.get<LoanTask[]>("tasks", INITIAL_TASKS);
  }

  saveTasks(tasks: LoanTask[]) {
    this.set("tasks", tasks);
  }

  getLeads(): LoanLead[] {
    return this.get<LoanLead[]>("leads", INITIAL_LEADS);
  }

  saveLeads(leads: LoanLead[]) {
    this.set("leads", leads);
  }

  getAudits(): AuditLog[] {
    return this.get<AuditLog[]>("audits", INITIAL_AUDITS);
  }

  saveAudits(audits: AuditLog[]) {
    this.set("audits", audits);
  }

  addAudit(loanId: string | undefined, operatorName: string, operatorRole: any, action: string, details: string) {
    const audits = this.getAudits();
    const nextLog: AuditLog = {
      id: "A-" + genId().toUpperCase(),
      loanId,
      timestamp: formatDateTime(new Date()),
      operatorName,
      operatorRole,
      action,
      details,
      ipAddress: "192.168." + Math.floor(Math.random() * 254 + 1) + "." + Math.floor(Math.random() * 254 + 1)
    };
    audits.unshift(nextLog);
    this.saveAudits(audits);
  }

  resetAll() {
    localStorage.removeItem("lendflow_loans");
    localStorage.removeItem("lendflow_conditions");
    localStorage.removeItem("lendflow_tasks");
    localStorage.removeItem("lendflow_leads");
    localStorage.removeItem("lendflow_audits");
    window.dispatchEvent(new Event("lendflow_db_updated"));
  }
}

export const db = new Database();
export { genId };
