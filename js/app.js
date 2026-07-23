/**
 * Daily Invoicer - Main Application Controller (With Firebase Auth & Firestore Sync)
 */

// Application State Object
const AppState = {
  currentUser: null,
  activeInvoice: null,
  savedInvoices: [],
  businessProfile: null,
  savedClients: [],
  savedFilter: 'all',
  activeView: 'split',
  firestoreUnsubscribe: null
};

// Storage Keys
const STORAGE_KEYS = {
  INVOICES: 'apex_saved_invoices_v1',
  PROFILE: 'apex_business_profile_v1',
  CLIENTS: 'apex_saved_clients_v1'
};

/* ==========================================================================
   INITIALIZATION & AUTHENTICATION OBSERVER
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initStorage();
  initAuthViewHandlers();
  initEventListeners();
  renderClientDropdown();
  
  // Register Firebase Auth State Listener
  FirebaseAuthManager.onAuthChange((user) => {
    handleAuthStateChange(user);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
});

/**
 * Handle user sign in / sign out UI transition and data sync
 */
function handleAuthStateChange(user) {
  AppState.currentUser = user;

  const authOverlay = document.getElementById('auth-overlay');
  const userMenu = document.getElementById('user-account-menu');
  const userEmailDisplay = document.getElementById('header-user-email');
  const btnHeaderSignIn = document.getElementById('btn-header-sign-in');

  if (user) {
    // User is Logged In
    if (authOverlay) authOverlay.style.display = 'none';
    if (userMenu) userMenu.style.display = 'flex';
    if (btnHeaderSignIn) btnHeaderSignIn.style.display = 'none';
    if (userEmailDisplay) userEmailDisplay.textContent = user.email || user.displayName || 'Logged User';

    showToast(`Welcome back, ${user.displayName || user.email}!`, 'success');

    // Always start with a fresh blank invoice on login
    // (old invoices stay in Saved Invoices library, accessible any time)
    let isFirstSyncAfterLogin = true;
    createNewBlankInvoice();

    // Subscribe to User-Scoped Firestore Cloud Sync
    if (AppState.firestoreUnsubscribe) AppState.firestoreUnsubscribe();
    
    AppState.firestoreUnsubscribe = FirebaseAuthManager.syncUserInvoices(user.uid, (cloudInvoices) => {
      if (cloudInvoices && cloudInvoices.length > 0) {
        AppState.savedInvoices = cloudInvoices;
      } else {
        AppState.savedInvoices = [];
      }
      updateStatsHeader();
      renderSavedInvoicesTable();

      // On first sync only, keep the fresh blank invoice active (don't overwrite)
      if (isFirstSyncAfterLogin) {
        isFirstSyncAfterLogin = false;
        // Don't load a saved invoice — editor stays fresh
      }
    });

  } else {
    // User is Logged Out
    if (authOverlay) authOverlay.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';
    if (btnHeaderSignIn) btnHeaderSignIn.style.display = 'inline-flex';

    if (AppState.firestoreUnsubscribe) {
      AppState.firestoreUnsubscribe();
      AppState.firestoreUnsubscribe = null;
    }

    // Reset to local initial state
    AppState.savedInvoices = [INITIAL_SAMPLE_INVOICE];
    AppState.activeInvoice = JSON.parse(JSON.stringify(INITIAL_SAMPLE_INVOICE));
    renderEditorFromState();
    updateCalculationsAndPreview();
    updateStatsHeader();
  }
}

/**
 * Auth Views Toggle Handlers (Sign In, Sign Up, Forgot Password)
 */
function initAuthViewHandlers() {
  const viewSignin = document.getElementById('auth-view-signin');
  const viewSignup = document.getElementById('auth-view-signup');
  const viewForgot = document.getElementById('auth-view-forgot');
  const subTitle = document.getElementById('auth-sub-title');

  document.getElementById('btn-show-signup')?.addEventListener('click', () => {
    viewSignin.style.display = 'none';
    viewForgot.style.display = 'none';
    viewSignup.style.display = 'block';
    subTitle.textContent = 'Create your account to start generating and storing invoices';
  });

  document.getElementById('btn-show-signin')?.addEventListener('click', () => {
    viewSignup.style.display = 'none';
    viewForgot.style.display = 'none';
    viewSignin.style.display = 'block';
    subTitle.textContent = 'Sign in to manage and sync your professional invoices';
  });

  document.getElementById('btn-show-forgot')?.addEventListener('click', () => {
    viewSignin.style.display = 'none';
    viewSignup.style.display = 'none';
    viewForgot.style.display = 'block';
    subTitle.textContent = 'Reset your account password';
  });

  document.getElementById('btn-back-signin')?.addEventListener('click', () => {
    viewForgot.style.display = 'none';
    viewSignup.style.display = 'none';
    viewSignin.style.display = 'block';
    subTitle.textContent = 'Sign in to manage and sync your professional invoices';
  });

  // Submit Sign In
  document.getElementById('form-signin')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signin-email').value;
    const pass = document.getElementById('signin-password').value;
    const btn = document.getElementById('btn-submit-signin');

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader"></i> Signing In...';
    
    const res = await FirebaseAuthManager.signIn(email, pass);
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="log-in"></i> Sign In';

    if (!res.success) {
      showToast(res.error || 'Failed to sign in', 'error');
    }
  });

  // Submit Sign Up
  document.getElementById('form-signup')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const pass = document.getElementById('signup-password').value;
    const btn = document.getElementById('btn-submit-signup');

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader"></i> Creating...';

    const res = await FirebaseAuthManager.signUp(email, pass, name);
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="user-plus"></i> Create Account';

    if (!res.success) {
      showToast(res.error || 'Failed to create account', 'error');
    }
  });

  // Submit Forgot Password
  document.getElementById('form-forgot')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    const btn = document.getElementById('btn-submit-forgot');

    btn.disabled = true;
    const res = await FirebaseAuthManager.sendPasswordReset(email);
    btn.disabled = false;

    if (res.success) {
      showToast(res.message || 'Password reset email sent!', 'success');
      document.getElementById('btn-back-signin').click();
    } else {
      showToast(res.error || 'Failed to send reset link', 'error');
    }
  });

  // Google Sign In
  document.getElementById('btn-signin-google')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-signin-google');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader"></i> Signing in with Google...';
    if (window.lucide) window.lucide.createIcons();

    const res = await FirebaseAuthManager.signInWithGoogle();

    btn.disabled = false;
    btn.innerHTML = originalHTML;
    if (window.lucide) window.lucide.createIcons();

    if (res.success) {
      showToast('Signed in with Google successfully!', 'success');
      const authOverlay = document.getElementById('auth-overlay');
      if (authOverlay) authOverlay.style.display = 'none';
    } else {
      showToast(res.error || 'Google sign in failed', 'error');
    }
  });

  // Header Sign Out Button
  document.getElementById('btn-sign-out')?.addEventListener('click', async () => {
    await FirebaseAuthManager.signOut();
    showToast('Signed out successfully', 'info');
  });

  // Header Sign In Button (when overlay closed)
  document.getElementById('btn-header-sign-in')?.addEventListener('click', () => {
    const authOverlay = document.getElementById('auth-overlay');
    if (authOverlay) authOverlay.style.display = 'flex';
  });
}

/**
 * Initialize local storage
 */
function initStorage() {
  const storedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
  if (storedProfile) {
    try { AppState.businessProfile = JSON.parse(storedProfile); } catch (e) { AppState.businessProfile = DEFAULT_BUSINESS_PROFILE; }
  } else {
    AppState.businessProfile = DEFAULT_BUSINESS_PROFILE;
  }

  const storedClients = localStorage.getItem(STORAGE_KEYS.CLIENTS);
  if (storedClients) {
    try { AppState.savedClients = JSON.parse(storedClients); } catch (e) { AppState.savedClients = DEFAULT_CLIENTS; }
  } else {
    AppState.savedClients = DEFAULT_CLIENTS;
  }

  AppState.savedInvoices = [INITIAL_SAMPLE_INVOICE];
  AppState.activeInvoice = JSON.parse(JSON.stringify(INITIAL_SAMPLE_INVOICE));
}

/* ==========================================================================
   EVENT LISTENERS & BINDINGS
   ========================================================================== */
function initEventListeners() {
  // Mode switcher tabs
  document.querySelectorAll('.mode-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.mode-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      const targetBtn = e.currentTarget;
      targetBtn.classList.add('active');
      setWorkspaceMode(targetBtn.dataset.target);
    });
  });

  // Template theme selector
  const templateSelect = document.getElementById('select-template');
  if (templateSelect) {
    templateSelect.addEventListener('change', (e) => {
      AppState.activeInvoice.template = e.target.value;
      updateTemplateTheme(e.target.value);
    });
  }

  // Input listeners
  const formInputs = [
    'inv-number', 'inv-date', 'inv-due-date', 'inv-status', 'inv-currency', 'inv-po-number',
    'biz-name', 'biz-email', 'biz-phone', 'biz-address',
    'client-name', 'client-email', 'client-phone', 'client-address',
    'inv-payment-terms', 'inv-notes',
    'inv-tax-rate', 'inv-discount-val', 'inv-discount-type', 'inv-shipping', 'inv-amount-paid'
  ];

  formInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        readFormToState();
        updateCalculationsAndPreview();
      });
      if (el.tagName === 'SELECT') {
        el.addEventListener('change', () => {
          readFormToState();
          updateCalculationsAndPreview();
        });
      }
    }
  });

  // Add Item button
  document.getElementById('btn-add-item')?.addEventListener('click', addNewLineItem);

  // Header Actions
  document.getElementById('btn-new-invoice')?.addEventListener('click', createNewBlankInvoice);
  document.getElementById('btn-save-draft')?.addEventListener('click', saveActiveInvoice);
  document.getElementById('btn-open-saved')?.addEventListener('click', openSavedInvoicesModal);
  document.getElementById('btn-open-settings')?.addEventListener('click', openSettingsModal);
  document.getElementById('btn-load-saved-profile')?.addEventListener('click', loadDefaultBusinessProfileToActive);
  document.getElementById('btn-pay-now')?.addEventListener('click', openPaymentCheckoutModal);

  // PDF Export & Print
  document.getElementById('btn-print-invoice')?.addEventListener('click', () => PDFExporter.printInvoice());

  document.getElementById('btn-download-pdf')?.addEventListener('click', async () => {
    const paperEl = document.getElementById('invoice-paper');
    showToast('Generating PDF document...', 'info');
    const success = await PDFExporter.downloadPDF(paperEl, AppState.activeInvoice);
    if (success) showToast('PDF Downloaded successfully!', 'success');
  });

  // Saved Client Select
  const clientSelect = document.getElementById('select-saved-client');
  if (clientSelect) {
    clientSelect.addEventListener('change', (e) => {
      const clientId = e.target.value;
      if (clientId) {
        const client = AppState.savedClients.find(c => c.id === clientId);
        if (client) {
          document.getElementById('client-name').value = client.name;
          document.getElementById('client-email').value = client.email || '';
          document.getElementById('client-phone').value = client.phone || '';
          document.getElementById('client-address').value = client.address || '';
          readFormToState();
          updateCalculationsAndPreview();
          showToast(`Autofilled client: ${client.name}`, 'info');
        }
      }
    });
  }

  // Modals Close buttons
  document.getElementById('btn-close-saved')?.addEventListener('click', closeSavedInvoicesModal);
  document.getElementById('btn-done-saved')?.addEventListener('click', closeSavedInvoicesModal);
  document.getElementById('btn-close-settings')?.addEventListener('click', closeSettingsModal);
  document.getElementById('btn-cancel-settings')?.addEventListener('click', closeSettingsModal);

  // Business Profile Settings Form Actions
  document.getElementById('btn-save-settings')?.addEventListener('click', saveBusinessSettingsProfile);
  document.getElementById('input-logo-file')?.addEventListener('change', handleLogoUpload);
  document.getElementById('btn-remove-logo')?.addEventListener('click', handleLogoRemove);
  document.getElementById('input-qr-file')?.addEventListener('change', handleQRUpload);
  document.getElementById('btn-remove-qr')?.addEventListener('click', handleQRRemove);

  // Firebase Config Modal Actions
  document.getElementById('btn-open-firebase-config')?.addEventListener('click', openFirebaseConfigModal);
  document.getElementById('btn-close-firebase-config')?.addEventListener('click', closeFirebaseConfigModal);
  document.getElementById('btn-cancel-fb-config')?.addEventListener('click', closeFirebaseConfigModal);
  document.getElementById('btn-save-fb-config')?.addEventListener('click', saveCustomFirebaseConfig);

  // Saved Invoices Search & Filter Tabs
  document.getElementById('search-saved-invoices')?.addEventListener('input', renderSavedInvoicesTable);
  document.querySelectorAll('.filter-tabs .filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-tabs .filter-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      AppState.savedFilter = e.currentTarget.dataset.filter;
      renderSavedInvoicesTable();
    });
  });

  // Send Email Modal Actions
  document.getElementById('btn-send-email')?.addEventListener('click', () => openSendEmailModal());
  document.getElementById('btn-close-send-email')?.addEventListener('click', closeSendEmailModal);
  document.getElementById('btn-cancel-send-email')?.addEventListener('click', closeSendEmailModal);
  document.getElementById('btn-confirm-send-email')?.addEventListener('click', confirmSendInvoiceEmail);
  document.getElementById('btn-open-gmail-compose')?.addEventListener('click', openGmailComposeTab);
  document.getElementById('btn-launch-mailto')?.addEventListener('click', launchMailtoClient);

  // Dark / Light Theme Toggle Action
  document.getElementById('btn-toggle-theme')?.addEventListener('click', toggleTheme);

  // JSON Data Backup Export
  document.getElementById('btn-export-backup')?.addEventListener('click', exportDataBackupJSON);
}

/* ==========================================================================
   STATE TO EDITOR & PREVIEW BINDINGS
   ========================================================================== */
function renderEditorFromState() {
  const inv = AppState.activeInvoice;
  if (!inv) return;

  document.getElementById('inv-number').value = inv.number || '';
  document.getElementById('inv-date').value = inv.issueDate || '';
  document.getElementById('inv-due-date').value = inv.dueDate || '';
  document.getElementById('inv-po-number').value = inv.poNumber || '';
  document.getElementById('inv-status').value = inv.status || 'Unpaid';
  document.getElementById('inv-currency').value = inv.currency || 'INR';
  
  if (document.getElementById('select-template')) {
    document.getElementById('select-template').value = inv.template || 'modern-blue';
    updateTemplateTheme(inv.template || 'modern-blue');
  }

  document.getElementById('biz-name').value = inv.bizName || '';
  document.getElementById('biz-email').value = inv.bizEmail || '';
  document.getElementById('biz-phone').value = inv.bizPhone || '';
  document.getElementById('biz-address').value = inv.bizAddress || '';

  document.getElementById('client-name').value = inv.clientName || '';
  document.getElementById('client-email').value = inv.clientEmail || '';
  document.getElementById('client-phone').value = inv.clientPhone || '';
  document.getElementById('client-address').value = inv.clientAddress || '';

  document.getElementById('inv-payment-terms').value = inv.paymentTerms || '';
  document.getElementById('inv-notes').value = inv.notes || '';

  document.getElementById('inv-tax-rate').value = inv.taxRate !== undefined ? inv.taxRate : 0;
  document.getElementById('inv-discount-val').value = inv.discountValue !== undefined ? inv.discountValue : 0;
  document.getElementById('inv-discount-type').value = inv.discountType || 'fixed';
  document.getElementById('inv-shipping').value = inv.shipping !== undefined ? inv.shipping : 0;
  document.getElementById('inv-amount-paid').value = inv.amountPaid !== undefined ? inv.amountPaid : 0;

  renderEditorLineItems();
}

function readFormToState() {
  if (!AppState.activeInvoice) return;
  const inv = AppState.activeInvoice;

  inv.number = document.getElementById('inv-number').value;
  inv.issueDate = document.getElementById('inv-date').value;
  inv.dueDate = document.getElementById('inv-due-date').value;
  inv.poNumber = document.getElementById('inv-po-number').value;
  inv.status = document.getElementById('inv-status').value;
  inv.currency = document.getElementById('inv-currency').value;

  inv.bizName = document.getElementById('biz-name').value;
  inv.bizEmail = document.getElementById('biz-email').value;
  inv.bizPhone = document.getElementById('biz-phone').value;
  inv.bizAddress = document.getElementById('biz-address').value;

  inv.clientName = document.getElementById('client-name').value;
  inv.clientEmail = document.getElementById('client-email').value;
  inv.clientPhone = document.getElementById('client-phone').value;
  inv.clientAddress = document.getElementById('client-address').value;

  inv.paymentTerms = document.getElementById('inv-payment-terms').value;
  inv.notes = document.getElementById('inv-notes').value;

  inv.taxRate = parseFloat(document.getElementById('inv-tax-rate').value) || 0;
  inv.discountValue = parseFloat(document.getElementById('inv-discount-val').value) || 0;
  inv.discountType = document.getElementById('inv-discount-type').value;
  inv.shipping = parseFloat(document.getElementById('inv-shipping').value) || 0;
  inv.amountPaid = parseFloat(document.getElementById('inv-amount-paid').value) || 0;

  const tbody = document.getElementById('items-tbody');
  const rows = tbody.querySelectorAll('tr');
  const items = [];

  rows.forEach((row) => {
    const descInput = row.querySelector('.item-desc');
    const qtyInput = row.querySelector('.item-qty');
    const priceInput = row.querySelector('.item-price');
    const id = row.dataset.id || 'item-' + Math.random();

    if (descInput && qtyInput && priceInput) {
      items.push({
        id: id,
        description: descInput.value,
        qty: parseFloat(qtyInput.value) || 0,
        price: parseFloat(priceInput.value) || 0
      });
    }
  });

  inv.items = items;
}

/* ==========================================================================
   LINE ITEMS TABLE MANIPULATION
   ========================================================================== */
function renderEditorLineItems() {
  const tbody = document.getElementById('items-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  const items = AppState.activeInvoice.items || [];
  const currencyCode = AppState.activeInvoice.currency || 'INR';

  items.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.dataset.id = item.id || ('item-' + index);
    const amount = (item.qty || 0) * (item.price || 0);

    tr.innerHTML = `
      <td>
        <input type="text" class="item-desc" value="${escapeHTML(item.description || '')}" placeholder="Service name or product description">
      </td>
      <td>
        <input type="number" class="item-qty" min="0" step="1" value="${item.qty || 1}">
      </td>
      <td>
        <input type="number" class="item-price" min="0" step="0.01" value="${item.price || 0}">
      </td>
      <td style="vertical-align: middle; font-weight: 600;" class="item-total-cell">
        ${formatCurrency(amount, currencyCode)}
      </td>
      <td style="vertical-align: middle; text-align: center;">
        <button type="button" class="btn-remove-row" title="Delete Row" data-id="${tr.dataset.id}">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    `;

    const descInput = tr.querySelector('.item-desc');
    const qtyInput = tr.querySelector('.item-qty');
    const priceInput = tr.querySelector('.item-price');

    [descInput, qtyInput, priceInput].forEach(input => {
      input.addEventListener('input', () => {
        readFormToState();
        updateCalculationsAndPreview();
      });
    });

    tr.querySelector('.btn-remove-row').addEventListener('click', () => {
      removeLineItem(tr.dataset.id);
    });

    tbody.appendChild(tr);
  });

  if (window.lucide) window.lucide.createIcons();
}

function addNewLineItem() {
  if (!AppState.activeInvoice.items) AppState.activeInvoice.items = [];
  AppState.activeInvoice.items.push({
    id: 'item-' + Date.now(),
    description: '',
    qty: 1,
    price: 0.00
  });
  renderEditorLineItems();
  readFormToState();
  updateCalculationsAndPreview();
  showToast('New item added', 'info');
}

function removeLineItem(itemId) {
  if (!AppState.activeInvoice.items) return;
  if (AppState.activeInvoice.items.length <= 1) {
    showToast('Invoice must have at least one line item', 'error');
    return;
  }
  AppState.activeInvoice.items = AppState.activeInvoice.items.filter(item => item.id !== itemId);
  renderEditorLineItems();
  readFormToState();
  updateCalculationsAndPreview();
}

/* ==========================================================================
   CALCULATIONS & LIVE PREVIEW RENDERER
   ========================================================================== */
function updateCalculationsAndPreview() {
  const inv = AppState.activeInvoice;
  if (!inv) return;

  const currencyCode = inv.currency || 'INR';
  const currSymbol = (CURRENCY_MAP[currencyCode] || CURRENCY_MAP.INR).symbol;

  document.querySelectorAll('.currency-symbol').forEach(el => el.textContent = currSymbol);

  let subtotal = 0;
  (inv.items || []).forEach(item => {
    subtotal += (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
  });

  let discountAmt = 0;
  if (inv.discountType === 'percent') {
    discountAmt = subtotal * ((parseFloat(inv.discountValue) || 0) / 100);
  } else {
    discountAmt = parseFloat(inv.discountValue) || 0;
  }
  if (discountAmt > subtotal) discountAmt = subtotal;

  const discountedSubtotal = subtotal - discountAmt;
  const taxRate = parseFloat(inv.taxRate) || 0;
  const taxAmt = discountedSubtotal * (taxRate / 100);
  const shippingAmt = parseFloat(inv.shipping) || 0;
  const grandTotal = discountedSubtotal + taxAmt + shippingAmt;
  const amountPaid = parseFloat(inv.amountPaid) || 0;
  const balanceDue = grandTotal - amountPaid;

  document.getElementById('calc-subtotal').textContent = formatCurrency(subtotal, currencyCode);
  document.getElementById('calc-tax-amt').textContent = formatCurrency(taxAmt, currencyCode);
  document.getElementById('calc-grand-total').textContent = formatCurrency(grandTotal, currencyCode);
  document.getElementById('calc-balance-due').textContent = formatCurrency(balanceDue, currencyCode);

  const calcDiscountRow = document.getElementById('calc-discount-row');
  if (discountAmt > 0) {
    calcDiscountRow.style.display = 'flex';
    document.getElementById('calc-discount-amt').textContent = '-' + formatCurrency(discountAmt, currencyCode);
  } else {
    calcDiscountRow.style.display = 'none';
  }

  const calcShippingRow = document.getElementById('calc-shipping-row');
  if (shippingAmt > 0) {
    calcShippingRow.style.display = 'flex';
    document.getElementById('calc-shipping-amt').textContent = formatCurrency(shippingAmt, currencyCode);
  } else {
    calcShippingRow.style.display = 'none';
  }

  const tbody = document.getElementById('items-tbody');
  if (tbody) {
    const rows = tbody.querySelectorAll('tr');
    (inv.items || []).forEach((item, idx) => {
      if (rows[idx]) {
        const amtCell = rows[idx].querySelector('.item-total-cell');
        if (amtCell) {
          amtCell.textContent = formatCurrency((item.qty || 0) * (item.price || 0), currencyCode);
        }
      }
    });
  }

  // UPDATE PAPER PREVIEW
  document.getElementById('paper-inv-number').textContent = inv.number ? `#${inv.number}` : '#INV-000';
  document.getElementById('paper-inv-date').textContent = formatDate(inv.issueDate);
  document.getElementById('paper-inv-due-date').textContent = formatDate(inv.dueDate);
  
  const poRow = document.getElementById('paper-po-row');
  if (inv.poNumber) {
    poRow.style.display = 'table-row';
    document.getElementById('paper-inv-po').textContent = inv.poNumber;
  } else {
    poRow.style.display = 'none';
  }

  const statusPill = document.getElementById('paper-status-pill');
  const statusStamp = document.getElementById('preview-status-stamp');
  const statusVal = inv.status || 'Unpaid';
  
  statusPill.textContent = statusVal;
  statusPill.className = `paper-status-pill status-${statusVal.toLowerCase()}`;
  
  statusStamp.textContent = statusVal.toUpperCase();
  statusStamp.className = `status-stamp stamp-${statusVal.toLowerCase()}`;

  const paperLogoImg = document.getElementById('paper-logo-img');
  const paperLogoPlaceholder = document.getElementById('paper-logo-placeholder');
  
  if (AppState.businessProfile && AppState.businessProfile.logoBase64) {
    paperLogoImg.src = AppState.businessProfile.logoBase64;
    paperLogoImg.style.display = 'block';
    paperLogoPlaceholder.style.display = 'none';
  } else {
    paperLogoImg.style.display = 'none';
    paperLogoPlaceholder.style.display = 'flex';
  }

  document.getElementById('paper-biz-name').textContent = inv.bizName || 'Company Name';
  document.getElementById('paper-biz-email').textContent = inv.bizEmail || '';
  document.getElementById('paper-biz-phone').textContent = inv.bizPhone || '';
  document.getElementById('paper-biz-address').innerHTML = (inv.bizAddress || '').replace(/\n/g, '<br>');

  document.getElementById('paper-client-name').textContent = inv.clientName || 'Client Name';
  document.getElementById('paper-client-email').textContent = inv.clientEmail || '';
  document.getElementById('paper-client-phone').textContent = inv.clientPhone || '';
  document.getElementById('paper-client-address').innerHTML = (inv.clientAddress || '').replace(/\n/g, '<br>');

  document.getElementById('paper-big-amount').textContent = formatCurrency(balanceDue, currencyCode);
  document.getElementById('paper-due-by-text').textContent = inv.dueDate ? `Due by ${formatDate(inv.dueDate)}` : 'Due upon receipt';

  const paperItemsTbody = document.getElementById('paper-items-tbody');
  if (paperItemsTbody) {
    paperItemsTbody.innerHTML = '';
    (inv.items || []).forEach((item, index) => {
      const rowAmt = (item.qty || 0) * (item.price || 0);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-num">${index + 1}</td>
        <td class="col-desc">${escapeHTML(item.description || 'Item Description')}</td>
        <td class="col-qty">${item.qty || 0}</td>
        <td class="col-price">${formatCurrency(item.price || 0, currencyCode)}</td>
        <td class="col-total">${formatCurrency(rowAmt, currencyCode)}</td>
      `;
      paperItemsTbody.appendChild(tr);
    });
  }

  document.getElementById('paper-payment-terms').innerHTML = (inv.paymentTerms || '').replace(/\n/g, '<br>');
  document.getElementById('paper-notes-text').innerHTML = (inv.notes || '').replace(/\n/g, '<br>');

  document.getElementById('paper-subtotal').textContent = formatCurrency(subtotal, currencyCode);
  document.getElementById('paper-tax-rate').textContent = taxRate;
  document.getElementById('paper-tax-amt').textContent = formatCurrency(taxAmt, currencyCode);

  const paperDiscountRow = document.getElementById('paper-discount-row');
  if (discountAmt > 0) {
    paperDiscountRow.style.display = 'table-row';
    document.getElementById('paper-discount-amt').textContent = '-' + formatCurrency(discountAmt, currencyCode);
  } else {
    paperDiscountRow.style.display = 'none';
  }

  const paperShippingRow = document.getElementById('paper-shipping-row');
  if (shippingAmt > 0) {
    paperShippingRow.style.display = 'table-row';
    document.getElementById('paper-shipping-amt').textContent = formatCurrency(shippingAmt, currencyCode);
  } else {
    paperShippingRow.style.display = 'none';
  }

  document.getElementById('paper-grand-total').textContent = formatCurrency(grandTotal, currencyCode);

  const paperPaidRow = document.getElementById('paper-paid-row');
  if (amountPaid > 0) {
    paperPaidRow.style.display = 'table-row';
    document.getElementById('paper-paid-amt').textContent = formatCurrency(amountPaid, currencyCode);
  } else {
    paperPaidRow.style.display = 'none';
  }

  document.getElementById('paper-balance-due').textContent = formatCurrency(balanceDue, currencyCode);

  updateStatsHeader();
  if (window.lucide) window.lucide.createIcons();
}

/* ==========================================================================
   SAVED INVOICES MANAGEMENT & USER CLOUD SYNC
   ========================================================================== */
async function saveActiveInvoice() {
  if (!AppState.currentUser) {
    document.getElementById('auth-overlay').style.display = 'flex';
    showToast('Please sign in to save your invoices!', 'info');
    return;
  }

  readFormToState();
  const active = AppState.activeInvoice;

  if (!active.number) {
    showToast('Please enter an invoice number', 'error');
    return;
  }

  // Save to Firebase User-Scoped Cloud Storage / Firestore
  await FirebaseAuthManager.saveUserInvoice(AppState.currentUser.uid, active);

  // Update in-memory AppState.savedInvoices immediately so UI reflects saved state in real time
  const existingIdx = AppState.savedInvoices.findIndex(i => i.id === active.id || (i.number && i.number === active.number));
  if (existingIdx >= 0) {
    AppState.savedInvoices[existingIdx] = JSON.parse(JSON.stringify(active));
  } else {
    AppState.savedInvoices.unshift(JSON.parse(JSON.stringify(active)));
  }

  // Save client profile if new
  if (active.clientName) {
    const existingClient = AppState.savedClients.find(c => c.name.toLowerCase() === active.clientName.toLowerCase());
    if (!existingClient) {
      AppState.savedClients.push({
        id: 'client-' + Date.now(),
        name: active.clientName,
        email: active.clientEmail,
        phone: active.clientPhone,
        address: active.clientAddress
      });
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(AppState.savedClients));
      renderClientDropdown();
    }
  }

  updateStatsHeader();
  showToast(`Invoice ${active.number} saved to your account!`, 'success');
}

function createNewBlankInvoice() {
  const nextNum = 'INV-' + new Date().getFullYear() + '-' + String(AppState.savedInvoices.length + 1).padStart(3, '0');
  
  AppState.activeInvoice = {
    id: 'inv-' + Date.now(),
    number: nextNum,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    poNumber: '',
    status: 'Unpaid',
    currency: 'INR',
    template: 'modern-blue',

    bizName: AppState.businessProfile.name || '',
    bizEmail: AppState.businessProfile.email || '',
    bizPhone: AppState.businessProfile.phone || '',
    bizAddress: AppState.businessProfile.address || '',

    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',

    items: [
      { id: 'item-' + Date.now(), description: '', qty: 1, price: 0.00 }
    ],

    taxRate: 0,
    discountValue: 0,
    discountType: 'fixed',
    shipping: 0,
    amountPaid: 0,

    paymentTerms: AppState.businessProfile.paymentTerms || '',
    notes: 'Thank you for your business!'
  };

  renderEditorFromState();
  updateCalculationsAndPreview();
  showToast('Created new blank invoice draft', 'info');
}

function openSavedInvoicesModal() {
  renderSavedInvoicesTable();
  const modal = document.getElementById('modal-saved-invoices');
  if (modal) modal.classList.add('active');
}

function closeSavedInvoicesModal() {
  const modal = document.getElementById('modal-saved-invoices');
  if (modal) modal.classList.remove('active');
}

function renderSavedInvoicesTable() {
  const tbody = document.getElementById('saved-invoices-tbody');
  if (!tbody) return;

  const searchQuery = (document.getElementById('search-saved-invoices')?.value || '').toLowerCase();
  const filterStatus = AppState.savedFilter;

  let filtered = AppState.savedInvoices.filter(inv => {
    const matchesSearch = (inv.number || '').toLowerCase().includes(searchQuery) ||
                          (inv.clientName || '').toLowerCase().includes(searchQuery);
    const matchesFilter = (filterStatus === 'all') || (inv.status === filterStatus);
    return matchesSearch && matchesFilter;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No saved invoices found.</td></tr>`;
    return;
  }

  filtered.forEach(inv => {
    let subtotal = 0;
    (inv.items || []).forEach(i => subtotal += (i.qty || 0) * (i.price || 0));
    let discount = inv.discountType === 'percent' ? subtotal * ((inv.discountValue || 0) / 100) : (inv.discountValue || 0);
    let tax = (subtotal - discount) * ((inv.taxRate || 0) / 100);
    let grandTotal = subtotal - discount + tax + (inv.shipping || 0);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${inv.number || 'N/A'}</strong></td>
      <td>${escapeHTML(inv.clientName || 'Unnamed Client')}</td>
      <td>${formatDate(inv.issueDate)}</td>
      <td>${formatDate(inv.dueDate)}</td>
      <td><strong>${formatCurrency(grandTotal, inv.currency || 'INR')}</strong></td>
      <td><span class="paper-status-pill status-${(inv.status || 'Unpaid').toLowerCase()}">${inv.status || 'Unpaid'}</span></td>
      <td style="text-align: right;">
        <button class="btn btn-primary btn-xs btn-email-inv" data-id="${inv.id}" title="Send Email to Client">
          <i data-lucide="send"></i> Send
        </button>
        <button class="btn btn-secondary btn-xs btn-load-inv" data-id="${inv.id}" title="Edit Invoice">
          <i data-lucide="edit-2"></i> Edit
        </button>
        <button class="btn btn-secondary btn-xs btn-duplicate-inv" data-id="${inv.id}" title="Duplicate Invoice">
          <i data-lucide="copy"></i> Copy
        </button>
        <button class="btn btn-secondary btn-xs text-danger btn-delete-inv" data-id="${inv.id}" title="Delete Invoice">
          <i data-lucide="trash"></i>
        </button>
      </td>
    `;

    tr.querySelector('.btn-email-inv').addEventListener('click', () => {
      openSendEmailModal(inv);
    });

    tr.querySelector('.btn-load-inv').addEventListener('click', () => {
      AppState.activeInvoice = JSON.parse(JSON.stringify(inv));
      renderEditorFromState();
      updateCalculationsAndPreview();
      closeSavedInvoicesModal();
      showToast(`Loaded invoice ${inv.number}`, 'info');
    });

    tr.querySelector('.btn-duplicate-inv').addEventListener('click', async () => {
      const clone = JSON.parse(JSON.stringify(inv));
      clone.id = 'inv-' + Date.now();
      clone.number = inv.number + '-COPY';
      if (AppState.currentUser) {
        await FirebaseAuthManager.saveUserInvoice(AppState.currentUser.uid, clone);
      }
      const existingIdx = AppState.savedInvoices.findIndex(i => i.id === clone.id);
      if (existingIdx < 0) {
        AppState.savedInvoices.unshift(clone);
      }
      renderSavedInvoicesTable();
      updateStatsHeader();
      showToast(`Duplicated invoice as ${clone.number}`, 'success');
    });

    tr.querySelector('.btn-delete-inv').addEventListener('click', async (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const confirmDelete = confirm(`Are you sure you want to delete invoice ${inv.number}?`);
      if (confirmDelete) {
        const targetId = inv.id || inv.number;

        // 1. Immediately remove from in-memory AppState.savedInvoices matching by ID OR Number
        AppState.savedInvoices = AppState.savedInvoices.filter(i => {
          if (inv.id && i.id === inv.id) return false;
          if (inv.number && i.number === inv.number) return false;
          if (targetId && (i.id === targetId || i.number === targetId)) return false;
          return true;
        });

        // 2. Immediately update UI table and stats header synchronously
        renderSavedInvoicesTable();
        updateStatsHeader();

        // 3. Persist deletion in background/database
        if (AppState.currentUser) {
          await FirebaseAuthManager.deleteUserInvoice(AppState.currentUser.uid, targetId, inv.number);
        } else {
          localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(AppState.savedInvoices));
        }

        showToast(`Invoice ${inv.number || ''} deleted`, 'info');
      }
    });

    tbody.appendChild(tr);
  });

  if (window.lucide) window.lucide.createIcons();
}

/* ==========================================================================
   BUSINESS PROFILE SETTINGS & FIREBASE CONFIG MODALS
   ========================================================================== */
function openSettingsModal() {
  const prof = AppState.businessProfile || {};
  document.getElementById('pref-biz-name').value = prof.name || '';
  document.getElementById('pref-biz-email').value = prof.email || '';
  document.getElementById('pref-biz-phone').value = prof.phone || '';
  document.getElementById('pref-biz-address').value = prof.address || '';
  document.getElementById('pref-biz-payment').value = prof.paymentTerms || '';
  if (document.getElementById('pref-biz-upi')) {
    document.getElementById('pref-biz-upi').value = prof.upiId || '';
  }

  const imgEl = document.getElementById('settings-logo-img');
  const placeholderIcon = document.getElementById('settings-logo-placeholder-icon');

  if (prof.logoBase64) {
    imgEl.src = prof.logoBase64;
    imgEl.style.display = 'block';
    if (placeholderIcon) placeholderIcon.style.display = 'none';
  } else {
    imgEl.style.display = 'none';
    if (placeholderIcon) placeholderIcon.style.display = 'block';
  }

  const qrImgEl = document.getElementById('settings-qr-img');
  const qrPlaceholderIcon = document.getElementById('settings-qr-placeholder-icon');

  if (qrImgEl) {
    if (prof.customQrBase64) {
      qrImgEl.src = prof.customQrBase64;
      qrImgEl.style.display = 'block';
      if (qrPlaceholderIcon) qrPlaceholderIcon.style.display = 'none';
    } else {
      qrImgEl.style.display = 'none';
      if (qrPlaceholderIcon) qrPlaceholderIcon.style.display = 'block';
    }
  }

  document.getElementById('modal-business-settings').classList.add('active');
}

function closeSettingsModal() {
  document.getElementById('modal-business-settings').classList.remove('active');
}

function saveBusinessSettingsProfile() {
  AppState.businessProfile.name = document.getElementById('pref-biz-name').value;
  AppState.businessProfile.email = document.getElementById('pref-biz-email').value;
  AppState.businessProfile.phone = document.getElementById('pref-biz-phone').value;
  AppState.businessProfile.address = document.getElementById('pref-biz-address').value;
  AppState.businessProfile.paymentTerms = document.getElementById('pref-biz-payment').value;
  if (document.getElementById('pref-biz-upi')) {
    AppState.businessProfile.upiId = document.getElementById('pref-biz-upi').value.trim();
  }

  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(AppState.businessProfile));
  closeSettingsModal();
  updateCalculationsAndPreview();
  showToast('Business Profile saved!', 'success');
}

function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showToast('Image size should be less than 2MB', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    const base64 = evt.target.result;
    AppState.businessProfile.logoBase64 = base64;

    const imgEl = document.getElementById('settings-logo-img');
    const placeholderIcon = document.getElementById('settings-logo-placeholder-icon');
    imgEl.src = base64;
    imgEl.style.display = 'block';
    if (placeholderIcon) placeholderIcon.style.display = 'none';

    updateCalculationsAndPreview();
    showToast('Logo uploaded!', 'info');
  };
  reader.readAsDataURL(file);
}

function handleLogoRemove() {
  AppState.businessProfile.logoBase64 = '';
  document.getElementById('settings-logo-img').style.display = 'none';
  const placeholderIcon = document.getElementById('settings-logo-placeholder-icon');
  if (placeholderIcon) placeholderIcon.style.display = 'block';
  updateCalculationsAndPreview();
  showToast('Logo removed', 'info');
}

function handleQRUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showToast('QR Image size should be less than 2MB', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    const base64 = evt.target.result;
    AppState.businessProfile.customQrBase64 = base64;

    const qrImgEl = document.getElementById('settings-qr-img');
    const qrPlaceholderIcon = document.getElementById('settings-qr-placeholder-icon');
    if (qrImgEl) {
      qrImgEl.src = base64;
      qrImgEl.style.display = 'block';
    }
    if (qrPlaceholderIcon) qrPlaceholderIcon.style.display = 'none';

    showToast('Custom Payment QR Image uploaded!', 'success');
  };
  reader.readAsDataURL(file);
}

function handleQRRemove() {
  AppState.businessProfile.customQrBase64 = '';
  const qrImgEl = document.getElementById('settings-qr-img');
  const qrPlaceholderIcon = document.getElementById('settings-qr-placeholder-icon');
  if (qrImgEl) qrImgEl.style.display = 'none';
  if (qrPlaceholderIcon) qrPlaceholderIcon.style.display = 'block';
  showToast('Custom Payment QR Image removed', 'info');
}

function openFirebaseConfigModal() {
  const cfg = FirebaseAuthManager.getConfig();
  document.getElementById('fb-api-key').value = cfg.apiKey || '';
  document.getElementById('fb-auth-domain').value = cfg.authDomain || '';
  document.getElementById('fb-project-id').value = cfg.projectId || '';

  document.getElementById('modal-firebase-config').classList.add('active');
}

function closeFirebaseConfigModal() {
  document.getElementById('modal-firebase-config').classList.remove('active');
}

function saveCustomFirebaseConfig() {
  const apiKey = document.getElementById('fb-api-key').value.trim();
  const authDomain = document.getElementById('fb-auth-domain').value.trim();
  const projectId = document.getElementById('fb-project-id').value.trim();

  if (!apiKey || !projectId) {
    showToast('Please enter an API Key and Project ID', 'error');
    return;
  }

  const config = {
    apiKey,
    authDomain,
    projectId,
    storageBucket: `${projectId}.appspot.com`,
    messagingSenderId: "123456789012",
    appId: `1:123456789012:web:${projectId}`
  };

  FirebaseAuthManager.saveConfig(config);
  closeFirebaseConfigModal();
  showToast('Firebase Config saved! Reloading app...', 'success');
}

function loadDefaultBusinessProfileToActive() {
  const prof = AppState.businessProfile;
  document.getElementById('biz-name').value = prof.name || '';
  document.getElementById('biz-email').value = prof.email || '';
  document.getElementById('biz-phone').value = prof.phone || '';
  document.getElementById('biz-address').value = prof.address || '';
  document.getElementById('inv-payment-terms').value = prof.paymentTerms || '';
  readFormToState();
  updateCalculationsAndPreview();
  showToast('Loaded business profile defaults', 'info');
}

/* ==========================================================================
   SEND INVOICE TO CLIENT EMAIL MODAL
   ========================================================================== */
function openSendEmailModal(invoice) {
  readFormToState();
  const activeInv = invoice || AppState.activeInvoice;
  if (!activeInv) return;

  // Fill default client email if empty
  const typedClientEmail = document.getElementById('client-email')?.value.trim();
  if (!typedClientEmail || activeInv.clientEmail === 'vrushabhdhote29@gmail.com') {
    activeInv.clientEmail = 'vrushabhdhote088@gmail.com';
    if (document.getElementById('client-email')) {
      document.getElementById('client-email').value = 'vrushabhdhote088@gmail.com';
    }
  }

  // Calculate totals for email body summary
  let subtotal = 0;
  (activeInv.items || []).forEach(i => subtotal += (i.qty || 0) * (i.price || 0));
  let discount = activeInv.discountType === 'percent' ? subtotal * ((activeInv.discountValue || 0) / 100) : (activeInv.discountValue || 0);
  let tax = (subtotal - discount) * ((activeInv.taxRate || 0) / 100);
  let grandTotal = subtotal - discount + tax + (activeInv.shipping || 0);
  let balanceDue = grandTotal - (activeInv.amountPaid || 0);
  const currCode = activeInv.currency || 'USD';

  const recipientEmail = document.getElementById('client-email')?.value || activeInv.clientEmail || 'vrushabhdhote088@gmail.com';
  const subjectText = `Invoice #${activeInv.number || 'INV-001'} from ${activeInv.bizName || 'Apex Studio'}`;
  
  const bodyText = `Dear ${activeInv.clientName || 'Valued Client'},

Please find your invoice details below from ${activeInv.bizName || 'our business'}.

INVOICE SUMMARY
----------------------------------------
Invoice Number : #${activeInv.number || 'INV-001'}
Date Issued    : ${formatDate(activeInv.issueDate)}
Due Date       : ${formatDate(activeInv.dueDate)}
Total Amount   : ${formatCurrency(grandTotal, currCode)}
Balance Due    : ${formatCurrency(balanceDue, currCode)}

PAYMENT INSTRUCTIONS
----------------------------------------
${activeInv.paymentTerms || 'Bank Transfer / ACH'}

${activeInv.notes ? 'NOTES:\n' + activeInv.notes + '\n\n' : ''}Thank you for your business!

Best regards,
${activeInv.bizName || 'Finance Team'}`;

  document.getElementById('send-email-to').value = recipientEmail;
  document.getElementById('send-email-subject').value = subjectText;
  document.getElementById('send-email-body').value = bodyText;

  // Populate EmailJS API credentials if saved
  const cfg = EmailDeliveryService.getConfig();
  if (document.getElementById('emailjs-service-id')) document.getElementById('emailjs-service-id').value = cfg.serviceId || '';
  if (document.getElementById('emailjs-template-id')) document.getElementById('emailjs-template-id').value = cfg.templateId || '';
  if (document.getElementById('emailjs-public-key')) document.getElementById('emailjs-public-key').value = cfg.publicKey || '';

  document.getElementById('modal-send-email').classList.add('active');
}

function closeSendEmailModal() {
  document.getElementById('modal-send-email').classList.remove('active');
}
function openGmailComposeTab() {
  const recipient = document.getElementById('send-email-to').value.trim() || 'vrushabhdhote088@gmail.com';
  const subject = document.getElementById('send-email-subject').value.trim();
  const body = document.getElementById('send-email-body').value.trim();

  if (!recipient) {
    showToast('Please enter recipient client email address', 'error');
    return;
  }

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(gmailUrl, '_blank');
  
  closeSendEmailModal();
  showToast(`✅ Opened Gmail Compose tab prefilled for ${recipient}!`, 'success');
}

async function confirmSendInvoiceEmail() {
  const recipient = document.getElementById('send-email-to').value.trim();
  const subject = document.getElementById('send-email-subject').value.trim();
  const body = document.getElementById('send-email-body').value.trim();

  if (!recipient) {
    showToast('Please enter recipient client email address', 'error');
    document.getElementById('send-email-to').focus();
    return;
  }

  // Save EmailJS configuration if entered
  const serviceId = document.getElementById('emailjs-service-id')?.value.trim() || '';
  const templateId = document.getElementById('emailjs-template-id')?.value.trim() || '';
  const publicKey = document.getElementById('emailjs-public-key')?.value.trim() || '';

  if (serviceId && templateId && publicKey) {
    EmailDeliveryService.saveConfig({ serviceId, templateId, publicKey });
  }

  const btnConfirm = document.getElementById('btn-confirm-send-email');
  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = '<i data-lucide="loader"></i> Opening Gmail...';
  }

  // Open Gmail Web Compose tab directly with all prefilled details
  openGmailComposeTab();

  if (btnConfirm) {
    btnConfirm.disabled = false;
    btnConfirm.innerHTML = '<i data-lucide="send"></i> Send Invoice Email';
  }

  const smtpUser = document.getElementById('smtp-user')?.value.trim() || '';
  const smtpPass = document.getElementById('smtp-pass')?.value.trim() || '';

  const res = await EmailDeliveryService.sendEmail({
    toEmail: recipient,
    toName: AppState.activeInvoice?.clientName || 'Client',
    subject: subject,
    message: body,
    invoiceNumber: AppState.activeInvoice?.number || '001',
    grandTotal: document.getElementById('paper-grand-total')?.textContent || '$0.00',
    smtpUser: smtpUser,
    smtpPass: smtpPass
  });

  if (btnConfirm) {
    btnConfirm.disabled = false;
    btnConfirm.innerHTML = '<i data-lucide="send"></i> Send Invoice Email';
  }

  // Update status badge to Pending / Unpaid if draft
  if (AppState.activeInvoice) {
    if (AppState.activeInvoice.status === 'Draft') {
      AppState.activeInvoice.status = 'Unpaid';
      const statusSelect = document.getElementById('inv-status');
      if (statusSelect) statusSelect.value = 'Unpaid';
      updateCalculationsAndPreview();
    }
  }

  closeSendEmailModal();

  // Show prominent modal alert box so confirmation is 100% unmissable!
  const successMsg = `✅ SUCCESS!\n\nInvoice #${AppState.activeInvoice?.number || 'INV-001'} has been sent to client email:\n${recipient}`;
  alert(successMsg);
  showToast(successMsg.replace(/\n/g, ' '), 'success');
}

function launchMailtoClient() {
  const recipient = document.getElementById('send-email-to').value.trim();
  const subject = document.getElementById('send-email-subject').value.trim();
  const body = document.getElementById('send-email-body').value.trim();

  if (!recipient) {
    showToast('Please enter client recipient email address first', 'error');
    return;
  }

  const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailtoUrl, '_blank');
  showToast(`Opening default email application for ${recipient}...`, 'success');
}

/* ==========================================================================
   UI UTILITIES & HELPERS
   ========================================================================== */
function setWorkspaceMode(mode) {
  const workspace = document.getElementById('workspace-container');
  workspace.classList.remove('mode-editor-only', 'mode-preview-only');

  if (mode === 'editor') {
    workspace.classList.add('mode-editor-only');
  } else if (mode === 'preview') {
    workspace.classList.add('mode-preview-only');
  }
}

function updateTemplateTheme(themeName) {
  const paper = document.getElementById('invoice-paper');
  if (paper) {
    paper.className = `invoice-paper ${themeName}`;
  }
}

function renderClientDropdown() {
  const select = document.getElementById('select-saved-client');
  if (!select) return;

  select.innerHTML = '<option value="">-- Choose Saved Client --</option>';
  AppState.savedClients.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

function updateStatsHeader() {
  const totalCountEl = document.getElementById('stat-total-count');
  const totalPendingEl = document.getElementById('stat-total-pending');
  const totalPaidEl = document.getElementById('stat-total-paid');

  if (!totalCountEl) return;

  totalCountEl.textContent = AppState.savedInvoices.length;

  let pendingSum = 0;
  let paidSum = 0;

  AppState.savedInvoices.forEach(inv => {
    let subtotal = 0;
    (inv.items || []).forEach(i => subtotal += (i.qty || 0) * (i.price || 0));
    let discount = inv.discountType === 'percent' ? subtotal * ((inv.discountValue || 0) / 100) : (inv.discountValue || 0);
    let tax = (subtotal - discount) * ((inv.taxRate || 0) / 100);
    let grandTotal = subtotal - discount + tax + (inv.shipping || 0);

    if (inv.status === 'Paid') {
      paidSum += grandTotal;
    } else {
      pendingSum += grandTotal;
    }
  });

  const activeCurrency = AppState.activeInvoice?.currency || document.getElementById('inv-currency')?.value || 'INR';
  totalPendingEl.textContent = formatCurrency(pendingSum, activeCurrency);
  totalPaidEl.textContent = formatCurrency(paidSum, activeCurrency);
}

function exportDataBackupJSON() {
  const backupData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    user: AppState.currentUser ? AppState.currentUser.email : 'guest',
    profile: AppState.businessProfile,
    invoices: AppState.savedInvoices,
    clients: AppState.savedClients
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `ApexInvoice_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup JSON downloaded!', 'success');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${escapeHTML(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ==========================================================================
   THEME TOGGLE SYSTEM (DARK / LIGHT MODE)
   ========================================================================== */
function initTheme() {
  const savedTheme = localStorage.getItem('apex_theme_mode') || 'light';
  setTheme(savedTheme);
}

function setTheme(theme) {
  const isDark = (theme === 'dark');
  const targetTheme = isDark ? 'dark' : 'light';

  document.documentElement.setAttribute('data-theme', targetTheme);
  document.documentElement.classList.toggle('dark-theme', isDark);
  document.documentElement.classList.toggle('light-theme', !isDark);

  if (document.body) {
    document.body.setAttribute('data-theme', targetTheme);
    document.body.classList.toggle('dark-theme', isDark);
    document.body.classList.toggle('light-theme', !isDark);
  }
  try {
    localStorage.setItem('apex_theme_mode', targetTheme);
  } catch (e) {}

  const text = document.getElementById('theme-toggle-text');
  const icon = document.getElementById('theme-toggle-icon');

  if (text) {
    text.textContent = isDark ? 'Light Mode' : 'Dark Mode';
  }

  if (icon) {
    icon.classList.add('theme-icon-spin');
    icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    if (window.lucide) {
      window.lucide.createIcons();
    }
    setTimeout(() => icon.classList.remove('theme-icon-spin'), 350);
  }
}

function toggleTheme() {
  const currentAttr = document.documentElement.getAttribute('data-theme');
  const currentSaved = localStorage.getItem('apex_theme_mode');
  const activeTheme = currentAttr || currentSaved || 'light';
  const nextTheme = (activeTheme === 'dark') ? 'light' : 'dark';
  setTheme(nextTheme);
  showToast(`Switched to ${nextTheme === 'dark' ? 'Dark Mode 🌙' : 'Light Mode ☀️'}`, 'info');
}

// Bind theme functions to window scope for global onclick compatibility
window.initTheme = initTheme;
window.setTheme = setTheme;
window.toggleTheme = toggleTheme;

/* ==========================================================================
   PAYMENT CHECKOUT MODAL & PROCESSING ENGINE
   ========================================================================== */
function openPaymentCheckoutModal() {
  const inv = AppState.activeInvoice;
  if (!inv) return;

  const modal = document.getElementById('modal-payment-checkout');
  if (!modal) return;

  const amount = (inv.balanceDue || inv.grandTotal || 0).toFixed(2);
  const currency = inv.currency || 'INR';

  document.getElementById('checkout-inv-number').textContent = inv.number ? `#${inv.number}` : '#INV-001';
  document.getElementById('checkout-client-name').textContent = inv.clientName || 'Valued Client';
  document.getElementById('checkout-total-amount').textContent = formatCurrency(amount, currency);

  // Update dynamic or custom QR code & UPI ID
  const qrImg = document.getElementById('checkout-qr-img');
  const upiIdDisplay = document.getElementById('checkout-upi-id-display');
  const prof = AppState.businessProfile || {};
  const activeUpi = prof.upiId || 'apexstudio@okaxis';

  if (qrImg) {
    if (prof.customQrBase64) {
      qrImg.src = prof.customQrBase64;
    } else if (window.PaymentGatewayManager) {
      qrImg.src = window.PaymentGatewayManager.generateUPIQRCodeURL(inv, activeUpi);
    }
  }

  if (upiIdDisplay) {
    upiIdDisplay.textContent = `UPI ID: ${activeUpi}`;
  }

  // Update bank transfer details display
  const bankDisplay = document.getElementById('checkout-bank-details-display');
  if (bankDisplay) {
    if (prof.paymentTerms) {
      bankDisplay.innerHTML = `<div class="font-bold mb-1">Direct Bank Wire / ACH Details:</div>${prof.paymentTerms.replace(/\n/g, '<br>')}`;
    }
  }

  // Setup tab switching
  const tabs = modal.querySelectorAll('.gateway-tab');
  const panes = modal.querySelectorAll('.gateway-pane');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.style.display = 'none');
      const target = e.currentTarget;
      target.classList.add('active');
      const pane = document.getElementById(`pane-${target.dataset.tab}`);
      if (pane) pane.style.display = 'block';
    });
  });

  // Sandbox Test Mode checkbox
  const chkTest = document.getElementById('chk-payment-test-mode');
  if (chkTest && window.PaymentGatewayManager) {
    chkTest.checked = window.PaymentGatewayManager.getTestMode();
    chkTest.onchange = (e) => window.PaymentGatewayManager.setTestMode(e.target.checked);
  }

  // Close handlers
  const closeBtn = document.getElementById('btn-close-payment-checkout');
  if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');

  modal.classList.add('active');
}

async function handlePaymentSuccess(txnResult) {
  const inv = AppState.activeInvoice;
  if (!inv) return;

  inv.status = 'Paid';
  inv.amountPaid = inv.grandTotal || 0;
  inv.transactionId = txnResult.transactionId;
  inv.paidTimestamp = new Date().toLocaleString();

  // Save to active state and database
  readFormToState();
  if (AppState.currentUser && window.FirebaseAuthManager) {
    await window.FirebaseAuthManager.saveUserInvoice(AppState.currentUser.uid, inv);
  }
  
  renderEditorFromState();
  updateCalculationsAndPreview();
  updateStatsHeader();

  const modal = document.getElementById('modal-payment-checkout');
  if (modal) modal.classList.remove('active');

  showToast(`Payment Successful! Txn ID: ${txnResult.transactionId}`, 'success');

  // Trigger automated payment receipt email
  if (window.EmailDeliveryService) {
    window.EmailDeliveryService.sendPaymentConfirmationReceipt(inv, txnResult);
  }
}

// Bind payment submission handlers
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-submit-pay-card')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-submit-pay-card');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader"></i> Processing Card...';
    if (window.lucide) window.lucide.createIcons();

    const res = await window.PaymentGatewayManager.processStripePayment(AppState.activeInvoice);
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="lock"></i> Pay Securely via Stripe Card';
    if (window.lucide) window.lucide.createIcons();

    if (res.success) {
      handlePaymentSuccess(res);
    } else {
      showToast(res.error || 'Card payment failed', 'error');
    }
  });

  document.getElementById('btn-submit-pay-paypal')?.addEventListener('click', async () => {
    const res = await window.PaymentGatewayManager.processPayPalPayment(AppState.activeInvoice);
    if (res.success) handlePaymentSuccess(res);
  });

  document.getElementById('btn-submit-pay-razorpay')?.addEventListener('click', async () => {
    const res = await window.PaymentGatewayManager.processRazorpayPayment(AppState.activeInvoice);
    if (res.success) handlePaymentSuccess(res);
  });

  document.getElementById('btn-submit-pay-bank')?.addEventListener('click', async () => {
    const ref = document.getElementById('pay-bank-ref')?.value || '';
    const res = await window.PaymentGatewayManager.confirmBankOrUPIPayment(AppState.activeInvoice, 'bank', ref);
    if (res.success) handlePaymentSuccess(res);
  });
});
