import { chromium } from "playwright";
import fs from "fs";

const PAGE_URL = "https://20.detik.com/live/trans-7";
const PLAYLIST = "os4.m3u";

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

let chunklistUrl = null;

// =====================================================
// DETEKSI REQUEST HLS
// =====================================================

page.on("request", request => {
  const url = request.url();

  if (
    url.includes("video.detik.com/trans7-sec/") &&
    url.includes(".m3u8")
  ) {
    console.log("");
    console.log("HLS REQUEST:");
    console.log(url);

    // PRIORITAS UTAMA:
    // chunklist karena request ini terbukti 200
    if (
      url.includes("chunklist") &&
      !chunklistUrl
    ) {
      chunklistUrl = url;

      console.log("");
      console.log("=================================");
      console.log("CHUNKLIST TRANS7 DITEMUKAN");
      console.log("=================================");
      console.log(chunklistUrl);
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
    console.log("HLS RESPONSE:");
    console.log("STATUS:", response.status());
    console.log(url);

    if (
      response.status() === 200 &&
      url.includes("chunklist") &&
      !chunklistUrl
    ) {
      chunklistUrl = url;

      console.log("");
      console.log("=================================");
      console.log("CHUNKLIST 200 DITEMUKAN");
      console.log("=================================");
      console.log(chunklistUrl);
    }
  }
});

// =====================================================
// BUKA HALAMAN TRANS7
// =====================================================

console.log("Membuka Live Trans7 20Detik...");

try {
  await page.goto(PAGE_URL, {
    waitUntil: "domcontentloaded",
    timeout: 90000
  });

  console.log("Halaman Trans7 terbuka.");
} catch (error) {
  console.log("");
  console.log("Navigasi mengalami masalah:");
  console.log(error.message);
  console.log("");
  console.log("Tetap menunggu request HLS...");
}

// =====================================================
// TUNGGU PLAYER
// =====================================================

await page.waitForTimeout(10000);

// =====================================================
// PLAY SEMUA VIDEO
// =====================================================

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
          await videos.nth(i).evaluate(video => {
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

// =====================================================
// KLIK PLAYER
// =====================================================

try {
  await page.mouse.click(640, 360);
  console.log("Player diklik.");
} catch {}

// =====================================================
// TUNGGU CHUNKLIST
// =====================================================

console.log("");
console.log("Menunggu CHUNKLIST Trans7...");

for (
  let i = 0;
  i < 60 && !chunklistUrl;
  i++
) {
  await page.waitForTimeout(2000);

  if (i % 5 === 0) {
    console.log(
      `Menunggu HLS... ${i * 2}s`
    );
  }
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

if (!chunklistUrl) {
  console.error(
    "GAGAL: CHUNKLIST Trans7 tidak ditemukan."
  );

  process.exit(1);
}

console.log("CHUNKLIST TRANS7:");
console.log(chunklistUrl);

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
  /(#EXTINF:-1,Trans7\s*\n)(?:#EXTVLCOPT:[^\r\n]*\r?\n)*(https?:\/\/[^\r\n]*)/i;

if (!trans7Regex.test(playlist)) {
  console.error("");
  console.error(
    "Blok Trans7 tidak ditemukan di os4.m3u"
  );

  process.exit(1);
}

// =====================================================
// HEADER TRANS7
// =====================================================

const trans7Block =
  `#EXTINF:-1,Trans7\n` +
  `#EXTVLCOPT:http-referrer=https://20.detik.com/\n` +
  `#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36\n` +
  `${chunklistUrl}`;

// =====================================================
// UPDATE TRANS7
// =====================================================

playlist = playlist.replace(
  trans7Regex,
  trans7Block
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
console.log("Trans7 CHUNKLIST:");
console.log(chunklistUrl);
