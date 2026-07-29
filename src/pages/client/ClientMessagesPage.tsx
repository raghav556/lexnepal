import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const THREADS = [
  { id: "1", case: "KTM/2081/234 \u2014 Property Dispute", lastMsg: "Your hearing date has been confirmed for 15 Mangsir.", time: "2 hours ago", unread: 1 },
  { id: "2", case: "KTM/2081/567 \u2014 Company Registration", lastMsg: "Please review the MOA draft we sent and confirm.", time: "Yesterday", unread: 0 },
];

export default function ClientMessagesPage() {
  const [selected, setSelected] = useState<string | null>("1");
  const [draft, setDraft] = useState("");

  return (
    <div className="p-4 sm:p-6 h-full">
      <h1 className="font-serif text-2xl font-bold text-foreground mb-4">Messages</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-180px)]">
        <div className="space-y-2">
          {THREADS.map((t) => (
            <Card key={t.id} className={`cursor-pointer transition-colors ${selected === t.id ? "border-accent" : ""}`} onClick={() => setSelected(t.id)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground line-clamp-1">{t.case}</p>
                  {t.unread > 0 && <span className="w-4 h-4 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center flex-shrink-0">{t.unread}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.lastMsg}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.time}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {selected ? (
          <Card className="md:col-span-2 flex flex-col">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-medium">{THREADS.find((t) => t.id === selected)?.case}</CardTitle>
            </CardHeader>
            <div className="flex-1 p-4 space-y-3 overflow-auto">
              <div className="flex justify-start">
                <div className="bg-secondary rounded-lg px-3 py-2 max-w-xs">
                  <p className="text-sm text-foreground">Your hearing date has been confirmed for 15 Mangsir 2081 at 11:00 AM, District Court Kathmandu.</p>
                  <p className="text-xs text-muted-foreground mt-1">Adv. Binod Thapa \u2022 2 hours ago</p>
                </div>
              </div>
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message..."
                onKeyDown={(e) => { if (e.key === "Enter") { toast.info("Messaging coming in the next milestone!"); setDraft(""); } }}
              />
              <Button size="sm" onClick={() => { toast.info("Messaging coming in the next milestone!"); setDraft(""); }}><Send className="w-4 h-4" /></Button>
            </div>
          </Card>
        ) : (
          <div className="md:col-span-2 flex items-center justify-center text-muted-foreground text-sm">Select a conversation</div>
        )}
      </div>
    </div>
  );
}
