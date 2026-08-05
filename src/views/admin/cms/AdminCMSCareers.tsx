import React, { useState } from "react";
import { useCareers, useCmsCommands, useJobApplications } from "@/client/queries/cms";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog.tsx";
import { Plus, Briefcase, Users, Trash2, Edit, CheckCircle2, XCircle, FileText, ExternalLink, Mail, Phone, Clock, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { FadeInUp } from "@/components/ui/animations.tsx";

export default function AdminCMSCareers() {
  const careers = useCareers({}, "admin") || [];
  const applications = useJobApplications({}) || [];
  const cms = useCmsCommands();
  const createJob = (body: any) => cms.create("careers", body);
  const updateJob = ({ id, ...body }: any) => cms.update("careers", id, body);
  const deleteJob = ({ id }: any) => cms.remove("careers", id);
  const updateAppStatus = ({ id, status }: any) => cms.updateApplicationStatus(id, status);

  const [activeTab, setActiveTab] = useState("jobs");
  
  // Job Form State
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [jobForm, setJobForm] = useState({
    title: "",
    department: "",
    location: "Kathmandu, Nepal",
    type: "full_time" as "full_time" | "part_time" | "contract" | "internship",
    description: "",
    requirements: [""],
    isActive: true,
  });

  const handleOpenJobModal = (job?: any) => {
    if (job) {
      setEditingJobId(job._id);
      setJobForm({
        title: job.title,
        department: job.department,
        location: job.location,
        type: job.type,
        description: job.description,
        requirements: job.requirements?.length > 0 ? job.requirements : [""],
        isActive: job.isActive,
      });
    } else {
      setEditingJobId(null);
      setJobForm({
        title: "", department: "", location: "Kathmandu, Nepal", type: "full_time",
        description: "", requirements: [""], isActive: true,
      });
    }
    setIsJobModalOpen(true);
  };

  const handleSaveJob = async () => {
    try {
      const cleanRequirements = jobForm.requirements.filter(r => r.trim() !== "");
      const payload = { ...jobForm, requirements: cleanRequirements };

      if (editingJobId) {
        await updateJob({ id: editingJobId as any, ...payload, postedDate: new Date().toISOString() });
        toast.success("Job updated successfully.");
      } else {
        await createJob({ ...payload, postedDate: new Date().toISOString() });
        toast.success("Job posted successfully.");
      }
      setIsJobModalOpen(false);
    } catch (e) {
      toast.error("Failed to save job.");
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (confirm("Are you sure you want to delete this job posting? Applications may be orphaned.")) {
      try {
        await deleteJob({ id: id as any });
        toast.success("Job deleted.");
      } catch (e) {
        toast.error("Failed to delete.");
      }
    }
  };

  const handleStatusChange = async (appId: string, newStatus: any) => {
    try {
      await updateAppStatus({ id: appId as any, status: newStatus });
      toast.success("Application status updated.");
    } catch (e) {
      toast.error("Failed to update status.");
    }
  };

  // Dynamic Requirements Logic
  const addRequirement = () => setJobForm({ ...jobForm, requirements: [...jobForm.requirements, ""] });
  const updateRequirement = (index: number, val: string) => {
    const newReqs = [...jobForm.requirements];
    newReqs[index] = val;
    setJobForm({ ...jobForm, requirements: newReqs });
  };
  const removeRequirement = (index: number) => {
    const newReqs = jobForm.requirements.filter((_, i) => i !== index);
    if (newReqs.length === 0) newReqs.push("");
    setJobForm({ ...jobForm, requirements: newReqs });
  };

  const formatType = (type: string) => type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const statusSelectClass = (status: string) =>
    `w-full sm:w-auto h-9 rounded-md border border-input text-xs font-semibold px-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
      status === "new" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" : ""
    } ${status === "reviewed" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" : ""} ${
      status === "interviewed" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" : ""
    } ${status === "hired" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : ""} ${
      status === "rejected" ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" : ""
    }`;

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-foreground">Careers & ATS</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage open job positions and review incoming applications.
          </p>
        </div>
        <Button onClick={() => handleOpenJobModal()} className="gap-2 shrink-0 w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Post New Job
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
        <TabsList className="mb-4 sm:mb-6 w-full max-w-full sm:max-w-md h-auto bg-muted/50 p-1 border border-border rounded-lg grid grid-cols-2 gap-1">
          <TabsTrigger value="jobs" className="py-2 sm:py-2.5 gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background px-2">
            <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Job Postings</span>
          </TabsTrigger>
          <TabsTrigger value="apps" className="py-2 sm:py-2.5 gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background px-2">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Applications</span>
            <Badge variant="secondary" className="h-5 px-1.5 shrink-0">
              {applications.filter((a: any) => a.status === "new").length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="mt-0 space-y-4 min-w-0">
          <FadeInUp>
            <Card className="border-border overflow-hidden min-w-0">
              {/* Mobile job cards */}
              <div className="md:hidden divide-y divide-border">
                {careers.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No job postings found. Click &quot;Post New Job&quot; to get started.
                  </p>
                ) : (
                  careers.map((job: any) => (
                    <div key={job._id} className="p-3 space-y-3 min-w-0">
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground text-sm break-words flex-1 min-w-0">
                            {job.title}
                          </p>
                          <Badge
                            variant={job.isActive ? "default" : "secondary"}
                            className="uppercase tracking-wider text-[10px] shrink-0 whitespace-nowrap gap-1"
                          >
                            {job.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {job.isActive ? "Active" : "Closed"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {job.department} · {formatType(job.type)}
                        </p>
                        <p className="text-xs text-muted-foreground break-words">{job.location}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          Posted {new Date(job.postedDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                        <Button variant="outline" size="sm" onClick={() => handleOpenJobModal(job)} className="gap-1.5">
                          <Edit className="w-4 h-4" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteJob(job._id)}
                          className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-b border-border">
                    <tr>
                      <th className="px-4 lg:px-6 py-4">Job Details</th>
                      <th className="px-4 lg:px-6 py-4">Status</th>
                      <th className="px-4 lg:px-6 py-4">Department & Type</th>
                      <th className="px-4 lg:px-6 py-4">Location</th>
                      <th className="px-4 lg:px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {careers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                          No job postings found. Click &quot;Post New Job&quot; to get started.
                        </td>
                      </tr>
                    ) : (
                      careers.map((job: any) => (
                        <tr key={job._id} className="bg-background hover:bg-muted/30 transition-colors group">
                          <td className="px-4 lg:px-6 py-4 min-w-0">
                            <div className="font-semibold text-foreground text-base mb-1 break-words max-w-sm">
                              {job.title}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Posted {new Date(job.postedDate).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <Badge
                              variant={job.isActive ? "default" : "secondary"}
                              className="uppercase tracking-wider text-[10px] whitespace-nowrap"
                            >
                              {job.isActive ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                              {job.isActive ? "Active" : "Closed"}
                            </Badge>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <div className="font-medium">{job.department}</div>
                            <div className="text-xs text-muted-foreground">{formatType(job.type)}</div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-muted-foreground whitespace-nowrap">
                            {job.location}
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenJobModal(job)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteJob(job._id)}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
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
          </FadeInUp>
        </TabsContent>

        <TabsContent value="apps" className="mt-0 space-y-4 min-w-0">
          <FadeInUp>
            <Card className="border-border overflow-hidden min-w-0">
              <div className="md:hidden divide-y divide-border">
                {applications.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No applications received yet.
                  </p>
                ) : (
                  applications.map((app: any) => (
                    <div key={app._id} className="p-3 space-y-3 min-w-0">
                      <div className="min-w-0 space-y-1">
                        <p className="font-semibold text-foreground text-sm break-words">{app.applicantName}</p>
                        <p className="text-xs text-muted-foreground break-all flex items-center gap-1">
                          <Mail className="w-3 h-3 shrink-0" /> {app.email}
                        </p>
                        {app.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3 shrink-0" /> {app.phone}
                          </p>
                        )}
                        <p className="text-xs text-foreground pt-1">
                          Applied for <span className="font-medium">{app.jobTitle}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(app.appliedDate).toLocaleDateString()}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {app.resumeUrl && (
                            <a
                              href={app.resumeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> Resume
                            </a>
                          )}
                          {app.coverLetter && (
                            <a
                              href={app.coverLetter}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> Cover Letter
                            </a>
                          )}
                        </div>
                      </div>
                      <select
                        className={statusSelectClass(app.status)}
                        value={app.status}
                        onChange={(e) => handleStatusChange(app._id, e.target.value)}
                      >
                        <option value="new">New Applicant</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="interviewed">Interviewed</option>
                        <option value="hired">Hired</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  ))
                )}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold border-b border-border">
                    <tr>
                      <th className="px-4 lg:px-6 py-4">Applicant</th>
                      <th className="px-4 lg:px-6 py-4">Applied For</th>
                      <th className="px-4 lg:px-6 py-4">Date</th>
                      <th className="px-4 lg:px-6 py-4">Documents</th>
                      <th className="px-4 lg:px-6 py-4 text-right">Status Tracker</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {applications.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                          No applications received yet.
                        </td>
                      </tr>
                    ) : (
                      applications.map((app: any) => (
                        <tr key={app._id} className="bg-background hover:bg-muted/30 transition-colors">
                          <td className="px-4 lg:px-6 py-4 min-w-0">
                            <div className="font-semibold text-foreground">{app.applicantName}</div>
                            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                              <div className="flex items-center gap-1 min-w-0">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate">{app.email}</span>
                              </div>
                              {app.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {app.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 font-medium text-foreground">{app.jobTitle}</td>
                          <td className="px-4 lg:px-6 py-4 text-muted-foreground whitespace-nowrap">
                            {new Date(app.appliedDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <div className="flex flex-col gap-2 items-start">
                              {app.resumeUrl && (
                                <a
                                  href={app.resumeUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" /> View Resume
                                </a>
                              )}
                              {app.coverLetter && (
                                <a
                                  href={app.coverLetter}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-muted-foreground hover:text-primary hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> Cover Letter
                                </a>
                              )}
                              {!app.resumeUrl && !app.coverLetter && (
                                <span className="text-xs text-muted-foreground">No documents</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-right">
                            <select
                              className={statusSelectClass(app.status)}
                              value={app.status}
                              onChange={(e) => handleStatusChange(app._id, e.target.value)}
                            >
                              <option value="new">New Applicant</option>
                              <option value="reviewed">Reviewed</option>
                              <option value="interviewed">Interviewed</option>
                              <option value="hired">Hired</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </FadeInUp>
        </TabsContent>
      </Tabs>

      <Dialog open={isJobModalOpen} onOpenChange={setIsJobModalOpen}>
        <DialogContent className="!max-w-3xl w-[calc(100%-1rem)] sm:w-[95vw] max-h-[92vh] bg-background border-border overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 sm:px-6 py-4 border-b border-border shrink-0">
            <DialogTitle>{editingJobId ? "Edit Job Posting" : "Post New Job"}</DialogTitle>
            <DialogDescription>Create a new career opportunity for the public board.</DialogDescription>
          </DialogHeader>

          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-foreground min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-muted/20 border border-border rounded-lg">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground">Job Status</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Is this job currently accepting applications?
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={jobForm.isActive}
                  onChange={(e) => setJobForm({ ...jobForm, isActive: e.target.checked })}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2 min-w-0">
                <label className="text-sm font-semibold text-foreground">Job Title</label>
                <Input
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  placeholder="e.g. Senior Corporate Lawyer"
                  className="bg-background text-foreground min-w-0"
                />
              </div>
              <div className="space-y-2 min-w-0">
                <label className="text-sm font-semibold text-foreground">Department</label>
                <Input
                  value={jobForm.department}
                  onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                  placeholder="e.g. Litigation"
                  className="bg-background text-foreground min-w-0"
                />
              </div>
              <div className="space-y-2 min-w-0">
                <label className="text-sm font-semibold text-foreground">Employment Type</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm"
                  value={jobForm.type}
                  onChange={(e) => setJobForm({ ...jobForm, type: e.target.value as any })}
                >
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2 min-w-0">
                <label className="text-sm font-semibold text-foreground">Location</label>
                <Input
                  value={jobForm.location}
                  onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                  placeholder="e.g. Kathmandu, Nepal"
                  className="bg-background text-foreground min-w-0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Job Description</label>
              <textarea
                className="flex min-h-[100px] w-full min-w-0 rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm"
                value={jobForm.description}
                onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                placeholder="Describe the role..."
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <label className="text-sm font-semibold text-foreground">Requirements & Qualifications</label>
                  <p className="text-xs text-muted-foreground mt-0.5">List specific skills or degrees required.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRequirement}
                  className="gap-1 h-8 text-xs w-full sm:w-auto"
                >
                  <PlusCircle className="w-3 h-3" /> Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {jobForm.requirements.map((req, idx) => (
                  <div key={idx} className="flex items-center gap-2 min-w-0">
                    <Input
                      value={req}
                      onChange={(e) => updateRequirement(idx, e.target.value)}
                      placeholder="e.g. 5+ years of litigation experience"
                      className="h-9 bg-background text-foreground min-w-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10"
                      onClick={() => removeRequirement(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="px-4 sm:px-6 py-4 border-t border-border shrink-0 bg-muted/10 flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsJobModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSaveJob} className="gap-2 w-full sm:w-auto">
              <CheckCircle2 className="w-4 h-4" /> {editingJobId ? "Update Job" : "Post Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
