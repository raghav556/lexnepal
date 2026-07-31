import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, Send, User, Bot, Loader2, ArrowRight, Scale } from "lucide-react";
import { Button } from "./button.tsx";
import { cn } from "@/lib/utils.ts";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Link } from "react-router-dom";

type Message = {
  id: string;
  role: "user" | "bot";
  content: string;
  isForm?: boolean;
  isLink?: boolean;
  linkText?: string;
  linkHref?: string;
};

// Advanced Knowledge Base
const KNOWLEDGE_BASE = {
  firmName: "Srimar Law",
  location: "Kathmandu, Nepal",
  hours: "Sunday to Friday, 9:00 AM - 6:00 PM. Closed on Saturdays and public holidays.",
  contact: "Email: info@Srimar Law.com | Phone: +977-1-4XXXXXX",
  practiceAreas: [
    "Corporate & Commercial Law (Company Registration, FDI, Contracts)",
    "Civil Litigation (Property, Family, Torts)",
    "Criminal Defense",
    "Intellectual Property (Trademarks, Patents)",
    "Employment & Labor Law"
  ],
  team: [
    { name: "Senior Partners", role: "Handling complex litigation and major corporate deals." },
    { name: "Associates", role: "Handling day-to-to legal compliance, drafting, and research." }
  ],
  consultation: "Initial consultations are available in-person or virtually. You can book directly through our website."
};

// Simulated AI Intent Engine
function evaluateIntent(text: string) {
  const lower = text.toLowerCase();
  
  // Guardrail: Complex Legal Advice
  if (lower.match(/(divorce|sue|arrest|police|jail|stole|fraud|cheat|murder|rape|crime|court|judge)/)) {
    return { intent: "complex_case", score: 10 };
  }
  
  const scores = {
    greeting: (lower.match(/(hi|hello|hey|morning|afternoon)/g) || []).length * 2,
    location: (lower.match(/(where|location|address|visit|kathmandu)/g) || []).length * 2,
    hours: (lower.match(/(time|hours|open|close|saturday|sunday)/g) || []).length * 2,
    contact: (lower.match(/(contact|phone|email|call|number)/g) || []).length * 2,
    practice_areas: (lower.match(/(practice|areas|services|do you handle|corporate|civil|criminal|property|ip|labor)/g) || []).length * 2,
    team: (lower.match(/(lawyer|attorney|advocate|team|who|partner|associate)/g) || []).length * 2,
    consultation: (lower.match(/(book|appointment|consultation|meet|fee|cost)/g) || []).length * 2,
  };

  let maxIntent = "unknown";
  let maxScore = 0;

  for (const [intent, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxIntent = intent;
    }
  }

  return maxScore > 0 ? maxIntent : "unknown";
}

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "bot",
      content: "Hello! Welcome to Srimar Law. I'm your digital assistant. How can I help you today?",
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const submitLead = useMutation(api.chatbots?.submitLead || (() => {})); // safe fallback for mock

  // Lead capture state
  const [leadName, setLeadName] = useState("");
  const [leadContact, setLeadContact] = useState("");
  const [submittingLead, setSubmittingLead] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setInput("");
    
    // Add User Message
    const newMessages = [...messages, { id: Date.now().toString(), role: "user" as const, content: userText }];
    setMessages(newMessages);
    setIsTyping(true);

    // Advanced Mock AI Logic Engine
    const processingTime = Math.random() * 800 + 800; // Simulate AI thinking time (800ms - 1600ms)

    setTimeout(() => {
      let botResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: ""
      };

      const intent = evaluateIntent(userText);

      switch (intent) {
        case "greeting":
          botResponse.content = `Hello there! Welcome to ${KNOWLEDGE_BASE.firmName}. How can I assist you with your legal needs today?`;
          break;
        case "location":
          botResponse.content = `Our main office is located in ${KNOWLEDGE_BASE.location}. Would you like to schedule an in-person meeting?`;
          break;
        case "hours":
          botResponse.content = `Our office hours are: ${KNOWLEDGE_BASE.hours}.`;
          break;
        case "contact":
          botResponse.content = `You can reach us directly at:\n${KNOWLEDGE_BASE.contact}\n\nAlternatively, leave your details below and we will call you back!`;
          botResponse.isForm = true;
          break;
        case "practice_areas":
          botResponse.content = `We are a full-service law firm. Our main practice areas include:\n• ${KNOWLEDGE_BASE.practiceAreas.join('\n• ')}\n\nDo you need help with any of these specific areas?`;
          break;
        case "team":
          botResponse.content = `We have a highly specialized team of advocates, including:\n• ${KNOWLEDGE_BASE.team[0].name} (${KNOWLEDGE_BASE.team[0].role})\n• ${KNOWLEDGE_BASE.team[1].name} (${KNOWLEDGE_BASE.team[1].role})\n\nYou can view their full profiles in our directory.`;
          botResponse.isLink = true;
          botResponse.linkText = "View Our Advocates";
          botResponse.linkHref = "/lawyers";
          break;
        case "consultation":
          botResponse.content = `${KNOWLEDGE_BASE.consultation}\nWould you like to book one now?`;
          botResponse.isLink = true;
          botResponse.linkText = "Book Consultation";
          botResponse.linkHref = "/consultation";
          break;
        case "complex_case":
          botResponse.content = `It sounds like you are dealing with a complex legal situation. To ensure attorney-client privilege and confidentiality, I cannot provide direct legal advice here.\n\nPlease leave your name and contact details below, and one of our specialized advocates will contact you immediately.`;
          botResponse.isForm = true;
          break;
        default:
          botResponse.content = `I understand. Since I am an AI assistant and cannot provide specific legal advice, would you like one of our human advocates to contact you to discuss this further?`;
          botResponse.isForm = true;
      }

      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, processingTime);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !leadContact) return;
    
    setSubmittingLead(true);
    try {
      // @ts-ignore - mock function will handle it
      await submitLead({
        fullName: leadName,
        email: leadContact.includes('@') ? leadContact : undefined,
        phone: !leadContact.includes('@') ? leadContact : undefined,
        practiceAreaInterest: "General Inquiry (Via Chatbot)"
      });
      
      setMessages(prev => [
        ...prev.map(m => m.isForm ? { ...m, isForm: false, content: "Contact information received." } : m),
        { id: Date.now().toString(), role: "bot", content: "Thank you, " + leadName.split(' ')[0] + ". We have securely received your details. An advocate will reach out to you shortly." }
      ]);
    } catch (error) {
      console.error(error);
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
            className="fixed bottom-24 right-4 sm:right-8 w-[350px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[70vh] bg-background border border-border shadow-2xl rounded-2xl flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between shadow-sm z-10 relative">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                    <Scale className="w-5 h-5 text-accent" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-primary rounded-full" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-primary-foreground leading-tight">Lex Assistant</h3>
                  <p className="text-[11px] text-primary-foreground/70 font-medium">Typically replies instantly</p>
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
                <div key={msg.id} className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}>
                  <div className={cn(
                    "flex gap-2 max-w-[85%]",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm",
                      msg.role === "user" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                    )}>
                      {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={cn(
                      "p-3 rounded-2xl text-sm shadow-sm",
                      msg.role === "user" 
                        ? "bg-accent text-accent-foreground rounded-tr-sm" 
                        : "bg-card border border-border text-foreground rounded-tl-sm"
                    )}>
                      {msg.content}
                      
                      {msg.isLink && msg.linkHref && (
                        <div className="mt-3">
                          <Button asChild size="sm" className="w-full bg-primary hover:bg-primary/90 text-xs">
                            <Link to={msg.linkHref} onClick={() => setIsOpen(false)}>
                              {msg.linkText} <ArrowRight className="ml-1 w-3 h-3" />
                            </Link>
                          </Button>
                        </div>
                      )}

                      {msg.isForm && (
                        <form onSubmit={handleLeadSubmit} className="mt-3 space-y-2 border-t border-border pt-3">
                          <input 
                            type="text" 
                            required
                            placeholder="Full Name" 
                            value={leadName}
                            onChange={e => setLeadName(e.target.value)}
                            className="w-full text-xs px-3 py-2 rounded-md border border-input bg-background focus:ring-1 focus:ring-accent outline-none"
                          />
                          <input 
                            type="text" 
                            required
                            placeholder="Phone or Email" 
                            value={leadContact}
                            onChange={e => setLeadContact(e.target.value)}
                            className="w-full text-xs px-3 py-2 rounded-md border border-input bg-background focus:ring-1 focus:ring-accent outline-none"
                          />
                          <Button type="submit" disabled={submittingLead} size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 text-xs h-8">
                            {submittingLead ? <Loader2 className="w-3 h-3 animate-spin" /> : "Request Callback"}
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex items-start gap-2 max-w-[85%]">
                   <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm bg-primary text-primary-foreground">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-4 rounded-2xl bg-card border border-border rounded-tl-sm flex gap-1 items-center h-[44px]">
                      <motion.div className="w-1.5 h-1.5 bg-primary/40 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                      <motion.div className="w-1.5 h-1.5 bg-primary/40 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                      <motion.div className="w-1.5 h-1.5 bg-primary/40 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
                    </div>
                </div>
              )}
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
                  disabled={!input.trim() || isTyping}
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
            className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-2xl flex items-center justify-center hover:bg-primary/90 hover:scale-105 transition-all z-50 overflow-hidden group"
            aria-label="Open Chat"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity" />
            <MessageSquare className="w-6 h-6" />
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-primary rounded-full" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
