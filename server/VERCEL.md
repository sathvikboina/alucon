# Vercel deployment (API project: Root Directory = server)

This project deploys as a serverless function. Two limits are handled in code:

- **Socket.IO is disabled.** `server.js` skips `http.listen` and installs a
  no-op emitter when `VERCEL` is set. Messaging still uses the REST endpoints;
  realtime delivery needs a separate long-lived service.
- **Local uploads are disabled.** Set the Cloudinary variables below, or uploads
  return `503`. Vercel has no writable persistent disk.
- **Semantic search uses Gemini embeddings.** The local BGE/ONNX runtime
  (~900 MB) cannot be bundled, so the deployed API embeds through
  `gemini-embedding-001` over HTTPS. Set `EMBEDDING_PROVIDER=gemini` (it is
  chosen automatically on Vercel when `GEMINI_API_KEY` exists). If the provider
  fails, search degrades to lexical matching instead of erroring.

## Environment variables

| Name | Required | Notes |
| --- | --- | --- |
| `MONGO_URI` | yes | MongoDB Atlas connection string |
| `JWT_SECRET` | yes | Same value as the existing deployment |
| `ENCRYPTION_KEY` | yes | Keep the existing value or old messages cannot be read |
| `CLIENT_URL` | yes | The Vercel client URL, e.g. `https://alucon.vercel.app` |
| `CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | yes for uploads | |
| `GEMINI_API_KEY` | yes for AI search | Also enables model-backed AI assists |
| `EMBEDDING_PROVIDER` | recommended | `gemini` on Vercel; `local` for development |
| `EMBEDDING_DIMENSIONS` | optional | Vector size, default 768 for Gemini / 384 for local |
| `GEMINI_EMBEDDING_MODEL` | optional | Defaults to `gemini-embedding-001` |
| `TRUST_PROXY` | recommended | `1` behind Vercel's proxy |
| `SEARCH_INDEX_AUTO` | optional | `0` keeps indexing off |

Do not set `PORT`; Vercel provides it.

## Client project (Root Directory = client)

Set `REACT_APP_BACKEND_URL` to this API project's URL and
`REACT_APP_REALTIME=false`. The second value swaps the Socket.IO client for a
no-op stub so the browser does not retry a connection the API cannot serve.

## Atlas checklist

1. Create a free cluster and a database user.
2. Allow access from `0.0.0.0/0` (Vercel functions have no fixed egress IPs).
3. Copy the `mongodb+srv://...` URI into `MONGO_URI`.
4. Seed or migrate data (see the main README).
