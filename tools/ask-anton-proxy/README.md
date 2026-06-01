# Ask Anton Secure Proxy

This proxy keeps your model API key on the server so it never appears in the Git repo or browser JavaScript.

## 1) Configure environment variables

Create a local `.env` file beside `server.mjs` using `.env.example`.

Required:

- `OPENAI_API_KEY`

Recommended:

- `ALLOWED_ORIGIN` (for local use `*`; for production use your deployed site origin)
- `PORT`
- `DEFAULT_MODEL`

## 2) Run locally

Node.js 18+ is recommended, but a Python fallback is included.

```bash
cd tools/ask-anton-proxy
node --env-file=.env server.mjs
```

Python fallback:

```bash
cd tools/ask-anton-proxy
python server.py
```

The proxy endpoint is:

- `http://127.0.0.1:8787/api/ask-anton`

Health check:

- `http://127.0.0.1:8787/health`

## 3) Point Ask Anton to your proxy

On Ask Anton Settings, set `Proxy Endpoint` to:

- `http://127.0.0.1:8787/api/ask-anton` (local)
- or your deployed proxy URL.

## 4) Deployment notes

- Do not commit `.env`.
- Store `OPENAI_API_KEY` in host secrets (Vercel/Netlify/Render/etc.).
- Restrict `ALLOWED_ORIGIN` to your site origin in production (comma-separated values are supported).
- Add rate limits and auth in front of this endpoint for production.
