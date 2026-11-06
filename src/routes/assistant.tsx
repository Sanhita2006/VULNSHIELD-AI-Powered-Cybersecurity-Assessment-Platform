import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Bot, Send, ShieldAlert, Sparkles, User, Terminal, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Security Assistant — VULNSHIELD" },
      { name: "description", content: "AI-powered cybersecurity guidance and remediation advisor." },
    ],
  }),
  component: AssistantPage,
});

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "How do I fix missing HTTP security headers?",
  "Explain OWASP Top 10 Injection vulnerabilities",
  "What is the best way to secure an API endpoint?",
  "How to verify SSL/TLS certificate configuration?",
];

function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: "Greetings, operator. I am VULNSHIELD AI Assistant, trained in web security, threat analysis, and vulnerability remediation. How can I assist your security audit today?",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    // Simulate intelligent security assistant response
    setTimeout(() => {
      let aiResponseText = "I have analyzed your query based on standard cybersecurity frameworks and OWASP guidelines.";
      
      const lower = query.toLowerCase();
      if (lower.includes("header") || lower.includes("http")) {
        aiResponseText = "To secure HTTP headers, ensure you implement Content-Security-Policy (CSP), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, and Strict-Transport-Security (HSTS). These prevent XSS, clickjacking, and protocol downgrade attacks.";
      } else if (lower.includes("owasp") || lower.includes("injection")) {
        aiResponseText = "OWASP Top 10 highlights critical risks like Injection, Broken Authentication, and Security Misconfigurations. Always use parameterized queries for databases and enforce strict input validation.";
      } else if (lower.includes("api") || lower.includes("endpoint")) {
        aiResponseText = "Securing API endpoints requires token-based authentication (JWT/OAuth2), rate limiting to prevent brute-force attacks, robust CORS policies, and input payload sanitization using Zod or similar validation schemas.";
      } else if (lower.includes("ssl") || lower.includes("tls") || lower.includes("certificate")) {
        aiResponseText = "Check your TLS configuration to ensure support for TLS 1.2 and TLS 1.3 only, disable obsolete ciphers (RC4, 3DES), and configure automatic HTTP-to-HTTPS redirects with valid certificate chain validation.";
      } else {
        aiResponseText = `Regarding "${query}": Always perform passive scanning first, verify asset ownership, and apply defense-in-depth principles. Let me know if you need specific remediation code snippets or log analysis help.`;
      }

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        sender: "ai",
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        code="AI-01"
        title="AI Security Assistant"
        description="Consult the artificial intelligence core for vulnerability explanations, threat insights, and secure code remediations."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setMessages([
                {
                  id: "1",
                  sender: "ai",
                  text: "Chat cleared. Ready for your next security inquiry.",
                  timestamp: new Date().toLocaleTimeString(),
                },
              ])
            }
            className="flex items-center gap-2 border-border font-mono text-xs"
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
            Clear Chat
          </Button>
        }
      />

      <Panel title="Secure Communication Channel" code="SEC-CHAT" className="scanline flex flex-col h-[600px]">
        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex items-start gap-3 max-w-[85%]",
                msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded border font-mono text-xs",
                  msg.sender === "user"
                    ? "bg-primary/20 border-primary/50 text-primary"
                    : "bg-muted border-border text-foreground"
                )}
              >
                {msg.sender === "user" ? <User className="size-4" /> : <Bot className="size-4 text-primary" />}
              </div>
              <div
                className={cn(
                  "rounded-lg p-3 font-mono text-xs leading-relaxed border",
                  msg.sender === "user"
                    ? "bg-primary/10 border-primary/30 text-foreground"
                    : "bg-card border-border text-foreground"
                )}
              >
                <div className="flex items-center justify-between gap-4 mb-1 text-[10px] text-muted-foreground">
                  <span className="uppercase font-semibold">{msg.sender === "user" ? "Operator" : "VULNSHIELD Core AI"}</span>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3 mr-auto">
              <div className="flex size-8 shrink-0 items-center justify-center rounded border bg-muted border-border text-primary">
                <Bot className="size-4 animate-pulse" />
              </div>
              <div className="rounded-lg p-3 font-mono text-xs bg-card border border-border text-muted-foreground flex items-center gap-2">
                <Sparkles className="size-3.5 animate-spin text-primary" />
                Analyzing security context and formulating response...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="mb-4 pt-2 border-t border-border/40">
          <p className="font-mono text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Suggested Queries:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                className="rounded border border-border bg-muted/30 px-2.5 py-1 font-mono text-[10px] text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground font-mono text-xs">
              &gt;
            </span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about vulnerabilities, headers, threat mitigations..."
              className="w-full rounded-md border border-input bg-background/50 pl-7 pr-4 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <Button variant="neon" onClick={() => handleSend()} disabled={loading || !input.trim()} className="gap-2">
            <Send className="size-3.5" />
            Transmit
          </Button>
        </div>
      </Panel>
    </div>
  );
}
