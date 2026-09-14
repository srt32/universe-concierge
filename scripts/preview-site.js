import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)), "dist");
const host = "127.0.0.1";
const port = Number(process.env.PORT ?? 4173);
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

export function localPath(requestUrl) {
  try {
    const pathname = decodeURIComponent(
      new URL(requestUrl, `http://${host}`).pathname,
    );
    const requested = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
    const path = resolve(root, `.${requested}`);
    if (path !== root && !path.startsWith(`${root}${sep}`)) {
      return null;
    }
    return path;
  } catch {
    return null;
  }
}

const server = createServer(async (request, response) => {
  const path = localPath(request.url ?? "/");
  if (!path) {
    response.writeHead(400).end("Invalid path");
    return;
  }

  try {
    const info = await stat(path);
    if (!info.isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentTypes.get(extname(path)) ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    createReadStream(path).pipe(response);
  } catch (error) {
    if (error?.code === "ENOENT") {
      response.writeHead(404).end("Not found");
      return;
    }
    console.error(error);
    response.writeHead(500).end("Server error");
  }
});

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  server.listen(port, host, () => {
    console.log(`Universe Concierge preview: http://${host}:${port}`);
  });
}
