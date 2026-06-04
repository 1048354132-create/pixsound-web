# Pixsound Cloudflare Worker

This Worker protects API keys and handles:

1. Image data URL -> Qwen Vision prompt.
2. Prompt -> MiniMax instrumental music with `music-2.6-free`.

## Deploy

Install and log in to Wrangler:

```powershell
npm create cloudflare@latest
npx wrangler login
```

From this `worker` folder, set secrets:

```powershell
npx wrangler secret put DASHSCOPE_API_KEY
npx wrangler secret put MINIMAX_API_KEY
```

Then deploy:

```powershell
npx wrangler deploy
```

The endpoint used by the front end is:

```txt
https://<your-worker>.<your-subdomain>.workers.dev/generate
```

Paste that URL into the root `config.js`:

```js
window.PIXSOUND_API_ENDPOINT = "https://<your-worker>.<your-subdomain>.workers.dev/generate";
```

## Optional Region

If your Qwen key is for the international/Singapore region, update `DASHSCOPE_BASE_URL` in `wrangler.toml`:

```toml
DASHSCOPE_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
```
