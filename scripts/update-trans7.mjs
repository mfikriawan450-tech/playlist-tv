import { chromium } from "playwright";
import fs from "fs";

const PAGE_URL = "https://sevenhub.id/live";
const OUTPUT_FILE = "stream-trans7.txt";

console.log("=================================");
console.log("MEMBUKA SEVENHUB");
console.log("=================================");
console.log(PAGE_URL);

const browser = await chromium.launch({
  headless: true
});

const page = await browser.newPage({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/151.0.0.0 Safari/537.36"
});

let foundUrl = null;

page.on("request", request => {
  const url = request.url();

  if (
    url.includes("dmcdn.net") &&
    url.includes(".m3u8") &&
    url.includes("x8qckyq")
  ) {
    console.log("");
    console.log("=================================");
    console.log("M3U8 DAILYMOTION DITEMUKAN");
    console.log("=================================");
    console.log(url);

    foundUrl = url;
  }
});

page.on("response", async response => {
  const url = response.url();

  if (
    url.includes("dmcdn.net") &&
    url.includes(".m3u8") &&
    url.includes("x8qckyq")
  ) {
    console.log("");
    console.log("M3U8 RESPONSE");
    console.log("STATUS:", response.status());
    console.log(url);

    if (response.status() === 200) {
      foundUrl = url;
    }
  }
});

try {
  await page.goto(PAGE_URL, {
    waitUntil: "domcontentloaded",
    timeout: 30000
  });

  console.log("SevenHub berhasil dibuka.");
} catch (error) {
  console.log("Navigasi mengalami timeout/error.");
  console.log(error.message);
}

console.log("Menunggu player...");
await page.waitForTimeout(10000);

console.log("Mencari video player...");

const videos = await page.locator("video").count();

console.log(`Ditemukan ${videos} video.`);

for (let i = 0; i < videos; i++) {
  try {
    await page.locator("video").nth(i).evaluate(video => {
      video.muted = true;
      video.play().catch(() => {});
    });

    console.log(`Video ${i} diperintahkan play.`);
  } catch {
    console.log(`Video ${i} gagal diperintahkan play.`);
  }
}

console.log("Menunggu M3U8 Dailymotion...");

// Tunggu maksimal 60 detik
for (let i = 0; i < 60; i++) {
  if (foundUrl) break;

  await page.waitForTimeout(1000);

  if (i % 10 === 0) {
    console.log(`Menunggu... ${i}s`);
  }
}

await browser.close();

console.log("");
console.log("=================================");
console.log("HASIL DETEKSI TRANS7");
console.log("=================================");

if (!foundUrl) {
  console.log("M3U8 TRANS7 TIDAK DITEMUKAN.");
  process.exit(1);
}

console.log("URL TRANS7:");
console.log(foundUrl);

// Pastikan URL benar-benar HTTP
if (!foundUrl.startsWith("https://")) {
  console.log("URL tidak valid.");
  process.exit(1);
}

// ==========================================
// SIMPAN URL KE FILE KHUSUS TRANS7
// ==========================================

fs.writeFileSync(
  OUTPUT_FILE,
  foundUrl.trim() + "\n",
  "utf8"
);

console.log("");
console.log("=================================");
console.log("STREAM TRANS7 BERHASIL DIPERBARUI");
console.log("=================================");
console.log(`File: ${OUTPUT_FILE}`);
console.log(foundUrl);
