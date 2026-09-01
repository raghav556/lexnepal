import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Send, User, Bot, Loader2, ArrowRight, Scale } from "lucide-react";
import { Button } from "./button.tsx";
import { cn } from "@/lib/utils.ts";
import { Link } from "@/client/navigation";
import { useLeadCommands } from "@/client/queries/crm";
import { usePracticeAreas } from "@/client/queries/cms";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";
import {
  buildGuidedResponse,
  evaluateGuidedIntent,
  validateCallbackContact,
} from "@/lib/chatbot-guidance";

type Message = {
  id: string;
  role: "user" | "bot";
  content: string;
  isForm?: boolean;
  isLink?: boolean;
  linkText?: string;
  linkHref?: string;
};

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "bot",
      content:
        "Hello. I’m an automated website guide, not a lawyer or live-chat agent. I can direct you to published information or help you submit a callback request.",
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { createPublicLead } = useLeadCommands();
  const settings = usePublicCmsSettings();
  const cmsPracticeAreas = usePracticeAreas({ isActive: true }, "public") || [];

  // Lead capture state
  const [leadName, setLeadName] = useState("");
  const [leadContact, setLeadContact] = useState("");
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadError, setLeadError] = useState("");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setInput("");

    // Add User Message
    const newMessages = [
      ...messages,
      { id: Date.now().toString(), role: "user" as const, content: userText },
    ];
    setMessages(newMessages);
    const response = buildGuidedResponse({
      intent: evaluateGuidedIntent(userText),
      settings,
      practiceAreas: cmsPracticeAreas,
    });
    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: response.content,
        isForm: response.isForm,
        isLink: !!response.linkHref,
        linkText: response.linkText,
        linkHref: response.linkHref,
      },
    ]);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingLead) return;
    if (leadName.trim().length < 2) {
      setLeadError("Please enter your full name.");
      return;
    }
    if (!validateCallbackContact(leadContact)) {
      setLeadError("Enter a valid email address or phone number.");
      return;
    }

    setLeadError("");
    setSubmittingLead(true);
    try {
      await createPublicLead.mutateAsync({
        fullName: leadName.trim(),
        email: leadContact.includes("@") ? leadContact.trim() : undefined,
        phone: !leadContact.includes("@") ? leadContact.trim() : undefined,
        practiceAreaInterest: "General Inquiry (Via Chatbot)",
        source: "website",
      });

      setMessages((prev) => [
        ...prev.map((m) =>
          m.isForm ? { ...m, isForm: false, content: "Contact information received." } : m,
        ),
        {
          id: Date.now().toString(),
          role: "bot",
          content:
            "Thank you, " +
            leadName.split(" ")[0] +
            ". Your callback request was submitted for the firm to review. Response timing and availability are not guaranteed.",
        },
      ]);
      setLeadName("");
      setLeadContact("");
    } catch (error) {
      setLeadError(error instanceof Error ? error.message : "The request could not be submitted.");
    } finally {
      setSubmittingLead(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-3 sm:bottom-24 sm:right-8 w-[min(350px,calc(100vw-1.5rem))] h-[min(500px,70vh)] bg-background border border-border shadow-2xl rounded-2xl flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between shadow-sm z-10 relative">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                    <Scale className="w-5 h-5 text-accent" />
                  </div>
                </div>
                <div>
                  <h3 className="font-serif font-bold text-primary-foreground leading-tight">
                    Lex Assistant
                  </h3>
                  <p className="text-[11px] text-primary-foreground/70 font-medium">
                    Automated guidance • not legal advice
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-primary-foreground/70 hover:text-primary-foreground bg-transparent hover:bg-primary-foreground/10 p-1.5 rounded-full transition-colors"
                aria-label="Close Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}
                >
                  <div
                    className={cn(
                      "flex gap-2 max-w-[85%]",
                      msg.role === "user" ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm",
                        msg.role === "user"
                          ? "bg-accent text-accent-foreground"
                          : "bg-primary text-primary-foreground",
                      )}
                    >
                      {msg.role === "user" ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "p-3 rounded-2xl text-sm shadow-sm",
                        msg.role === "user"
                          ? "bg-accent text-accent-foreground rounded-tr-sm"
                          : "bg-card border border-border text-foreground rounded-tl-sm",
                      )}
                    >
                      {msg.content}

                      {msg.isLink && msg.linkHref && (
                        <div className="mt-3">
                          <Button
                            asChild
                            size="sm"
                            className="w-full bg-primary hover:bg-primary/90 text-xs"
                          >
                            <Link href={msg.linkHref} onClick={() => setIsOpen(false)}>
                              {msg.linkText} <ArrowRight className="ml-1 w-3 h-3" />
                            </Link>
                          </Button>
                        </div>
                      )}

                      {msg.isForm && (
                        <form
                          onSubmit={handleLeadSubmit}
                          className="mt-3 space-y-2 border-t border-border pt-3"
                        >
                          <input
                            type="text"
                            required
                            placeholder="Full Name"
                            value={leadName}
                            onChange={(e) => setLeadName(e.target.value)}
                            aria-label="Full name"
                            className="w-full text-xs px-3 py-2 rounded-md border border-input bg-background focus:ring-1 focus:ring-accent outline-none"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Phone or Email"
                            value={leadContact}
                            onChange={(e) => setLeadContact(e.target.value)}
                            aria-label="Phone or email"
                            className="w-full text-xs px-3 py-2 rounded-md border border-input bg-background focus:ring-1 focus:ring-accent outline-none"
                          />
                          <Button
                            type="submit"
                            disabled={submittingLead}
                            size="sm"
                            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 text-xs h-8"
                          >
                            {submittingLead ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Request Callback"
                            )}
                          </Button>
                          <p className="text-[10px] leading-relaxed text-muted-foreground">
                            Submit basic contact details only. Do not send confidential or urgent
                            legal information through this form.
                          </p>
                          {leadError && (
                            <p role="alert" className="text-[11px] text-destructive">
                              {leadError}
                            </p>
                          )}
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-background border-t border-border">
              <form onSubmit={handleSend} className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full pl-4 pr-12 py-3 bg-muted/30 border border-input rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="absolute right-1 w-10 h-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-4 right-3 sm:bottom-8 sm:right-8 w-12 h-12 sm:w-14 sm:h-14 bg-primary text-primary-foreground rounded-full shadow-2xl flex items-center justify-center hover:bg-primary/90 hover:scale-105 transition-all z-50 overflow-hidden group"
            aria-label="Open Chat"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity" />
            <MessageSquare className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
