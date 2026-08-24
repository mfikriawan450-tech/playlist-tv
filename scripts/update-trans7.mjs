import { chromium } from "playwright";
import fs from "fs";

const PAGE_URL = "https://20.detik.com/live/trans-7";
const PLAYLIST = "playlist/os4.m3u";

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

let trans7Url = null;

// =====================================================
// DETEKSI REQUEST HLS TRANS7
// =====================================================

page.on("request", request => {
  const url = request.url();

  if (
    url.includes("video.detik.com/trans7-sec/") &&
    url.includes(".m3u8")
  ) {
    console.log("");
    console.log("=================================");
    console.log("TRANS7 HLS REQUEST DITEMUKAN");
    console.log("=================================");
    console.log(url);

    // Prioritaskan playlist/master, bukan chunklist
    if (
      url.includes("playlist.m3u8")
    ) {
      trans7Url = url;
    } else if (!trans7Url) {
      trans7Url = url;
    }
  }
});

// =====================================================
// DETEKSI RESPONSE HLS
// =====================================================

page.on("response", response => {
  const url = response.url();

  if (
    url.includes("video.detik.com/trans7-sec/") &&
    url.includes(".m3u8")
  ) {
    console.log("");
    console.log("TRANS7 HLS RESPONSE:");
    console.log("STATUS:", response.status());
    console.log(url);

    if (
      response.status() === 200 &&
      url.includes("playlist.m3u8")
    ) {
      trans7Url = url;
    } else if (
      response.status() === 200 &&
      !trans7Url
    ) {
      trans7Url = url;
    }
  }
});

// =====================================================
// BUKA HALAMAN TRANS7
// =====================================================

try {
  console.log("Membuka Live Trans7 20Detik...");

  try {
    await page.goto(PAGE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 90000
    });

    console.log("Halaman Trans7 terbuka.");
  } catch (error) {
    console.log("");
    console.log(
      "Navigasi timeout, tetapi proses tetap dilanjutkan..."
    );
    console.log(error.message);
  }

  // Beri waktu halaman/player mulai dibuat
  await page.waitForTimeout(10000);

  console.log("");
  console.log("=================================");
  console.log("MEMERIKSA FRAME");
  console.log("=================================");

  for (const frame of page.frames()) {
    console.log("FRAME:", frame.url());
  }

  // ===================================================
  // JALANKAN VIDEO DI SEMUA FRAME
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
  // COBA KLIK AREA PLAYER
  // ===================================================

  try {
    await page.mouse.click(640, 360);
    console.log("Player diklik.");
  } catch {}

  // ===================================================
  // TUNGGU HLS
  // ===================================================

  console.log("");
  console.log("Menunggu HLS Trans7...");

  for (
    let i = 0;
    i < 60 && !trans7Url;
    i++
  ) {
    await page.waitForTimeout(2000);

    if (i % 5 === 0) {
      console.log(
        `Menunggu HLS... ${i * 2}s`
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
// CEK HASIL
// =====================================================

console.log("");
console.log("=================================");
console.log("HASIL DETEKSI TRANS7");
console.log("=================================");

if (!trans7Url) {
  console.error(
    "GAGAL: URL HLS Trans7 tidak ditemukan."
  );

  process.exit(1);
}

console.log("URL HLS Trans7:");
console.log(trans7Url);

// =====================================================
// CEK FILE PLAYLIST
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
// SIMPAN
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
