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

let trans7Url = null;
let lastUrl = null;

// =====================================================
// DETEKSI REQUEST
// =====================================================

page.on("request", request => {
  const url = request.url();

  if (
    url.includes("video.detik.com/trans7-sec/") &&
    url.includes("playlist.m3u8")
  ) {
    lastUrl = url;

    console.log("");
    console.log("TRANS7 MASTER DITEMUKAN:");
    console.log(url);
  }
});

// =====================================================
// DETEKSI RESPONSE
// =====================================================

page.on("response", response => {
  const url = response.url();

  if (
    url.includes("video.detik.com/trans7-sec/") &&
    url.includes("playlist.m3u8")
  ) {
    console.log("");
    console.log("TRANS7 MASTER RESPONSE:");
    console.log("STATUS:", response.status());
    console.log(url);

    if (response.status() === 200) {
      trans7Url = url;

      console.log("");
      console.log("=================================");
      console.log("TRANS7 MASTER 200 DITEMUKAN");
      console.log("=================================");
    }
  }
});

// =====================================================
// BUKA TRANS7
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
// PLAY VIDEO
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

  await page.mouse.click(
    640,
    360
  );

  console.log(
    "Player diklik."
  );

} catch {}

// =====================================================
// TUNGGU MASTER 200
// =====================================================

console.log("");
console.log(
  "Menunggu URL HLS Trans7..."
);

for (
  let i = 0;
  i < 45 && !trans7Url;
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
// JIKA RESPONSE 200 TIDAK TERTANGKAP,
// PAKAI REQUEST TERBARU
// =====================================================

if (!trans7Url && lastUrl) {

  console.log("");
  console.log(
    "Response 200 tidak tertangkap."
  );

  console.log(
    "Menggunakan URL master terbaru."
  );

  trans7Url = lastUrl;
}

// =====================================================
// TUTUP BROWSER
// =====================================================

await browser.close();

// =====================================================
// HASIL
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
// BLOK TRANS7
// =====================================================

const trans7Regex =
  /#EXTINF:-1,Trans7\s*\n(?:#EXTVLCOPT:[^\r\n]*\r?\n)*(https?:\/\/[^\r\n]*)/i;

if (!trans7Regex.test(playlist)) {

  console.error("");
  console.error(
    "Blok Trans7 tidak ditemukan di os4.m3u"
  );

  process.exit(1);
}

// =====================================================
// BLOK BARU TRANS7
// =====================================================

const trans7Block =
  `#EXTINF:-1,Trans7\n` +
  `#EXTVLCOPT:http-referrer=https://20.detik.com/\n` +
  `#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36\n` +
  `${trans7Url}`;

// =====================================================
// UPDATE
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
console.log("Trans7:");
console.log(trans7Url);
