const promptInput = document.querySelector("#prompt");
const statusText = document.querySelector("#status");
const resultImage = document.querySelector("#resultImage");
const emptyState = document.querySelector("#emptyState");
const downloadLink = document.querySelector("#downloadLink");
const runButton = document.querySelector("#runButton");
const modeTabs = document.querySelectorAll(".mode-tab");
const editFields = document.querySelector("#editFields");
const editOnlyFields = document.querySelectorAll(".edit-only");
const imageInput = document.querySelector("#imageInput");
const maskInput = document.querySelector("#maskInput");

const controls = {
  model: document.querySelector("#model"),
  size: document.querySelector("#size"),
  n: document.querySelector("#n"),
  quality: document.querySelector("#quality"),
  background: document.querySelector("#background"),
  output_format: document.querySelector("#outputFormat"),
  output_compression: document.querySelector("#outputCompression"),
  moderation: document.querySelector("#moderation"),
  input_fidelity: document.querySelector("#inputFidelity")
};

let mode = "generate";

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("error", isError);
}

function collectParams(includeEditOnly = false) {
  const params = {
    model: controls.model.value.trim(),
    prompt: promptInput.value.trim(),
    size: controls.size.value,
    n: controls.n.value,
    quality: controls.quality.value,
    background: controls.background.value,
    output_format: controls.output_format.value,
    output_compression: controls.output_compression.value,
    moderation: controls.moderation.value
  };

  if (includeEditOnly) {
    params.input_fidelity = controls.input_fidelity.value;
  }

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function setMode(nextMode) {
  mode = nextMode;
  modeTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === mode));
  editFields.hidden = mode !== "edit";
  editOnlyFields.forEach((field) => {
    field.hidden = mode !== "edit";
  });
  runButton.textContent = mode === "edit" ? "编辑图片" : "生成图片";
  setStatus(mode === "edit" ? "上传原图，输入编辑要求后开始。" : "输入提示词后开始生成。");
}

function showImage(src) {
  resultImage.src = src;
  downloadLink.href = src;
  resultImage.hidden = false;
  emptyState.hidden = true;
  downloadLink.hidden = false;
}

async function runGenerate() {
  const params = collectParams(false);
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });
  return response;
}

async function runEdit() {
  const image = imageInput.files?.[0];
  if (!image) {
    imageInput.focus();
    throw new Error("请先上传要编辑的原图。");
  }

  const params = collectParams(true);
  const form = new FormData();
  for (const [key, value] of Object.entries(params)) {
    form.append(key, value);
  }
  form.append("image", image);

  const mask = maskInput.files?.[0];
  if (mask) {
    form.append("mask", mask);
  }

  return fetch("/api/edit", {
    method: "POST",
    body: form
  });
}

modeTabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

runButton.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    setStatus("请输入提示词。", true);
    promptInput.focus();
    return;
  }

  runButton.disabled = true;
  setStatus(mode === "edit" ? "正在编辑图片，通常需要几十秒..." : "正在生成图片，通常需要几十秒...");

  try {
    const response = mode === "edit" ? await runEdit() : await runGenerate();
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "处理失败。");
    }

    showImage(data.image);
    setStatus(`${mode === "edit" ? "编辑" : "生成"}完成。模型：${data.model}`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "处理失败。", true);
  } finally {
    runButton.disabled = false;
  }
});

setMode("generate");
