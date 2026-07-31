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
    "nav.time": "Time & Billing",
    "nav.clients": "Clients",
    "nav.appointments": "Appointments",
    "nav.research": "Research Vault",
    "nav.users": "Users",
    "nav.hr": "HR",
    "nav.finance": "Finance",
    "nav.expenses": "Expenses",
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
    "nav.billing": "Billing",
    "nav.book_appointment": "Book Appointment",
    "nav.messages": "Messages",
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
    "client.billing": "Billing & Trust",
    "staff.command_center": "Command Center",
    "common.loading": "Loading...",
    "common.empty": "Nothing here yet.",
    "common.error": "Something went wrong.",
  },
  ne: {
    "nav.dashboard": "ड्यासबोर्ड",
    "nav.cases": "मुद्दाहरू",
    "nav.hearings": "पेशी / सुनुवाई",
    "nav.documents": "कागजातहरू",
    "nav.tasks": "कार्यहरू",
    "nav.time": "समय र बिलिङ",
    "nav.clients": "ग्राहकहरू",
    "nav.appointments": "भेटघाटहरू",
    "nav.research": "अनुसन्धान",
    "nav.users": "प्रयोगकर्ताहरू",
    "nav.hr": "मानव संसाधन",
    "nav.finance": "वित्तीय",
    "nav.expenses": "खर्चहरू",
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
    "nav.billing": "बिलिङ",
    "nav.book_appointment": "भेट बुक गर्नुहोस्",
    "nav.messages": "सन्देशहरू",
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
    "client.billing": "बिलिङ र ट्रस्ट",
    "staff.command_center": "कमाण्ड सेन्टर",
    "common.loading": "लोड हुँदै...",
    "common.empty": "अहिले केही छैन।",
    "common.error": "केही गलत भयो।",
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
