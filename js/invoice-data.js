/**
 * ApexInvoice - Pre-filled Sample Data & Helper Models
 */

const DEFAULT_BUSINESS_PROFILE = {
  name: "Apex Studio Creative Agency",
  email: "billing@apexstudio.design",
  phone: "+1 (555) 234-8900",
  address: "77 Innovation Tower, Suite 1400\nNew York, NY 10001\nTax ID / VAT: US-998877665",
  paymentTerms: "Wire Transfer / ACH Details:\nBank: HDFC Bank Ltd\nAccount: 5020-0012-345678\nIFSC Code: HDFC0001234\nBranch: Tech Park, Mumbai",
  upiId: "apexstudio@okaxis",
  customQrBase64: "",
  logoBase64: ""
};

const DEFAULT_CLIENTS = [
  {
    id: "client-1",
    name: "Acme Enterprises Inc.",
    email: "accounts@acmeenterprises.com",
    phone: "+1 (555) 887-1234",
    address: "500 Market Street, Floor 12\nSan Francisco, CA 94105"
  },
  {
    id: "client-2",
    name: "Nexus Global Logistics",
    email: "invoices@nexusglobal.io",
    phone: "+1 (555) 345-6789",
    address: "120 Logistics Parkway\nChicago, IL 60607"
  },
  {
    id: "client-3",
    name: "Vanguard Tech Solutions",
    email: "finance@vanguardtech.dev",
    phone: "+44 20 7946 0912",
    address: "25 Finsbury Circus\nLondon, EC2M 7EE, UK"
  }
];

const INITIAL_SAMPLE_INVOICE = {
  id: "inv-" + Date.now(),
  number: "INV-2026-001",
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
  poNumber: "PO-98402",
  status: "Unpaid",
  currency: "INR",
  template: "modern-blue",

  // Business Sender Info
  bizName: "Apex Studio Creative Agency",
  bizEmail: "billing@apexstudio.design",
  bizPhone: "+1 (555) 234-8900",
  bizAddress: "77 Innovation Tower, Suite 1400\nNew York, NY 10001\nTax ID: US-998877665",

  // Billed Client Info
  clientName: "Acme Enterprises Inc.",
  clientEmail: "accounts@acmeenterprises.com",
  clientPhone: "+1 (555) 887-1234",
  clientAddress: "500 Market Street, Floor 12\nSan Francisco, CA 94105",

  // Line Items
  items: [
    {
      id: "item-1",
      description: "Brand Identity System & Custom Web UI/UX Design",
      qty: 1,
      price: 25000.00
    },
    {
      id: "item-2",
      description: "Frontend Web Application Development (HTML5 / Vanilla JS / CSS3)",
      qty: 40,
      price: 1500.00
    },
    {
      id: "item-3",
      description: "Cloud Architecture Setup & Automated CI/CD Pipeline",
      qty: 1,
      price: 10000.00
    }
  ],

  // Calculations
  taxRate: 18.0,
  discountValue: 1500.00,
  discountType: "fixed", // 'percent' or 'fixed'
  shipping: 0.00,
  amountPaid: 0.00,

  // Notes & Payment
  paymentTerms: "Bank Transfer:\nBank: HDFC Bank Ltd\nAccount: 5020-0012-345678\nIFSC Code: HDFC0001234\nBranch: Tech Park, Mumbai",
  notes: "Thank you for partnering with Apex Studio! Please issue payment within 15 days of invoice date."
};

const CURRENCY_MAP = {
  INR: { symbol: "₹", code: "INR" },
  USD: { symbol: "$", code: "USD" },
  EUR: { symbol: "€", code: "EUR" },
  GBP: { symbol: "£", code: "GBP" },
  CAD: { symbol: "CA$", code: "CAD" },
  AUD: { symbol: "A$", code: "AUD" },
  JPY: { symbol: "¥", code: "JPY" },
  AED: { symbol: "AED ", code: "AED" }
};

/**
 * Format currency helper
 */
function formatCurrency(amount, currencyCode = "INR") {
  const curr = CURRENCY_MAP[currencyCode] || CURRENCY_MAP.INR;
  const numericAmount = parseFloat(amount) || 0;
  return curr.symbol + numericAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Bind symbols to window for ES Module & global scope compatibility
window.DEFAULT_BUSINESS_PROFILE = DEFAULT_BUSINESS_PROFILE;
window.DEFAULT_CLIENTS = DEFAULT_CLIENTS;
window.INITIAL_SAMPLE_INVOICE = INITIAL_SAMPLE_INVOICE;
window.CURRENCY_MAP = CURRENCY_MAP;
window.formatCurrency = formatCurrency;
