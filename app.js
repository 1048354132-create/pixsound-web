const imageInput = document.querySelector("#image-input");
const dropZone = document.querySelector("#drop-zone");
const generateButton = document.querySelector("#generate-button");
const playButton = document.querySelector("#play-button");
const tonearmButton = document.querySelector("#tonearm-button");
const mainCover = document.querySelector("#main-cover");
const recordCover = document.querySelector("#record-cover");
const trackTitle = document.querySelector("#track-title");
const caption = document.querySelector("#caption");
const tagPrimary = document.querySelector("#tag-primary");
const tagSecondary = document.querySelector("#tag-secondary");
const progressBar = document.querySelector("#progress-bar");
const elapsedTime = document.querySelector("#elapsed-time");
const appShell = document.querySelector(".app-shell");

let selectedImage = null;
let selectedImageDataUrl = "";
let isPlaying = false;
let generatedAudio = new Audio();

function setUploadedImage(file) {
  if (!file || !file.type.startsWith("image/")) return;

  selectedImage = file;
  const previewUrl = URL.createObjectURL(file);
  mainCover.src = previewUrl;
  recordCover.src = previewUrl;
  trackTitle.textContent = file.name.replace(/\.[^.]+$/, "").slice(0, 28) || "Untitled Image";
  tagPrimary.textContent = "Qwen Vision";
  tagSecondary.textContent = "Instrumental";
  caption.textContent = "图片已载入，点击生成音乐开始创作。";

  readFileAsDataUrl(file).then((dataUrl) => {
    selectedImageDataUrl = dataUrl;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function generateMusic() {
  if (!selectedImage) {
    caption.textContent = "请先上传一张图片。";
    return;
  }

  if (!selectedImageDataUrl) {
    selectedImageDataUrl = await readFileAsDataUrl(selectedImage);
  }

  const endpoint =
    window.PIXSOUND_API_ENDPOINT ||
    localStorage.getItem("pixsoundProxyEndpoint") ||
    "/api/generate";

  appShell.classList.add("is-generating");
  generateButton.disabled = true;
  generateButton.textContent = "生成中";
  caption.textContent = "正在用千问理解图片，并调用 MiniMax 生成纯音乐。";
  progressBar.style.width = "52%";
  elapsedTime.textContent = "108s";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: selectedImageDataUrl }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || `Request failed: ${response.status}`);
    }

    const audioSource = result.audioSource || result.audioUrl;

    if (audioSource) {
      generatedAudio.src = audioSource;
      generatedAudio.preload = "auto";
      caption.textContent = result.visualPrompt || "音乐已生成，点击唱针或播放键试听。";
      togglePlayback(true);
    } else {
      caption.textContent =
        result.message ||
        "音乐请求已完成，但 MiniMax 响应里没有找到可播放的音频数据。";
    }

    tagPrimary.textContent = result.model?.vision || "Qwen";
    tagSecondary.textContent = result.model?.music || "MiniMax";
  } catch (error) {
    caption.textContent = `生成失败：${error.message}`;
  } finally {
    generateButton.textContent = "生成音乐";
    generateButton.disabled = false;
    appShell.classList.remove("is-generating");
  }
}

function togglePlayback(forceState) {
  isPlaying = typeof forceState === "boolean" ? forceState : !isPlaying;
  appShell.classList.toggle("is-playing", isPlaying);
  playButton.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
  tonearmButton.setAttribute("aria-pressed", String(isPlaying));

  if (!generatedAudio.src) return;

  if (isPlaying) {
    generatedAudio.play().catch(() => {
      caption.textContent = "浏览器阻止了自动播放，请再点击一次播放。";
      togglePlayback(false);
    });
  } else {
    generatedAudio.pause();
  }
}

imageInput.addEventListener("change", (event) => {
  setUploadedImage(event.target.files?.[0]);
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("is-dragging");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-dragging");
  setUploadedImage(event.dataTransfer.files?.[0]);
});

generateButton.addEventListener("click", generateMusic);
playButton.addEventListener("click", () => togglePlayback());
tonearmButton.addEventListener("click", () => togglePlayback());

generatedAudio.addEventListener("ended", () => togglePlayback(false));
