import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Save, Globe, Phone, Mail, MapPin, Image as ImageIcon, Palette, Search } from "lucide-react";
import { toast } from "sonner";

export default function AdminCMSDashboard() {
  const settings = useQuery(api.cms.getSettings);
  const updateSettings = useMutation(api.cms.updateSettings);

  const [formData, setFormData] = useState({
    firmName: "",
    tagline: "",
    email: "",
    phone: "",
    address: "",
    facebookUrl: "",
    linkedinUrl: "",
    twitterUrl: "",
    instagramUrl: "",
    tiktokUrl: "",
    youtubeUrl: "",
    logoUrl: "",
    faviconUrl: "",
    heroImageUrl: "",
    primaryColor: "",
    seoMetaDescription: "",
    seoTitleFormat: "",
    googleAnalyticsId: "",
    mobileAppBannerVisible: false,
    mobileAppTitle: "",
    mobileAppDescription: "",
    mobileAppPlayStoreUrl: "",
    mobileAppAppStoreUrl: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        firmName: settings.firmName || "",
        tagline: settings.tagline || "",
        email: settings.email || "",
        phone: settings.phone || "",
        address: settings.address || "",
        facebookUrl: settings.facebookUrl || "",
        linkedinUrl: settings.linkedinUrl || "",
        twitterUrl: settings.twitterUrl || "",
        instagramUrl: settings.instagramUrl || "",
        tiktokUrl: settings.tiktokUrl || "",
        youtubeUrl: settings.youtubeUrl || "",
        logoUrl: settings.logoUrl || "",
        faviconUrl: settings.faviconUrl || "",
        heroImageUrl: settings.heroImageUrl || "",
        primaryColor: settings.primaryColor || "#3b0764",
        seoMetaDescription: settings.seoMetaDescription || "",
        seoTitleFormat: settings.seoTitleFormat || "",
        googleAnalyticsId: settings.googleAnalyticsId || "",
        mobileAppBannerVisible: settings.mobileAppBannerVisible || false,
        mobileAppTitle: settings.mobileAppTitle || "Srimar Law Mobile App",
        mobileAppDescription: settings.mobileAppDescription || "Get legal assistance at your fingertips. Coming soon to iOS and Android.",
        mobileAppPlayStoreUrl: settings.mobileAppPlayStoreUrl || "",
        mobileAppAppStoreUrl: settings.mobileAppAppStoreUrl || "",
      });
    }
  }, [JSON.stringify(settings)]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings(formData as any);
      toast.success("CMS settings updated successfully.");
    } catch (error) {
      toast.error("Failed to update CMS settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return <div className="p-8 text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Site Settings</h1>
          <p className="text-muted-foreground mt-1">Manage global website configuration.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              General Branding
            </CardTitle>
            <CardDescription>This information appears on the homepage and global headers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Firm Name</label>
              <input
                type="text"
                value={formData.firmName}
                onChange={(e) => setFormData({ ...formData, firmName: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Tagline / Slogan</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Contact Information
            </CardTitle>
            <CardDescription>Displayed in the footer and contact page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium flex items-center gap-2"><Mail className="w-4 h-4"/> Public Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium flex items-center gap-2"><Phone className="w-4 h-4"/> Support Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Physical Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Social Links
            </CardTitle>
            <CardDescription>Optional URLs for social media integration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Facebook URL</label>
                <input type="url" value={formData.facebookUrl} onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">LinkedIn URL</label>
                <input type="url" value={formData.linkedinUrl} onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Twitter (X) URL</label>
                <input type="url" value={formData.twitterUrl} onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Instagram URL</label>
                <input type="url" value={formData.instagramUrl} onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">TikTok URL</label>
                <input type="url" value={formData.tiktokUrl} onChange={(e) => setFormData({ ...formData, tiktokUrl: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">YouTube URL</label>
                <input type="url" value={formData.youtubeUrl} onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              Brand Assets (Media)
            </CardTitle>
            <CardDescription>Upload or link media files to customize the site's look and feel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Firm Logo URL</label>
                <input
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Favicon URL</label>
                <input
                  type="url"
                  value={formData.faviconUrl}
                  onChange={(e) => setFormData({ ...formData, faviconUrl: e.target.value })}
                  placeholder="https://example.com/favicon.ico"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Hero Background Image URL</label>
              <input
                type="url"
                value={formData.heroImageUrl}
                onChange={(e) => setFormData({ ...formData, heroImageUrl: e.target.value })}
                placeholder="https://example.com/hero-bg.jpg"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">Leave blank to use the default gradient.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Theme Engine
            </CardTitle>
            <CardDescription>Customize the primary color scheme of the public portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Primary Brand Color (Hex)</label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="flex h-10 w-full md:max-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              SEO & Analytics
            </CardTitle>
            <CardDescription>Optimize search engine visibility and track visitors.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Global Meta Description</label>
              <textarea
                value={formData.seoMetaDescription}
                onChange={(e) => setFormData({ ...formData, seoMetaDescription: e.target.value })}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Srimar Law is Nepal's Premier Legal Practice..."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">SEO Title Format</label>
                <input
                  type="text"
                  value={formData.seoTitleFormat}
                  onChange={(e) => setFormData({ ...formData, seoTitleFormat: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Srimar Law | %s"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Google Analytics ID</label>
                <input
                  type="text"
                  value={formData.googleAnalyticsId}
                  onChange={(e) => setFormData({ ...formData, googleAnalyticsId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Mobile App Banner
            </CardTitle>
            <CardDescription>Configure the "Coming Soon" mobile app section on the homepage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-md border border-input bg-muted/30">
              <div>
                <p className="font-medium">Show Mobile App Banner</p>
                <p className="text-sm text-muted-foreground">Toggle to display the coming soon section.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={formData.mobileAppBannerVisible}
                  onChange={(e) => setFormData({...formData, mobileAppBannerVisible: e.target.checked})}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {formData.mobileAppBannerVisible && (
              <>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Banner Title</label>
                  <input
                    type="text"
                    value={formData.mobileAppTitle}
                    onChange={(e) => setFormData({ ...formData, mobileAppTitle: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Srimar Law Mobile App"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Banner Description</label>
                  <textarea
                    value={formData.mobileAppDescription}
                    onChange={(e) => setFormData({ ...formData, mobileAppDescription: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Get legal assistance at your fingertips. Coming soon to iOS and Android."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Play Store URL (Optional)</label>
                    <input
                      type="url"
                      value={formData.mobileAppPlayStoreUrl}
                      onChange={(e) => setFormData({ ...formData, mobileAppPlayStoreUrl: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="https://play.google.com/..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">App Store URL (Optional)</label>
                    <input
                      type="url"
                      value={formData.mobileAppAppStoreUrl}
                      onChange={(e) => setFormData({ ...formData, mobileAppAppStoreUrl: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="https://apps.apple.com/..."
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving} className="gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
