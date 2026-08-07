import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useCmsTeamIdentityBridge } from "@/client/queries/identity";
import { usePracticeAreas } from "@/client/queries/cms";
import { Save, CheckCircle, XCircle, UserCircle, Search, Filter, Plus, Edit2, EyeOff, X, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog.tsx";
import { LEADERSHIP_TITLE_EXAMPLES, isLeadershipRole } from "@/shared/leadership";

const PUBLIC_ELIGIBLE_ROLES = ["partner", "senior_associate", "associate", "paralegal"] as const;

export default function AdminCMSTeam() {
  const { users, updateTeamMember, removeFromPublicTeam, togglePublicStatus } = useCmsTeamIdentityBridge();
  const cmsPracticeAreas = usePracticeAreas({}, "admin") || [];
  const practiceAreaTitleOptions = cmsPracticeAreas
    .filter((a: { isActive?: boolean }) => a.isActive !== false)
    .map((a: { title?: string }) => String(a.title ?? "").trim())
    .filter(Boolean);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const filteredUsers = useMemo(() => {
    return users.filter((u: any) => {
      const isEligibleRole = PUBLIC_ELIGIBLE_ROLES.includes(u.role);
      if (!isEligibleRole) return false;

      const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  /** Staff who can be featured but are not yet public-facing. */
  const featureCandidates = useMemo(() => {
    return users.filter(
      (u: any) =>
        PUBLIC_ELIGIBLE_ROLES.includes(u.role) &&
        !u.isPublicFacing &&
        u.isActive &&
        !u.isPending,
    );
  }, [users]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFeaturePickerOpen, setIsFeaturePickerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "professional" | "education">("basic");

  // Form State
  const [formData, setFormData] = useState<any>({
    name: "",
    email: "",
    role: "associate",
    isPublicFacing: false,
    bio: "",
    longBio: "",
    leadershipTitle: "",
    avatarUrl: "",
    linkedinUrl: "",
    twitterUrl: "",
    publicEmail: "",
    barCouncilNumber: "",
    practiceAreas: [],
    notableCases: [],
    education: [],
  });
  const [isSaving, setIsSaving] = useState(false);

  const openEditModal = (user: any) => {
    setEditingId(user._id);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "associate",
      isPublicFacing: user.isPublicFacing || false,
      bio: user.bio || "",
      longBio: user.longBio || "",
      leadershipTitle: user.leadershipTitle || "",
      avatarUrl: user.avatarUrl || "",
      linkedinUrl: user.linkedinUrl || "",
      twitterUrl: user.twitterUrl || "",
      publicEmail: user.publicEmail || "",
      barCouncilNumber: user.barCouncilNumber || "",
      practiceAreas: user.practiceAreas || [],
      notableCases: user.notableCases || [],
      education: user.education || [],
    });
    setActiveTab("basic");
    setIsModalOpen(true);
  };

  const featureUser = async (user: any) => {
    try {
      await togglePublicStatus({ userId: user._id, isPublicFacing: true });
      setIsFeaturePickerOpen(false);
      openEditModal({ ...user, isPublicFacing: true });
      toast.success(`${user.name} is now public. Complete their profile details.`);
    } catch {
      toast.error("Could not feature this person on the public site.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setIsSaving(true);
    try {
      const { email: _email, role: _role, avatarUrl: _avatarUrl, ...publicProfile } = formData;
      await updateTeamMember({
        userId: editingId,
        ...publicProfile,
      });
      toast.success("Public profile updated.");
      setIsModalOpen(false);
    } catch {
      toast.error("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveFromPublic = async (id: string, name: string) => {
    if (!window.confirm(`Hide ${name} from the public website? Their login account stays active.`)) {
      return;
    }
    try {
      await removeFromPublicTeam({ userId: id });
      toast.success("Removed from public team (account still active).");
    } catch {
      toast.error("Failed to update public visibility.");
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await togglePublicStatus({ userId: id, isPublicFacing: !currentStatus });
      toast.success(`User is now ${!currentStatus ? "Public" : "Hidden"}.`);
    } catch {
      toast.error("Failed to update status.");
    }
  };

  // Dynamic Array Handlers
  const addArrayItem = (field: "practiceAreas" | "notableCases") => {
    setFormData({ ...formData, [field]: [...formData[field], ""] });
  };
  const updateArrayItem = (field: "practiceAreas" | "notableCases", index: number, value: string) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };
  const removeArrayItem = (field: "practiceAreas" | "notableCases", index: number) => {
    const newArray = formData[field].filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, [field]: newArray });
  };

  const addEducation = () => {
    setFormData({ ...formData, education: [...formData.education, { degree: "", institution: "", year: "" }] });
  };
  const updateEducation = (index: number, key: string, value: string) => {
    const newEdu = [...formData.education];
    newEdu[index] = { ...newEdu[index], [key]: value };
    setFormData({ ...formData, education: newEdu });
  };
  const removeEducation = (index: number) => {
    const newEdu = formData.education.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, education: newEdu });
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-foreground">
            <span className="sm:hidden">Public team</span>
            <span className="hidden sm:inline">Public team profiles</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Edit website bios, practice areas, and visibility. Invite or change roles in{" "}
            <Link href="/admin/users" className="text-primary underline-offset-2 hover:underline">
              Users
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
          <Button variant="outline" asChild className="w-full md:w-auto">
            <Link href="/admin/users">
              <ExternalLink className="w-4 h-4 mr-2" /> Invite in Users
            </Link>
          </Button>
          <Button
            onClick={() => setIsFeaturePickerOpen(true)}
            className="gap-2 w-full md:w-auto"
            disabled={featureCandidates.length === 0}
            title={
              featureCandidates.length === 0
                ? "Invite staff in Users first, or all eligible people are already public"
                : undefined
            }
          >
            <Plus className="w-4 h-4" /> Feature on website
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card className="bg-card min-w-0 overflow-hidden">
        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full min-w-0"
            />
          </div>
          <div className="relative w-full sm:w-auto sm:min-w-[200px] shrink-0">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select
              className="w-full bg-background text-foreground border border-border rounded-md pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary h-10"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="partner">Partners</option>
              <option value="senior_associate">Senior Associates</option>
              <option value="associate">Associates</option>
              <option value="paralegal">Paralegals</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Roster — cards on phone, table from md up */}
      <Card className="min-w-0 overflow-hidden">
        <div className="md:hidden divide-y divide-border">
          {filteredUsers.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No team members found matching your criteria.
            </p>
          ) : (
            filteredUsers.map((user: any) => (
              <div key={user._id} className="p-3 space-y-3 min-w-0">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-border shrink-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground break-words">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email || "No email provided"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="outline" className="capitalize">
                        {user.role.replace("_", " ")}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => toggleStatus(user._id, user.isPublicFacing)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          user.isPublicFacing
                            ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {user.isPublicFacing ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {user.isPublicFacing ? "Public" : "Hidden"}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pl-[3.25rem]">
                  <Button variant="outline" size="sm" onClick={() => openEditModal(user)} className="gap-1.5">
                    <Edit2 className="w-4 h-4" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveFromPublic(user._id, user.name)}
                    title="Hide from public website"
                  >
                    <EyeOff className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase border-b border-border">
              <tr>
                <th className="px-4 lg:px-6 py-4 font-medium">Team Member</th>
                <th className="px-4 lg:px-6 py-4 font-medium">Role</th>
                <th className="px-4 lg:px-6 py-4 font-medium">Visibility</th>
                <th className="px-4 lg:px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    No team members found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user: any) => (
                  <tr key={user._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 lg:px-6 py-4 min-w-0">
                      <div className="flex items-center gap-3 lg:gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-border shrink-0">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <UserCircle className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">{user.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {user.email || "No email provided"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <Badge variant="outline" className="capitalize whitespace-nowrap">
                        {user.role.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <button
                        type="button"
                        onClick={() => toggleStatus(user._id, user.isPublicFacing)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                          user.isPublicFacing
                            ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 hover:bg-green-500/20"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        }`}
                      >
                        {user.isPublicFacing ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {user.isPublicFacing ? "Public" : "Hidden"}
                      </button>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(user)}>
                          <Edit2 className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveFromPublic(user._id, user.name)}
                          title="Hide from public website"
                        >
                          <EyeOff className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Editor Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] w-[calc(100%-1.5rem)] sm:w-full overflow-hidden flex flex-col p-0 border-border bg-background">
          <div className="p-4 sm:p-6 border-b border-border bg-muted/30 min-w-0">
            <h2 className="text-lg sm:text-2xl font-serif font-bold text-foreground break-words">
              Edit {formData.name || "team member"}&apos;s public profile
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Website bio, credentials, and practice areas. Role and invite changes stay in Users.
            </p>
          </div>

          <div className="flex border-b border-border px-3 sm:px-6 pt-2 bg-muted/10 gap-3 sm:gap-6 text-xs sm:text-sm font-medium overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
            <button
              type="button"
              className={`pb-3 border-b-2 transition-colors shrink-0 ${activeTab === "basic" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              onClick={() => setActiveTab("basic")}
            >
              Basic
            </button>
            <button
              type="button"
              className={`pb-3 border-b-2 transition-colors shrink-0 ${activeTab === "professional" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              onClick={() => setActiveTab("professional")}
            >
              <span className="sm:hidden">Professional</span>
              <span className="hidden sm:inline">Professional Background</span>
            </button>
            <button
              type="button"
              className={`pb-3 border-b-2 transition-colors shrink-0 ${activeTab === "education" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              onClick={() => setActiveTab("education")}
            >
              Education
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background min-w-0">
            {activeTab === "basic" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Full Name</label>
                    <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Ramesh Badal" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Role (identity)</label>
                    <Input value={formData.role?.replace(/_/g, " ") || ""} disabled className="capitalize bg-muted/40" />
                    <p className="text-xs text-muted-foreground">
                      Change role when inviting or editing in{" "}
                      <Link href="/admin/users" className="text-primary underline-offset-2 hover:underline">
                        Users
                      </Link>
                      .
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Public leadership title</label>
                  <Input
                    value={formData.leadershipTitle}
                    onChange={(e) => setFormData({ ...formData, leadershipTitle: e.target.value })}
                    placeholder={
                      isLeadershipRole(formData.role)
                        ? "e.g. Managing Partner, Director of Litigation"
                        : "Optional — shown on public profile instead of role label"
                    }
                    list="leadership-title-suggestions"
                  />
                  <datalist id="leadership-title-suggestions">
                    {LEADERSHIP_TITLE_EXAMPLES.map((title) => (
                      <option key={title} value={title} />
                    ))}
                  </datalist>
                  <p className="text-xs text-muted-foreground">
                    Used on lawyer profiles, directory, and homepage director message. Partners and senior associates can be featured as firm leadership.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Public Email (Contact)</label>
                    <Input value={formData.publicEmail} onChange={e => setFormData({...formData, publicEmail: e.target.value})} placeholder="e.g. ramesh@lexnepal.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Avatar</label>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                        {formData.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={formData.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">N/A</div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Avatars are managed in{" "}
                        <a href="/admin/users" className="underline text-foreground">
                          Users
                        </a>
                        . This field is display-only.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Short Bio (Displayed on cards)</label>
                  <textarea 
                    className="w-full min-h-[80px] bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    value={formData.bio}
                    onChange={e => setFormData({...formData, bio: e.target.value})}
                    placeholder="A brief 1-2 sentence introduction..."
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Full Biography (Displayed on individual profile page)</label>
                  <textarea 
                    className="w-full min-h-[150px] bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    value={formData.longBio}
                    onChange={e => setFormData({...formData, longBio: e.target.value})}
                    placeholder="Detailed professional history..."
                  />
                </div>
              </div>
            )}

            {activeTab === "professional" && (
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Bar Council Registration Number</label>
                  <Input value={formData.barCouncilNumber} onChange={e => setFormData({...formData, barCouncilNumber: e.target.value})} placeholder="e.g. 12345" className="max-w-md" />
                </div>

                <div className="space-y-3 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-sm font-medium text-foreground">Practice Areas</label>
                    <Button variant="outline" size="sm" onClick={() => addArrayItem("practiceAreas")} className="w-full sm:w-auto">
                      <Plus className="w-3 h-3 mr-1" /> Add Area
                    </Button>
                  </div>
                  {formData.practiceAreas.length === 0 && <p className="text-xs text-muted-foreground italic">No practice areas added.</p>}
                  {formData.practiceAreas.map((area: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 min-w-0">
                      <Input
                        value={area}
                        list="cms-team-practice-areas"
                        onChange={(e) => updateArrayItem("practiceAreas", index, e.target.value)}
                        placeholder="e.g. Corporate Litigation"
                        className="min-w-0"
                      />
                      <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeArrayItem("practiceAreas", index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <datalist id="cms-team-practice-areas">
                    {practiceAreaTitleOptions.map((title) => (
                      <option key={title} value={title} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-3 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-sm font-medium text-foreground">Notable Cases / Achievements</label>
                    <Button variant="outline" size="sm" onClick={() => addArrayItem("notableCases")} className="w-full sm:w-auto">
                      <Plus className="w-3 h-3 mr-1" /> Add Case
                    </Button>
                  </div>
                  {formData.notableCases.length === 0 && <p className="text-xs text-muted-foreground italic">No notable cases added.</p>}
                  {formData.notableCases.map((caseStr: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 min-w-0">
                      <textarea
                        className="w-full min-w-0 min-h-[60px] bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                        value={caseStr}
                        onChange={(e) => updateArrayItem("notableCases", index, e.target.value)}
                        placeholder="e.g. Successfully defended XYZ Corp in a high-profile merger dispute."
                      />
                      <Button variant="ghost" size="icon" className="text-destructive mt-1 shrink-0" onClick={() => removeArrayItem("notableCases", index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "education" && (
              <div className="space-y-4 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <label className="text-sm font-medium text-foreground">Education History</label>
                  <Button variant="outline" size="sm" onClick={addEducation} className="w-full sm:w-auto">
                    <Plus className="w-3 h-3 mr-1" /> Add Education
                  </Button>
                </div>
                {formData.education.length === 0 && (
                  <div className="text-center p-8 border border-dashed border-border rounded-lg text-muted-foreground">
                    <p className="text-sm">No education records added.</p>
                  </div>
                )}
                {formData.education.map((edu: any, index: number) => (
                  <Card key={index} className="bg-muted/10 border-border/50">
                    <CardContent className="p-4 flex gap-4 items-start">
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Degree / Qualification</label>
                            <Input value={edu.degree} onChange={e => updateEducation(index, "degree", e.target.value)} placeholder="e.g. LL.M in Corporate Law" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Year</label>
                            <Input value={edu.year} onChange={e => updateEducation(index, "year", e.target.value)} placeholder="e.g. 2015" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Institution</label>
                          <Input value={edu.institution} onChange={e => updateEducation(index, "institution", e.target.value)} placeholder="e.g. Kathmandu University School of Law" />
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive mt-6" onClick={() => removeEducation(index)}><Trash2 className="w-4 h-4"/></Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 sm:p-6 border-t border-border bg-muted/30 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 rounded-b-lg">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2 w-full sm:w-auto">
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feature existing identity on the public site */}
      <Dialog open={isFeaturePickerOpen} onOpenChange={setIsFeaturePickerOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
          <div className="p-4 sm:p-5 border-b border-border">
            <h2 className="text-lg font-serif font-bold text-foreground">Feature on website</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choose an existing staff account. New people must be invited in Users first.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 sm:p-3">
            {featureCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                No eligible staff left to feature.{" "}
                <Link href="/admin/users" className="text-primary underline-offset-2 hover:underline">
                  Invite someone in Users
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {featureCandidates.map((user: any) => (
                  <li key={user._id}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 rounded-md transition-colors"
                      onClick={() => featureUser(user)}
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {user.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate capitalize">
                          {user.role?.replace(/_/g, " ")} · {user.email}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-primary shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
