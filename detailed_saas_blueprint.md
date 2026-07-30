# Deep Codebase Inspection: Missing Modules for an Advanced Legal SaaS

Based on a deep inspection of your codebase (`lexnepal` directory, specifically `src/pages/public`, `admin`, `staff`, `client`, and the `convex-mock.tsx` backend), the current system is an excellent static shell and mock-data prototype. 

To achieve your vision of a **fully dynamic, paperless, enterprise-grade SaaS** that also dynamically manages the law firm's public website, the following modules and features are entirely missing and must be built.

---

## 1. Dynamic Public Website & CMS (Content Management System)
*Current State: The public pages (`HomePage.tsx`, `PracticeAreasPage.tsx`, `BlogPage.tsx`) are hardcoded static files.*

To make the public website dynamic, we need an **Admin CMS Module** that controls the frontend in real-time.

**Missing Features:**
- **Dynamic Site Settings:** An admin page to update the firm's logo, contact number, email, address, and social links. The `PublicLayout.tsx` header/footer should fetch these dynamically.
- **Lawyer Directory Sync:** The `LawyerDirectoryPage.tsx` should automatically pull active lawyers from the HR Database (`LexUser` with roles Partner/Associate) rather than being hardcoded. Admins should be able to add biographies and photos via the HR portal that instantly appear on the website.
- **Practice Area Manager:** Admins need a CRUD (Create, Read, Update, Delete) interface to add new practice areas (e.g., "Cyber Law"), upload icons, and write descriptions that immediately reflect on `PracticeAreasPage.tsx`.
- **Blogging Engine:** A rich text editor (e.g., TipTap or Quill) in the Admin panel to write, draft, and publish legal articles to `BlogPage.tsx`, complete with SEO meta tags, categories, and author linking.
- **Dynamic SEO:** Every public page needs dynamic `<meta>` tags generated from the database for Google indexing.

---

## 2. Paperless Office & Document Automation
*Current State: You can upload a file, give it a version, and link it to a case.*

A true paperless law firm requires automated document creation, not just storage.

**Missing Features:**
- **Document Template Engine:** A system where Admins upload standard legal templates (e.g., *Wakalatanama*, *Fisad*, *NDA*). When an Associate generates a document for a case, the system automatically injects the Client's Name, Case Number, and Court Details into the template.
- **E-Signature Integration:** The ability to send a document to the Client Portal for legally binding digital signatures.
- **OCR (Optical Character Recognition):** When physical evidence is scanned and uploaded as an image or PDF, the system must extract the text so lawyers can use a global search bar to find specific words *inside* the scanned files.
- **Secure File Sharing Links:** Ability to generate a secure, password-protected download link with an expiration date (e.g., "Link expires in 24 hours") to share documents with external opposing counsel.

---

## 3. Advanced Client Intake & CRM
*Current State: `AdminCRMPage.tsx` has a basic kanban board for leads.*

**Missing Features:**
- **Dynamic Form Builder:** Admins should be able to create custom intake questionnaires depending on the practice area (e.g., a "Divorce Intake Form" vs. a "Corporate Registration Form").
- **Automated Digital KYC:** When a lead is converted, they receive an SMS/Email with a secure link to upload their Citizenship/Company Registration and fill out their forms *before* the consultation.
- **Conflict of Interest (COI) Checker:** A global, fuzzy-search engine. Before accepting a new client, staff must run a COI check that scans all current clients, opposing parties, judges, and witnesses to ensure the firm has no legal conflicts.

---

## 4. Nepal-Specific Legal Practice Management
*Current State: We have mock data strings for Bikram Sambat (B.S.) dates.*

**Missing Features:**
- **AD ↔ BS Date Engine:** A systemic date utility. Staff should be able to input court dates in B.S., and the system automatically syncs it to the underlying A.D. database for calendar rendering. 
- **Automated Deadline Calculator:** Based on Nepali law (e.g., Muluki Ain limits), the system should automatically calculate response deadlines (e.g., "15 days to file a response") excluding public holidays (Dashain, Tihar, etc.).
- **SMS Reminders (Sparrow SMS integration):** Automated SMS alerts sent to clients 24 hours before their court hearing (`LexHearing` trigger) or consultation.

---

## 5. Comprehensive Financials & HR
*Current State: We draft invoices from time entries and calculate a flat 13% VAT.*

**Missing Features:**
- **Expense Tracking (Hard vs. Soft Costs):** Staff must be able to log disbursements (e.g., "Rs. 500 Court Filing Fee", "Rs. 200 Courier"). These must automatically attach to the client's next invoice.
- **Payment Gateway API:** The current "Pay Now" button is a mock. We need live API integrations for **eSewa, Khalti, and ConnectIPS** webhook callbacks to automatically mark invoices as `paid` and update the Trust Ledger.
- **HR Payroll with Tax Rules:** The `AdminHRPage` needs a payroll generator that automatically calculates and deducts Social Security Fund (SSF) at 3.33%, Provident Fund, and Nepali income tax brackets from staff salaries.

---

## 6. Communications Sync
*Current State: Internal messaging works in the portal.*

**Missing Features:**
- **Email Integration:** Connect the system via IMAP/SMTP or Microsoft Graph so lawyers can send/receive emails *inside* the SaaS, and save specific emails directly to a `LexCase` file.
- **Video Consultation Integration:** When an online consultation is booked via the public website, the system automatically generates and emails a Zoom or Google Meet link to the client and assigned lawyer.

---

## 7. True SaaS Infrastructure
*Current State: Everything runs on `convex-mock.tsx` in local memory. Refreshing the browser resets everything.*

**Missing Features:**
- **Database Migration:** We must implement the actual Convex backend (or PostgreSQL/Supabase) schemas and replace the mock file.
- **Authentication Realization:** Connecting Clerk.com or Firebase Auth for real logins, password resets, and Multi-Factor Authentication (MFA).
- **Role-Based Access Control (RBAC):** Strict security logic. A Junior Associate should only be able to view cases they are assigned to, whereas a Partner can view the entire firm's caseload and financials.

---

### Conclusion & Next Steps
Your codebase currently has an **A+ User Interface** and strong logical mockups. However, **100% of the true backend automation, CMS, and third-party integrations are missing.**

**Recommendation for Next Immediate Action:**
If you want to start building the "Dynamic SaaS" aspect right now, I highly recommend we start with **Module 1: The CMS & Public Website Integration**. 
We can build the Admin interfaces to dynamically control the Homepage, Practice Areas, and Blog, and wire the public website to read from the database instead of static code.
