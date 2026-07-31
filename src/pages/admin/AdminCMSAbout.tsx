import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import { Save } from "lucide-react";

const DEFAULT_ABOUT = {
  hero: {
    title: "Modernizing Legal Practice in Nepal",
    description: "We combine decades of courtroom experience with cutting-edge technology to deliver transparent, efficient, and results-driven legal services."
  },
  mission: {
    text: "At Srimar Law, we believe that access to quality legal representation should not be a privilege. Our mission is to provide every client — from individuals facing personal legal challenges to multinational corporations navigating Nepal's regulatory landscape — with the same level of dedication, expertise, and transparency."
  },
  valuesJson: JSON.stringify([
    { icon: "Shield", title: "Integrity First", desc: "We uphold the highest ethical standards in every case, maintaining complete transparency with our clients." },
    { icon: "Target", title: "Precision & Diligence", desc: "Every detail matters in law. We leave no stone unturned in building your case and protecting your interests." },
    { icon: "Users", title: "Client-Centered", desc: "Your goals drive our strategy. We listen first, then craft legal solutions tailored to your specific needs." },
    { icon: "Award", title: "Excellence in Practice", desc: "Our advocates are among the most experienced in Nepal, registered with the Nepal Bar Council and continuously trained." }
  ], null, 2),
  timelineJson: JSON.stringify([
    { year: "2010", title: "Firm Founded", desc: "Established in Kathmandu with a vision to modernize legal practice in Nepal." },
    { year: "2015", title: "50+ Corporate Clients", desc: "Became one of Kathmandu's leading corporate law practices." },
    { year: "2019", title: "Digital Transformation", desc: "Launched our Client Portal — bringing transparency and 24/7 case access to our clients." },
    { year: "2024", title: "15+ Advocates Strong", desc: "Grew to a full-service firm covering all major areas of Nepal law." }
  ], null, 2)
};

export default function AdminCMSAbout() {
  const settings = useQuery(api.cms.getSettings) || {};
  const updateSettings = useMutation(api.cms.updateSettings);

  const [formData, setFormData] = useState(DEFAULT_ABOUT);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings.about_page) {
      const data = settings.about_page;
      setFormData({
        hero: data.hero || DEFAULT_ABOUT.hero,
        mission: data.mission || DEFAULT_ABOUT.mission,
        valuesJson: data.values ? JSON.stringify(data.values, null, 2) : DEFAULT_ABOUT.valuesJson,
        timelineJson: data.timeline ? JSON.stringify(data.timeline, null, 2) : DEFAULT_ABOUT.timelineJson,
      });
    }
  }, [settings.about_page]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let values = [];
      let timeline = [];
      try { values = JSON.parse(formData.valuesJson); } catch (e) { throw new Error("Invalid JSON in Core Values"); }
      try { timeline = JSON.parse(formData.timelineJson); } catch (e) { throw new Error("Invalid JSON in Timeline"); }

      const payload = {
        hero: formData.hero,
        mission: formData.mission,
        values,
        timeline,
      };

      await updateSettings({
        settings: [
          { key: "about_page", value: payload }
        ]
      });
      toast.success("About page content updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 w-full min-w-0 overflow-x-hidden max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-3xl font-bold tracking-tight font-serif">About Us Page</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage the content of the public About Us page.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="shrink-0 w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 min-w-0">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">Hero Section</CardTitle>
            <CardDescription>The top banner of the About page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-3 sm:px-6">
            <div className="space-y-2 min-w-0">
              <Label>Title</Label>
              <Input
                value={formData.hero.title}
                onChange={(e) => setFormData((p) => ({ ...p, hero: { ...p.hero, title: e.target.value } }))}
                className="min-w-0 w-full"
              />
            </div>
            <div className="space-y-2 min-w-0">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={formData.hero.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, hero: { ...p.hero, description: e.target.value } }))
                }
                className="min-w-0 w-full resize-y"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">Mission Section</CardTitle>
            <CardDescription>Your firm&apos;s mission statement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-3 sm:px-6">
            <div className="space-y-2 min-w-0">
              <Label>Mission Text</Label>
              <Textarea
                rows={4}
                value={formData.mission.text}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, mission: { ...p.mission, text: e.target.value } }))
                }
                className="min-w-0 w-full resize-y"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">Core Values (JSON)</CardTitle>
              <CardDescription>
                Edit the list of core values. Valid icons: Shield, Target, Users, Award, Scale.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <Textarea
                rows={10}
                className="font-mono text-xs min-w-0 w-full resize-y"
                value={formData.valuesJson}
                onChange={(e) => setFormData((p) => ({ ...p, valuesJson: e.target.value }))}
              />
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">Journey / Timeline (JSON)</CardTitle>
              <CardDescription>Edit the firm&apos;s timeline events.</CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <Textarea
                rows={10}
                className="font-mono text-xs min-w-0 w-full resize-y"
                value={formData.timelineJson}
                onChange={(e) => setFormData((p) => ({ ...p, timelineJson: e.target.value }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
