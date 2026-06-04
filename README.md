# Pixsound

Pixsound is a static GitHub Pages front end for an image-to-BGM workflow. The page matches the Figma Make design, lets users upload or drag an image, previews it as album artwork, and creates a music prompt.

## Run Locally

Open `index.html` directly in a browser, or serve this folder with any static server.

## Deploy To GitHub Pages

1. Create a GitHub repository.
2. Push this folder to the repository.
3. In GitHub, open `Settings` -> `Pages`.
4. Choose `Deploy from a branch`.
5. Select the `main` branch and `/ (root)`.
6. Save, then wait for the Pages URL to become available.

## MiniMax Integration

GitHub Pages is static, so it cannot safely store MiniMax API keys. Use a small proxy service for production. The front end will call a proxy endpoint saved in the browser:

```js
localStorage.setItem("pixsoundProxyEndpoint", "https://your-proxy.example.com/generate-music");
```

The proxy should accept:

```json
{ "prompt": "music prompt text" }
```

Then it can call MiniMax from the server with `Authorization: Bearer <MINIMAX_API_KEY>`.
