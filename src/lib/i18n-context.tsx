import React, { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "ne";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation (Admin/Staff)
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
    
    // Common Actions
    "action.add": "Add New",
    "action.edit": "Edit",
    "action.delete": "Delete",
    "action.save": "Save Changes",
    "action.cancel": "Cancel",
    "action.search": "Search...",
    
    // Hearings Page Specific
    "hearings.title": "Court Hearings & Deadlines",
    "hearings.subtitle": "Manage upcoming court appearances and internal deadlines.",
    "hearings.fetch_pesi": "Fetch Court Pesi (Mock)",
    "hearings.date": "Date (AD & BS)",
    "hearings.case": "Case",
    "hearings.court": "Court/Authority",
    "hearings.type": "Type",
    "hearings.assigned": "Assigned To",
  },
  ne: {
    // Navigation (Admin/Staff)
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
    
    // Common Actions
    "action.add": "नयाँ थप्नुहोस्",
    "action.edit": "सम्पादन गर्नुहोस्",
    "action.delete": "मेटाउनुहोस्",
    "action.save": "सुरक्षित गर्नुहोस्",
    "action.cancel": "रद्द गर्नुहोस्",
    "action.search": "खोज्नुहोस्...",
    
    // Hearings Page Specific
    "hearings.title": "अदालतको पेशी र सुनुवाई",
    "hearings.subtitle": "आगामी अदालतको उपस्थिति र आन्तरिक समयसीमा व्यवस्थापन गर्नुहोस्।",
    "hearings.fetch_pesi": "अदालतको पेशी ल्याउनुहोस् (Mock)",
    "hearings.date": "मिति (AD र BS)",
    "hearings.case": "मुद्दा",
    "hearings.court": "अदालत/निकाय",
    "hearings.type": "प्रकार",
    "hearings.assigned": "तोकिएको व्यक्ति",
  }
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
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
