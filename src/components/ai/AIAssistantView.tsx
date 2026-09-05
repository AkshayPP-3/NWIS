"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Sparkles,
  Layers,
  Activity,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  RotateCcw,
  Compass,
} from "lucide-react";
import type { Well, AIAssistantMessage } from "@/types/well";

interface AIAssistantViewProps {
  wells: Well[];
  selectedWell: Well | null;
  onNavigateToWell: (well: Well) => void;
  onNavigateToCompare: (wellIds: string[]) => void;
  onNavigateToNearby: (well: Well) => void;
  initialPrompt?: string;
}

export default function AIAssistantView({
  wells,
  selectedWell,
  onNavigateToWell,
  onNavigateToCompare,
  onNavigateToNearby,
  initialPrompt,
}: AIAssistantViewProps) {
  const [messages, setMessages] = useState<AIAssistantMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content: `### 🤖 Welcome to NWIS AI Drilling Assistant
I am directly connected to your **Neon PostgreSQL** database. I analyze real well trajectories, drilling parameter logs (ROP, WOB, Torque, Pressure), historical incidents, and geodetic offset proximities.

**How can I assist your drilling operations today?**`,
      timestamp: new Date().toISOString(),
    },
  ]);

  const [inputQuery, setInputQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const starterQueries = [
    `Show nearby wells around ${selectedWell?.wellId || "WELL-001"}.`,
    "Which nearby wells have the same formation?",
    "Compare WELL-001 and WELL-005.",
    "What drilling events occurred near 2000 m?",
    "Which wells had high pressure?",
    `Summarize the drilling history of ${selectedWell?.wellId || "WELL-008"}.`,
    "What patterns are visible in nearby wells?",
  ];

  const handleSend = async (queryToSend?: string) => {
    const query = (queryToSend || inputQuery).trim();
    if (!query || loading) return;

    const userMessage: AIAssistantMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          contextWellId: selectedWell?.wellId,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `⚠️ Error: ${data.error}`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        setMessages((prev) => [...prev, data]);
        // Default evidence to expanded
        if (data.id) {
          setExpandedEvidence((prev) => ({ ...prev, [data.id]: true }));
        }
      }
    } catch (err) {
      console.error("AI request error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "❌ Connection failure to AI Assistant API.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // If initialPrompt was provided, trigger it
  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  return (
    <div className="flex flex-col h-[740px] max-w-5xl mx-auto rounded-xl border border-zinc-800 bg-zinc-950/90 shadow-2xl backdrop-blur-md overflow-hidden text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-850 p-4 bg-zinc-900/60">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-400">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-zinc-100">
                NWIS AI Drilling Decision Assistant
              </h2>
              <span className="rounded bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold text-violet-300 border border-violet-500/40">
                Grounded on Neon DB
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Autonomous conversational reasoning with explainable telemetry evidence
            </p>
          </div>
        </div>

        {selectedWell && (
          <div className="text-xs text-zinc-400 font-mono flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-amber-400" />
            <span>Active Focus: <strong className="text-amber-400">{selectedWell.wellId}</strong></span>
          </div>
        )}
      </div>

      {/* Suggested Starter Prompts Banner */}
      <div className="flex overflow-x-auto gap-2 p-3 border-b border-zinc-850 bg-zinc-950/60 scrollbar-none">
        <span className="text-[10px] uppercase font-bold text-zinc-500 self-center shrink-0 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-400" /> Suggested:
        </span>
        {starterQueries.map((sq, i) => (
          <button
            key={i}
            onClick={() => handleSend(sq)}
            className="shrink-0 rounded-full border border-zinc-750 bg-zinc-900/80 px-3 py-1 text-xs text-zinc-300 hover:border-amber-500/50 hover:bg-zinc-800 hover:text-white transition-all font-medium"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const hasEvidence = msg.evidence && msg.evidence.length > 0;
          const isEvidenceOpen = expandedEvidence[msg.id] ?? false;

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-950/60 text-violet-400">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed shadow-md ${
                  isUser
                    ? "bg-amber-500 text-zinc-950 font-medium"
                    : "bg-zinc-900/80 border border-zinc-800 text-zinc-200"
                }`}
              >
                {/* Message Content */}
                <div className="prose prose-invert prose-xs max-w-none space-y-2 whitespace-pre-line">
                  {msg.content}
                </div>

                {/* Explainable Evidence Attribution Section */}
                {hasEvidence && (
                  <div className="mt-4 pt-3 border-t border-zinc-800">
                    <button
                      onClick={() =>
                        setExpandedEvidence((prev) => ({
                          ...prev,
                          [msg.id]: !isEvidenceOpen,
                        }))
                      }
                      className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:underline"
                    >
                      <FileCheck2 className="h-3.5 w-3.5" />
                      <span>
                        Explainable Technical Evidence ({msg.evidence!.length}{" "}
                        points)
                      </span>
                      {isEvidenceOpen ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>

                    {isEvidenceOpen && (
                      <div className="mt-2 space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-950 p-2.5">
                        {msg.evidence!.map((ev, idx) => (
                          <div
                            key={idx}
                            className="border-b border-zinc-850 pb-1.5 last:border-none last:pb-0"
                          >
                            <span className="font-bold text-zinc-200 block text-[11px]">
                              &bull; {ev.title}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {ev.details}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Interactive Action Link */}
                {msg.actionLink && (
                  <div className="mt-3 pt-2 border-t border-zinc-800 flex justify-end">
                    <button
                      onClick={() => {
                        if (msg.actionLink?.type === "view_well") {
                          const w = wells.find(
                            (item) => item.wellId === msg.actionLink?.targetId
                          );
                          if (w) onNavigateToWell(w);
                        } else if (msg.actionLink?.type === "compare") {
                          const ids = (msg.actionLink.targetId || "").split(",");
                          onNavigateToCompare(ids);
                        } else if (msg.actionLink?.type === "show_nearby") {
                          const w = wells.find(
                            (item) => item.wellId === msg.actionLink?.targetId
                          );
                          if (w) onNavigateToNearby(w);
                        }
                      }}
                      className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all"
                    >
                      <span>{msg.actionLink.label}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-950 text-violet-400 animate-pulse">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 text-xs text-zinc-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>Querying Neon PostgreSQL models and calculating offset geodetics...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-800 p-4 bg-zinc-900/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask a technical drilling question (e.g. Compare WELL-001 and WELL-005, or show nearby wells)..."
            className="flex-1 rounded-xl border border-zinc-750 bg-zinc-950 px-4 py-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || loading}
            className="flex items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-zinc-950 font-bold hover:bg-amber-400 disabled:opacity-40 transition-all"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

