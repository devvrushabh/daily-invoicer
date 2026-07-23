# 📄 Daily Invoicer - Professional Billing & Invoice Solution

[![Live Hosted App](https://img.shields.io/badge/Live%20App-https%3A%2F%2Fdaily--invoicer.web.app%2F-2563eb?style=for-the-badge&logo=firebase)](https://daily-invoicer.web.app/)
[![Firebase Hosting](https://img.shields.io/badge/Deploy-Firebase%20Hosting-FFCA28?style=for-the-badge&logo=firebase)](https://daily-invoicer.web.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

**Daily Invoicer** is a modern, high-performance web application designed for freelancers, agencies, and businesses to create, manage, export, and email professional invoices in seconds. Featuring real-time document rendering, user-scoped Firebase authentication, cloud Firestore synchronization, interactive payment gateways, and client email dispatching.

🌐 **Live Application**: [https://daily-invoicer.web.app/](https://daily-invoicer.web.app/)

---

## 🔑 Demo Account Credentials

Experience all cloud features, Firestore invoice saving, and profile synchronization using the pre-configured demo account:

> [!IMPORTANT]
> **Demo Login Credentials**  
> 📧 **Email**: `vrushabhdhote29@gmail.com`  
> 🔑 **Password**: `Vd@12345`

You can sign in using these credentials directly on the application overlay to access saved invoices across devices.

---

## 📸 Screenshots & Visual Overview

### 1. Main Application Dashboard & Live Split Editor
The intuitive split-view layout provides a real-time reactive invoice editor alongside a live document canvas that updates synchronously as you type.

![Daily Invoicer Dashboard](docs/screenshots/app-dashboard.png)

### 2. Saved Invoices Library & Real-Time Sync
Manage all your past invoices with instant search, status filtering (Paid, Pending, Overdue, Draft), one-click duplication, and cloud deletion.

![Saved Invoices Library](docs/screenshots/saved-invoices-modal.png)

### 3. Professional A4 Printable Document & PDF Export
Generate clean, professional invoices complete with customizable color themes, logo upload, payment terms, tax calculations, and status stamps.

![Invoice Document Preview](docs/screenshots/invoice-preview.png)

---

## ✨ Key Features

- **⚡ Real-Time Live Preview Canvas**: Instant visual feedback on every line item, calculation, tax rate, and discount change.
- **🔐 Firebase Authentication & Cloud Sync**:
  - Email & Password Sign-In / Sign-Up with automatic fallback.
  - One-click **Google Sign-In** support.
  - User-scoped **Firestore Cloud Database** synchronization.
- **🌙 Dark / Light Theme Engine**: Smooth 400ms CSS variable transitions with system theme auto-detection.
- **💳 Integrated Multi-Gateway Payment Checkout**:
  - Credit / Debit Card payments via **Stripe**.
  - **PayPal** express checkout.
  - **Razorpay** & Dynamic **UPI QR Code Generator** (GPay, PhonePe, Paytm).
  - Direct Bank Transfer / Wire details.
  - **Sandbox Test Mode** toggle for zero-risk testing.
- **✉️ Direct Client Email Delivery**:
  - One-click prefilled **Gmail Web Compose** tab dispatcher.
  - **EmailJS** API & SMTP direct inbox delivery support.
  - Automated payment confirmation receipts.
- **📄 High-Resolution PDF Export**: Single-click client-side A4 PDF download using `html2pdf.js` and browser print formatting.
- **🏢 Business Profile & Asset Management**: Store default company details, custom logos, payment terms, and payee UPI IDs.
- **💾 Offline Backup & Export**: Export complete account data as portable `.json` backup files.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6+ Modules), CSS3 (Modern HSL Design Tokens & Dark Mode System)
- **Icons & Fonts**: Lucide Icons, Google Fonts (Inter & Outfit)
- **Backend & Cloud**: Firebase v10 SDK (Auth & Cloud Firestore), Python HTTP Server (local test server)
- **Export & Tools**: `html2pdf.js`, Vite, GitHub Actions CI/CD Pipeline
- **Deployment**: Firebase Hosting (`daily-invoicer.web.app`)

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/devvrushabh/daily-invoicer.git
   cd daily-invoicer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start local development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

4. **Build for Production**:
   ```bash
   npm run build
   ```
   The optimized production bundle will be generated in the `dist/` directory.

---

## 🔄 CI/CD & Deployment Pipeline

This repository includes a continuous integration and deployment workflow powered by **GitHub Actions** (`.github/workflows/firebase-hosting-deploy.yml`).

Every `git push` to the `main` branch automatically triggers:
1. Repository checkout (`actions/checkout@v4`)
2. Node.js environment initialization (`actions/setup-node@v4`)
3. Dependency installation (`npm ci`)
4. Production bundle build (`npm run build`)
5. Automatic deployment to **Firebase Hosting** (`FirebaseExtended/action-hosting-deploy@v0`)

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more details.

---

<p align="center">Made with ❤️ by <a href="https://github.com/devvrushabh">Vrushabh Dhote</a></p>
