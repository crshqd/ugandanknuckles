/*
welcome to the abombination that is fileclient's source code
it is literally just the index, this javascript file, and sw.js
*/
(async () => {
  const swUrl = new URL("./sw.js", location.href);
  await navigator.serviceWorker.register(swUrl);
  await navigator.serviceWorker.ready;

  if (!navigator.serviceWorker.controller) {
    location.reload();
    return;
  }

  console.log("[JS] SW ready and controlling page");
})();

const p = [
  "https://file.garden/aZWwRAkyAioQfCnw/files/dlpack.html",
  "https://file.garden/aZWwRAkyAioQfCnw/files/the%20puffs.zip",
  "https://file.garden/aZKAbTtM0CnyBnR2/BGC.zip",
  "https://file.garden/aZWwRAkyAioQfCnw/files/BGBUltraCompress.zip",
];

// UI helpers
function main() {
  document.getElementById("sf").style.display = "none";
  document.getElementById("zip").style.display = "none";
  document.getElementById("main").style.display = "block";
}
function sf() {
  document.getElementById("sf").style.display = "block";
  document.getElementById("main").style.display = "none";
}
function zip() {
  document.getElementById("zip").style.display = "block";
  document.getElementById("main").style.display = "none";
}

// Get dynamic base path (directory of current page)
function getBasePath() {
  const url = new URL(location.href);
  return url.pathname.endsWith("/")
    ? url.pathname
    : url.pathname.substring(0, url.pathname.lastIndexOf("/") + 1);
}

// Open single HTML file from input
async function sfon() {
  const file = document.getElementById("html").files[0];
  if (!file) return;

  const newWin = window.open("about:blank", "_blank");
  const base = getBasePath();
  const virtualPath = base + "dfw/index.html";

  try {
    const files = {};
    files[virtualPath] = file;
    await sendZipToSW(files);
    newWin.location.href = virtualPath;
  } catch (e) {
    newWin.close();
    alert("Error: " + e.message);
  }
}

// Open HTML content from URL
async function sfr(contentUrl) {
  const newWin = window.open("about:blank", "_blank");
  const base = getBasePath();
  const virtualPath = base + "dfw/index.html";
  const files = {};

  try {
    const response = await fetch(contentUrl);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const htmlText = await response.text();

    files[virtualPath] = new Blob([htmlText], { type: "text/html" });
    await sendZipToSW(files);

    newWin.location.href = virtualPath;
  } catch (e) {
    newWin.close();
    alert("Failed to load content: " + e.message);
  }
}

// Send ZIP or files to SW
function sendZipToSW(files) {
  return new Promise(async (resolve, reject) => {
    const sw = navigator.serviceWorker.controller;
    if (!sw) return reject("No active service worker controller");

    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      if (event.data?.type === "ZIP_LOADED") resolve();
      else reject("SW failed");
    };

    sw.postMessage({ type: "LOAD_ZIP", files }, [channel.port2]);
  });
}

// ZIP picker
async function zipon() {
  const fileInput = document.getElementById("zipInput");
  const zipFile = fileInput.files[0];
  if (!zipFile) return alert("Please choose a ZIP file!");

  const zip = await JSZip.loadAsync(zipFile);
  const htmlFiles = Object.keys(zip.files).filter(
    (f) => f.endsWith(".html") || f.endsWith(".htm")
  );
  if (!htmlFiles.length) return alert("No HTML files in ZIP!");

  const picker = document.createElement("div");
  picker.id = "zip-picker";
  picker.style.border = "1px solid #ccc";
  picker.style.padding = "10px";
  picker.style.marginTop = "10px";

  const title = document.createElement("p");
  title.textContent = "Pick an HTML file to open:";
  picker.appendChild(title);

  htmlFiles.forEach((f) => {
    const btn = document.createElement("button");
    btn.textContent = f;
    btn.style.display = "block";
    btn.style.margin = "5px 0";

    btn.onclick = async () => {
      const newWin = window.open("about:blank", "_blank");
      const base = getBasePath();
      const files = {};

      for (const name in zip.files) {
        if (!zip.files[name].dir) {
          const blob = await zip.files[name].async("blob");
          files[base + "dfw/" + name] = blob;
        }
      }

      await sendZipToSW(files);
      newWin.location.href = base + "dfw/" + f;
    };

    picker.appendChild(btn);
  });

  const zipDiv = document.getElementById("zip");
  const oldPicker = document.getElementById("zip-picker");
  if (oldPicker) oldPicker.remove();
  zipDiv.appendChild(picker);
}

// Fetch ZIP from URL and open a file
async function zipr(url, f) {
  const newWin = window.open("about:blank", "_blank");
  const base = getBasePath();
  const virtualBase = base + "dfw/";

  let zipFile;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    zipFile = await response.arrayBuffer();
  } catch (e) {
    newWin.close();
    return alert("Failed to fetch ZIP: " + e.message);
  }

  const zip = await JSZip.loadAsync(zipFile);
  const files = {};

  for (const name in zip.files) {
    if (!zip.files[name].dir) {
      const blob = await zip.files[name].async("blob");
      files[virtualBase + name] = blob;
    }
  }

  await sendZipToSW(files);
  newWin.location.href = virtualBase + f;
}