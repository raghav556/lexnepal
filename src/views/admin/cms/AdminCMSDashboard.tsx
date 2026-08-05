import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useCmsCommands, useCmsSettings } from "@/client/queries/cms";
import { Save, Globe, Phone, Mail, MapPin, Image as ImageIcon, Palette, Search, Smartphone, AlertCircle, Shield, Clock } from "lucide-react";
import { toast } from "sonner";
import { FadeInUp } from "@/components/ui/animations.tsx";

// Helper for real-time image preview
const ImagePreview = ({ url, fallbackText }: { url: string; fallbackText: string }) => {
  const [error, setError] = useState(false);
  useEffect(() => setError(false), [url]);

  if (!url || error) {
    return (
      <div className="mt-2 w-full h-32 rounded-lg border-2 border-dashed border-border bg-muted/20 flex flex-col items-center justify-center text-muted-foreground">
        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
        <span className="text-sm font-medium">{fallbackText}</span>
      </div>
    );
  }

  return (
    <div className="mt-2 relative w-full h-32 rounded-lg border border-border overflow-hidden bg-muted/10 group">
      <img 
        src={url} 
        alt="Preview" 
        className="w-full h-full object-contain"
        onError={() => setError(true)}
      />
      <div className="absolute inset-0 bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-sm font-semibold">Image Preview Active</span>
      </div>
    </div>
  );
};

// Premium Law Firm Color Swatches
const PREDEFINED_COLORS = [
  { name: "Executive Navy", hex: "#0f172a" },
  { name: "Royal Purple", hex: "#3b0764" },
  { name: "Slate Blue", hex: "#334155" },
  { name: "Burgundy", hex: "#7f1d1d" },
  { name: "Emerald", hex: "#064e3b" },
  { name: "Charcoal", hex: "#171717" },
];

export default function AdminCMSDashboard() {
  const settings = useCmsSettings("admin");
  const { updateSettings } = useCmsCommands();

  const [formData, setFormData] = useState({
    firmName: "", tagline: "", email: "", phone: "", address: "",
    facebookUrl: "", linkedinUrl: "", twitterUrl: "", instagramUrl: "", tiktokUrl: "", youtubeUrl: "",
    logoUrl: "", faviconUrl: "", heroImageUrl: "", primaryColor: "",
    seoMetaDescription: "", seoTitleFormat: "", googleAnalyticsId: "",
    mobileAppBannerVisible: false, mobileAppTitle: "", mobileAppDescription: "", mobileAppPlayStoreUrl: "", mobileAppAppStoreUrl: "",
    announcementVisible: false, announcementText: "", announcementLink: "",
    businessHoursText: "", timezone: "Asia/Kathmandu", emergencyPhone: "", emergencyText: "",
    privacyPolicyUrl: "", termsOfServiceUrl: "", cookieConsentEnabled: true,
    maintenanceModeEnabled: false, maintenanceMessage: "", facebookPixelId: "", liveChatWidgetScript: ""
  });

  const [initialData, setInitialData] = useState(formData);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      const data = {
        firmName: settings.firmName || "", tagline: settings.tagline || "", email: settings.email || "", phone: settings.phone || "", address: settings.address || "",
        facebookUrl: settings.facebookUrl || "", linkedinUrl: settings.linkedinUrl || "", twitterUrl: settings.twitterUrl || "", instagramUrl: settings.instagramUrl || "", tiktokUrl: settings.tiktokUrl || "", youtubeUrl: settings.youtubeUrl || "",
        logoUrl: settings.logoUrl || "", faviconUrl: settings.faviconUrl || "", heroImageUrl: settings.heroImageUrl || "", primaryColor: settings.primaryColor || "#3b0764",
        seoMetaDescription: settings.seoMetaDescription || "", seoTitleFormat: settings.seoTitleFormat || "", googleAnalyticsId: settings.googleAnalyticsId || "",
        mobileAppBannerVisible: settings.mobileAppBannerVisible || false, mobileAppTitle: settings.mobileAppTitle || "Srimar Law Mobile App", mobileAppDescription: settings.mobileAppDescription || "Get legal assistance at your fingertips. Coming soon to iOS and Android.", mobileAppPlayStoreUrl: settings.mobileAppPlayStoreUrl || "", mobileAppAppStoreUrl: settings.mobileAppAppStoreUrl || "",
        announcementVisible: settings.announcementVisible || false, announcementText: settings.announcementText || "", announcementLink: settings.announcementLink || "",
        businessHoursText: settings.businessHoursText || "", timezone: settings.timezone || "Asia/Kathmandu", emergencyPhone: settings.emergencyPhone || "", emergencyText: settings.emergencyText || "",
        privacyPolicyUrl: settings.privacyPolicyUrl || "", termsOfServiceUrl: settings.termsOfServiceUrl || "", cookieConsentEnabled: settings.cookieConsentEnabled ?? true,
        maintenanceModeEnabled: settings.maintenanceModeEnabled || false, maintenanceMessage: settings.maintenanceMessage || "", facebookPixelId: settings.facebookPixelId || "", liveChatWidgetScript: settings.liveChatWidgetScript || ""
      };
      setFormData(data);
      setInitialData(data);
    }
  }, [JSON.stringify(settings)]);

  useEffect(() => {
    setHasUnsavedChanges(JSON.stringify(formData) !== JSON.stringify(initialData));
  }, [formData, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings(formData as any);
      setInitialData(formData);
      setHasUnsavedChanges(false);
      toast.success("CMS settings updated successfully.");
    } catch (error) {
      toast.error("Failed to update CMS settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const discardChanges = () => {
    setFormData(initialData);
    setHasUnsavedChanges(false);
    toast.info("Changes discarded.");
  };

  if (!settings) return <div className="p-3 sm:p-6 text-muted-foreground animate-pulse">Loading premium settings...</div>;

  const settingsTabs = [
    { value: "general", label: "General", short: "General", icon: Globe },
    { value: "branding", label: "Branding & Media", short: "Branding", icon: Palette },
    { value: "socials", label: "Contact & Socials", short: "Contact", icon: Mail },
    { value: "seo", label: "SEO & Analytics", short: "SEO", icon: Search },
    { value: "mobile", label: "Mobile App", short: "Mobile", icon: Smartphone },
    { value: "notifications", label: "Notifications & Hours", short: "Hours", icon: AlertCircle },
    { value: "advanced", label: "Advanced & Legal", short: "Advanced", icon: Shield },
  ] as const;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] pb-24 w-full min-w-0 overflow-x-hidden">
      <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 min-w-0">
        
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-foreground">Site Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage global website configuration, branding, and SEO properties.</p>
        </div>

        <Tabs defaultValue="general" className="w-full min-w-0 gap-0">
          {/* Horizontal scroll on phone — avoids tall stacked nav pushing content below fold */}
          <div className="mb-4 sm:mb-6 -mx-1 px-1 min-w-0">
            <TabsList className="w-full max-w-full h-auto justify-start gap-1 p-1 bg-muted/50 border border-border rounded-lg inline-flex flex-nowrap overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:thin]">
              {settingsTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="shrink-0 py-2 px-2.5 sm:px-4 gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=inactive]:bg-transparent hover:bg-background/50"
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="sm:hidden">{tab.short}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <form id="settings-form" onSubmit={handleSubmit}>
            
            {/* GENERAL TAB */}
            <TabsContent value="general">
              <FadeInUp>
                <Card className="border-border">
                  <CardHeader className="bg-muted/30 border-b pb-4">
                    <CardTitle className="text-lg sm:text-xl">General Information</CardTitle>
                    <CardDescription>This information appears on the homepage and global headers.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    <div className="grid gap-2">
                      <label className="text-sm font-semibold">Firm Name</label>
                      <Input type="text" value={formData.firmName} onChange={(e) => setFormData({ ...formData, firmName: e.target.value })} required />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-semibold">Tagline / Slogan</label>
                      <Input type="text" value={formData.tagline} onChange={(e) => setFormData({ ...formData, tagline: e.target.value })} />
                    </div>
                  </CardContent>
                </Card>
              </FadeInUp>
            </TabsContent>

            {/* BRANDING TAB */}
            <TabsContent value="branding" className="space-y-6">
              <FadeInUp>
                <Card className="border-border">
                  <CardHeader className="bg-muted/30 border-b pb-4">
                    <CardTitle className="text-lg sm:text-xl">Theme Engine</CardTitle>
                    <CardDescription>Select the primary color scheme that drives the entire application.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid gap-4">
                      <label className="text-sm font-semibold">Primary Brand Color</label>
                      <div className="flex flex-wrap gap-4 items-center">
                        <Input 
                          type="color" 
                          value={formData.primaryColor} 
                          onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                          className="w-16 h-12 p-1 cursor-pointer"
                        />
                        <Input 
                          type="text" 
                          value={formData.primaryColor} 
                          onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                          className="w-32 font-mono uppercase"
                        />
                        <div className="flex flex-wrap gap-2 sm:border-l sm:border-border sm:pl-4">
                          {PREDEFINED_COLORS.map(color => (
                            <button
                              key={color.hex}
                              type="button"
                              title={color.name}
                              onClick={() => setFormData({ ...formData, primaryColor: color.hex })}
                              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 shrink-0 ${formData.primaryColor.toLowerCase() === color.hex ? 'border-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-background' : 'border-transparent'}`}
                              style={{ backgroundColor: color.hex }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader className="bg-muted/30 border-b pb-4">
                    <CardTitle className="text-lg sm:text-xl">Brand Assets (Media)</CardTitle>
                    <CardDescription>Upload or link media files to customize the site's look and feel.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Firm Logo URL</label>
                      <Input type="url" value={formData.logoUrl} onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })} placeholder="https://example.com/logo.png" />
                      <ImagePreview url={formData.logoUrl} fallbackText="No Logo Provided" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Favicon URL</label>
                      <Input type="url" value={formData.faviconUrl} onChange={(e) => setFormData({ ...formData, faviconUrl: e.target.value })} placeholder="https://example.com/favicon.ico" />
                      <ImagePreview url={formData.faviconUrl} fallbackText="No Favicon Provided" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-semibold">Hero Background Image URL</label>
                      <Input type="url" value={formData.heroImageUrl} onChange={(e) => setFormData({ ...formData, heroImageUrl: e.target.value })} placeholder="https://example.com/hero-bg.jpg" />
                      <ImagePreview url={formData.heroImageUrl} fallbackText="No Hero Image Provided" />
                      <p className="text-xs text-muted-foreground mt-1">Leave blank to use the default gradient.</p>
                    </div>
                  </CardContent>
                </Card>
              </FadeInUp>
            </TabsContent>

            {/* CONTACT & SOCIALS TAB */}
            <TabsContent value="socials" className="space-y-6">
              <FadeInUp>
                <Card className="border-border">
                  <CardHeader className="bg-muted/30 border-b pb-4">
                    <CardTitle className="text-lg sm:text-xl">Contact Information</CardTitle>
                    <CardDescription>Displayed in the footer and contact page.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                      <label className="text-sm font-semibold flex items-center gap-2"><Mail className="w-4 h-4"/> Public Email</label>
                      <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-semibold flex items-center gap-2"><Phone className="w-4 h-4"/> Support Phone</label>
                      <Input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <label className="text-sm font-semibold flex items-center gap-2"><MapPin className="w-4 h-4"/> Physical Address</label>
                      <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader className="bg-muted/30 border-b pb-4">
                    <CardTitle className="text-lg sm:text-xl">Social Links</CardTitle>
                    <CardDescription>Optional URLs for social media integration.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['facebookUrl', 'linkedinUrl', 'twitterUrl', 'instagramUrl', 'tiktokUrl', 'youtubeUrl'].map((field) => (
                      <div key={field} className="grid gap-2">
                        <label className="text-sm font-semibold capitalize">{field.replace('Url', '')} URL</label>
                        <Input type="url" value={(formData as any)[field]} onChange={(e) => setFormData({ ...formData, [field]: e.target.value })} placeholder={`https://${field.replace('Url', '')}.com/...`} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </FadeInUp>
            </TabsContent>

            {/* SEO & ANALYTICS TAB */}
            <TabsContent value="seo">
              <FadeInUp>
                <Card className="border-border">
                  <CardHeader className="bg-muted/30 border-b pb-4">
                    <CardTitle className="text-lg sm:text-xl">SEO & Analytics</CardTitle>
                    <CardDescription>Optimize search engine visibility and track visitors.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid gap-2">
                      <label className="text-sm font-semibold">Global Meta Description</label>
                      <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.seoMetaDescription} onChange={(e) => setFormData({ ...formData, seoMetaDescription: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="grid gap-2">
                        <label className="text-sm font-semibold">SEO Title Format</label>
                        <Input type="text" value={formData.seoTitleFormat} onChange={(e) => setFormData({ ...formData, seoTitleFormat: e.target.value })} placeholder="Firm Name | %s" />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-semibold">Google Analytics ID</label>
                        <Input type="text" value={formData.googleAnalyticsId} onChange={(e) => setFormData({ ...formData, googleAnalyticsId: e.target.value })} placeholder="G-XXXXXXXXXX" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeInUp>
            </TabsContent>

            {/* MOBILE APP TAB */}
            <TabsContent value="mobile">
              <FadeInUp>
                <Card className="border-border">
                  <CardHeader className="bg-muted/30 border-b pb-4">
                    <CardTitle className="text-lg sm:text-xl">Mobile App Banner</CardTitle>
                    <CardDescription>Configure the "Coming Soon" mobile app section on the homepage.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-lg">
                      <div>
                        <p className="font-semibold text-sm">Show Mobile App Banner</p>
                        <p className="text-xs text-muted-foreground mt-1">Toggle to display the coming soon section.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={formData.mobileAppBannerVisible} onChange={(e) => setFormData({ ...formData, mobileAppBannerVisible: e.target.checked })} />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {formData.mobileAppBannerVisible && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                        <div className="grid gap-2">
                          <label className="text-sm font-semibold">Banner Title</label>
                          <Input type="text" value={formData.mobileAppTitle} onChange={(e) => setFormData({ ...formData, mobileAppTitle: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-semibold">Banner Description</label>
                          <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.mobileAppDescription} onChange={(e) => setFormData({ ...formData, mobileAppDescription: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="grid gap-2">
                            <label className="text-sm font-semibold">Play Store URL</label>
                            <Input type="url" value={formData.mobileAppPlayStoreUrl} onChange={(e) => setFormData({ ...formData, mobileAppPlayStoreUrl: e.target.value })} />
                          </div>
                          <div className="grid gap-2">
                            <label className="text-sm font-semibold">App Store URL</label>
                            <Input type="url" value={formData.mobileAppAppStoreUrl} onChange={(e) => setFormData({ ...formData, mobileAppAppStoreUrl: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </FadeInUp>
            </TabsContent>
            {/* NOTIFICATIONS & HOURS TAB */}
            <TabsContent value="notifications" className="space-y-6">
              <FadeInUp>
                <Card className="border-border">
                  <CardHeader className="bg-muted/30 border-b pb-4">
                    <CardTitle className="text-lg sm:text-xl">Global Announcement Bar</CardTitle>
                    <CardDescription>A banner that appears at the top of the public website for important alerts.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-lg">
                      <div>
                        <p className="font-semibold text-sm">Enable Announcement Banner</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Toggle this to show or hide the banner globally.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={formData.announcementVisible} onChange={(e) => setFormData({ ...formData, announcementVisible: e.target.checked })} />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {formData.announcementVisible && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="grid gap-2">
                          <label className="text-sm font-semibold">Announcement Message</label>
                          <Input type="text" value={formData.announcementText} onChange={(e) => setFormData({ ...formData, announcementText: e.target.value })} placeholder="e.g. Our office will be closed during Dashain." />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-semibold">Link URL (Optional)</label>
                          <Input type="url" value={formData.announcementLink} onChange={(e) => setFormData({ ...formData, announcementLink: e.target.value })} placeholder="https://..." />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border mt-6">
                  <CardHeader className="bg-muted/30 border-b pb-4">
                    <CardTitle className="text-lg sm:text-xl flex items-center gap-2"><Clock className="w-5 h-5 shrink-0"/> Business Hours & Emergency</CardTitle>
                    <CardDescription>Configure when the office is open and who to contact in a crisis.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid gap-2 md:col-span-2">
                      <label className="text-sm font-semibold">Business Hours Text</label>
                      <Input type="text" value={formData.businessHoursText} onChange={(e) => setFormData({ ...formData, businessHoursText: e.target.value })} placeholder="e.g. Mon-Fri: 9:00 AM - 6:00 PM (NPT)" />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-semibold">Timezone</label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.timezone} onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}>
                        <option value="Asia/Kathmandu">Asia/Kathmandu (NPT)</option>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="Europe/London">London (GMT)</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-semibold flex items-center gap-2 text-destructive"><AlertCircle className="w-4 h-4"/> Emergency Hotline</label>
                      <Input type="text" value={formData.emergencyPhone} onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })} placeholder="e.g. +977-9800000000" className="border-destructive/50 focus-visible:ring-destructive/50" />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <label className="text-sm font-semibold">Emergency Context</label>
                      <Input type="text" value={formData.emergencyText} onChange={(e) => setFormData({ ...formData, emergencyText: e.target.value })} placeholder="e.g. For urgent criminal defense, call 24/7." />
                    </div>
                  </CardContent>
                </Card>
              </FadeInUp>
            </TabsContent>

            {/* ADVANCED & LEGAL TAB */}
            <TabsContent value="advanced" className="space-y-6">
              <FadeInUp>
                <Card className="border-border">
                  <CardHeader className="bg-muted/30 border-b pb-4">
                    <CardTitle className="text-lg sm:text-xl flex items-center gap-2"><Shield className="w-5 h-5 shrink-0"/> Legal & Compliance</CardTitle>
                    <CardDescription>Links to your legal policies and cookie consent settings.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-lg">
                      <div>
                        <p className="font-semibold text-sm">Require Cookie Consent</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Show a cookie consent banner to visitors (GDPR/Compliance).</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={formData.cookieConsentEnabled} onChange={(e) => setFormData({ ...formData, cookieConsentEnabled: e.target.checked })} />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="grid gap-2">
                        <label className="text-sm font-semibold">Privacy Policy URL</label>
                        <Input type="url" value={formData.privacyPolicyUrl} onChange={(e) => setFormData({ ...formData, privacyPolicyUrl: e.target.value })} placeholder="/privacy" />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-semibold">Terms of Service URL</label>
                        <Input type="url" value={formData.termsOfServiceUrl} onChange={(e) => setFormData({ ...formData, termsOfServiceUrl: e.target.value })} placeholder="/terms" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border mt-6 border-destructive/20 shadow-sm">
                  <CardHeader className="bg-destructive/5 border-b border-destructive/20 pb-4">
                    <CardTitle className="text-lg sm:text-xl text-destructive flex items-center gap-2"><AlertCircle className="w-5 h-5 shrink-0"/> Maintenance & Danger Zone</CardTitle>
                    <CardDescription>Take the site offline or inject advanced scripts.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                      <div>
                        <p className="font-semibold text-sm text-destructive">Maintenance Mode</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Take the public website offline. Only admins can log in.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={formData.maintenanceModeEnabled} onChange={(e) => setFormData({ ...formData, maintenanceModeEnabled: e.target.checked })} />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-destructive"></div>
                      </label>
                    </div>

                    {formData.maintenanceModeEnabled && (
                      <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-sm font-semibold">Maintenance Message</label>
                        <Input type="text" value={formData.maintenanceMessage} onChange={(e) => setFormData({ ...formData, maintenanceMessage: e.target.value })} placeholder="e.g. We are currently undergoing scheduled maintenance." />
                      </div>
                    )}

                    <div className="border-t border-border pt-6 grid gap-6">
                      <div className="grid gap-2">
                        <label className="text-sm font-semibold">Facebook Pixel ID</label>
                        <Input type="text" value={formData.facebookPixelId} onChange={(e) => setFormData({ ...formData, facebookPixelId: e.target.value })} placeholder="e.g. 123456789012345" />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-semibold">Live Chat Widget Script (HTML/JS)</label>
                        <textarea disabled className="flex min-h-[100px] w-full rounded-md border border-input bg-muted px-3 py-2 text-sm font-mono opacity-70" value="Arbitrary scripts are disabled by the CMS security policy." readOnly />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeInUp>
            </TabsContent>
          </form>
        </Tabs>
      </div>

      {/* STICKY SAVE BAR */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-0 left-0 right-0 md:pl-56 bg-background/80 backdrop-blur-md border-t border-border p-4 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] z-40 animate-in slide-in-from-bottom-full">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500 font-medium">
              <AlertCircle className="w-5 h-5 animate-pulse" />
              <span>You have unsaved changes!</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={discardChanges} disabled={isSaving} className="w-full sm:w-auto">Discard</Button>
              <Button type="submit" form="settings-form" disabled={isSaving} className="gap-2 bg-primary text-primary-foreground w-full sm:w-auto">
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
