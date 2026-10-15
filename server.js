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
