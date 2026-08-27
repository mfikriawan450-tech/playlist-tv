import { chromium } from "playwright";
import fs from "fs";

const PAGE_URL = "https://sevenhub.id/live";
const OUTPUT_FILE = "stream-trans7.txt";

console.log("=================================");
console.log("MEMBUKA SEVENHUB");
console.log("=================================");
console.log(PAGE_URL);

const browser = await chromium.launch({
  headless: true,
  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--disable-blink-features=AutomationControlled"
  ]
});

const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/151.0.0.0 Safari/537.36",
  viewport: {
    width: 1280,
    height: 720
  }
});

const page = await context.newPage();

let originalUrl = null;

// ==========================================
// DETEKSI REQUEST M3U8
// ==========================================

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

    originalUrl = url;

    console.log("");
    console.log("TARGET TRANS7 DITEMUKAN!");
  }
});

// ==========================================
// DETEKSI RESPONSE M3U8
// ==========================================

page.on("response", response => {
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
      originalUrl = url;

      console.log("");
      console.log("TARGET TRANS7 RESPONSE 200!");
    }
  }
});

// ==========================================
// BUKA SEVENHUB
// ==========================================

try {
  await page.goto(PAGE_URL, {
    waitUntil: "domcontentloaded",
    timeout: 30000
  });

  console.log("SevenHub berhasil dibuka.");
} catch (error) {
  console.log("Navigasi mengalami masalah:");
  console.log(error.message);
}

// ==========================================
// TUNGGU STREAM
// ==========================================

console.log("Menunggu player...");

await page.waitForTimeout(10000);

console.log("Mencari video player...");

const videos = await page.locator("video").count();

console.log(`Frame memiliki ${videos} video.`);

for (let i = 0; i < videos; i++) {
  try {
    await page.locator("video").nth(i).evaluate(video => {
      video.muted = true;
      video.setAttribute("muted", "");
      video.play().catch(() => {});
    });

    console.log(`Video ${i} diperintahkan play.`);
  } catch {
    console.log(`Video ${i} gagal dimainkan.`);
  }
}

// ==========================================
// KLIK PLAYER
// ==========================================

try {
  const players = page.locator(
    "video, iframe, [class*='player'], [class*='video']"
  );

  const count = await players.count();

  if (count > 0) {
    await players.first().click({
      force: true,
      timeout: 5000
    }).catch(() => {});

    console.log("Player diklik.");
  }
} catch {
  console.log("Player tidak dapat diklik.");
}

// ==========================================
// TUNGGU M3U8
// ==========================================

console.log("Menunggu M3U8 Dailymotion...");

for (let i = 0; i < 90; i++) {
  if (originalUrl) {
    break;
  }

  await page.waitForTimeout(1000);

  if (i % 10 === 0) {
    console.log(`Menunggu... ${i}s`);
  }
}

await browser.close();

// ==========================================
// HASIL DETEKSI
// ==========================================

console.log("");
console.log("=================================");
console.log("HASIL DETEKSI TRANS7");
console.log("=================================");

if (!originalUrl) {
  console.log("M3U8 TRANS7 TIDAK DITEMUKAN.");
}

console.log("");
console.log("URL ASLI:");
console.log(originalUrl);

// ==========================================
// COBA UBAH 240 → 720
// ==========================================

let finalUrl = originalUrl;

if (originalUrl.includes("live-240.m3u8")) {

  const url720 = originalUrl.replace(
    "live-240.m3u8",
    "live-720.m3u8"
  );

  console.log("");
  console.log("=================================");
  console.log("MENCOBA STREAM 720P");
  console.log("=================================");
  console.log(url720);

  try {
    const response720 = await fetch(url720, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/151.0.0.0 Safari/537.36",
        "Referer": "https://sevenhub.id/"
      },
      redirect: "follow"
    });

    console.log("");
    console.log("STATUS 720P:", response720.status);

    if (response720.status === 200) {

      finalUrl = url720;

      console.log("");
      console.log("=================================");
      console.log("720P TERSEDIA!");
      console.log("=================================");
      console.log("Menggunakan URL 720P.");
    } else {

      console.log("");
      console.log("=================================");
      console.log("720P TIDAK TERSEDIA");
      console.log("=================================");
      console.log("Kembali menggunakan URL asli.");
    }

  } catch (error) {

    console.log("");
    console.log("GAGAL TEST 720P:");
    console.log(error.message);

    console.log("");
    console.log("Menggunakan URL asli.");
  }

} else {

  console.log("");
  console.log("URL tidak menggunakan pola live-240.m3u8.");
  console.log("URL asli akan digunakan.");
}

// ==========================================
// SIMPAN URL FINAL
// ==========================================

fs.writeFileSync(
  OUTPUT_FILE,
  finalUrl.trim() + "\n",
  "utf8"
);

console.log("");
console.log("=================================");
console.log("STREAM TRANS7 BERHASIL DIPERBARUI");
console.log("=================================");

console.log("");
console.log("URL FINAL:");
console.log(finalUrl);

console.log("");
console.log("FILE:");
console.log(OUTPUT_FILE);

console.log("");
console.log("=================================");
