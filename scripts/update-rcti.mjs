import { chromium } from "playwright";

const URL = "https://www.rctiplus.com/tv/gtv";

console.log("");
console.log("=================================");
console.log("DEBUG KHUSUS GTV");
console.log("=================================");

const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu"
  ]
});

const context = await browser.newContext({
  viewport: {
    width: 1280,
    height: 720
  },

  userAgent:
    "Mozilla/5.0 (X11; Linux x86_64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/151.0.0.0 Safari/537.36"
});

const page = await context.newPage();

// ==========================================
// ERROR JAVASCRIPT
// ==========================================

page.on("pageerror", (error) => {
  console.log("");
  console.log("========== PAGE ERROR ==========");
  console.log(error.message);
  console.log("================================");
});

page.on("console", (msg) => {
  const text = msg.text();

  if (
    text.includes("error") ||
    text.includes("Error") ||
    text.includes("player") ||
    text.includes("video") ||
    text.includes("stream") ||
    text.includes("jw")
  ) {
    console.log("");
    console.log("========== BROWSER CONSOLE ==========");
    console.log(`[${msg.type()}] ${text}`);
    console.log("======================================");
  }
});

// ==========================================
// SEMUA REQUEST
// ==========================================

page.on("request", (request) => {
  const url = request.url();
  const type = request.resourceType();

  const interesting =
    url.includes("gtv") ||
    url.includes("rctiplus") ||
    url.includes("m3u8") ||
    url.includes("jwplayer") ||
    url.includes("jwpltx") ||
    url.includes("api") ||
    type === "xhr" ||
    type === "fetch" ||
    type === "media";

  if (interesting) {
    console.log("");
    console.log("---------- REQUEST ----------");
    console.log("TYPE :", type);
    console.log("METHOD:", request.method());
    console.log("URL   :", url);

    const headers = request.headers();

    if (headers.referer) {
      console.log("REFERER:", headers.referer);
    }

    console.log("-----------------------------");
  }
});

// ==========================================
// SEMUA RESPONSE
// ==========================================

page.on("response", async (response) => {
  const url = response.url();
  const type = response.request().resourceType();

  const interesting =
    url.includes("gtv") ||
    url.includes("rctiplus") ||
    url.includes("m3u8") ||
    url.includes("jwplayer") ||
    url.includes("jwpltx") ||
    url.includes("api") ||
    type === "xhr" ||
    type === "fetch" ||
    type === "media";

  if (!interesting) {
    return;
  }

  console.log("");
  console.log("---------- RESPONSE ----------");
  console.log("STATUS:", response.status());
  console.log("TYPE  :", type);
  console.log("URL   :", url);
  console.log("------------------------------");

  // ========================================
  // KHUSUS RESPONSE JSON
  // ========================================

  const contentType =
    response.headers()["content-type"] || "";

  if (
    contentType.includes("json") ||
    type === "xhr" ||
    type === "fetch"
  ) {
    try {
      const text = await response.text();

      if (text) {
        console.log("RESPONSE BODY:");

        // Batasi supaya log GitHub tidak terlalu besar
        if (text.length > 10000) {
          console.log(
            text.substring(0, 10000)
          );
          console.log(
            `...[dipotong, panjang ${text.length} karakter]`
          );
        } else {
          console.log(text);
        }
      }
    } catch (error) {
      console.log(
        "Tidak bisa membaca response body:",
        error.message
      );
    }
  }
});

// ==========================================
// BUKA HALAMAN
// ==========================================

console.log("");
console.log("=================================");
console.log("MEMBUKA GTV");
console.log("=================================");

try {
  await page.goto(URL, {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });

  console.log("GTV halaman berhasil dibuka.");
} catch (error) {
  console.log("");
  console.log("GTV GAGAL DIBUKA");
  console.log(error.message);
}

// ==========================================
// TUNGGU HALAMAN
// ==========================================

console.log("");
console.log("=================================");
console.log("MENUNGGU JAVASCRIPT GTV");
console.log("=================================");

for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(1000);

  console.log(
    `GTV menunggu... ${i + 1} detik`
  );
}

// ==========================================
// INFORMASI HALAMAN
// ==========================================

console.log("");
console.log("=================================");
console.log("INFORMASI HALAMAN");
console.log("=================================");

console.log("URL:");
console.log(page.url());

console.log("");
console.log("TITLE:");

try {
  console.log(await page.title());
} catch {
  console.log("Tidak tersedia");
}

// ==========================================
// VIDEO
// ==========================================

console.log("");
console.log("=================================");
console.log("VIDEO ELEMENT GTV");
console.log("=================================");

try {
  const videos = await page.locator("video").evaluateAll(
    (elements) =>
      elements.map((video) => ({
        src: video.src,
        currentSrc: video.currentSrc,
        readyState: video.readyState,
        networkState: video.networkState,
        paused: video.paused,
        muted: video.muted,
        autoplay: video.autoplay,
        controls: video.controls
      }))
  );

  console.log(
    JSON.stringify(videos, null, 2)
  );
} catch (error) {
  console.log(error.message);
}

// ==========================================
// SCRIPT
// ==========================================

console.log("");
console.log("=================================");
console.log("SCRIPT GTV");
console.log("=================================");

try {
  const scripts = await page.locator("script").evaluateAll(
    (elements) =>
      elements.map((script) => ({
        src: script.src,
        type: script.type
      }))
  );

  console.log(
    JSON.stringify(scripts, null, 2)
  );
} catch (error) {
  console.log(error.message);
}

// ==========================================
// IFRAME
// ==========================================

console.log("");
console.log("=================================");
console.log("IFRAME GTV");
console.log("=================================");

try {
  const frames = page.frames();

  for (const frame of frames) {
    console.log("FRAME:", frame.url());
  }
} catch (error) {
  console.log(error.message);
}

// ==========================================
// PERFORMANCE RESOURCE
// ==========================================

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

  console.log(
    JSON.stringify(resources, null, 2)
  );
} catch (error) {
  console.log(error.message);
}

// ==========================================
// LOCAL STORAGE
// ==========================================

console.log("");
console.log("=================================");
console.log("LOCAL STORAGE GTV");
console.log("=================================");

try {
  const storage = await page.evaluate(() => {
    const result = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key) {
        result[key] = localStorage.getItem(key);
      }
    }

    return result;
  });

  console.log(
    JSON.stringify(storage, null, 2)
  );
} catch (error) {
  console.log(error.message);
}

// ==========================================
// SESSION STORAGE
// ==========================================

console.log("");
console.log("=================================");
console.log("SESSION STORAGE GTV");
console.log("=================================");

try {
  const storage = await page.evaluate(() => {
    const result = {};

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);

      if (key) {
        result[key] = sessionStorage.getItem(key);
      }
    }

    return result;
  });

  console.log(
    JSON.stringify(storage, null, 2)
  );
} catch (error) {
  console.log(error.message);
}

// ==========================================
// HTML
// ==========================================

console.log("");
console.log("=================================");
console.log("CEK HTML GTV");
console.log("=================================");

try {
  const html = await page.content();

  console.log(
    `Panjang HTML: ${html.length} karakter`
  );

  const keywords = [
    "gtv",
    "gtv-linier",
    "gtv-sdi",
    "m3u8",
    "hdnts",
    "hdntl",
    "jwplayer",
    "jwplayer6",
    "playlist",
    "stream",
    "video"
  ];

  for (const keyword of keywords) {
    const found = html
      .toLowerCase()
      .includes(keyword.toLowerCase());

    console.log(
      `${keyword}: ${found ? "DITEMUKAN" : "TIDAK ADA"}`
    );
  }
} catch (error) {
  console.log(error.message);
}

// ==========================================
// SELESAI
// ==========================================

console.log("");
console.log("=================================");
console.log("DEBUG GTV SELESAI");
console.log("=================================");

await page.close();
await context.close();
await browser.close();
