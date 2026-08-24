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
// DETEKSI REQUEST MASTER
// =====================================================

page.on("request", request => {
  const url = request.url();

  if (
    url.includes("video.detik.com/trans7-sec/") &&
    url.includes("playlist.m3u8")
  ) {
    lastUrl = url;

    console.log("");
    console.log("=================================");
    console.log("TRANS7 MASTER REQUEST");
    console.log("=================================");
    console.log(url);
  }
});

// =====================================================
// DETEKSI RESPONSE MASTER
// =====================================================

page.on("response", response => {
  const url = response.url();

  if (
    url.includes("video.detik.com/trans7-sec/") &&
    url.includes("playlist.m3u8")
  ) {
    console.log("");
    console.log("TRANS7 MASTER RESPONSE");
    console.log("STATUS:", response.status());
    console.log(url);

    if (response.status() === 200) {
      trans7Url = url;

      console.log("");
      console.log("TRANS7 MASTER 200 DITEMUKAN");
    }
  }
});

// =====================================================
// MONITOR ERROR REQUEST
// =====================================================

page.on("requestfailed", request => {
  const url = request.url();

  if (
    url.includes("video.detik.com/trans7-sec/")
  ) {
    console.log("");
    console.log("TRANS7 REQUEST FAILED");
    console.log("URL:", url);
    console.log(
      "ERROR:",
      request.failure()?.errorText
    );
  }
});

// =====================================================
// BUKA HALAMAN
// =====================================================

console.log(
  "Membuka Live Trans7 20Detik..."
);

try {

  await page.goto(PAGE_URL, {
    waitUntil: "commit",
    timeout: 30000
  });

  console.log(
    "Navigasi awal berhasil."
  );

} catch (error) {

  console.log("");
  console.log(
    "Navigasi mengalami timeout."
  );

  console.log(
    error.message
  );

  console.log("");
  console.log(
    "Request HLS tetap dipantau..."
  );
}

// =====================================================
// TUNGGU PLAYER
// =====================================================

await page.waitForTimeout(10000);

// =====================================================
// PLAY VIDEO DI SEMUA FRAME
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

              const p =
                video.play();

              if (
                p &&
                typeof p.catch ===
                  "function"
              ) {
                p.catch(() => {});
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
// TUNGGU HLS
// =====================================================

console.log("");
console.log(
  "Menunggu HLS Trans7..."
);

for (
  let i = 0;
  i < 45 &&
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
// FALLBACK URL TERAKHIR
// =====================================================

if (
  !trans7Url &&
  lastUrl
) {

  console.log("");
  console.log(
    "Tidak mendapatkan response 200."
  );

  console.log(
    "Menggunakan request master terakhir."
  );

  trans7Url =
    lastUrl;
}

// =====================================================
// TUTUP BROWSER
// =====================================================

await browser.close();

// =====================================================
// HASIL
// =====================================================

console.log("");
console.log(
  "================================="
);

console.log(
  "HASIL DETEKSI TRANS7"
);

console.log(
  "================================="
);

if (!trans7Url) {

  console.error(
    "GAGAL: URL HLS Trans7 tidak ditemukan."
  );

  process.exit(1);
}

console.log("");
console.log(
  "URL HLS TRANS7:"
);

console.log(
  trans7Url
);

// =====================================================
// CEK PLAYLIST
// =====================================================

if (
  !fs.existsSync(
    PLAYLIST
  )
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
// BLOK TRANS7
// =====================================================

const trans7Regex =
  /(#EXTINF:-1,Trans7\s*\n)(?:#EXTVLCOPT:[^\r\n]*\r?\n)*(https?:\/\/[^\r\n]*)/i;

if (
  !trans7Regex.test(
    playlist
  )
) {

  console.error("");
  console.error(
    "Blok Trans7 tidak ditemukan di os4.m3u"
  );

  process.exit(1);
}

// =====================================================
// BLOK TRANS7 BARU
// =====================================================

const trans7Block =
  `#EXTINF:-1,Trans7\n` +
  `#EXTVLCOPT:http-referrer=https://20.detik.com/\n` +
  `#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36\n` +
  `${trans7Url}`;

// =====================================================
// UPDATE
// =====================================================

playlist =
  playlist.replace(
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
console.log(
  "================================="
);

console.log(
  "PLAYLIST BERHASIL DIPERBARUI"
);

console.log(
  "================================="
);

console.log("");
console.log(
  "Trans7:"
);

console.log(
  trans7Url
);
