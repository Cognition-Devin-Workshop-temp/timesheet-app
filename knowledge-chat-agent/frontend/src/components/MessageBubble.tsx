import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Chip,
  Snackbar,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import DescriptionIcon from "@mui/icons-material/Description";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "../types";

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({ message }: Props) {
  const [copySnack, setCopySnack] = useState(false);
  const isUser = message.role === "user";

  const handleCopyTemplate = () => {
    if (message.template) {
      navigator.clipboard.writeText(message.template);
      setCopySnack(true);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        mb: 2,
        px: 1,
      }}
    >
      <Paper
        elevation={1}
        sx={{
          maxWidth: isUser ? "70%" : "85%",
          p: 2,
          bgcolor: isUser ? "primary.main" : "background.paper",
          color: isUser ? "primary.contrastText" : "text.primary",
          borderRadius: 2,
          borderTopRightRadius: isUser ? 4 : 16,
          borderTopLeftRadius: isUser ? 16 : 4,
        }}
      >
        {message.mode && !isUser && (
          <Chip
            label={`${message.mode} mode`}
            size="small"
            sx={{ mb: 1, fontSize: "0.7rem", height: 20 }}
            variant="outlined"
          />
        )}

        <Box sx={{ "& p": { m: 0, mb: 1 }, "& p:last-child": { mb: 0 } }}>
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </Box>

        {message.steps && message.steps.length > 0 && (
          <Accordion
            sx={{
              mt: 1,
              bgcolor: isUser ? "primary.dark" : "grey.50",
              "&::before": { display: "none" },
            }}
            defaultExpanded
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <FormatListNumberedIcon sx={{ mr: 1, fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={600}>
                Steps ({message.steps.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                {message.steps.map((step, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    <Typography variant="body2">{step}</Typography>
                  </li>
                ))}
              </ol>
            </AccordionDetails>
          </Accordion>
        )}

        {message.template && (
          <Accordion
            sx={{
              mt: 1,
              bgcolor: isUser ? "primary.dark" : "grey.50",
              "&::before": { display: "none" },
            }}
            defaultExpanded
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <DescriptionIcon sx={{ mr: 1, fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={600}>
                Template
              </Typography>
              <Tooltip title="Copy template">
                <IconButton
                  size="small"
                  sx={{ ml: "auto", mr: 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyTemplate();
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </AccordionSummary>
            <AccordionDetails>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  bgcolor: "grey.100",
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                  whiteSpace: "pre-wrap",
                  overflowX: "auto",
                }}
              >
                {message.template}
              </Paper>
            </AccordionDetails>
          </Accordion>
        )}

        {message.sources && message.sources.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
            >
              Sources:
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
              {message.sources.map((s, i) => (
                <Chip
                  key={i}
                  label={s.articleTitle}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: "0.7rem", height: 20 }}
                />
              ))}
            </Box>
          </Box>
        )}

        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 1,
            opacity: 0.6,
            textAlign: "right",
          }}
        >
          {new Date(message.timestamp).toLocaleTimeString()}
        </Typography>
      </Paper>

      <Snackbar
        open={copySnack}
        autoHideDuration={2000}
        onClose={() => setCopySnack(false)}
        message="Template copied to clipboard"
      />
    </Box>
  );
}
