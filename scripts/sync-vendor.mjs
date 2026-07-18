import { mkdir, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const assets = [
  ["node_modules/react/umd/react.production.min.js", "public/vendor/react.min.js"],
  ["node_modules/react-dom/umd/react-dom.production.min.js", "public/vendor/react-dom.min.js"],
  ["node_modules/dayjs/dayjs.min.js", "public/vendor/dayjs.min.js"],
  ["node_modules/antd/dist/antd.min.js", "public/vendor/antd.min.js"],
  ["node_modules/antd/dist/reset.css", "public/vendor/antd-reset.css"]
];

for (const [from, to] of assets) {
  const source = join(root, from);
  const target = join(root, to);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
}
