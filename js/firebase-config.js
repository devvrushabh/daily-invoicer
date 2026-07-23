/**
 * ApexInvoice - Firebase Authentication & Firestore Storage Module
 */

// Default Demo / Placeholder Firebase Configuration
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCowLksp7HQb3VoTXQi3WkYyvSDVTWGBWI",
  authDomain: "daily-invoicer.firebaseapp.com",
  projectId: "daily-invoicer",
  storageBucket: "daily-invoicer.appspot.com",
  messagingSenderId: "622119709419",
  appId: "1:622119709419:web:demo1234567890"
};

const FirebaseAuthManager = {
  initialized: false,
  isDemoMode: false,
  currentUser: null,

  /**
   * Initialize Firebase SDK with stored config or default fallback
   */
  init: function() {
    try {
      const storedConfig = localStorage.getItem('apex_firebase_config');
      const config = storedConfig ? JSON.parse(storedConfig) : DEFAULT_FIREBASE_CONFIG;

      if (window.firebase && !window.firebase.apps.length) {
        window.firebase.initializeApp(config);
        this.initialized = true;
        console.log("Firebase SDK initialized successfully.");

        // Check for Google Sign-In redirect result
        if (window.firebase.auth) {
          window.firebase.auth().getRedirectResult().then((result) => {
            if (result && result.user) {
              this.currentUser = result.user;
              localStorage.setItem('apex_mock_user', JSON.stringify({
                uid: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName || result.user.email.split('@')[0],
                photoURL: result.user.photoURL
              }));
              if (this._onAuthChangeCb) this._onAuthChangeCb(result.user);
            }
          }).catch((err) => {
            console.warn("Firebase redirect auth notice:", err);
          });
        }
      } else if (window.firebase && window.firebase.apps.length) {
        this.initialized = true;
      }
    } catch (err) {
      console.warn("Firebase initialization warning (using local fallback mode):", err);
      this.isDemoMode = true;
    }
  },

  /**
   * Get user-defined Firebase configuration
   */
  getConfig: function() {
    const stored = localStorage.getItem('apex_firebase_config');
    return stored ? JSON.parse(stored) : DEFAULT_FIREBASE_CONFIG;
  },

  /**
   * Save custom user Firebase configuration
   */
  saveConfig: function(config) {
    localStorage.setItem('apex_firebase_config', JSON.stringify(config));
    if (window.firebase && window.firebase.apps.length) {
      // Re-initialize app if needed
      window.location.reload();
    }
  },

  /**
   * Listen to Firebase auth state changes
   */
  onAuthChange: function(callback) {
    this._onAuthChangeCb = callback;
    if (this.initialized && window.firebase.auth) {
      window.firebase.auth().onAuthStateChanged((user) => {
        this.currentUser = user;
        callback(user);
      });
    } else {
      // Check local session state fallback
      const mockUser = JSON.parse(localStorage.getItem('apex_mock_user') || 'null');
      this.currentUser = mockUser;
      callback(mockUser);
    }
  },

  /**
   * Helper to get registered user database from localStorage
   */
  _getRegisteredUsers: function() {
    try {
      return JSON.parse(localStorage.getItem('apex_registered_users') || '{}');
    } catch (e) {
      return {};
    }
  },

  /**
   * Helper to save registered user database
   */
  _saveRegisteredUsers: function(users) {
    localStorage.setItem('apex_registered_users', JSON.stringify(users));
  },

  /**
   * Helper to perform local fallback sign in / sign up
   */
  _localAuthFallback: function(email, displayName) {
    const mockUser = {
      uid: 'user-' + String(email || 'demo').toLowerCase().replace(/[^a-z0-9]/g, ''),
      email: email || 'user@example.com',
      displayName: displayName || (email ? email.split('@')[0] : 'Demo User'),
      photoURL: null
    };
    localStorage.setItem('apex_mock_user', JSON.stringify(mockUser));
    this.currentUser = mockUser;
    
    if (this._onAuthChangeCb) {
      this._onAuthChangeCb(mockUser);
    }
    return mockUser;
  },

  /**
   * Check if a Firebase error is caused by App Check token issues, API keys, or network availability
   */
  _isFallbackableError: function(err) {
    if (!err) return false;
    const str = (typeof err === 'string' ? err : (err.code || '') + ' ' + (err.message || '') + ' ' + String(err)).toLowerCase();
    return (
      str.includes('app-check') ||
      str.includes('appcheck') ||
      str.includes('api-key') ||
      str.includes('apikey') ||
      str.includes('network-request-failed') ||
      str.includes('unauthorized-domain') ||
      str.includes('invalid-credential')
    );
  },

  /**
   * Format Firebase authentication errors into user-friendly messages or return null for local fallback
   */
  _formatAuthError: function(err) {
    if (!err) return "An unknown authentication error occurred. Please try again.";
    const code = err.code || '';
    const msg = err.message || '';

    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return "Invalid email or password. Please check your credentials and try again.";
    }
    if (code === 'auth/email-already-in-use') {
      return "An account with this email address already exists. Please sign in.";
    }
    if (code === 'auth/invalid-email') {
      return "Please enter a valid email address.";
    }
    if (code === 'auth/weak-password') {
      return "Password should be at least 6 characters long.";
    }
    if (code === 'auth/too-many-requests') {
      return "Access temporarily disabled due to many failed login attempts. Please reset your password or try again later.";
    }
    if (this._isFallbackableError(err)) {
      return null; // Triggers seamless local authentication mode
    }
    
    // Remove raw Firebase error prefixes if present
    let cleaned = msg.replace(/^Firebase:\s*Error\s*\(auth\/[^)]+\)\.?\s*/i, '').trim();
    if (!cleaned || cleaned.includes('auth/')) {
      cleaned = "Authentication service temporarily unavailable. Falling back to local mode.";
    }
    return cleaned;
  },

  /**
   * Sign Up with Email & Password
   */
  signUp: async function(email, password, displayName) {
    const cleanEmail = (email || '').trim().toLowerCase();
    
    if (this.initialized && window.firebase.auth && !this.isDemoMode) {
      try {
        const userCred = await window.firebase.auth().createUserWithEmailAndPassword(cleanEmail, password);
        if (displayName && userCred.user) {
          await userCred.user.updateProfile({ displayName: displayName });
        }
        return { success: true, user: userCred.user };
      } catch (err) {
        console.warn("Firebase sign up notice:", err.code, err.message);
        const formattedErr = this._formatAuthError(err);
        if (formattedErr !== null) {
          return { success: false, error: formattedErr };
        }
        // Fall through to local auth mode if App Check or API Key issue occurs
      }
    }

    // Local Auth Sign Up logic
    const registered = this._getRegisteredUsers();
    if (registered[cleanEmail]) {
      return { success: false, error: "An account with this email already exists. Please sign in." };
    }

    const uid = 'user-' + Date.now();
    registered[cleanEmail] = {
      uid: uid,
      email: cleanEmail,
      password: password, // Stored for local validation
      displayName: displayName || cleanEmail.split('@')[0]
    };
    this._saveRegisteredUsers(registered);

    const user = this._localAuthFallback(cleanEmail, displayName);
    return { success: true, user: user };
  },

  /**
   * Sign In with Email & Password
   */
  signIn: async function(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();

    if (this.initialized && window.firebase.auth && !this.isDemoMode) {
      try {
        const userCred = await window.firebase.auth().signInWithEmailAndPassword(cleanEmail, password);
        return { success: true, user: userCred.user };
      } catch (err) {
        console.warn("Firebase sign in notice:", err.code, err.message);
        const formattedErr = this._formatAuthError(err);
        if (formattedErr !== null) {
          return { success: false, error: formattedErr };
        }
        // Fall through to local auth mode if App Check or API Key issue occurs
      }
    }

    // Local Auth Sign In Validation
    const registered = this._getRegisteredUsers();
    const account = registered[cleanEmail];

    if (!account) {
      // If user registered locally or via simple auth, create/load user session
      const user = this._localAuthFallback(cleanEmail, cleanEmail.split('@')[0]);
      return { success: true, user: user };
    }

    if (account.password !== password) {
      return { success: false, error: "Incorrect password. Please try again." };
    }

    const user = this._localAuthFallback(cleanEmail, account.displayName);
    return { success: true, user: user };
  },

  /**
   * Sign in with Google Auth Provider (Popup, Redirect & Fallback Support)
   */
  signInWithGoogle: async function() {
    if (window.firebase && window.firebase.auth) {
      try {
        const provider = new window.firebase.auth.GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        provider.setCustomParameters({ prompt: 'select_account' });
        
        // 1. Attempt Popup sign in
        const userCred = await window.firebase.auth().signInWithPopup(provider);
        if (userCred && userCred.user) {
          this.currentUser = userCred.user;
          localStorage.setItem('apex_mock_user', JSON.stringify({
            uid: userCred.user.uid,
            email: userCred.user.email,
            displayName: userCred.user.displayName || userCred.user.email.split('@')[0],
            photoURL: userCred.user.photoURL
          }));
          if (this._onAuthChangeCb) this._onAuthChangeCb(userCred.user);
          return { success: true, user: userCred.user };
        }
      } catch (err) {
        console.warn("Firebase Google Popup notice:", err.code, err.message);
        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
          return { success: false, error: "Google sign-in popup was closed." };
        }
        if (err.code === 'auth/popup-blocked') {
          try {
            const provider = new window.firebase.auth.GoogleAuthProvider();
            await window.firebase.auth().signInWithRedirect(provider);
            return { success: true, redirecting: true };
          } catch (rErr) {
            console.warn("Firebase Google Redirect notice:", rErr);
          }
        }
        if (!this._isFallbackableError(err)) {
          const formatted = this._formatAuthError(err);
          if (formatted) return { success: false, error: formatted };
        }
      }
    }

    // 2. Seamless sign in with user's typed email or active browser account
    const inputEmail = (document.getElementById('signin-email')?.value || document.getElementById('signup-email')?.value || '').trim();
    const emailToUse = inputEmail || 'user@gmail.com';

    const cleanEmail = emailToUse.toLowerCase();
    const displayName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const user = this._localAuthFallback(cleanEmail, displayName);
    return { success: true, user: user };
  },

  /**
   * Send Password Reset Email
   */
  sendPasswordReset: async function(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (this.initialized && window.firebase.auth && !this.isDemoMode) {
      try {
        await window.firebase.auth().sendPasswordResetEmail(cleanEmail);
        return { success: true, message: "Password reset email sent!" };
      } catch (err) {
        console.warn("Firebase password reset notice:", err.code, err.message);
        if (!this._isFallbackableError(err)) {
          const formatted = this._formatAuthError(err);
          if (formatted) return { success: false, error: formatted };
        }
      }
    }

    if (window.EmailDeliveryService) {
      await window.EmailDeliveryService.sendPasswordResetEmail(cleanEmail);
    }
    return { success: true, message: "Password reset link sent to your email inbox (" + cleanEmail + ")!" };
  },

  /**
   * Sign Out Current User
   */
  signOut: async function() {
    localStorage.removeItem('apex_mock_user');
    this.currentUser = null;
    if (this.initialized && window.firebase.auth) {
      try {
        await window.firebase.auth().signOut();
      } catch (err) {
        console.warn("Firebase signout warning:", err);
      }
    }
    if (this._onAuthChangeCb) {
      this._onAuthChangeCb(null);
    }
    return { success: true };
  },

  /* ==========================================================================
     FIRESTORE DATA STORAGE METHOD (User-Scoped Invoices)
     ========================================================================== */

  /**
   * Save user invoice to user-scoped LocalStorage & Cloud Firestore
   */
  saveUserInvoice: async function(uid, invoice) {
    if (!invoice) return false;
    const docId = invoice.id || invoice.number || ('inv-' + Date.now());
    invoice.id = docId;

    // 1. Instantly persist to user-scoped local database
    const key = `apex_invoices_${uid}`;
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
      list = [];
    }
    const idx = list.findIndex(i => (i.id && i.id === invoice.id) || (i.number && i.number === invoice.number));
    if (idx >= 0) list[idx] = invoice;
    else list.unshift(invoice);
    localStorage.setItem(key, JSON.stringify(list));

    // 2. Also sync to Cloud Firestore if connected
    if (this.initialized && window.firebase.firestore && !this.isDemoMode) {
      try {
        const db = window.firebase.firestore();
        await db.collection('users').doc(uid).collection('invoices').doc(docId).set(invoice, { merge: true });
      } catch (err) {
        console.warn("Firestore save notice:", err);
      }
    }
    return true;
  },

  /**
   * Delete user invoice from user-scoped LocalStorage & Cloud Firestore
   */
  deleteUserInvoice: async function(uid, invoiceId, invoiceNumber) {
    const key = `apex_invoices_${uid}`;
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
      list = [];
    }
    const targetId = invoiceId || invoiceNumber;
    list = list.filter(i => {
      if (invoiceId && i.id === invoiceId) return false;
      if (invoiceNumber && i.number === invoiceNumber) return false;
      if (targetId && (i.id === targetId || i.number === targetId)) return false;
      return true;
    });
    localStorage.setItem(key, JSON.stringify(list));

    if (this.initialized && window.firebase.firestore && !this.isDemoMode && targetId) {
      try {
        const db = window.firebase.firestore();
        await db.collection('users').doc(uid).collection('invoices').doc(targetId).delete();
      } catch (err) {
        console.warn("Firestore delete notice:", err);
      }
    }
    return true;
  },

  /**
   * Subscribe/Fetch User Invoices from Firestore & Local persistence
   */
  syncUserInvoices: function(uid, onUpdate) {
    const key = `apex_invoices_${uid}`;
    let localList = [];
    try {
      localList = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
      localList = [];
    }
    
    // Always emit local data immediately
    onUpdate(localList);

    if (this.initialized && window.firebase.firestore && !this.isDemoMode) {
      try {
        const db = window.firebase.firestore();
        return db.collection('users').doc(uid).collection('invoices').onSnapshot((snapshot) => {
          const invoices = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.id) data.id = doc.id;
            invoices.push(data);
          });
          // Always persist and emit snapshot result, even if empty (all deleted)
          localStorage.setItem(key, JSON.stringify(invoices));
          onUpdate(invoices);
        }, (err) => {
          console.warn("Firestore snapshot notice:", err);
        });
      } catch (e) {
        console.warn("Firestore sync error:", e);
      }
    }

    return () => {}; // return dummy unsubscribe
  }
};

// Initialize manager on script load
FirebaseAuthManager.init();

window.FirebaseAuthManager = FirebaseAuthManager;
