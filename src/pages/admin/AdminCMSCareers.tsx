import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Users, MoreVertical } from "lucide-react";
import { FadeInUp } from "@/components/ui/animations";

export default function AdminCMSCareers() {
  const careers = useQuery(api.cms.listCareers, {}) || [];
  const applications = useQuery(api.cms.listCareers, {}) || []; // Using same query for mock

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Careers CMS</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage open job positions and review applications.</p>
        </div>
        <Button className="bg-accent hover:bg-accent/90"><Plus className="w-4 h-4 mr-2" /> Post New Job</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FadeInUp className="lg:col-span-2">
          <Card className="h-full border-border/50 shadow-sm">
            <CardHeader className="bg-secondary/20 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-accent" /> Active Job Postings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {careers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No active job postings.</div>
              ) : (
                <div className="divide-y">
                  {careers.map((job: any) => (
                    <div key={job._id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                      <div>
                        <h4 className="font-bold">{job.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{job.department} • {job.location} • {job.type}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${job.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {job.isActive ? 'Active' : 'Closed'}
                        </span>
                        <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.1}>
          <Card className="h-full border-border/50 shadow-sm">
            <CardHeader className="bg-secondary/20 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" /> Recent Applications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="p-8 text-center text-muted-foreground">No recent applications found.</div>
            </CardContent>
          </Card>
        </FadeInUp>
      </div>
    </div>
  );
}
