import { Router, Request, Response } from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import { knowledgeStore } from "../services/knowledge-store";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "text/plain",
      "text/markdown",
      "application/pdf",
      "application/octet-stream",
    ];
    const extAllowed = /\.(txt|md|pdf)$/i.test(file.originalname);
    if (allowed.includes(file.mimetype) || extAllowed) {
      cb(null, true);
    } else {
      cb(new Error("Only .txt, .md, and .pdf files are supported"));
    }
  },
});

router.get("/", (_req: Request, res: Response) => {
  const articles = knowledgeStore.listArticles();
  res.json({ articles });
});

router.get("/:id", (req: Request, res: Response) => {
  const article = knowledgeStore.getArticle(req.params.id);
  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  res.json({ article });
});

router.post("/text", (req: Request, res: Response) => {
  const { title, content } = req.body;

  if (!title || !content) {
    res.status(400).json({ error: "Title and content are required" });
    return;
  }

  const article = knowledgeStore.addArticle(title, content, "paste");
  res.status(201).json({ article: { id: article.id, title: article.title, source: article.source, createdAt: article.createdAt } });
});

router.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      let content: string;
      const fileName = file.originalname;

      if (fileName.endsWith(".pdf")) {
        const pdfData = await pdfParse(file.buffer);
        content = pdfData.text;
      } else {
        content = file.buffer.toString("utf-8");
      }

      const title = req.body.title || fileName.replace(/\.[^.]+$/, "");

      const article = knowledgeStore.addArticle(
        title,
        content,
        "upload",
        fileName
      );
      res.status(201).json({
        article: {
          id: article.id,
          title: article.title,
          source: article.source,
          fileName: article.fileName,
          createdAt: article.createdAt,
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload processing failed";
      res.status(500).json({ error: message });
    }
  }
);

router.delete("/:id", (req: Request, res: Response) => {
  const deleted = knowledgeStore.removeArticle(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
