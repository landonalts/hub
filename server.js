import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import express from "express";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { createBareServer } from "@tomphttp/bare-server-node";
import ipaddr from "ipaddr.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const dirOf = (specifier) => path.dirname(require.resolve(specifier));

const app = express();

// lets proxied sites use SharedArrayBuffer
app.use((_req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

// scramjet browser bundles
app.use("/scram/", express.static(scramjetPath));
app.use("/utils/", express.static(dirOf("@mercuryworkshop/scramjet-utils")));
app.use("/controller/", express.static(dirOf("@mercuryworkshop/scramjet-controller")));
app.use("/baremod/", express.static(dirOf("@mercuryworkshop/bare-transport")));
// hub static site
app.use(express.static(path.join(__dirname, "public")));

// ---- /cdn/ : same-origin game asset proxy (fixes blocked CDNs client-side) ----
const CDN_ALLOW = {
  "gfiles": "master",
  "Offline-HTML-Games-Pack": "master",
  "html-css-javascript-games": "main",
  "block_blast": "main",
};
app.use("/cdn/", async (req, res) => {
  try {
    const parts = req.path.split("/").filter(Boolean);
    const repo = parts.shift();
    const branch = CDN_ALLOW[repo];
    if (!branch || !parts.length || parts.includes("..")) {
      res.status(404).end("not found");
      return;
    }
    const file = parts.map(encodeURIComponent).join("/");
    const upstream = `https://cdn.jsdelivr.net/gh/landonalts/${repo}@${branch}/${file}`;
    const r = await fetch(upstream);
    if (!r.ok) { res.status(r.status).end("upstream error"); return; }
    res.setHeader("Access-Control-Allow-Origin", "*");
    // jsDelivr serves .html as text/plain (breaks iframes) — set type from extension
    const MIME = { ".html": "text/html; charset=utf-8", ".htm": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8", ".json": "application/json",
      ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
      ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
      ".ico": "image/x-icon", ".mp3": "audio/mpeg", ".wav": "audio/wav",
      ".ogg": "audio/ogg", ".mp4": "video/mp4", ".webm": "video/webm",
      ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf" };
    const ext = ("." + file.split(".").pop().toLowerCase()).slice(0, 6);
    res.setHeader("content-type", MIME[ext] || r.headers.get("content-type") || "application/octet-stream");
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("content-length", buf.length);
    res.send(buf);
  } catch (e) { res.status(502).end("proxy error"); }
});

const bareServer = createBareServer("/bare/", {
  connectionLimiter: { maxConnectionsPerIP: 2000, windowDuration: 60, blockDuration: 10 },
  filterRemote(url) {
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    if (ipaddr.isValid(hostname) && ipaddr.parse(hostname).range() !== "unicast") {
      throw new RangeError("Forbidden IP");
    }
  },
});

const handleRequest = (req, res) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeRequest(req, res);
    return;
  }
  app(req, res);
};

export default handleRequest;

if (!process.env.VERCEL) {
  http.createServer(handleRequest).listen(process.env.PORT || 3000);
  console.log("hub listening on :" + (process.env.PORT || 3000));
}
