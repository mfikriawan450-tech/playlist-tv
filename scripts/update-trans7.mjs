import { chromium } from "playwright";
import fs from "fs";

const PAGE_URL = "https://sevenhub.id/live";
const PLAYLIST = "os4.m3u";

const TARGET_VIDEO_ID = "x8qckyq";

// =====================================================
// KONFIGURASI RESOLUSI
// =====================================================

// Kita sengaja menjadikan 720p sebagai target.
// SevenHub biasanya memberikan request live-240.m3u8,
// lalu URL tersebut kita ubah menjadi live-720.m3u8.
const TARGET_RESOLUTION = 720;
const FALLBACK_RESOLUTION = 240;

// =====================================================
// BROWSER
// =====================================================

const browser = await chromium.launch({
  headless: true,

  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--disable-blink-features=AutomationControlled",
    "--no-sandbox",
    "--disable-dev-shm-usage"
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
// VARIABEL
// =====================================================

let originalUrl = null;
let selectedUrl = null;

// =====================================================
// CEK TARGET DAILYMOTION
// =====================================================

function isTargetStream(url) {
  return (
    url.includes("dmcdn.net") &&
    url.includes(".m3u8") &&
    url.includes(TARGET_VIDEO_ID)
  );
}

// =====================================================
// UBAH RESOLUSI
// =====================================================

function changeResolution(url, resolution) {
  return url.replace(
    /live-\d{3,4}\.m3u8/i,
    `live-${resolution}.m3u8`
  );
}

// =====================================================
// REQUEST M3U8
// =====================================================

page.on("request", request => {
  const url = request.url();

  if (!isTargetStream(url)) {
    return;
  }

  console.log("");
  console.log("M3U8 DAILYMOTION DITEMUKAN");
  console.log("---------------------------------");
  console.log(url);

  // Ambil URL pertama yang ditemukan.
  if (!originalUrl) {
    originalUrl = url;

    console.log("");
    console.log("URL DASAR TRANS7 DITEMUKAN:");
    console.log(originalUrl);
  }
});

// =====================================================
// RESPONSE M3U8
// =====================================================

page.on("response", response => {
  const url = response.url();

  if (!isTargetStream(url)) {
    return;
  }

  const status = response.status();

  console.log("");
  console.log("M3U8 RESPONSE");
  console.log("STATUS:", status);
  console.log("URL:", url);

  if (status === 200 && !originalUrl) {
    originalUrl = url;
  }
});

// =====================================================
// BUKA SEVENHUB
// =====================================================

try {
  console.log("");
  console.log("=================================");
  console.log("MEMBUKA SEVENHUB");
  console.log("=================================");
  console.log(PAGE_URL);

  try {
    await page.goto(PAGE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    console.log("");
    console.log("SevenHub berhasil dibuka.");
  } catch (error) {
    console.log("");
    console.log("Navigasi mengalami masalah:");
    console.log(error.message);
    console.log("");
    console.log("Request tetap dipantau...");
  }

  // ===================================================
  // TUNGGU PLAYER
  // ===================================================

  console.log("");
  console.log("Menunggu player...");

  await page.waitForTimeout(5000);

  console.log("");
  console.log("Tunggu 10 detik agar stream mulai...");

  await page.waitForTimeout(10000);

  // ===================================================
  // FRAME
  // ===================================================

  console.log("");
  console.log("=================================");
  console.log("FRAME YANG TERBUKA");
  console.log("=================================");

  for (const frame of page.frames()) {
    console.log(frame.url());
  }

  // ===================================================
  // CARI VIDEO PLAYER
  // ===================================================

  console.log("");
  console.log("Mencari video player...");

  for (const frame of page.frames()) {
    try {
      const videos = frame.locator("video");
      const count = await videos.count();

      if (count > 0) {
        console.log(
          `Frame memiliki ${count} video.`
        );

        for (let i = 0; i < count; i++) {
          try {
            await videos
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

    console.log("");
    console.log("Player diklik.");
  } catch {}

  // ===================================================
  // TUNGGU STREAM 240
  // ===================================================

  console.log("");
  console.log("=================================");
  console.log("MENUNGGU M3U8 DAILYMOTION");
  console.log("=================================");

  for (let i = 0; i < 60 && !originalUrl; i++) {
    await page.waitForTimeout(2000);

    if (i % 5 === 0) {
      console.log(
        `Menunggu... ${i * 2}s`
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
// CEK URL DASAR
// =====================================================

if (!originalUrl) {
  console.error("");
  console.error("=================================");
  console.error("HASIL DETEKSI TRANS7");
  console.error("=================================");
  console.error("");
  console.error(
    "GAGAL: URL M3U8 Dailymotion tidak ditemukan."
  );

  await browser.close();
  process.exit(1);
}

console.log("");
console.log("=================================");
console.log("URL DASAR DITEMUKAN");
console.log("=================================");
console.log(originalUrl);

// =====================================================
// BUAT URL 720P
// =====================================================

const url720 = changeResolution(
  originalUrl,
  TARGET_RESOLUTION
);

console.log("");
console.log("=================================");
console.log("MENCOBA RESOLUSI 720P");
console.log("=================================");
console.log(url720);

// =====================================================
// CEK URL 720P
// =====================================================

let resolution720Works = false;

try {
  console.log("");
  console.log("Mengecek apakah URL 720P tersedia...");

  const response720 = await context.request.get(
    url720,
    {
      timeout: 30000,
      headers: {
        "Referer": "https://sevenhub.id/",
        "Origin": "https://sevenhub.id",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/151.0.0.0 Safari/537.36"
      }
    }
  );

  console.log(
    "STATUS 720P:",
    response720.status()
  );

  if (response720.status() === 200) {
    resolution720Works = true;

    console.log("");
    console.log("=================================");
    console.log("720P TERSEDIA!");
    console.log("=================================");
    console.log(url720);
  } else {
    console.log("");
    console.log(
      `720P tidak tersedia. HTTP ${response720.status()}`
    );
  }

  await response720.dispose();

} catch (error) {
  console.log("");
  console.log("Gagal mengecek 720P:");
  console.log(error.message);
}

// =====================================================
// PILIH URL
// =====================================================

if (resolution720Works) {
  selectedUrl = url720;

  console.log("");
  console.log("RESOLUSI 720P DIPILIH.");
} else {
  selectedUrl = changeResolution(
    originalUrl,
    FALLBACK_RESOLUTION
  );

  console.log("");
  console.log(
    "720P gagal diverifikasi."
  );

  console.log(
    "Menggunakan fallback 240P."
  );
}

// =====================================================
// TUTUP BROWSER
// =====================================================

await browser.close();

// =====================================================
// HASIL AKHIR
// =====================================================

console.log("");
console.log("=================================");
console.log("HASIL DETEKSI TRANS7");
console.log("=================================");
console.log("");
console.log("URL DASAR:");
console.log(originalUrl);
console.log("");
console.log("URL TERPILIH:");
console.log(selectedUrl);

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
  /(#EXTINF:-1,Trans7\s*\n)(?:#EXTVLCOPT:[^\r\n]*\r?\n)*([^\r\n]*)/i;

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
  `$1${selectedUrl}`
);

// =====================================================
// SIMPAN PLAYLIST
// =====================================================

fs.writeFileSync(
  PLAYLIST,
  playlist,
  "utf8"
);

// =====================================================
// SELESAI
// =====================================================

console.log("");
console.log("=================================");
console.log("PLAYLIST BERHASIL DIPERBARUI");
console.log("=================================");
console.log("");
console.log("File:");
console.log(PLAYLIST);
console.log("");
console.log("Trans7:");
console.log(selectedUrl);
console.log("");

if (resolution720Works) {
  console.log("Resolusi: 720P");
} else {
  console.log("Resolusi: 240P (fallback)");
}
