import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
await loadDotEnv(join(root, ".env"));

const publicDir = join(root, "public");
const port = Number(process.env.PORT || 5177);
const apiBase = process.env.IMAGE_API_BASE || "https://apiproxy.paigod.work/v1";
const model = process.env.IMAGE_MODEL || "gpt-image-2";

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

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function assertApiKey(res) {
  if (!process.env.IMAGE_API_KEY) {
    sendJson(res, 500, { error: "Server is missing IMAGE_API_KEY." });
    return false;
  }
  return true;
}

function buildImagePayload(body) {
  const payload = {};
  const allowed = [
    "prompt",
    "size",
    "n",
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

  payload.model = String(body.model || model);
  return payload;
}

function normalizeImageResponse(data) {
  const image = data?.data?.[0];
  if (!image?.b64_json && !image?.url) return null;
  return {
    image: image.b64_json ? `data:image/png;base64,${image.b64_json}` : image.url,
    created: data.created,
    model: data.model || model
  };
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

  const boundary = Buffer.from(`--${boundaryMatch[1]}`);
  const body = await readRequestBody(req);
  const fields = {};
  const files = {};
  let cursor = 0;

  while (cursor < body.length) {
    const boundaryStart = body.indexOf(boundary, cursor);
    if (boundaryStart === -1) break;

    let partStart = boundaryStart + boundary.length;
    if (body.slice(partStart, partStart + 2).toString() === "--") break;
    if (body.slice(partStart, partStart + 2).toString() === "\r\n") partStart += 2;

    const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), partStart);
    if (headerEnd === -1) break;

    const headersText = body.slice(partStart, headerEnd).toString("utf8");
    const contentStart = headerEnd + 4;
    let nextBoundary = body.indexOf(boundary, contentStart);
    if (nextBoundary === -1) nextBoundary = body.length;

    let contentEnd = nextBoundary;
    if (body.slice(contentEnd - 2, contentEnd).toString() === "\r\n") contentEnd -= 2;

    const headers = Object.fromEntries(
      headersText.split(/\r?\n/).map((line) => {
        const index = line.indexOf(":");
        return [line.slice(0, index).toLowerCase(), line.slice(index + 1).trim()];
      })
    );
    const disposition = parseContentDisposition(headers["content-disposition"]);
    const name = disposition.name;
    if (name) {
      const file = {
        filename: disposition.filename,
        contentType: headers["content-type"] || "application/octet-stream",
        buffer: body.slice(contentStart, contentEnd)
      };
      if (disposition.filename) files[name] = file;
      else fields[name] = file.buffer.toString("utf8");
    }

    cursor = nextBoundary + boundary.length;
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

  if (prompt.length < 2) {
    sendJson(res, 400, { error: "Please enter a prompt." });
    return;
  }

  const response = await fetch(`${apiBase}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.IMAGE_API_KEY}`,
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
  if (!normalized) {
    sendJson(res, 502, { error: "The image API returned an empty result." });
    return;
  }

  sendJson(res, 200, normalized);
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

  if (prompt.length < 2) {
    sendJson(res, 400, { error: "Please enter an edit prompt." });
    return;
  }

  if (!sourceImage?.buffer?.length) {
    sendJson(res, 400, { error: "Please upload an image to edit." });
    return;
  }

  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    form.append(key, String(value));
  }
  form.append("image", new Blob([sourceImage.buffer], { type: sourceImage.contentType }), sourceImage.filename || "image.png");

  const mask = parsed.files.mask;
  if (mask?.buffer?.length) {
    form.append("mask", new Blob([mask.buffer], { type: mask.contentType }), mask.filename || "mask.png");
  }

  const response = await fetch(`${apiBase}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.IMAGE_API_KEY}`
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
  if (!normalized) {
    sendJson(res, 502, { error: "The image API returned an empty edit result." });
    return;
  }

  sendJson(res, 200, normalized);
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
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

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/generate") {
      await handleGenerate(req, res);
      return;
    }

    if (req.method === "POST" && req.url === "/api/edit") {
      await handleEdit(req, res);
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
});

server.listen(port, () => {
  console.log(`DreamTools image web running at http://localhost:${port}`);
});
