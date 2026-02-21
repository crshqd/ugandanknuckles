self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());

const DB_NAME = "virtual-files-db";
const STORE_NAME = "files";

const mimeMap = {
  ".html": "text/html",
  ".htm": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "audio/ogg",
  ".eot": "application/vnd.ms-fontobject",
  ".woff": "font/woff",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
};

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);

    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function clearStore(store) {
  return new Promise((resolve) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
  });
}

self.addEventListener("message", async (event) => {
  if (event.data?.type === "LOAD_ZIP") {
    const files = event.data.files;

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    await clearStore(store);

    for (const [path, blob] of Object.entries(files)) {
      store.put(blob, path);
    }

    tx.oncomplete = () => {
      console.log("[SW] ZIP stored in IndexedDB:", Object.keys(files));
      if (event.ports[0]) {
        event.ports[0].postMessage({ type: "ZIP_LOADED" });
      }
    };
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/dfw/")) {
    event.respondWith(
      (async () => {
        const path = decodeURIComponent(url.pathname);

        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);

        const blob = await new Promise((resolve) => {
          const req = store.get(path);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(undefined);
        });

        if (!blob) {
          console.log("[SW] File not found in IndexedDB:", path);
          return new Response("File not found", { status: 404 });
        }

        const ext = Object.keys(mimeMap).find((ext) => path.endsWith(ext));
        const contentType = ext ? mimeMap[ext] : "application/octet-stream";

        console.log("[SW] Serving from IndexedDB:", path);

        return new Response(blob, {
          headers: { "Content-Type": contentType },
        });
      })()
    );
  }
});
