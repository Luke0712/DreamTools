const promptInput = document.querySelector("#prompt");
const sizeSelect = document.querySelector("#size");
const button = document.querySelector("#generateButton");
const statusText = document.querySelector("#status");
const resultImage = document.querySelector("#resultImage");
const emptyState = document.querySelector("#emptyState");
const downloadLink = document.querySelector("#downloadLink");

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("error", isError);
}

button.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    setStatus("请输入提示词。", true);
    promptInput.focus();
    return;
  }

  button.disabled = true;
  setStatus("正在生成图片，通常需要几十秒...");

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        size: sizeSelect.value
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "生成失败。");
    }

    resultImage.src = data.image;
    downloadLink.href = data.image;
    resultImage.hidden = false;
    emptyState.hidden = true;
    downloadLink.hidden = false;
    setStatus(`生成完成。模型：${data.model}`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "生成失败。", true);
  } finally {
    button.disabled = false;
  }
});
