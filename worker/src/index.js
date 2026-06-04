export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return json({ ok: true, service: "pixsound-api" }, 200, corsHeaders);
    }

    if (request.method !== "POST" || url.pathname !== "/generate") {
      return json({ error: "Not found" }, 404, corsHeaders);
    }

    if (!env.DASHSCOPE_API_KEY || !env.MINIMAX_API_KEY) {
      return json(
        { error: "Missing DASHSCOPE_API_KEY or MINIMAX_API_KEY secret." },
        500,
        corsHeaders,
      );
    }

    try {
      const body = await request.json();
      const image = body?.image;

      if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
        return json({ error: "A base64 image data URL is required." }, 400, corsHeaders);
      }

      const qwenModel = env.QWEN_VISION_MODEL || "qwen3-vl-flash";
      const minimaxModel = env.MINIMAX_MUSIC_MODEL || "music-2.6-free";
      const visualPrompt = await describeImageWithQwen(
        image,
        env.DASHSCOPE_API_KEY,
        qwenModel,
        env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
      );
      const musicPrompt = buildInstrumentalPrompt(visualPrompt);
      const musicResult = await generateInstrumentalMusic(
        musicPrompt,
        env.MINIMAX_API_KEY,
        minimaxModel,
      );

      return json(
        {
          visualPrompt,
          musicPrompt,
          model: {
            vision: qwenModel,
            music: minimaxModel,
          },
          music: musicResult,
          audioUrl: extractAudioUrl(musicResult),
          message: "Music generation request completed.",
        },
        200,
        corsHeaders,
      );
    } catch (error) {
      return json({ error: error.message || "Generation failed." }, 500, corsHeaders);
    }
  },
};

function getCorsHeaders(request, env) {
  const requestOrigin = request.headers.get("Origin") || "*";
  const configuredOrigin = env.ALLOWED_ORIGIN || "*";
  const allowedOrigin = configuredOrigin === "*" ? requestOrigin : configuredOrigin;

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

async function describeImageWithQwen(image, apiKey, model, baseUrl) {
  const result = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: image },
            },
            {
              type: "text",
              text:
                "Describe this image as a concise English music-generation prompt. Focus on mood, scene, tempo, instruments, texture, energy, and genre. Do not mention the uploaded file or camera details.",
            },
          ],
        },
      ],
      max_tokens: 420,
      temperature: 0.7,
    }),
  });

  if (!result.ok) {
    const text = await result.text();
    throw new Error(`Qwen image description failed: ${result.status} ${text}`);
  }

  const data = await result.json();
  const content = data?.choices?.[0]?.message?.content;

  if (Array.isArray(content)) {
    return content.map((item) => item.text || "").join(" ").trim();
  }

  return String(content || "").trim();
}

function buildInstrumentalPrompt(visualPrompt) {
  return [
    visualPrompt,
    "Instrumental background music only.",
    "No vocals, no lyrics, no spoken words.",
    "Create a polished cinematic BGM track with a clear intro, development, and gentle ending.",
  ].join(" ");
}

async function generateInstrumentalMusic(prompt, apiKey, model) {
  const result = await fetch("https://api.minimax.io/v1/music_generation", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      is_instrumental: true,
      output_format: "url",
      audio_setting: {
        sample_rate: 44100,
        bitrate: 256000,
        format: "mp3",
      },
    }),
  });

  if (!result.ok) {
    const text = await result.text();
    throw new Error(`MiniMax music generation failed: ${result.status} ${text}`);
  }

  return result.json();
}

function extractAudioUrl(result) {
  return (
    result?.data?.audio_url ||
    result?.data?.music_url ||
    result?.data?.url ||
    result?.data?.audio ||
    result?.audio_url ||
    result?.music_url ||
    result?.url ||
    null
  );
}
