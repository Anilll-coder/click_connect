import React, { useEffect, useRef, useState } from "react";
import { Send, Mic, Sparkles, Copy, Loader, MessageSquare, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

// Helper to handle copying
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
    } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
        document.body.removeChild(textarea);
    }
}

// Custom Confirmation Modal
const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 font-sans">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold mb-3 text-slate-900 dark:text-white">{title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors">
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function Chatbot() {
    const navigate = useNavigate();
    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem("cc_chat_history_ui");
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    
    const bottomRef = useRef(null);
    const recognitionRef = useRef(null);

    // Persist state
    useEffect(() => {
        localStorage.setItem("cc_chat_history_ui", JSON.stringify(messages));
    }, [messages]);

    // Scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
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

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
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
            const response = await fetch("http://localhost:8000/api/chat", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

        // Add user message
        const userMsg = { id: Date.now() + Math.random(), role: "user", text: trimmed };
        setMessages(m => [...m, userMsg]);

        // Add temporary "thinking" message
        const thinkingMsgId = 'thinking';
        setMessages(m => [...m, { id: thinkingMsgId, role: "assistant", text: "...", timestamp: Date.now() + 1 }]);

        setIsLoading(true);
        setInput("");

        const assistantText = await sendMessageToApi(trimmed);

        // Update with final response
        setMessages(prev => {
            const copy = [...prev].filter(m => m.id !== thinkingMsgId);
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
        navigate('/create', { state: { content: text } });
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
            <ConfirmationModal
                isOpen={showConfirmation}
                title="Clear Chat History"
                message="Are you sure you want to delete all messages? This cannot be undone."
                onConfirm={clearChatConfirmed}
                onCancel={() => setShowConfirmation(false)}
            />

            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 z-10">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <MessageSquare size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-800 dark:text-white">AI Assistant</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Powered by Content Lab</p>
                    </div>
                </div>
                <button
                    onClick={handleClearChat}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                    title="Clear Chat"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 dark:bg-slate-900/50">
                <AnimatePresence initial={false} mode="popLayout">
                    {messages.length === 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60"
                        >
                            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-4 text-indigo-500">
                                <Sparkles size={32} />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">How can I help you today?</h3>
                            <p className="text-sm text-slate-500 max-w-xs mt-2">Ask me to write articles, summarize text, or generate creative ideas.</p>
                        </motion.div>
                    )}
                    
                    {messages.map((m) => (
                        <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            layout
                            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-sm ${
                                m.role === 'user' 
                                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                            }`}>
                                <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</div>
                                
                                {m.role === 'assistant' && m.id !== 'thinking' && (
                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                        <button 
                                            onClick={() => copyToClipboard(m.text)}
                                            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                        >
                                            <Copy size={14} /> Copy
                                        </button>
                                        <button 
                                            onClick={() => handleMagicDraft(m.text)}
                                            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors px-2 py-1 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                        >
                                            <Sparkles size={14} /> Magic Draft
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                    
                    {isLoading && messages.some(m => m.id === 'thinking') && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-none p-4 flex items-center gap-3 shadow-sm">
                                <Loader size={16} className="animate-spin text-indigo-500" />
                                <span className="text-sm text-slate-500">Thinking...</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                <form onSubmit={handleSend} className="relative flex items-end gap-2">
                    <div className="relative flex-1">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Type a message..."
                            className="w-full p-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none max-h-32 min-h-[50px] text-sm"
                            rows={1}
                            style={{ minHeight: '50px' }}
                        />
                        <button
                            type="button"
                            onClick={toggleVoiceInput}
                            className={`absolute right-2 bottom-2 p-2 rounded-lg transition-all ${
                                isListening 
                                    ? 'bg-rose-100 text-rose-600 animate-pulse' 
                                    : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                            title="Voice Input"
                        >
                            <Mic size={20} />
                        </button>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="p-3 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all flex-shrink-0"
                    >
                        {isLoading ? <Loader size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                </form>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-slate-400">AI can make mistakes. Please verify important information.</p>
                </div>
            </div>
        </div>
    );
}