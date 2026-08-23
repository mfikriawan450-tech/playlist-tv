import { chromium } from "playwright";
import fs from "fs";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-blink-features=AutomationControlled",
    "--window-size=1280,720"
  ]
});

const context = await browser.newContext({
  viewport: {
    width: 1280,
    height: 720
  },

await context.addInitScript(() => {
  Object.defineProperty(navigator, "webdriver", {
    get: () => undefined
  });

  Object.defineProperty(navigator, "languages", {
    get: () => ["en-US", "en"]
  });

  Object.defineProperty(navigator, "plugins", {
    get: () => [1, 2, 3, 4, 5]
  });

  Object.defineProperty(navigator, "platform", {
    get: () => "Win32"
  });
});

  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
});

const page = await context.newPage();

const found = new Set();

function checkUrl(url, type) {
  if (
    url.includes("live-240.m3u8") &&
    url.includes("dmcdn.net")
  ) {
    if (!found.has(url)) {
      found.add(url);

      console.log("");
      console.log("=================================");
      console.log("LIVE-240 DITEMUKAN");
      console.log("=================================");
      console.log(url);
      console.log("=================================");
    }
  }
}

/*
 * Tangkap request sebelum membuka halaman.
 */
page.on("request", request => {
  checkUrl(request.url(), "REQUEST");
});

page.on("response", response => {
  checkUrl(response.url(), `RESPONSE ${response.status()}`);
});

console.log("Membuka Dailymotion Player Trans7...");

await page.goto(
  "https://geo.dailymotion.com/player/x15a7g.html?video=x8qckyq",
  {
    waitUntil: "domcontentloaded",
    timeout: 60000
  }
);

console.log("Player terbuka.");

await page.waitForTimeout(10000);

console.log("Mencari elemen video...");

const videos = await page.locator("video").count();

console.log("Jumlah video:", videos);

for (let i = 0; i < videos; i++) {
  try {
    await page.locator("video").nth(i).evaluate(video => {
      video.muted = true;

      const promise = video.play();

      if (promise) {
        promise.catch(() => {});
      }
    });

    console.log(`Video ${i} diperintahkan PLAY.`);
  } catch (error) {
    console.log(
      `Gagal menjalankan video ${i}: ${error.message}`
    );
  }
}

console.log("Menunggu request live-240.m3u8...");

for (let i = 0; i < 18; i++) {
  if (found.size > 0) break;

  console.log(`Menunggu... ${i * 10}s`);

  await page.waitForTimeout(10000);
}

console.log("");
console.log("=================================");
console.log("HASIL");
console.log("Jumlah URL ditemukan:", found.size);
console.log("=================================");

if (found.size === 0) {
  await browser.close();
  process.exit(1);
}

/*
 * Ambil URL pertama yang ditemukan.
 */
const streamUrl = [...found][0];

console.log("");
console.log("STREAM TRANS7:");
console.log(streamUrl);
console.log("");

/*
 * Pastikan folder playlist tersedia.
 */
fs.mkdirSync("playlist", {
  recursive: true
});

/*
 * Tulis playlist M3U.
 */
const playlist = `#EXTM3U
#EXTINF:-1,Trans7
${streamUrl}
`;

fs.writeFileSync(
  "playlist/trans7.m3u",
  playlist,
  "utf8"
);

console.log("Playlist Trans7 berhasil diperbarui.");
console.log("File: playlist/trans7.m3u");

await browser.close();
