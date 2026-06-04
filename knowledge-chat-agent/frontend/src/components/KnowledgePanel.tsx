import { useState, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  Paper,
  Chip,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ArticleIcon from "@mui/icons-material/Article";
import type { KnowledgeArticle } from "../types";
import {
  addArticleText,
  uploadArticleFile,
  deleteArticle,
} from "../api/client";

interface Props {
  articles: KnowledgeArticle[];
  onArticlesChanged: () => void;
}

export default function KnowledgePanel({ articles, onArticlesChanged }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAddText = useCallback(async () => {
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    setError("");
    try {
      await addArticleText(title, content);
      setTitle("");
      setContent("");
      setDialogOpen(false);
      onArticlesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add article");
    } finally {
      setLoading(false);
    }
  }, [title, content, onArticlesChanged]);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      await uploadArticleFile(file, title || undefined);
      setFile(null);
      setTitle("");
      setDialogOpen(false);
      onArticlesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setLoading(false);
    }
  }, [file, title, onArticlesChanged]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteArticle(id);
        onArticlesChanged();
      } catch (err) {
        console.error("Delete failed:", err);
      }
    },
    [onArticlesChanged]
  );

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Knowledge Base
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add Article
        </Button>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", px: 1 }}>
        {articles.length === 0 ? (
          <Box sx={{ textAlign: "center", mt: 4, px: 2 }}>
            <ArticleIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
            <Typography color="text.secondary" variant="body2">
              No articles yet. Add knowledge articles to get started.
            </Typography>
          </Box>
        ) : (
          <List dense>
            {articles.map((article) => (
              <ListItem
                key={article.id}
                sx={{
                  mb: 0.5,
                  borderRadius: 1,
                  bgcolor: "background.paper",
                }}
              >
                <ListItemText
                  primary={article.title}
                  secondary={
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.5,
                        alignItems: "center",
                        mt: 0.5,
                      }}
                    >
                      <Chip
                        label={article.source}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: "0.7rem", height: 20 }}
                      />
                      {article.fileName && (
                        <Typography variant="caption" color="text.secondary">
                          {article.fileName}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => handleDelete(article.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Knowledge Article</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ mb: 2 }}
          >
            <Tab label="Paste Text" icon={<ArticleIcon />} iconPosition="start" />
            <Tab
              label="Upload File"
              icon={<UploadFileIcon />}
              iconPosition="start"
            />
          </Tabs>

          <TextField
            label="Title"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 2 }}
            placeholder={tab === 1 ? "Optional (uses filename)" : "Article title"}
          />

          {tab === 0 ? (
            <TextField
              label="Content"
              fullWidth
              multiline
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your knowledge article content here..."
            />
          ) : (
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                textAlign: "center",
                cursor: "pointer",
                "&:hover": { bgcolor: "action.hover" },
              }}
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <input
                id="file-upload"
                type="file"
                accept=".txt,.md,.pdf"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <UploadFileIcon sx={{ fontSize: 40, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {file
                  ? file.name
                  : "Click to upload .txt, .md, or .pdf file"}
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={tab === 0 ? handleAddText : handleUpload}
            disabled={
              loading || (tab === 0 ? !title || !content : !file)
            }
          >
            {loading ? "Adding..." : "Add Article"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
