import { useState, useEffect, useCallback } from "react";
import { Box, Drawer, useMediaQuery, useTheme, IconButton, Fab } from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import CloseIcon from "@mui/icons-material/Close";
import KnowledgePanel from "./components/KnowledgePanel";
import ChatPanel from "./components/ChatPanel";
import { listArticles } from "./api/client";
import type { KnowledgeArticle } from "./types";

const DRAWER_WIDTH = 340;

export default function App() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const refreshArticles = useCallback(async () => {
    try {
      const data = await listArticles();
      setArticles(data);
    } catch (err) {
      console.error("Failed to load articles:", err);
    }
  }, []);

  useEffect(() => {
    refreshArticles();
  }, [refreshArticles]);

  useEffect(() => {
    if (isMobile) setDrawerOpen(false);
  }, [isMobile]);

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Drawer
        variant={isMobile ? "temporary" : "persistent"}
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: drawerOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            borderRight: "1px solid",
            borderColor: "divider",
          },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end", p: 0.5 }}>
          <IconButton size="small" onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <KnowledgePanel
          articles={articles}
          onArticlesChanged={refreshArticles}
        />
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: "100vh",
          overflow: "hidden",
          transition: "margin 0.3s",
          ml: !isMobile && drawerOpen ? 0 : 0,
        }}
      >
        <ChatPanel hasArticles={articles.length > 0} />
      </Box>

      {!drawerOpen && (
        <Fab
          color="primary"
          size="medium"
          sx={{ position: "fixed", bottom: 80, left: 16 }}
          onClick={() => setDrawerOpen(true)}
        >
          <MenuBookIcon />
        </Fab>
      )}
    </Box>
  );
}
