import React, { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "ne";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.cases": "Cases",
    "nav.hearings": "Hearings",
    "nav.documents": "Documents",
    "nav.tasks": "Tasks",
    "nav.checklist": "Checklist",
    "tasks.title": "Tasks",
    "tasks.shown": "shown",
    "tasks.total": "total",
    "tasks.new": "New Task",
    "tasks.due_scan": "Due scan",
    "tasks.view_kanban": "Kanban",
    "tasks.view_list": "List",
    "tasks.view_calendar": "Calendar",
    "tasks.view_workload": "Workload",
    "tasks.archived": "Archived",
    "tasks.restore": "Restore",
    "tasks.watchers": "Watchers",
    "tasks.client_checklist": "Your Checklist",
    "tasks.client_checklist_sub":
      "Action items your legal team shared with you. Contact your lawyer to mark items complete.",
    "tasks.your_items": "Shared action items",
    "tasks.done": "done",
    "tasks.no_client_items": "No checklist items have been shared with you yet.",
    "nav.clients": "Clients",
    "nav.appointments": "Appointments",
    "nav.research": "Research Vault",
    "nav.users": "Users",
    "nav.hr": "HR",
    "nav.crm": "CRM",
    "nav.settings": "Settings",
    "nav.signout": "Sign Out",
    "nav.admin_console": "Admin Console",
    "nav.staff_portal": "Lex Workspace",
    "nav.analytics": "Advanced Analytics",
    "nav.conflict_checker": "Conflict Checker",
    "nav.site_settings": "Site Settings",
    "nav.navigation": "Navigation & Menus",
    "nav.practice_areas": "Practice Areas",
    "nav.testimonials": "Testimonials",
    "nav.public_team": "Public Team",
    "nav.blog_articles": "Blog Articles",
    "nav.careers": "Careers",
    "nav.resources": "Resources",
    "nav.about_page": "About Page",
    "nav.news": "News & Awards",
    "nav.news_awards": "News & Awards",
    "nav.doc_generator": "Doc Generator",
    "nav.document_templates": "Document Templates",
    "nav.audit_log": "Audit Log",
    "nav.kyc": "Identity (KYC)",
    "nav.signatures": "E-Signatures",
    "nav.book_appointment": "Book Appointment",
    "nav.messages": "Messages",
    "nav.notifications": "Notifications",
    "nav.profile": "Profile & Settings",
    "action.add": "Add New",
    "action.edit": "Edit",
    "action.delete": "Delete",
    "action.save": "Save Changes",
    "action.cancel": "Cancel",
    "action.search": "Search...",
    "action.send": "Send",
    "action.pay": "Pay Now",
    "hearings.title": "Court Hearings & Deadlines",
    "hearings.subtitle": "Manage upcoming court appearances and internal deadlines.",
    "hearings.fetch_pesi": "Check Court Pesi Availability",
    "hearings.date": "Date (AD & BS)",
    "hearings.case": "Case",
    "hearings.court": "Court/Authority",
    "hearings.type": "Type",
    "hearings.assigned": "Assigned To",
    "client.welcome": "Welcome back",
    "client.overview": "Here's an overview of your matters.",
    "client.active_cases": "Active Cases",
    "staff.command_center": "Command Center",
    "common.loading": "Loading...",
    "status.active": "Active",
    "status.pending": "Pending",
    "status.closed": "Closed",
    "status.scheduled": "Scheduled",
    "status.completed": "Completed",
    "status.paid": "Paid",
    "status.unpaid": "Unpaid",
    "status.overdue": "Overdue",
    "status.draft": "Draft",
    "status.submitted": "Submitted",
    "status.verified": "Verified",
    "status.rejected": "Rejected",
    "status.signed": "Signed",
    "status.on_hold": "On Hold",
    "status.in_progress": "In Progress",
    "status.todo": "To Do",
    "status.done": "Done",
    "portal.crm.title": "CRM & Lead Pipeline",
    "portal.crm.description": "Capture, qualify, and convert inquiries into clients.",
    "portal.analytics.title": "Advanced Analytics",
    "portal.analytics.description": "Matter, client, lead, task, and hearing performance.",
    "portal.cms.title": "Site Settings & Branding",
    "portal.cms.description": "Firm identity, contact details, and public website configuration.",
    "portal.appointments.title": "Appointments & Calendar",
    "portal.appointments.description":
      "Manage firm schedule, online consultations, and lawyer assignments.",
    "portal.hr.title": "HR Management",
    "portal.hr.description": "Attendance, leave, and payroll for firm staff.",
    "portal.users.title": "User Directory",
    "portal.users.description":
      "Firm identity console — invite, roles, access, and linked records.",
    "portal.cases.title": "Matters & Cases",
    "portal.cases.description": "Active litigation, board view, and matter intake.",
    "portal.hearings.title": "Court Hearings & Deadlines",
    "portal.hearings.description": "Upcoming appearances, Pesi sync, and calendar view.",
    "portal.tasks.title": "Tasks & Work Queue",
    "portal.tasks.description": "Kanban, calendar, and team workload for daily legal operations.",
    "portal.documents.title": "Vault & Documents",
    "portal.documents.description": "Advanced paperless document management and e-signatures.",
    "portal.messages.title": "Client Messages",
    "portal.messages.description": "Matter-threaded conversations with portal clients.",
    "portal.content.title": "Content & Marketing",
    "portal.content.description": "Draft blog articles and news for admin review.",
  },
  ne: {
    "nav.dashboard": "ड्यासबोर्ड",
    "nav.cases": "मुद्दाहरू",
    "nav.hearings": "पेशी / सुनुवाई",
    "nav.documents": "कागजातहरू",
    "nav.tasks": "कार्यहरू",
    "nav.checklist": "चेकलिस्ट",
    "tasks.title": "कार्यहरू",
    "tasks.shown": "देखाइएको",
    "tasks.total": "जम्मा",
    "tasks.new": "नयाँ कार्य",
    "tasks.due_scan": "म्याद जाँच",
    "tasks.view_kanban": "कान्बान",
    "tasks.view_list": "सूची",
    "tasks.view_calendar": "पात्रो",
    "tasks.view_workload": "कार्यभार",
    "tasks.archived": "अभिलेख",
    "tasks.restore": "पुनर्स्थापना",
    "tasks.watchers": "निगरानीकर्ता",
    "tasks.client_checklist": "तपाईंको चेकलिस्ट",
    "tasks.client_checklist_sub":
      "तपाईंको कानुनी टोलीले सेयर गरेका कार्यहरू। पूरा गर्न आफ्नो वकिललाई सम्पर्क गर्नुहोस्।",
    "tasks.your_items": "सेयर गरिएका कार्यहरू",
    "tasks.done": "सम्पन्न",
    "tasks.no_client_items": "अहिलेसम्म कुनै चेकलिस्ट सेयर गरिएको छैन।",
    "nav.clients": "ग्राहकहरू",
    "nav.appointments": "भेटघाटहरू",
    "nav.research": "अनुसन्धान",
    "nav.users": "प्रयोगकर्ताहरू",
    "nav.hr": "मानव संसाधन",
    "nav.crm": "सम्पर्क व्यवस्थापन",
    "nav.settings": "सेटिङहरू",
    "nav.signout": "लग आउट",
    "nav.admin_console": "प्रशासक कन्सोल",
    "nav.staff_portal": "कर्मचारी पोर्टल",
    "nav.analytics": "विश्लेषण",
    "nav.conflict_checker": "द्वन्द्व जाँच",
    "nav.site_settings": "साइट सेटिङ",
    "nav.navigation": "मेनु व्यवस्थापन",
    "nav.practice_areas": "अभ्यास क्षेत्र",
    "nav.testimonials": "प्रशंसापत्र",
    "nav.public_team": "सार्वजनिक टोली",
    "nav.blog_articles": "ब्लग लेखहरू",
    "nav.careers": "करियर",
    "nav.resources": "स्रोतहरू",
    "nav.about_page": "हाम्रोबारे",
    "nav.news": "समाचार र पुरस्कार",
    "nav.news_awards": "समाचार र पुरस्कार",
    "nav.doc_generator": "कागजात जेनेरेटर",
    "nav.document_templates": "कागजात टेम्प्लेट",
    "nav.audit_log": "अडिट लग",
    "nav.kyc": "परिचय (KYC)",
    "nav.signatures": "इ-हस्ताक्षर",
    "nav.book_appointment": "भेट बुक गर्नुहोस्",
    "nav.messages": "सन्देशहरू",
    "nav.notifications": "सूचनाहरू",
    "nav.profile": "प्रोफाइल र सेटिङहरू",
    "action.add": "नयाँ थप्नुहोस्",
    "action.edit": "सम्पादन गर्नुहोस्",
    "action.delete": "मेटाउनुहोस्",
    "action.save": "सुरक्षित गर्नुहोस्",
    "action.cancel": "रद्द गर्नुहोस्",
    "action.search": "खोज्नुहोस्...",
    "action.send": "पठाउनुहोस्",
    "action.pay": "अहिले तिर्नुहोस्",
    "hearings.title": "अदालतको पेशी र सुनुवाई",
    "hearings.subtitle": "आगामी अदालतको उपस्थिति र आन्तरिक समयसीमा व्यवस्थापन गर्नुहोस्।",
    "hearings.fetch_pesi": "अदालतको पेशी उपलब्धता जाँच गर्नुहोस्",
    "hearings.date": "मिति (AD र BS)",
    "hearings.case": "मुद्दा",
    "hearings.court": "अदालत/निकाय",
    "hearings.type": "प्रकार",
    "hearings.assigned": "तोकिएको व्यक्ति",
    "client.welcome": "फेरि स्वागत छ",
    "client.overview": "तपाईंका मुद्दाहरूको सारांश।",
    "client.active_cases": "सक्रिय मुद्दाहरू",
    "staff.command_center": "कमाण्ड सेन्टर",
    "common.loading": "लोड हुँदै...",
    "status.active": "सक्रिय",
    "status.pending": "प्रतीक्षारत",
    "status.closed": "बन्द",
    "status.scheduled": "तालिकाबद्ध",
    "status.completed": "सम्पन्न",
    "status.paid": "भुक्तानी भएको",
    "status.unpaid": "बाँकी",
    "status.overdue": "म्याद नाघेको",
    "status.draft": "मस्यौदा",
    "status.submitted": "पेश गरिएको",
    "status.verified": "प्रमाणित",
    "status.rejected": "अस्वीकृत",
    "status.signed": "हस्ताक्षरित",
    "status.on_hold": "स्थगित",
    "status.in_progress": "प्रगतिमा",
    "status.todo": "गर्न बाँकी",
    "status.done": "सम्पन्न",
    "portal.crm.title": "ग्राहक सम्बन्ध र लीड पाइपलाइन",
    "portal.crm.description": "सोधपुछ संकलन, योग्यता जाँच, र ग्राहक रूपान्तरण।",
    "portal.analytics.title": "उन्नत विश्लेषण",
    "portal.analytics.description": "फर्म प्रदर्शन, राजस्व मेट्रिक, र उपयोगिता ट्र्याकिङ।",
    "portal.cms.title": "साइट सेटिङ र ब्रान्डिङ",
    "portal.cms.description": "फर्म पहिचान, सम्पर्क विवरण, र सार्वजनिक वेबसाइट कन्फिगरेसन।",
    "portal.appointments.title": "भेटघाट र पात्रो",
    "portal.appointments.description": "फर्म तालिका, अनलाइन परामर्श, र वकिल तोकाइ व्यवस्थापन।",
    "portal.hr.title": "मानव संसाधन व्यवस्थापन",
    "portal.hr.description": "हाजिरी, बिदा, र फर्म कर्मचारीको तलब।",
    "portal.users.title": "प्रयोगकर्ता निर्देशिका",
    "portal.users.description":
      "फर्म पहिचान कन्सोल — निमन्त्रणा, भूमिका, पहुँच, र लिङ्क गरिएका रेकर्ड।",
    "portal.cases.title": "मुद्दा व्यवस्थापन",
    "portal.cases.description": "सक्रिय मुद्दा, बोर्ड दृश्य, र नयाँ मुद्दा दर्ता।",
    "portal.hearings.title": "अदालतको पेशी र म्याद",
    "portal.hearings.description": "आगामी पेशी, पेसी सिंक, र पात्रो दृश्य।",
    "portal.tasks.title": "कार्य र कार्य सूची",
    "portal.tasks.description": "कान्बान, पात्रो, र दैनिक कानुनी कार्यका लागि टोली कार्यभार।",
    "portal.documents.title": "भल्ट र कागजातहरू",
    "portal.documents.description": "उन्नत पेपरलेस कागजात व्यवस्थापन र ई-हस्ताक्षर।",
    "portal.messages.title": "ग्राहक सन्देशहरू",
    "portal.messages.description": "पोर्टल ग्राहकसँग मुद्दा-थ्रेड गरिएका कुराकानी।",
    "portal.content.title": "सामग्री र मार्केटिङ",
    "portal.content.description":
      "प्रशासक समीक्षाका लागि ब्लग लेख र समाचार मस्यौदा तयार गर्नुहोस्।",
  },
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("lexnepal_lang");
      return saved === "ne" ? "ne" : "en";
    } catch {
      return "en";
    }
  });

  const t = (key: string): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  const setLanguagePersist = (lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem("lexnepal_lang", lang);
    } catch {
      /* ignore */
    }
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage: setLanguagePersist, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
