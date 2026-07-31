import React, { useEffect, useRef, useState } from "react";
import { Send, Mic, Sparkles, Copy, Loader, MessageSquare, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../utils/helpers";

function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
    document.body.removeChild(textarea);
  }
}

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-2xl"
      >
        <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-50">{title}</h3>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const SUGGESTIONS = [
  "Write a motivational post",
  "Translate this into French",
  "Summarize a long text",
];

export default function Chatbot() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("cc_chat_history_ui");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("cc_chat_history_ui", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev + (prev ? " " : "") + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  async function sendMessageToApi(query) {
    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      return data.reply;
    } catch (error) {
      console.error("API Error:", error);
      return "Sorry, I encountered an error while processing your request.";
    }
  }

  async function handleSend(e) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg = { id: Date.now() + Math.random(), role: "user", text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setMessages((m) => [...m, { id: "thinking", role: "assistant", text: "...", timestamp: Date.now() + 1 }]);

    setIsLoading(true);
    setInput("");

    const assistantText = await sendMessageToApi(trimmed);
    setMessages((prev) => {
      const copy = [...prev].filter((m) => m.id !== "thinking");
      copy.push({ id: Date.now() + Math.random(), role: "assistant", text: assistantText });
      return copy;
    });

    setIsLoading(false);
  }

  const handleClearChat = () => setShowConfirmation(true);

  const clearChatConfirmed = () => {
    setMessages([]);
    setShowConfirmation(false);
  };

  const handleMagicDraft = (text) => {
    navigate("/create", { state: { content: text } });
  };

  return (
    <div className="page max-w-3xl">
      <ConfirmationModal
        isOpen={showConfirmation}
        title="Clear Chat History"
        message="Are you sure you want to delete all messages? This cannot be undone."
        onConfirm={clearChatConfirmed}
        onCancel={() => setShowConfirmation(false)}
      />

      <div className="card flex h-[calc(100vh-9rem)] min-h-[480px] flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-sky-500/30">
              <MessageSquare size={20} />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-gray-50">AI Writing Assistant</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500">Content writing & translation</p>
            </div>
          </div>
          <button
            onClick={handleClearChat}
            className="rounded-xl p-2 text-gray-400 dark:text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
            title="Clear Chat"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-6 overflow-y-auto bg-[#fafbff] p-5">
          <AnimatePresence initial={false} mode="popLayout">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex h-full flex-col items-center justify-center py-8 text-center"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-sky-50 text-blue-500 dark:from-slate-800 dark:to-slate-700 dark:text-sky-400">
                  <Sparkles size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">How can I help you today?</h3>
                <p className="mt-2 max-w-xs text-sm text-gray-400 dark:text-gray-500">
                  Ask me to write articles, summarize text, or translate between languages.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="rounded-full border border-blue-100 bg-blue-50/60 px-4 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:border-slate-600 dark:bg-blue-500/10 dark:text-sky-400 dark:hover:bg-blue-500/20"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                layout
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow-sm md:max-w-[75%] ${
                    m.role === "user"
                      ? "rounded-tr-none bg-gradient-to-br from-blue-600 to-sky-600 text-white shadow-sky-500/20"
                      : "rounded-tl-none border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {m.role === "assistant" && m.id === "thinking" ? (
                      <span className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                        <Loader size={14} className="animate-spin" />
                        Thinking...
                      </span>
                    ) : (
                      m.text
                    )}
                  </div>

                  {m.role === "assistant" && m.id !== "thinking" && (
                    <div className="mt-3 flex items-center gap-2 border-t border-gray-100 dark:border-slate-700 pt-3">
                      <button
                        onClick={() => copyToClipboard(m.text)}
                        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"
                      >
                        <Copy size={14} /> Copy
                      </button>
                      <button
                        onClick={() => handleMagicDraft(m.text)}
                        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-sky-400 dark:hover:bg-blue-500/10"
                      >
                        <Sparkles size={14} /> Magic Draft
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message..."
                className="w-full resize-none rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 p-3 pr-12 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-100 dark:focus:ring-sky-500/20"
                rows={1}
                style={{ minHeight: "50px", maxHeight: "120px" }}
              />
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`absolute bottom-2 right-2 rounded-lg p-2 transition-all ${
                  isListening
                    ? "animate-pulse bg-rose-100 text-rose-600 dark:bg-rose-500/10"
                    : "text-gray-400 dark:text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"
                }`}
                title="Voice Input"
              >
                <Mic size={20} />
              </button>
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-sky-500/30 transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:shadow-none"
            >
              {isLoading ? <Loader size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </form>
          <p className="mt-2 text-center text-[10px] text-gray-400 dark:text-gray-500">
            AI can make mistakes. Please verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
