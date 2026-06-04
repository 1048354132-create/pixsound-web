const imageInput = document.querySelector("#image-input");
const dropZone = document.querySelector("#drop-zone");
const generateButton = document.querySelector("#generate-button");
const playButton = document.querySelector("#play-button");
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
let isPlaying = false;

function setUploadedImage(file) {
  if (!file || !file.type.startsWith("image/")) return;

  selectedImage = file;
  const url = URL.createObjectURL(file);
  mainCover.src = url;
  recordCover.src = url;
  trackTitle.textContent = file.name.replace(/\.[^.]+$/, "").slice(0, 28) || "Untitled Image";
  tagPrimary.textContent = "Image Prompt";
  tagSecondary.textContent = "BGM";
  caption.textContent = "Ready to translate this picture into a music prompt.";
}

function createPromptFromFile(file) {
  const baseName = file?.name?.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") || "uploaded image";
  return [
    `Create cinematic background music inspired by the image "${baseName}".`,
    "Mood: atmospheric, visual, immersive.",
    "Use layered textures, a memorable motif, and a clean 3 minute structure.",
    "Avoid vocals unless the image strongly suggests a human performance.",
  ].join(" ");
}

async function generateMusic() {
  if (!selectedImage) {
    caption.textContent = "请先上传一张图片。";
    return;
  }

  const prompt = createPromptFromFile(selectedImage);
  const proxyEndpoint = localStorage.getItem("pixsoundProxyEndpoint");

  appShell.classList.add("is-generating");
  generateButton.disabled = true;
  generateButton.textContent = "生成中";
  caption.textContent = prompt;
  progressBar.style.width = "52%";
  elapsedTime.textContent = "108s";

  if (!proxyEndpoint) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    caption.textContent = "已生成提示词。部署到 GitHub Pages 后，请接入代理后端来安全调用 MiniMax。";
    generateButton.textContent = "生成音乐";
    generateButton.disabled = false;
    appShell.classList.remove("is-generating");
    return;
  }

  try {
    const response = await fetch(proxyEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) throw new Error(`Request failed: ${response.status}`);

    const result = await response.json();
    caption.textContent = result.message || "Music generated successfully.";
  } catch (error) {
    caption.textContent = "音乐生成请求失败，请检查代理后端地址和密钥配置。";
  } finally {
    generateButton.textContent = "生成音乐";
    generateButton.disabled = false;
    appShell.classList.remove("is-generating");
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

playButton.addEventListener("click", () => {
  isPlaying = !isPlaying;
  appShell.classList.toggle("is-generating", isPlaying);
});
