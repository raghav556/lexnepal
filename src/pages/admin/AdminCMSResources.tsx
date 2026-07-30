import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Download, MoreVertical } from "lucide-react";
import { FadeInUp } from "@/components/ui/animations";
import { format } from "date-fns";

export default function AdminCMSResources() {
  const resources = useQuery(api.cms.listResources, {}) || [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Resources CMS</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage whitepapers, legal guides, and downloadable resources.</p>
        </div>
        <Button className="bg-accent hover:bg-accent/90"><Plus className="w-4 h-4 mr-2" /> Upload Resource</Button>
      </div>

      <FadeInUp>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="bg-secondary/20 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" /> Resource Library
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {resources.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <BookOpen className="w-12 h-12 mb-4 opacity-20" />
                <p>No resources published yet. Click "Upload Resource" to add a whitepaper.</p>
              </div>
            ) : (
              <div className="divide-y">
                {resources.map((res: any) => (
                  <div key={res._id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center shrink-0">
                        <BookOpen className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-bold">{res.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="uppercase tracking-wider">{res.category}</span>
                          <span>•</span>
                          <span>Published: {format(new Date(res.publishedDate), 'MMM d, yyyy')}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {res.downloads} downloads</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {res.isGated ? (
                        <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-200 font-medium">Lead Magnet</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 border border-green-200 font-medium">Public</span>
                      )}
                      <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeInUp>
    </div>
  );
}
