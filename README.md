# Pixsound

Pixsound turns an uploaded image into instrumental BGM:

1. The front end previews the uploaded image as the album artwork.
2. A backend API sends the image to Qwen Vision for an English music prompt.
3. The backend sends that prompt to MiniMax Music with `music-2.6-free` and `is_instrumental: true`.

## Important API Key Note

Do not put API keys in `index.html`, `app.js`, or any other front-end file. GitHub Pages is public static hosting, so keys must live in backend environment variables.

## Environment Variables

Use these on the backend host:

```txt
DASHSCOPE_API_KEY=sk-your-qwen-api-key
MINIMAX_API_KEY=sk-your-minimax-api-key
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_VISION_MODEL=qwen3-vl-flash
MINIMAX_MUSIC_MODEL=music-2.6-free
```

If your Qwen key belongs to the international/Singapore region, set:

```txt
DASHSCOPE_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

## Run Locally

The UI can be previewed by opening `index.html`.

For the real Qwen + MiniMax workflow, deploy `api/generate.js` to a serverless host such as Vercel, then point the GitHub Pages front end to it:

```js
localStorage.setItem("pixsoundProxyEndpoint", "https://your-backend.vercel.app/api/generate");
```

## Deploy Front End To GitHub Pages

1. Push this repository to GitHub.
2. Open `Settings` -> `Pages`.
3. Choose `Deploy from a branch`.
4. Select `main` and `/ (root)`.
5. Save and wait for the Pages URL.

## Recommended Production Shape

Use GitHub Pages for the static page and Vercel/Netlify/Cloudflare Workers for the API proxy. A single Vercel deployment can also host both the static page and `/api/generate`.
