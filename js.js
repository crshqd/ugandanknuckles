(async () => {
  const swUrl = new URL("./sw.js", location.href);
  await navigator.serviceWorker.register(swUrl, { scope: "/" });
  await navigator.serviceWorker.ready;

  // Ensure this page is controlled
  if (!navigator.serviceWorker.controller) {
    location.reload();
    return;
  }

  console.log("[JS] SW ready and controlling page");
})();

const p = [];
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

// Open single HTML file
function sfon() {
  const file = document.getElementById("htmlInput").files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const blob = new Blob([reader.result], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  reader.readAsText(file);
}

// Open preset HTML
function sfr(content) {
  const blob = new Blob([content], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Send ZIP files to SW and wait for confirmation
function sendZipToSW(files) {
  return new Promise(async (resolve, reject) => {
    const registration = await navigator.serviceWorker.ready;
    const sw = navigator.serviceWorker.controller;

    if (!sw) {
      reject("No active service worker controller");
      return;
    }

    const channel = new MessageChannel();

    channel.port1.onmessage = (event) => {
      if (event.data?.type === "ZIP_LOADED") {
        resolve();
      } else {
        reject("SW failed");
      }
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
      const files = {};

      for (const name in zip.files) {
        if (!zip.files[name].dir) {
          const blob = await zip.files[name].async("blob");
          files["/dfw/" + name] = blob;
        }
      }

      // Wait until IndexedDB storage finishes
      await sendZipToSW(files);

      // Now safe to open
      window.open("/dfw/" + f, "_blank");
    };

    picker.appendChild(btn);
  });

  const zipDiv = document.getElementById("zip");
  const oldPicker = document.getElementById("zip-picker");
  if (oldPicker) oldPicker.remove();
  zipDiv.appendChild(picker);
}
