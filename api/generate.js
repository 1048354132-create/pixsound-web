export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const qwenApiKey = process.env.DASHSCOPE_API_KEY;
  const minimaxApiKey = process.env.MINIMAX_API_KEY;
  const qwenBaseUrl = process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const qwenModel = process.env.QWEN_VISION_MODEL || "qwen3-vl-flash";
  const minimaxModel = process.env.MINIMAX_MUSIC_MODEL || "music-2.6-free";

  if (!qwenApiKey || !minimaxApiKey) {
    return response.status(500).json({
      error: "Missing DASHSCOPE_API_KEY or MINIMAX_API_KEY environment variable.",
    });
  }

  try {
    const { image } = request.body || {};

    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      return response.status(400).json({ error: "A base64 image data URL is required." });
    }

    const visualPrompt = await describeImageWithQwen(image, qwenApiKey, qwenModel, qwenBaseUrl);
    const musicPrompt = buildInstrumentalPrompt(visualPrompt);
    const musicResult = await generateInstrumentalMusic(musicPrompt, minimaxApiKey, minimaxModel);

    return response.status(200).json({
      visualPrompt,
      musicPrompt,
      model: {
        vision: qwenModel,
        music: minimaxModel,
      },
      music: musicResult,
      audioUrl: extractAudioUrl(musicResult),
      message: "音乐生成请求已完成。",
    });
  } catch (error) {
    return response.status(500).json({
      error: error.message || "Generation failed.",
    });
  }
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
