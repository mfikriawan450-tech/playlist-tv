import { chromium } from "playwright";
import fs from "fs";

const URL = "https://www.rctiplus.com/tv/gtv";

console.log("");
console.log("=================================");
console.log("GTV DEBUG MODE");
console.log("=================================");
console.log("");

const browser = await chromium.launch({
  headless: true
});

const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
  viewport: {
    width: 1280,
    height: 720
  },
  locale: "id-ID"
});

const page = await context.newPage();

// ==========================================================
// REQUEST DEBUG
// ==========================================================

page.on("request", (request) => {
  const url = request.url();

  if (
    url.includes("rctiplus") ||
    url.includes("gtv") ||
    url.includes("linier") ||
    url.includes("m3u8") ||
    url.includes("api")
  ) {
    console.log("");
    console.log("[REQUEST]");
    console.log(request.method());
    console.log(url);
  }
});

// ==========================================================
// RESPONSE DEBUG
// ==========================================================

page.on("response", (response) => {
  const url = response.url();

  if (
    url.includes("rctiplus") ||
    url.includes("gtv") ||
    url.includes("linier") ||
    url.includes("m3u8") ||
    url.includes("api")
  ) {
    console.log("");
    console.log("[RESPONSE]");
    console.log(response.status());
    console.log(url);
  }
});

// ==========================================================
// CONSOLE DEBUG
// ==========================================================

page.on("console", (msg) => {
  console.log("");
  console.log("[BROWSER CONSOLE]");
  console.log(msg.type());
  console.log(msg.text());
});

// ==========================================================
// PAGE ERROR
// ==========================================================

page.on("pageerror", (error) => {
  console.log("");
  console.log("[PAGE ERROR]");
  console.log(error.message);
});

// ==========================================================
// REQUEST FAILED
// ==========================================================

page.on("requestfailed", (request) => {
  const url = request.url();

  if (
    url.includes("rctiplus") ||
    url.includes("gtv") ||
    url.includes("linier") ||
    url.includes("m3u8") ||
    url.includes("api")
  ) {
    console.log("");
    console.log("[REQUEST FAILED]");
    console.log(url);
    console.log(
      request.failure()?.errorText || "unknown"
    );
  }
});

// ==========================================================
// BUKA HALAMAN
// ==========================================================

console.log("=================================");
console.log("MEMBUKA GTV");
console.log("=================================");

try {
  await page.goto(URL, {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });

  console.log("");
  console.log("GTV halaman berhasil dibuka.");
} catch (error) {
  console.log("");
  console.log("GTV GAGAL DIBUKA");
  console.log(error.message);
}

// ==========================================================
// TUNGGU
// ==========================================================

console.log("");
console.log("=================================");
console.log("MENUNGGU HALAMAN GTV");
console.log("=================================");

for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(1000);

  if ((i + 1) % 5 === 0) {
    console.log(
      `GTV sudah menunggu ${i + 1} detik...`
    );
  }
}

// ==========================================================
// FRAME
// ==========================================================

console.log("");
console.log("=================================");
console.log("FRAME GTV");
console.log("=================================");

for (const [index, frame] of page.frames().entries()) {
  console.log("");
  console.log(`FRAME ${index}`);
  console.log("URL:", frame.url());
}

// ==========================================================
// VIDEO
// ==========================================================

console.log("");
console.log("=================================");
console.log("VIDEO ELEMENT GTV");
console.log("=================================");

try {
  const videos = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll("video")
    ).map((video) => ({
      src: video.src || "",
      currentSrc: video.currentSrc || "",
      readyState: video.readyState,
      networkState: video.networkState,
      paused: video.paused,
      autoplay: video.autoplay,
      muted: video.muted
    }));
  });

  console.log(
    JSON.stringify(videos, null, 2)
  );
} catch (error) {
  console.log(
    "Gagal membaca video:",
    error.message
  );
}

// ==========================================================
// IFRAME
// ==========================================================

console.log("");
console.log("=================================");
console.log("IFRAME GTV");
console.log("=================================");

try {
  const iframes = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll("iframe")
    ).map((iframe) => ({
      src: iframe.src || "",
      title: iframe.title || "",
      name: iframe.name || ""
    }));
  });

  console.log(
    JSON.stringify(iframes, null, 2)
  );
} catch (error) {
  console.log(
    "Gagal membaca iframe:",
    error.message
  );
}

// ==========================================================
// SCRIPT
// ==========================================================

console.log("");
console.log("=================================");
console.log("SCRIPT GTV");
console.log("=================================");

try {
  const scripts = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll("script")
    ).map((script) => ({
      src: script.src || "",
      type: script.type || "",
      length: (script.textContent || "").length
    }));
  });

  console.log(
    JSON.stringify(scripts, null, 2)
  );
} catch (error) {
  console.log(
    "Gagal membaca script:",
    error.message
  );
}

// ==========================================================
// HTML
// ==========================================================

console.log("");
console.log("=================================");
console.log("SIMPAN HTML GTV");
console.log("=================================");

try {
  const html = await page.content();

  fs.writeFileSync(
    "debug-gtv.html",
    html,
    "utf8"
  );

  console.log(
    "HTML berhasil disimpan ke debug-gtv.html"
  );

  console.log(
    "Ukuran HTML:",
    html.length,
    "karakter"
  );
} catch (error) {
  console.log(
    "Gagal menyimpan HTML:",
    error.message
  );
}

// ==========================================================
// PERFORMANCE RESOURCE
// ==========================================================

console.log("");
console.log("=================================");
console.log("PERFORMANCE RESOURCE GTV");
console.log("=================================");

try {
  const resources = await page.evaluate(() => {
    return performance
      .getEntriesByType("resource")
      .map((entry) => entry.name);
  });

  const filtered = resources.filter((url) =>
    /rctiplus|gtv|linier|m3u8|api/i.test(url)
  );

  console.log(
    JSON.stringify(filtered, null, 2)
  );
} catch (error) {
  console.log(
    "Gagal membaca performance:",
    error.message
  );
}

// ==========================================================
// LOCAL STORAGE
// ==========================================================

console.log("");
console.log("=================================");
console.log("LOCAL STORAGE GTV");
console.log("=================================");

try {
  const localStorage = await page.evaluate(() => {
    const result = {};

    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);

      if (key) {
        result[key] =
          window.localStorage.getItem(key);
      }
    }

    return result;
  });

  console.log(
    JSON.stringify(localStorage, null, 2)
  );
} catch (error) {
  console.log(
    "Gagal membaca localStorage:",
    error.message
  );
}

// ==========================================================
// SESSION STORAGE
// ==========================================================

console.log("");
console.log("=================================");
console.log("SESSION STORAGE GTV");
console.log("=================================");

try {
  const sessionStorage = await page.evaluate(() => {
    const result = {};

    for (
      let i = 0;
      i < window.sessionStorage.length;
      i++
    ) {
      const key =
        window.sessionStorage.key(i);

      if (key) {
        result[key] =
          window.sessionStorage.getItem(key);
      }
    }

    return result;
  });

  console.log(
    JSON.stringify(sessionStorage, null, 2)
  );
} catch (error) {
  console.log(
    "Gagal membaca sessionStorage:",
    error.message
  );
}

// ==========================================================
// GLOBAL VARIABLE YANG BERHUBUNGAN DENGAN GTV/STREAM
// ==========================================================

console.log("");
console.log("=================================");
console.log("SCAN GLOBAL VARIABLE");
console.log("=================================");

try {
  const globals = await page.evaluate(() => {
    const result = [];

    for (const key of Object.keys(window)) {
      if (
        /gtv|stream|video|player|channel|live/i.test(
          key
        )
      ) {
        result.push(key);
      }
    }

    return result;
  });

  console.log(
    JSON.stringify(globals, null, 2)
  );
} catch (error) {
  console.log(
    "Gagal scan global:",
    error.message
  );
}

// ==========================================================
// SCREENSHOT
// ==========================================================

console.log("");
console.log("=================================");
console.log("SCREENSHOT GTV");
console.log("=================================");

try {
  await page.screenshot({
    path: "debug-gtv.png",
    fullPage: true
  });

  console.log(
    "Screenshot berhasil disimpan ke debug-gtv.png"
  );
} catch (error) {
  console.log(
    "Gagal screenshot:",
    error.message
  );
}

// ==========================================================
// SELESAI
// ==========================================================

console.log("");
console.log("=================================");
console.log("GTV DEBUG SELESAI");
console.log("=================================");

await page.close();
await context.close();
await browser.close();
