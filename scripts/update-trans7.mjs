import { chromium } from "playwright";
import fs from "fs";

const PAGE_URL = "https://20.detik.com/live/trans-7";
const PLAYLIST = "os4.m3u";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-blink-features=AutomationControlled"
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
// DETEKSI REQUEST DAILYMOTION
// =====================================================

page.on("request", request => {
  const url = request.url();

  if (
    url.includes("cf.dmcdn.net") &&
    url.includes(".m3u8")
  ) {
    console.log("");
    console.log("=================================");
    console.log("DAILYMOTION HLS REQUEST");
    console.log("=================================");
    console.log(url);

    // Prioritas utama:
    // live-240.m3u8 dari video Trans7 x8qckyq

    if (
      url.includes("x8qckyq") &&
      url.includes("live-240.m3u8")
    ) {
      trans7Url = url;

      console.log("");
      console.log("TARGET TRANS7 DITEMUKAN!");
      console.log(trans7Url);
    }

    // Fallback apabila struktur URL berubah
    else if (
      url.includes("live-240.m3u8") &&
      !trans7Url
    ) {
      trans7Url = url;

      console.log("");
      console.log("STREAM 240P DITEMUKAN:");
      console.log(trans7Url);
    }
  }
});

// =====================================================
// DETEKSI RESPONSE DAILYMOTION
// =====================================================

page.on("response", response => {
  const url = response.url();

  if (
    url.includes("cf.dmcdn.net") &&
    url.includes(".m3u8")
  ) {
    console.log("");
    console.log("DAILYMOTION HLS RESPONSE");
    console.log("STATUS:", response.status());
    console.log(url);

    if (
      response.status() === 200 &&
      url.includes("x8qckyq") &&
      url.includes("live-240.m3u8")
    ) {
      trans7Url = url;

      console.log("");
      console.log("TARGET TRANS7 RESPONSE 200!");
    }
  }
});

// =====================================================
// REQUEST ERROR
// =====================================================

page.on("requestfailed", request => {
  const url = request.url();

  if (
    url.includes("cf.dmcdn.net")
  ) {
    console.log("");
    console.log("DAILYMOTION REQUEST FAILED");
    console.log(url);
    console.log(
      request.failure()?.errorText
    );
  }
});

// =====================================================
// BUKA HALAMAN
// =====================================================

console.log("");
console.log("=================================");
console.log("MEMBUKA TRANS7");
console.log("=================================");
console.log(PAGE_URL);

try {

  await page.goto(PAGE_URL, {
    waitUntil: "commit",
    timeout: 30000
  });

  console.log(
    "Halaman awal berhasil dibuka."
  );

} catch (error) {

  console.log("");
  console.log(
    "Navigasi mengalami masalah:"
  );

  console.log(
    error.message
  );

  console.log("");
  console.log(
    "Tetap memantau Dailymotion..."
  );
}

// =====================================================
// TUNGGU PLAYER
// =====================================================

await page.waitForTimeout(10000);

// =====================================================
// TAMPILKAN FRAME
// =====================================================

console.log("");
console.log("=================================");
console.log("FRAME");
console.log("=================================");

for (const frame of page.frames()) {
  console.log(frame.url());
}

// =====================================================
// PLAY SEMUA VIDEO
// =====================================================

console.log("");
console.log(
  "Mencari video player..."
);

for (const frame of page.frames()) {

  try {

    const videos =
      frame.locator("video");

    const count =
      await videos.count();

    if (count > 0) {

      console.log(
        `Frame memiliki ${count} video.`
      );

      for (
        let i = 0;
        i < count;
        i++
      ) {

        try {

          await videos
            .nth(i)
            .evaluate(video => {

              video.muted = true;

              const promise =
                video.play();

              if (
                promise &&
                typeof promise.catch ===
                  "function"
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
// TUNGGU DAILYMOTION HLS
// =====================================================

console.log("");
console.log(
  "Menunggu Dailymotion HLS..."
);

for (
  let i = 0;
  i < 60 &&
  !trans7Url;
  i++
) {

  await page.waitForTimeout(
    2000
  );

  if (i % 5 === 0) {

    console.log(
      `Menunggu HLS... ${i * 2}s`
    );

  }
}

// =====================================================
// HASIL
// =====================================================

console.log("");
console.log("=================================");
console.log("HASIL DETEKSI");
console.log("=================================");

if (!trans7Url) {

  console.error(
    "GAGAL: URL Dailymotion Trans7 tidak ditemukan."
  );

  await browser.close();

  process.exit(1);
}

console.log("");
console.log("URL TRANS7:");
console.log(trans7Url);

// =====================================================
// TUTUP BROWSER
// =====================================================

await browser.close();

// =====================================================
// CEK PLAYLIST
// =====================================================

if (
  !fs.existsSync(PLAYLIST)
) {

  console.error("");
  console.error(
    `File tidak ditemukan: ${PLAYLIST}`
  );

  process.exit(1);
}

let playlist =
  fs.readFileSync(
    PLAYLIST,
    "utf8"
  );

// =====================================================
// CARI BLOK TRANS7
// =====================================================

const trans7Regex =
  /(#EXTINF:-1,Trans7\s*\n)(?:#EXTVLCOPT:[^\r\n]*\r?\n)*(https?:\/\/[^\r\n]*)/i;

if (
  !trans7Regex.test(playlist)
) {

  console.error("");
  console.error(
    "Blok Trans7 tidak ditemukan di os4.m3u"
  );

  process.exit(1);
}

// =====================================================
// UPDATE URL SAJA
// =====================================================

playlist =
  playlist.replace(
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
console.log("Trans7:");
console.log(trans7Url);
