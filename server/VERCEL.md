# Vercel deployment (API project: Root Directory = server)

This project deploys as a serverless function. Two limits are handled in code:

- **Socket.IO is disabled.** `server.js` skips `http.listen` and installs a
  no-op emitter when `VERCEL` is set. Messaging still uses the REST endpoints;
  realtime delivery needs a separate long-lived service.
- **Local uploads are disabled.** Set the Cloudinary variables below, or uploads
  return `503`. Vercel has no writable persistent disk.
- **Semantic search falls back to lexical matching.** The BGE/ONNX runtime
  (~900 MB) is an optional dependency and is not installed here.

## Environment variables

| Name | Required | Notes |
| --- | --- | --- |
| `MONGO_URI` | yes | MongoDB Atlas connection string |
| `JWT_SECRET` | yes | Same value as the existing deployment |
| `ENCRYPTION_KEY` | yes | Keep the existing value or old messages cannot be read |
| `CLIENT_URL` | yes | The Vercel client URL, e.g. `https://alucon.vercel.app` |
| `CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | yes for uploads | |
| `GEMINI_API_KEY` | optional | Enables model-backed AI assists |
| `TRUST_PROXY` | recommended | `1` behind Vercel's proxy |
| `SEARCH_INDEX_AUTO` | optional | `0` keeps indexing off |

Do not set `PORT`; Vercel provides it.

## Atlas checklist

1. Create a free cluster and a database user.
2. Allow access from `0.0.0.0/0` (Vercel functions have no fixed egress IPs).
3. Copy the `mongodb+srv://...` URI into `MONGO_URI`.
4. Seed or migrate data (see the main README).
