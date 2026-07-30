# LexNepal: Advanced SaaS Gap Analysis & Roadmap

As your technical partner, I have reviewed the current state of the LexNepal codebase. We have built an incredible foundation—a unified system featuring a Client Portal, a Staff Portal, and an Admin Console. However, to transform this from a strong prototype into a **fully digitalized, paperless, enterprise-grade SaaS** for Nepali law firms, several critical modules and features are still missing.

Below is a detailed breakdown of the gaps, categorized by module, along with recommendations for the next phases of development.

---

## 1. Core Architecture & SaaS Foundation (The "Engine")

Currently, the system is running on a mock backend (`convex-mock.tsx`) and is structured as a single-firm application.

> [!WARNING]
> **Missing: Multi-Tenancy (Multi-Firm Support)**
> If this is a SaaS product intended to be sold to *multiple* law firms across Nepal, the database architecture must be upgraded to support **Multi-Tenancy**. Currently, the data structure assumes one firm. We need `firmId` tags on every database table so Firm A cannot access Firm B's clients or cases.

> [!IMPORTANT]
> **Missing: Real Infrastructure Integration**
> - **Live Database:** Transition from the local mock to a production-ready database (e.g., Convex, PostgreSQL).
> - **Real Cloud Storage:** Integrate AWS S3 or Convex Storage for secure, encrypted, cloud-based document vaults.
> - **Live Payment Gateways:** Replace the mock payment buttons with real API integrations for eSewa, Khalti, ConnectIPS, and FonePay.

---

## 2. Document & Workflow Automation (The "Paperless" Goal)

To achieve a truly paperless office, storing documents isn't enough; the system must help *create* and *sign* them.

> [!TIP]
> **Missing: Document Assembly & Templating**
> Law firms draft hundreds of standard documents (e.g., *Writ Petitions*, *Power of Attorney (Wakalatanama)*, *Non-Disclosure Agreements*). We need a **Template Engine** that auto-fills client names, case numbers, and court details directly into standard Word/PDF templates.

- **E-Signatures:** Integration with digital signature platforms. Clients should be able to legally sign retainer agreements and POAs directly from their phones in the Client Portal without printing paper.
- **Advanced OCR & Search:** When physical evidence is scanned and uploaded, the system needs Optical Character Recognition (OCR) so lawyers can search for specific words *inside* scanned PDFs.

---

## 3. Nepal-Specific Legal Compliance & Context

The legal system in Nepal has unique requirements that standard western software doesn't address.

- **Bikram Sambat (B.S.) Calendar Integration:** While we have mock strings for B.S. dates, we need a robust, systemic **AD ↔ BS Date Conversion Engine**. Court dates in Nepal are heavily reliant on the B.S. calendar, and the system must handle recurring tasks and deadlines across both calendars flawlessly.
- **Bilingual Interface (English / Nepali):** Many clients and support staff may prefer operating the software in Nepali. A localization (i18n) toggle is required.
- **Court API / Scraping (Future Tech):** Exploring automated scraping or API checks of the Supreme Court / High Court cause lists (*Pesi*) to automatically update hearing statuses in the software.

---

## 4. Advanced Practice Management (Staff Portal)

While we have Tasks, Hearings, and Time Tracking, the day-to-day workflow requires more integration.

> [!CAUTION]
> **Missing: Conflict of Interest Checking System**
> Before taking a new case, a firm must ensure they haven't represented the opposing party. We need a global, fuzzy-search **Conflict Checker** that scans all past clients, opposing counsels, and witnesses instantly.

- **Email & Calendar Sync:** Lawyers live in their inboxes. We need to sync the LexNepal calendar with Google Calendar / Microsoft Outlook, and allow saving emails directly to a Case file.
- **Legal Research Vault:** A centralized internal wiki or knowledge base where associates can save precedents, Supreme Court rulings (N.K.P.), and research notes for future reference.
- **Granular Permissions (RBAC):** Currently, Partners and Associates have the exact same access. We need strict permissions where Junior Associates only see cases assigned to them, while Partners see everything.

---

## 5. Client Experience & Intake (Client Portal & CRM)

The CRM currently tracks leads, but the intake process is manual.

- **Dynamic Client Intake Forms:** When a lead is generated, the system should send them a secure link to fill out their details, upload initial evidence, and complete KYC *before* the first consultation.
- **Client Appointment Booking:** Allow clients to view a Partner's available slots and book paid consultations directly through the portal, integrated with eSewa/Khalti for upfront payment.

---

## 6. Financial & Administrative Control (Admin Portal)

We have basic invoicing and trust ledgers, but a real firm needs comprehensive financial tracking.

- **Expense & Vendor Management:** Tracking office expenses (rent, electricity, printing) and associating specific disbursements (like court filing fees or courier charges) directly to a client's invoice as "Hard Costs."
- **Advanced Analytics & Custom Reports:** A drag-and-drop report builder. Partners need to know: *Which practice area is most profitable? Which associate bills the most hours? What is our realization rate?*
- **Taxation & Payroll Nuances:** Expanding the HR module to fully handle Nepal's tax brackets, Social Security Fund (SSF), Provident Fund, and generating automated payslips.

---

### Executive Summary & Next Steps

LexNepal currently possesses a **highly polished, functional frontend** that covers 70% of standard firm operations. However, it lacks the deep backend automation, third-party API integrations, and multi-tenancy required to be a commercial SaaS.

**If you wish to proceed with development, I recommend prioritizing the following modules:**
1. **Multi-Tenancy & Live Database Migration** (Crucial for SaaS).
2. **Document Assembly & E-Signatures** (Crucial for going Paperless).
3. **Robust AD/BS Calendar System & Email Sync** (Crucial for user adoption).
