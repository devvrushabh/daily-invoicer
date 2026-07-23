/**
 * ApexInvoice - Default Sample Invoice Data & Currency Utilities
 */

const CURRENCY_MAP = {
  INR: { symbol: '₹', name: 'Indian Rupee', code: 'INR' },
  USD: { symbol: '$', name: 'US Dollar', code: 'USD' },
  EUR: { symbol: '€', name: 'Euro', code: 'EUR' },
  GBP: { symbol: '£', name: 'British Pound', code: 'GBP' },
  CAD: { symbol: 'CA$', name: 'Canadian Dollar', code: 'CAD' },
  AUD: { symbol: 'A$', name: 'Australian Dollar', code: 'AUD' },
  JPY: { symbol: '¥', name: 'Japanese Yen', code: 'JPY' },
  AED: { symbol: 'AED ', name: 'UAE Dirham', code: 'AED' }
};

function formatCurrency(amount, currencyCode = 'INR') {
  const code = (currencyCode || 'INR').toUpperCase();
  const meta = CURRENCY_MAP[code] || CURRENCY_MAP.INR;
  const num = parseFloat(amount) || 0;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: meta.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  } catch (e) {
    return `${meta.symbol}${num.toFixed(2)}`;
  }
}

const DEFAULT_BUSINESS_PROFILE = {
  name: "Apex Studio Creative Agency",
  email: "billing@apexstudio.design",
  phone: "+1 (555) 234-8900",
  address: "77 Innovation Tower, Suite 1400\nNew York, NY 10001\nTax ID: US-998877665",
  logoBase64: "",
  paymentTerms: "Wire Transfer: Apex Studio Ltd\nBank: Chase Bank N.A.\nAccount: 1234 5678 9012\nSWIFT: CHASEUS33XXX",
  upiId: "apexstudio@okaxis",
  customQrBase64: ""
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
    name: "Global Dynamics Corp.",
    email: "billing@globaldynamics.io",
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

  // Services & Products Line Items
  items: [
    {
      id: "item-1",
      description: "UI/UX Mobile App Redesign & Design System Specification",
      qty: 40,
      price: 1200.00
    },
    {
      id: "item-2",
      description: "Cloud Infrastructure Setup & CI/CD Pipeline Automation",
      qty: 1,
      price: 3500.00
    },
    {
      id: "item-3",
      description: "Annual SLA Server Maintenance & Support License",
      qty: 1,
      price: 2500.00
    }
  ],

  // Summary Calculations
  taxRate: 8.5,
  discountValue: 1500.00,
  discountType: "fixed",
  shipping: 0.00,
  amountPaid: 0.00,

  // Terms & Notes
  paymentTerms: "Direct Wire Transfer / UPI Accepted\nBank: Chase Bank N.A.\nAccount #: 1234 5678 9012\nSWIFT: CHASEUS33XXX",
  notes: "Thank you for partnering with Apex Studio! Please complete payment by the due date."
};

window.CURRENCY_MAP = CURRENCY_MAP;
window.formatCurrency = formatCurrency;
window.DEFAULT_BUSINESS_PROFILE = DEFAULT_BUSINESS_PROFILE;
window.DEFAULT_CLIENTS = DEFAULT_CLIENTS;
window.INITIAL_SAMPLE_INVOICE = INITIAL_SAMPLE_INVOICE;
