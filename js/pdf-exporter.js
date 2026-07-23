/**
 * ApexInvoice - PDF Export Engine
 */

const PDFExporter = {
  /**
   * Download the printable invoice sheet directly as a PDF file
   * @param {HTMLElement} element - The invoice element to render
   * @param {Object} invoiceData - Active invoice metadata
   */
  downloadPDF: async function(element, invoiceData) {
    if (!element) {
      console.error("Invoice preview element not found.");
      return false;
    }

    // Format clean filename: INV-2026-001_ClientName.pdf
    const sanitizedClient = (invoiceData.clientName || 'Invoice')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_');
    const filename = `${invoiceData.number || 'Invoice'}_${sanitizedClient}.pdf`;

    // html2pdf configuration options for high-resolution A4 export
    const opt = {
      margin:       [8, 8, 8, 8],
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        letterRendering: true 
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Ensure transaction ID metadata is visible on PDF if paid
    const isPaid = invoiceData.status === 'Paid';
    const txnId = invoiceData.transactionId || 'TXN_OFFICIAL_' + Date.now();
    const txnMetaEl = element.querySelector('#paper-txn-meta');
    if (txnMetaEl) {
      txnMetaEl.style.display = isPaid ? 'block' : 'none';
      txnMetaEl.innerHTML = `<strong>Payment Receipt Verified</strong> — Txn ID: ${txnId} | Paid Date: ${invoiceData.paidTimestamp || new Date().toLocaleDateString()}`;
    }

    try {
      if (window.html2pdf) {
        await window.html2pdf().set(opt).from(element).save();
        return true;
      } else {
        console.warn("html2pdf library unavailable, falling back to window.print()");
        window.print();
        return true;
      }
    } catch (err) {
      console.error("Error generating PDF:", err);
      window.print();
      return false;
    }
  },

  /**
   * Trigger native browser print dialog optimized via @media print CSS
   */
  printInvoice: function() {
    window.print();
  }
};

window.PDFExporter = PDFExporter;
