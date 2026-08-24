import { chromium } from "playwright";
import fs from "fs";

const PAGE_URL = "https://sevenhub.id/live";
const PLAYLIST = "os4.m3u";

let trans7Url = null;

const browser = await chromium.launch({
  headless: true,
  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--disable-blink-features=AutomationControlled",
    "--no-sandbox"
  ]
});

const context = await browser.newContext({
  viewport: {
    width: 1280,
    height: 720
  },

  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/151.0.0.0 Safari/537.36"
});

const page = await context.newPage();

// =====================================================
// DETEKSI M3U8 DAILYMOTION
// =====================================================

page.on("request", request => {
  const url = request.url();

  if (
    url.includes("dmcdn.net") &&
    url.includes(".m3u8")
  ) {
    console.log("");
    console.log("=================================");
    console.log("M3U8 DAILYMOTION DITEMUKAN");
    console.log("=================================");
    console.log(url);

    if (!trans7Url) {
      trans7Url = url;
    }

    console.log("TARGET TRANS7 DITEMUKAN!");
  }
});

// =====================================================
// DETEKSI RESPONSE M3U8
// =====================================================

page.on("response", response => {
  const url = response.url();

  if (
    url.includes("dmcdn.net") &&
    url.includes(".m3u8")
  ) {
    console.log("");
    console.log("M3U8 RESPONSE");
    console.log("STATUS:", response.status());
    console.log(url);

    if (response.status() === 200) {
      trans7Url = url;

      console.log("TARGET TRANS7 RESPONSE 200!");
    }
  }
});

// =====================================================
// BUKA SEVENHUB
// =====================================================

console.log("");
console.log("=================================");
console.log("MEMBUKA SEVENHUB");
console.log("=================================");
console.log(PAGE_URL);

try {
  try {
    await page.goto(PAGE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    console.log("SevenHub berhasil dibuka.");
  } catch (error) {
    console.log("");
    console.log("Navigasi mengalami timeout/error:");
    console.log(error.message);
    console.log("");
    console.log("Tetap melanjutkan pemantauan request...");
  }

  // ===================================================
  // TUNGGU PLAYER
  // ===================================================

  console.log("");
  console.log("Menunggu player...");
  await page.waitForTimeout(3000);

  // ===================================================
  // BERIKAN WAKTU STREAM DIMULAI
  // ===================================================

  console.log("Tunggu 10 detik agar stream mulai...");
  await page.waitForTimeout(10000);

  // ===================================================
  // CARI VIDEO PLAYER DI SEMUA FRAME
  // ===================================================

  console.log("");
  console.log("Mencari video player...");

  for (const frame of page.frames()) {
    try {
      const videoCount = await frame
        .locator("video")
        .count();

      if (videoCount > 0) {
        console.log(
          `Frame memiliki ${videoCount} video.`
        );

        for (let i = 0; i < videoCount; i++) {
          try {
            await frame
              .locator("video")
              .nth(i)
              .evaluate(video => {
                video.muted = true;

                const promise = video.play();

                if (
                  promise &&
                  typeof promise.catch === "function"
                ) {
                  promise.catch(() => {});
                }
              });

            console.log(
              `Video ${i} diperintahkan play.`
            );
          } catch (error) {
            console.log(
              `Video ${i} gagal play:`,
              error.message
            );
          }
        }
      }
    } catch {}
  }

  // ===================================================
  // KLIK PLAYER
  // ===================================================

  try {
    await page.mouse.click(640, 360);
    console.log("Player diklik.");
  } catch {}

  // ===================================================
  // TUNGGU M3U8
  // ===================================================

  console.log("");
  console.log("Menunggu M3U8 Dailymotion...");

  for (
    let i = 0;
    i < 60 && !trans7Url;
    i++
  ) {
    await page.waitForTimeout(2000);

    if (i % 5 === 0) {
      console.log(
        `Menunggu M3U8... ${i * 2}s`
      );
    }
  }

} catch (error) {
  console.error("");
  console.error("ERROR:");
  console.error(error.message);

  await browser.close();
  process.exit(1);
}

// =====================================================
// TUTUP BROWSER
// =====================================================

await browser.close();

// =====================================================
// HASIL DETEKSI
// =====================================================

console.log("");
console.log("=================================");
console.log("HASIL DETEKSI TRANS7");
console.log("=================================");

if (!trans7Url) {
  console.error(
    "GAGAL: M3U8 Dailymotion Trans7 tidak ditemukan."
  );

  process.exit(1);
}

console.log("");
console.log("URL TRANS7:");
console.log(trans7Url);

// =====================================================
// CEK PLAYLIST
// =====================================================

if (!fs.existsSync(PLAYLIST)) {
  console.error("");
  console.error(
    `File tidak ditemukan: ${PLAYLIST}`
  );

  process.exit(1);
}

let playlist = fs.readFileSync(
  PLAYLIST,
  "utf8"
);

// =====================================================
// CARI BLOK TRANS7
// =====================================================

const trans7Regex =
  /(#EXTINF:-1,Trans7\s*\n)([^\r\n]*)/i;

if (!trans7Regex.test(playlist)) {
  console.error("");
  console.error(
    "Blok Trans7 tidak ditemukan di os4.m3u"
  );

  process.exit(1);
}

// =====================================================
// UPDATE URL TRANS7
// =====================================================

playlist = playlist.replace(
  trans7Regex,
  `$1${trans7Url}`
);

// =====================================================
// SIMPAN PLAYLIST
// =====================================================

fs.writeFileSync(
  PLAYLIST,
  playlist,
  "utf8"
);

console.log("");
console.log("=================================");
console.log("PLAYLIST BERHASIL DIPERBARUI");
console.log("=================================");
console.log("");
console.log("File:");
console.log(PLAYLIST);
console.log("");
console.log("Trans7:");
console.log(trans7Url);
