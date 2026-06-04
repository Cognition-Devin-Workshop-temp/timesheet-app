import { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  CircularProgress,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import type { ChatMessage } from "../types";
import { sendChatMessage } from "../api/client";
import MessageBubble from "./MessageBubble";

interface Props {
  hasArticles: boolean;
}

export default function ChatPanel({ hasArticles }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await sendChatMessage(trimmed, messages);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.answer,
        steps: response.steps,
        template: response.template,
        sources: response.sources,
        mode: response.mode,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: `Sorry, something went wrong: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <SmartToyIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>
          Knowledge Assistant
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", py: 2 }}>
        {messages.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 2,
              px: 3,
            }}
          >
            <SmartToyIcon sx={{ fontSize: 64, color: "primary.light" }} />
            <Typography variant="h5" fontWeight={700} textAlign="center">
              Knowledge Chat Agent
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              textAlign="center"
              maxWidth={500}
            >
              {hasArticles
                ? "Ask me anything about your knowledge articles. I'll provide detailed steps and ready-to-use templates."
                : "Add some knowledge articles first, then ask me questions. I'll give you step-by-step guidance and templates."}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
              {[
                "How do I get started?",
                "What are the best practices?",
                "Create a checklist for me",
                "Explain the process step by step",
              ].map((suggestion) => (
                <Paper
                  key={suggestion}
                  variant="outlined"
                  sx={{
                    px: 2,
                    py: 1,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "primary.50", borderColor: "primary.main" },
                    transition: "all 0.2s",
                  }}
                  onClick={() => setInput(suggestion)}
                >
                  <Typography variant="body2" color="text.secondary">
                    {suggestion}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Box>
        ) : (
          messages.map((msg, i) => <MessageBubble key={i} message={msg} />)
        )}
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "flex-start", px: 2 }}>
            <Paper
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                gap: 1,
                borderRadius: 2,
              }}
            >
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Thinking...
              </Typography>
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            placeholder={
              hasArticles
                ? "Ask about your knowledge articles..."
                : "Add articles first, then ask questions..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            multiline
            maxRows={3}
            size="small"
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            sx={{
              bgcolor: "primary.main",
              color: "white",
              "&:hover": { bgcolor: "primary.dark" },
              "&:disabled": { bgcolor: "action.disabledBackground" },
              width: 44,
              height: 44,
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
