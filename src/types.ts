export enum LoanStage {
  Lead = "Lead",
  Application = "Application",
  Processing = "Processing",
  Underwriting = "Underwriting",
  Approval = "Approval",
  CTC = "CTC", // Clear to Close
  Closed = "Closed"
}

export enum ConditionStatus {
  Outstanding = "Outstanding",
  Submitted = "Submitted",
  Reviewed = "Reviewed",
  Cleared = "Cleared"
}

export interface Borrower {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ssn: string;
  dob: string;
  address: string;
  monthlyIncome: number;
  monthlyDebts: number;
  creditScore: number;
}

export interface Loan {
  id: string;
  borrower: Borrower;
  stage: LoanStage;
  loanType: "Conventional" | "FHA" | "VA" | "ARM";
  loanAmount: number;
  purchasePrice: number;
  downPayment: number;
  ltv: number; // Loan to Value %
  dti: number; // Debt to Income %
  interestRate: number;
  termMonths: number;
  estimatedCloseDate: string;
  rateLockDate?: string;
  rateLockExpires?: string;
  rateLockLocked: boolean;
  tridDisclosedDate?: string;
  tridDisclosuresAcked?: boolean;
  qmEligible: boolean; // Qualified Mortgage check
  redFlagAlerts: string[];
  ausRunStatus?: "DU Approved" | "LPA Approved" | "Refer with Caution" | "Not Run";
  ausRunDate?: string;
}

export interface LoanCondition {
  id: string;
  loanId: string;
  title: string;
  description: string;
  category: "Asset" | "Income" | "Property" | "Legal" | "Credit";
  status: ConditionStatus;
  assignedTo: "Borrower" | "LO" | "LOA" | "Processor";
  dueDate: string;
  uploadedDocumentUrl?: string;
  uploadedDocumentName?: string;
  uploadedDocumentDate?: string;
  versionCount: number;
}

export interface LoanTask {
  id: string;
  loanId: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  assignedRole: "LO" | "LOA" | "Processor";
  countdownDays?: number;
}

export interface LoanLead {
  id: string;
  borrowerName: string;
  email: string;
  phone: string;
  loanType: string;
  estimatedAmount: number;
  leadSource: "Realtor Referral" | "Builder Partner" | "Online Inbound" | "Cold Walk-in";
  referralPartner?: string;
  status: "New" | "Contacted" | "Nurturing" | "Converted";
  notes: string;
  createdDate: string;
  followUpSequences: string[]; // Step sequences
}

export interface AuditLog {
  id: string;
  loanId?: string;
  timestamp: string;
  operatorName: string;
  operatorRole: "LO" | "LOA" | "Processor" | "Borrower" | "System";
  action: string;
  details: string;
  ipAddress: string;
}

export interface RateScenario {
  fha: { rate: number; payment: number; cashToClose: number; fee: number };
  conventional: { rate: number; payment: number; cashToClose: number; fee: number };
  arm: { rate: number; payment: number; cashToClose: number; fee: number };
}
