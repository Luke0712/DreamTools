import http from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const configPath = process.env.DREAMTOOLS_CONFIG_PATH || "";
await loadDotEnv(join(root, ".env"));
if (process.resourcesPath) {
  await loadDotEnv(join(process.resourcesPath, ".env"));
}
await loadPersistedConfig();

const publicDir = join(root, "public");
const vendorFiles = {
  "/vendor/antd-reset.css": join(root, "node_modules/antd/dist/reset.css"),
  "/vendor/antd.min.js": join(root, "node_modules/antd/dist/antd.min.js"),
  "/vendor/dayjs.min.js": join(root, "node_modules/dayjs/dayjs.min.js"),
  "/vendor/react-dom.min.js": join(root, "node_modules/react-dom/umd/react-dom.production.min.js"),
  "/vendor/react.min.js": join(root, "node_modules/react/umd/react.production.min.js")
};
const defaultPort = Number(process.env.PORT || 5177);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

async function loadDotEnv(filePath) {
  let content;
  try {
    content = await readFile(filePath, "utf8");
  } catch {
    return;
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function getRuntimeConfig() {
  return {
    apiKey: process.env.IMAGE_API_KEY || "",
    apiBase: process.env.IMAGE_API_BASE || "https://apiproxy.paigod.work/v1",
    model: process.env.IMAGE_MODEL || "gpt-image-2",
    speechApiKey: process.env.SPEECH_API_KEY || "DeAGtwOW5xKQphLhLpmAbRxNylj9HLRYF6PnIZT8U7J8w71E",
    speechApiUrl: process.env.SPEECH_API_URL || "https://apiproxy.paigod.work/v3/minimax-speech-2.8-turbo",
    speechModel: process.env.SPEECH_MODEL || "speech-2.8-turbo"
  };
}

async function loadPersistedConfig() {
  if (!configPath) return;

  try {
    const content = await readFile(configPath, "utf8");
    const data = JSON.parse(content);
    if (data.IMAGE_API_KEY && !process.env.IMAGE_API_KEY) process.env.IMAGE_API_KEY = String(data.IMAGE_API_KEY);
    if (data.IMAGE_API_BASE && !process.env.IMAGE_API_BASE) process.env.IMAGE_API_BASE = String(data.IMAGE_API_BASE);
    if (data.IMAGE_MODEL && !process.env.IMAGE_MODEL) process.env.IMAGE_MODEL = String(data.IMAGE_MODEL);
    if (data.SPEECH_API_KEY && !process.env.SPEECH_API_KEY) process.env.SPEECH_API_KEY = String(data.SPEECH_API_KEY);
    if (data.SPEECH_API_URL && !process.env.SPEECH_API_URL) process.env.SPEECH_API_URL = String(data.SPEECH_API_URL);
    if (data.SPEECH_MODEL && !process.env.SPEECH_MODEL) process.env.SPEECH_MODEL = String(data.SPEECH_MODEL);
  } catch {
    // ignore missing or malformed config
  }
}

async function savePersistedConfig(body) {
  if (!configPath) return;

  const next = {
    IMAGE_API_KEY: String(body.IMAGE_API_KEY || ""),
    IMAGE_API_BASE: String(body.IMAGE_API_BASE || "https://apiproxy.paigod.work/v1"),
    IMAGE_MODEL: String(body.IMAGE_MODEL || "gpt-image-2"),
    SPEECH_API_KEY: String(body.SPEECH_API_KEY || ""),
    SPEECH_API_URL: String(body.SPEECH_API_URL || "https://apiproxy.paigod.work/v3/minimax-speech-2.8-turbo"),
    SPEECH_MODEL: String(body.SPEECH_MODEL || "speech-2.8-turbo")
  };

  process.env.IMAGE_API_KEY = next.IMAGE_API_KEY;
  process.env.IMAGE_API_BASE = next.IMAGE_API_BASE;
  process.env.IMAGE_MODEL = next.IMAGE_MODEL;
  process.env.SPEECH_API_KEY = next.SPEECH_API_KEY;
  process.env.SPEECH_API_URL = next.SPEECH_API_URL;
  process.env.SPEECH_MODEL = next.SPEECH_MODEL;

  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function writeNdjson(res, body) {
  res.write(`${JSON.stringify(body)}\n`);
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function assertApiKey(res) {
  if (!getRuntimeConfig().apiKey) {
    sendJson(res, 400, { error: "请先在应用设置里填写 API Key。", code: "MISSING_IMAGE_API_KEY" });
    return false;
  }
  return true;
}

function assertSpeechApiKey(res) {
  if (!getRuntimeConfig().speechApiKey) {
    sendJson(res, 400, { error: "请先在应用设置里填写语音 API Key。", code: "MISSING_SPEECH_API_KEY" });
    return false;
  }
  return true;
}

function buildImagePayload(body) {
  const payload = {};
  const allowed = [
    "prompt",
    "size",
    "quality",
    "background",
    "output_format",
    "output_compression",
    "moderation",
    "input_fidelity"
  ];

  for (const key of allowed) {
    const value = body[key];
    if (value === undefined || value === null || value === "") continue;

    if (key === "n" || key === "output_compression") {
      const numberValue = Number(value);
      if (Number.isFinite(numberValue)) payload[key] = numberValue;
      continue;
    }

    payload[key] = String(value);
  }

  payload.model = String(body.model || getRuntimeConfig().model);
  return payload;
}

function buildSpeechPayload(body) {
  const runtime = getRuntimeConfig();
  const text = String(body?.text || "").trim();
  const sampleRate = Number(body?.sampleRate || 32000);
  const bitrate = Number(body?.bitrate || 128000);
  const channel = Number(body?.channel || 1);
  const speed = Number(body?.speed || 1);
  const volume = Number(body?.volume || 1);
  const pitch = Number(body?.pitch || 0);
  const voiceModifyPitch = Number(body?.voiceModifyPitch);
  const voiceModifyTimbre = Number(body?.voiceModifyTimbre);
  const voiceModifyIntensity = Number(body?.voiceModifyIntensity);
  const pronunciationTone = String(body?.pronunciationTone || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const payload = {
    model: String(body?.model || runtime.speechModel),
    text,
    stream: false,
    language_boost: String(body?.languageBoost || "Chinese"),
    output_format: "hex",
    aigc_watermark: Boolean(body?.aigcWatermark),
    voice_setting: {
      voice_id: String(body?.customVoiceId || body?.voiceId || "Chinese (Mandarin)_Lyrical_Voice"),
      speed: Number.isFinite(speed) ? speed : 1,
      vol: Number.isFinite(volume) ? volume : 1,
      pitch: Number.isFinite(pitch) ? pitch : 0
    },
    audio_setting: {
      sample_rate: Number.isFinite(sampleRate) ? sampleRate : 32000,
      audio_sample_rate: Number.isFinite(sampleRate) ? sampleRate : 32000,
      bitrate: Number.isFinite(bitrate) ? bitrate : 128000,
      format: String(body?.format || "mp3"),
      channel: Number.isFinite(channel) ? channel : 1
    }
  };

  if (body?.emotion) payload.voice_setting.emotion = String(body.emotion);
  if (body?.englishNormalization !== undefined) {
    payload.voice_setting.english_normalization = Boolean(body.englishNormalization);
  }
  if (body?.soundEffects || Number.isFinite(voiceModifyPitch) || Number.isFinite(voiceModifyTimbre) || Number.isFinite(voiceModifyIntensity)) {
    payload.voice_modify = {};
    if (Number.isFinite(voiceModifyPitch)) payload.voice_modify.pitch = voiceModifyPitch;
    if (Number.isFinite(voiceModifyTimbre)) payload.voice_modify.timbre = voiceModifyTimbre;
    if (Number.isFinite(voiceModifyIntensity)) payload.voice_modify.intensity = voiceModifyIntensity;
    if (body.soundEffects) payload.voice_modify.sound_effects = String(body.soundEffects);
  }
  if (pronunciationTone.length) {
    payload.pronunciation_dict = { tone: pronunciationTone };
  }

  return payload;
}

function getAudioMime(format) {
  const map = {
    flac: "audio/flac",
    opus: "audio/ogg",
    pcm: "audio/L16",
    pcmu_raw: "audio/basic",
    pcmu_wav: "audio/wav",
    wav: "audio/wav"
  };
  return map[format] || "audio/mpeg";
}

function normalizeSpeechResponse(data, format = "mp3") {
  const audioHex = data?.data?.audio || data?.audio;
  if (!audioHex || typeof audioHex !== "string") return null;

  return {
    audio: `data:${getAudioMime(format)};base64,${Buffer.from(audioHex, "hex").toString("base64")}`,
    duration: data?.extra_info?.audio_length,
    traceId: data?.trace_id
  };
}

function normalizeImageResponse(data) {
  const images = (data?.data || [])
    .filter((image) => image?.b64_json || image?.url)
    .map((image) => (image.b64_json ? `data:image/png;base64,${image.b64_json}` : image.url));

  if (!images.length) return null;

  return {
    image: images[0],
    images,
    created: data.created,
    model: data.model || getRuntimeConfig().model
  };
}

function readCount(body) {
  const count = Number(body?.n || 1);
  if (!Number.isFinite(count)) return 1;
  return Math.min(Math.max(Math.floor(count), 1), 10);
}

async function parseJsonRequest(req) {
  let body;
  try {
    body = JSON.parse((await readRequestBody(req)).toString("utf8"));
  } catch {
    return null;
  }
  return body;
}

function parseContentDisposition(value = "") {
  const result = {};
  for (const part of value.split(";")) {
    const [rawKey, ...rawRest] = part.trim().split("=");
    if (!rawRest.length) continue;
    result[rawKey] = rawRest.join("=").replace(/^"|"$/g, "");
  }
  return result;
}

async function parseMultipartRequest(req) {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=([^;]+)/);
  if (!boundaryMatch) return null;

  const boundary = boundaryMatch[1].replace(/^"|"$/g, "");
  const body = await readRequestBody(req);
  const fields = {};
  const files = {};

  for (const rawPart of body.toString("binary").split(`--${boundary}`)) {
    if (!rawPart || rawPart === "--\r\n" || rawPart === "--") continue;

    const trimmedPart = rawPart.startsWith("\r\n") ? rawPart.slice(2) : rawPart;
    const headerEnd = trimmedPart.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const headersText = trimmedPart.slice(0, headerEnd);
    let content = trimmedPart.slice(headerEnd + 4);
    if (content.endsWith("\r\n")) content = content.slice(0, -2);
    if (content.endsWith("--")) content = content.slice(0, -2);

    const headers = Object.fromEntries(
      headersText.split(/\r?\n/).flatMap((line) => {
        const index = line.indexOf(":");
        if (index === -1) return [];
        return [[line.slice(0, index).toLowerCase(), line.slice(index + 1).trim()]];
      })
    );
    const disposition = parseContentDisposition(headers["content-disposition"]);
    const name = disposition.name;
    if (name) {
      const file = {
        filename: disposition.filename,
        contentType: headers["content-type"] || "application/octet-stream",
        buffer: Buffer.from(content, "binary")
      };
      if (disposition.filename) files[name] = file;
      else fields[name] = file.buffer.toString("utf8");
    }
  }

  return { fields, files };
}

async function handleGenerate(req, res) {
  if (!assertApiKey(res)) return;

  const body = await parseJsonRequest(req);
  if (!body) {
    sendJson(res, 400, { error: "Invalid JSON request." });
    return;
  }

  const payload = buildImagePayload(body);
  const prompt = String(payload.prompt || "").trim();
  const count = readCount(body);

  if (prompt.length < 2) {
    sendJson(res, 400, { error: "Please enter a prompt." });
    return;
  }

  const results = [];
  let created;

  for (let index = 0; index < count; index += 1) {
    const runtime = getRuntimeConfig();
    const response = await fetch(`${runtime.apiBase}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${runtime.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      sendJson(res, response.status, {
        error: data?.error?.message || data?.message || "Image generation failed."
      });
      return;
    }

    const normalized = normalizeImageResponse(data);
    if (normalized) {
      results.push(...normalized.images);
      created = normalized.created || created;
    }
  }

  if (!results.length) {
    sendJson(res, 502, { error: "The image API returned an empty result." });
    return;
  }

  sendJson(res, 200, {
    image: results[0],
    images: results,
    created,
    model: payload.model
  });
}

async function handleSpeech(req, res) {
  if (!assertSpeechApiKey(res)) return;

  const body = await parseJsonRequest(req);
  if (!body) {
    sendJson(res, 400, { error: "Invalid JSON request." });
    return;
  }

  const payload = buildSpeechPayload(body);
  if (payload.text.length < 1) {
    sendJson(res, 400, { error: "请输入要合成的文本。" });
    return;
  }

  const runtime = getRuntimeConfig();
  const response = await fetch(runtime.speechApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtime.speechApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    sendJson(res, response.status, {
      error: data?.base_resp?.status_msg || data?.error?.message || data?.message || "Speech generation failed."
    });
    return;
  }

  if (data?.base_resp?.status_code && data.base_resp.status_code !== 0) {
    sendJson(res, 502, {
      error: data.base_resp.status_msg || "Speech generation failed.",
      code: data.base_resp.status_code
    });
    return;
  }

  const normalized = normalizeSpeechResponse(data, payload.audio_setting.format);
  if (!normalized) {
    sendJson(res, 502, { error: "The speech API returned an empty audio result." });
    return;
  }

  sendJson(res, 200, {
    ...normalized,
    model: payload.model,
    voiceId: payload.voice_setting.voice_id,
    format: payload.audio_setting.format
  });
}

async function generateOneImage(payload) {
  const runtime = getRuntimeConfig();
  const response = await fetch(`${runtime.apiBase}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtime.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || "Image generation failed.");
  }

  return normalizeImageResponse(data);
}

async function handleGenerateStream(req, res) {
  if (!assertApiKey(res)) return;

  const body = await parseJsonRequest(req);
  if (!body) {
    sendJson(res, 400, { error: "Invalid JSON request." });
    return;
  }

  const payload = buildImagePayload(body);
  const prompt = String(payload.prompt || "").trim();
  const count = readCount(body);

  if (prompt.length < 2) {
    sendJson(res, 400, { error: "Please enter a prompt." });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });

  writeNdjson(res, { type: "start", total: count, model: payload.model });

  for (let index = 0; index < count; index += 1) {
    try {
      const normalized = await generateOneImage(payload);
      if (!normalized) {
        writeNdjson(res, { type: "error", index, error: "The image API returned an empty result." });
        continue;
      }

      for (const image of normalized.images) {
        writeNdjson(res, {
          type: "image",
          index,
          image,
          created: normalized.created,
          model: payload.model
        });
      }
    } catch (error) {
      writeNdjson(res, {
        type: "error",
        index,
        error: error instanceof Error ? error.message : "Image generation failed."
      });
      break;
    }
  }

  writeNdjson(res, { type: "done", model: payload.model });
  res.end();
}

async function handleEdit(req, res) {
  if (!assertApiKey(res)) return;

  const parsed = await parseMultipartRequest(req);
  if (!parsed) {
    sendJson(res, 400, { error: "Invalid multipart request." });
    return;
  }

  const payload = buildImagePayload(parsed.fields);
  const prompt = String(payload.prompt || "").trim();
  const sourceImage = parsed.files.image;
  const count = readCount(parsed.fields);

  if (prompt.length < 2) {
    sendJson(res, 400, { error: "Please enter an edit prompt." });
    return;
  }

  if (!sourceImage?.buffer?.length) {
    sendJson(res, 400, { error: "Please upload an image to edit." });
    return;
  }

  const results = [];
  let created;

  for (let index = 0; index < count; index += 1) {
    const form = new FormData();
    for (const [key, value] of Object.entries(payload)) {
      form.append(key, String(value));
    }
    form.append("image", new Blob([sourceImage.buffer], { type: sourceImage.contentType }), sourceImage.filename || "image.png");

    const mask = parsed.files.mask;
    if (mask?.buffer?.length) {
      form.append("mask", new Blob([mask.buffer], { type: mask.contentType }), mask.filename || "mask.png");
    }

    const runtime = getRuntimeConfig();
    const response = await fetch(`${runtime.apiBase}/images/edits`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${runtime.apiKey}`
      },
      body: form
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      sendJson(res, response.status, {
        error: data?.error?.message || data?.message || "Image edit failed."
      });
      return;
    }

    const normalized = normalizeImageResponse(data);
    if (normalized) {
      results.push(...normalized.images);
      created = normalized.created || created;
    }
  }

  if (!results.length) {
    sendJson(res, 502, { error: "The image API returned an empty edit result." });
    return;
  }

  sendJson(res, 200, {
    image: results[0],
    images: results,
    created,
    model: payload.model
  });
}

async function editOneImage(payload, sourceImage, mask) {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    form.append(key, String(value));
  }
  form.append("image", new Blob([sourceImage.buffer], { type: sourceImage.contentType }), sourceImage.filename || "image.png");

  if (mask?.buffer?.length) {
    form.append("mask", new Blob([mask.buffer], { type: mask.contentType }), mask.filename || "mask.png");
  }

  const runtime = getRuntimeConfig();
  const response = await fetch(`${runtime.apiBase}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtime.apiKey}`
    },
    body: form
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || "Image edit failed.");
  }

  return normalizeImageResponse(data);
}

async function handleEditStream(req, res) {
  if (!assertApiKey(res)) return;

  const parsed = await parseMultipartRequest(req);
  if (!parsed) {
    sendJson(res, 400, { error: "Invalid multipart request." });
    return;
  }

  const payload = buildImagePayload(parsed.fields);
  const prompt = String(payload.prompt || "").trim();
  const sourceImage = parsed.files.image;
  const mask = parsed.files.mask;
  const count = readCount(parsed.fields);

  if (prompt.length < 2) {
    sendJson(res, 400, { error: "Please enter an edit prompt." });
    return;
  }

  if (!sourceImage?.buffer?.length) {
    sendJson(res, 400, { error: "Please upload an image to edit." });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });

  writeNdjson(res, { type: "start", total: count, model: payload.model });

  for (let index = 0; index < count; index += 1) {
    try {
      const normalized = await editOneImage(payload, sourceImage, mask);
      if (!normalized) {
        writeNdjson(res, { type: "error", index, error: "The image API returned an empty edit result." });
        continue;
      }

      for (const image of normalized.images) {
        writeNdjson(res, {
          type: "image",
          index,
          image,
          created: normalized.created,
          model: payload.model
        });
      }
    } catch (error) {
      writeNdjson(res, {
        type: "error",
        index,
        error: error instanceof Error ? error.message : "Image edit failed."
      });
      break;
    }
  }

  writeNdjson(res, { type: "done", model: payload.model });
  res.end();
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const assetPath = vendorFiles[requestedPath];
  const filePath = assetPath || join(publicDir, normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, ""));

  if (!filePath.startsWith(publicDir)) {
    if (!assetPath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
  }

  try {
    const file = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    res.end(file);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

function readSettings() {
  const runtime = getRuntimeConfig();
  return {
    hasApiKey: Boolean(runtime.apiKey),
    apiBase: runtime.apiBase,
    model: runtime.model,
    hasSpeechApiKey: Boolean(runtime.speechApiKey),
    speechApiUrl: runtime.speechApiUrl,
    speechModel: runtime.speechModel
  };
}

export function startServer(port = defaultPort) {
  return new Promise((resolve, reject) => {
    let server;

    const handleRequest = async (req, res) => {
      try {
        if (req.method === "GET" && req.url === "/api/settings") {
          sendJson(res, 200, readSettings());
          return;
        }

        if (req.method === "POST" && req.url === "/api/settings") {
          const body = await parseJsonRequest(req);
          if (!body) {
            sendJson(res, 400, { error: "Invalid JSON request." });
            return;
          }

          await savePersistedConfig(body);
          sendJson(res, 200, readSettings());
          return;
        }

        if (req.method === "POST" && req.url === "/api/generate") {
          await handleGenerate(req, res);
          return;
        }

        if (req.method === "POST" && req.url === "/api/speech") {
          await handleSpeech(req, res);
          return;
        }

        if (req.method === "POST" && req.url === "/api/generate-stream") {
          await handleGenerateStream(req, res);
          return;
        }

        if (req.method === "POST" && req.url === "/api/edit") {
          await handleEdit(req, res);
          return;
        }

        if (req.method === "POST" && req.url === "/api/edit-stream") {
          await handleEditStream(req, res);
          return;
        }

        if (req.method === "GET") {
          await serveStatic(req, res);
          return;
        }

        sendJson(res, 405, { error: "Method not allowed." });
      } catch (error) {
        sendJson(res, 500, { error: error instanceof Error ? error.message : "Unexpected server error." });
      }
    };

    const listen = (targetPort) => {
      server = http.createServer(handleRequest);

      server.once("error", (error) => {
        if (error?.code === "EADDRINUSE" && targetPort !== 0) {
          listen(0);
          return;
        }
        reject(error);
      });

      server.listen(targetPort, () => {
        const address = server.address();
        const actualPort = typeof address === "object" && address ? address.port : targetPort;
        console.log(`DreamTools image web running at http://localhost:${actualPort}`);
        resolve({ server, port: actualPort });
      });
    };

    listen(port);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await startServer();
}
