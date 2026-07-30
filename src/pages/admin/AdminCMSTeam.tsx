import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Users, Save, CheckCircle, XCircle, UserCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminCMSTeam() {
  const users = useQuery(api.users.listUsers, {}) || [];
  const updateTeamMember = useMutation(api.users.updateProfile);
  
  // Filter only staff that could be public facing
  const eligibleStaff = users.filter((u: any) => 
    ["partner", "senior_associate", "associate"].includes(u.role)
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = (user: any) => {
    setEditingId(user._id);
    setFormData({
      isPublicFacing: user.isPublicFacing || false,
      bio: user.bio || "",
      avatarUrl: user.avatarUrl || "",
      linkedinUrl: user.linkedinUrl || "",
      twitterUrl: user.twitterUrl || "",
      publicEmail: user.publicEmail || "",
      longBio: user.longBio || "",
      practiceAreasStr: (user.practiceAreas || []).join(", "),
      notableCasesStr: (user.notableCases || []).join("\n"),
      educationStr: (user.education || []).map((e: any) => `${e.degree} | ${e.institution} | ${e.year}`).join("\n"),
    });
  };

  const handleSave = async (id: string) => {
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        practiceAreas: formData.practiceAreasStr.split(",").map((s: string) => s.trim()).filter(Boolean),
        notableCases: formData.notableCasesStr.split("\n").map((s: string) => s.trim()).filter(Boolean),
        education: formData.educationStr.split("\n").map((line: string) => {
          const parts = line.split("|").map(s => s.trim());
          return { degree: parts[0] || "", institution: parts[1] || "", year: parts[2] || "" };
        }).filter((e: any) => e.degree !== ""),
      };
      delete payload.practiceAreasStr;
      delete payload.notableCasesStr;
      delete payload.educationStr;
      
      await updateTeamMember({ userId: id, ...payload });
      toast.success("Team member updated successfully.");
      setEditingId(null);
    } catch (error) {
      toast.error("Failed to update team member.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Dynamic Team Roster</h1>
          <p className="text-muted-foreground mt-1">Manage which advocates appear on the public 'Our Team' page.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {eligibleStaff.map((user: any) => (
          <Card key={user._id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border border-border">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-lg">{user.name}</CardTitle>
                  <CardDescription className="capitalize flex items-center gap-2">
                    {user.role.replace("_", " ")}
                    {user.isPublicFacing ? (
                      <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-0 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Public
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Hidden
                      </Badge>
                    )}
                  </CardDescription>
                </div>
              </div>
              {editingId !== user._id && (
                <Button variant="outline" onClick={() => startEditing(user)}>Edit Public Profile</Button>
              )}
            </CardHeader>
            
            {editingId === user._id && (
              <CardContent className="mt-4 border-t pt-4 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-md border border-input bg-muted/30">
                  <div>
                    <p className="font-medium">Show on Public Website</p>
                    <p className="text-sm text-muted-foreground">Toggle to display this advocate on the homepage.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={formData.isPublicFacing}
                      onChange={(e) => setFormData({...formData, isPublicFacing: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Avatar Image URL (Optional)</label>
                  <input
                    type="url"
                    value={formData.avatarUrl}
                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                    placeholder="https://example.com/photo.jpg"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">LinkedIn URL (Optional)</label>
                  <input
                    type="url"
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Twitter/X URL (Optional)</label>
                  <input
                    type="url"
                    value={formData.twitterUrl}
                    onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                    placeholder="https://twitter.com/username"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Public Contact Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.publicEmail}
                    onChange={(e) => setFormData({ ...formData, publicEmail: e.target.value })}
                    placeholder="lawyer@Srimar Law.com.np"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Public Biography</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Expert in Corporate Law with 10 years of experience..."
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Detailed Biography (Extended Profile)</label>
                  <textarea
                    value={formData.longBio}
                    onChange={(e) => setFormData({ ...formData, longBio: e.target.value })}
                    placeholder="Provide a detailed professional history..."
                    className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Practice Areas (Comma separated)</label>
                  <input
                    type="text"
                    value={formData.practiceAreasStr}
                    onChange={(e) => setFormData({ ...formData, practiceAreasStr: e.target.value })}
                    placeholder="Corporate Law, Intellectual Property, Civil Litigation"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Notable Cases (One per line)</label>
                  <textarea
                    value={formData.notableCasesStr}
                    onChange={(e) => setFormData({ ...formData, notableCasesStr: e.target.value })}
                    placeholder="Landmark ruling on XYZ..."
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Education (Format: Degree | Institution | Year per line)</label>
                  <textarea
                    value={formData.educationStr}
                    onChange={(e) => setFormData({ ...formData, educationStr: e.target.value })}
                    placeholder="LL.M. in Corporate Law | Harvard Law School | 2015"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                  <Button onClick={() => handleSave(user._id)} disabled={isSaving} className="gap-2">
                    <Save className="w-4 h-4" /> Save Profile
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {eligibleStaff.length === 0 && (
          <div className="text-center py-12 border border-dashed rounded-lg text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>No eligible staff members found.</p>
            <p className="text-sm">Only Partners and Associates can be displayed publicly.</p>
          </div>
        )}
      </div>
    </div>
  );
}
