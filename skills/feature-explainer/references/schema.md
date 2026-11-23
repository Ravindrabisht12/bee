# explainer.json schema

All fields except `title` are optional. Sections with no data are hidden.
Text fields accept plain text, plus `**bold**` and `` `code` ``.

```jsonc
{
  "title": "Blobby — shareable blobs",            // required
  "subtitle": "What we built in v0.1 and how it works",
  "mode": "build",                                // "build" | "change"
  "date": "2026-11-23",
  "audience": "Junior developer joining the project",

  "summary": {
    "oneLiner": "Blobby lets you drop any file and get a short link in 2 seconds.",
    "bullets": ["Drag-and-drop upload", "Short links that expire", "No account needed"]
  },

  "stats": [ { "label": "Files changed", "value": "14" }, { "label": "Tests", "value": "24 ✓" } ],

  "features": [
    { "name": "Share via link", "status": "new",       // new | changed | fixed | removed
      "what": "Every blob gets a public link.", "why": "Top complaint about competitor X was forced sign-up." }
  ],

  "beforeAfter": [
    { "area": "Sharing", "before": "Had to download and re-send the file", "after": "One click copies a link" }
  ],

  "specs": [        // from docs/specs + `spec.py trace`
    { "id": "SPEC-0001", "title": "Shareable blob links", "status": "Implemented",
      "covered": 6, "total": 6, "goal": "Anyone with the link can download the blob.", "href": "../../docs/specs/0001-shareable-blob-links.md" }
  ],

  "decisions": [    // from docs/adr — Proposed ones are flagged for review
    { "id": "ADR-0002", "title": "Store blobs in S3, metadata in Postgres", "status": "Accepted",
      "why": "Cheap durable storage; relational queries for sharing.", "href": "../../docs/adr/0002-store-blobs-in-s3.md" }
  ],

  "diagrams": [
    { "title": "Upload flow", "caption": "What happens when a user drops a file",
      "mermaid": "sequenceDiagram\n  User->>Web: drop file\n  Web->>API: POST /blobs\n  API->>S3: put object\n  API-->>Web: {id, url}" }
  ],

  "walkthrough": [
    { "title": "1. The upload endpoint",
      "file": "src/routes/blobs.ts", "lang": "ts",
      "explain": "Receives the file stream and stores it without buffering it all in memory.",
      "why": "Buffering 100 MB uploads would crash the small server.",
      "code": "router.post('/blobs', async (req, res) => { ... })",
      "tip": "If you change the size limit, also update `MAX_SIZE` in the client." }
  ],

  "files": [
    { "path": "src/routes/blobs.ts", "status": "added", "role": "HTTP endpoints for upload/download" }
  ],                                                  // status: added | modified | deleted

  "tryIt": [
    { "step": "Run `npm run dev` and open http://localhost:5173", "expect": "Empty state with a drop zone" }
  ],

  "glossary": [ { "term": "Presigned URL", "meaning": "A temporary URL that grants upload rights without credentials." } ],

  "quiz": [
    { "q": "Why are uploads streamed instead of buffered?",
      "options": ["Faster to write", "Avoids running out of memory on big files", "S3 requires it"],
      "answer": 1,
      "explain": "The server has 512 MB RAM. Streaming keeps memory flat regardless of file size." }
  ],

  "limitations": ["Links never expire yet; planned for v0.2"],
  "nextSteps": ["Add expiry", "Add virus scanning"],
  "links": [ { "label": "Architecture doc", "href": "../../docs/architecture.md" } ]
}
```
