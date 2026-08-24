import { chromium } from "playwright";
import fs from "fs";

const PAGE_URL = "https://sevenhub.id/live";
const PLAYLIST = "os4.m3u";

// =====================================================
// KONFIGURASI
// =====================================================

const TARGET_VIDEO_ID = "x8qckyq";

// Prioritas resolusi
const RESOLUTION_PRIORITY = [
  720,
  1080,
  576,
  480,
  360,
  240
];

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
// PENYIMPAN REQUEST M3U8
// =====================================================

const streams = new Map();

let selectedUrl = null;

// =====================================================
// FUNGSI IDENTIFIKASI RESOLUSI
// =====================================================

function getResolution(url) {
  const match = url.match(
    /(?:live-|[_-])(\d{3,4})(?:p)?\.m3u8/i
  );

  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
}

// =====================================================
// CEK APAKAH URL ADALAH TARGET DAILYMOTION
// =====================================================

function isTargetStream(url) {
  return (
    url.includes("dmcdn.net") &&
    url.includes(".m3u8") &&
    url.includes(TARGET_VIDEO_ID)
  );
}

// =====================================================
// SIMPAN STREAM
// =====================================================

function registerStream(url) {
  if (!isTargetStream(url)) {
    return;
  }

  const resolution = getResolution(url);

  const key = resolution
    ? String(resolution)
    : "unknown";

  streams.set(key, {
    url,
    resolution
  });

  console.log("");
  console.log("M3U8 DAILYMOTION DITEMUKAN");
  console.log("---------------------------------");
  console.log("Resolusi :", resolution ?? "unknown");
  console.log("URL      :", url);

  if (resolution === 720) {
    console.log("");
    console.log(">>> TARGET 720P DITEMUKAN! <<<");
    console.log("");
  }
}

// =====================================================
// REQUEST
// =====================================================

page.on("request", request => {
  registerStream(request.url());
});

// =====================================================
// RESPONSE
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

  if (status === 200) {
    registerStream(url);

    if (getResolution(url) === 720) {
      console.log("");
      console.log("TARGET 720P RESPONSE 200!");
    }
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
  // CARI VIDEO
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
  // TUNGGU REQUEST
  // ===================================================

  console.log("");
  console.log("=================================");
  console.log("MENUNGGU STREAM DAILYMOTION");
  console.log("=================================");

  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(2000);

    // Kalau 720 sudah ditemukan,
    // kita tidak perlu menunggu terlalu lama.
    if (streams.has("720")) {
      console.log("");
      console.log("720P sudah ditemukan.");
      break;
    }

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
// TUTUP BROWSER
// =====================================================

await browser.close();

// =====================================================
// HASIL STREAM
// =====================================================

console.log("");
console.log("=================================");
console.log("HASIL DETEKSI TRANS7");
console.log("=================================");

if (streams.size === 0) {
  console.error("");
  console.error(
    "GAGAL: Tidak ada stream Dailymotion ditemukan."
  );

  process.exit(1);
}

// =====================================================
// TAMPILKAN SEMUA STREAM
// =====================================================

console.log("");
console.log("STREAM YANG TERDETEKSI:");

for (const stream of streams.values()) {
  console.log(
    `${stream.resolution ?? "unknown"}p : ${stream.url}`
  );
}

// =====================================================
// PILIH RESOLUSI
// =====================================================

// 1. Cari 720p terlebih dahulu
for (const resolution of RESOLUTION_PRIORITY) {
  const stream = streams.get(String(resolution));

  if (stream) {
    selectedUrl = stream.url;

    console.log("");
    console.log(
      `RESOLUSI ${resolution}P DIPILIH.`
    );

    break;
  }
}

// =====================================================
// FALLBACK
// =====================================================

if (!selectedUrl) {
  const validStreams = [...streams.values()]
    .filter(stream => stream.resolution)
    .sort(
      (a, b) =>
        b.resolution - a.resolution
    );

  if (validStreams.length > 0) {
    selectedUrl = validStreams[0].url;

    console.log("");
    console.log(
      `720P tidak ditemukan. ` +
      `Menggunakan ${validStreams[0].resolution}P.`
    );
  }
}

// =====================================================
// JIKA RESOLUSI TIDAK TERBACA
// =====================================================

if (!selectedUrl) {
  selectedUrl = [...streams.values()][0].url;

  console.log("");
  console.log(
    "Resolusi tidak dapat dibaca."
  );

  console.log(
    "Menggunakan stream Dailymotion yang ditemukan."
  );
}

// =====================================================
// HASIL AKHIR
// =====================================================

console.log("");
console.log("=================================");
console.log("STREAM TRANS7 TERPILIH");
console.log("=================================");
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
// UPDATE URL
// =====================================================

playlist = playlist.replace(
  trans7Regex,
  `$1${selectedUrl}`
);

// =====================================================
// SIMPAN
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
