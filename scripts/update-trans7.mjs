import { chromium } from "playwright";
import fs from "fs";

const PAGE_URL = "https://sevenhub.id/live";
const PLAYLIST_FILE = "os4.m3u";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/151.0.0.0 Safari/537.36";

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
  userAgent: USER_AGENT,
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
// TUNGGU PLAYER
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
  console.error("M3U8 TRANS7 TIDAK DITEMUKAN.");
  process.exit(1);
}

console.log("");
console.log("URL ASLI BARU:");
console.log(originalUrl);

// ==========================================
// NORMALISASI UNTUK COMPARISON
//
// live-240 / live-480 / live-720
// dianggap resolusi yang sama untuk
// keperluan membandingkan identitas stream.
// ==========================================

function normalizeForCompare(url) {
  if (!url) {
    return null;
  }

  return url
    .replace("/live-240.m3u8", "/live-RESOLUTION.m3u8")
    .replace("/live-480.m3u8", "/live-RESOLUTION.m3u8")
    .replace("/live-720.m3u8", "/live-RESOLUTION.m3u8");
}

// ==========================================
// AMBIL URL TRANS7 LAMA DARI os4.m3u
// ==========================================

if (!fs.existsSync(PLAYLIST_FILE)) {
  console.error(`${PLAYLIST_FILE} tidak ditemukan.`);
  process.exit(1);
}

let playlist = fs.readFileSync(
  PLAYLIST_FILE,
  "utf8"
);

const blockRegex =
  /(#EXTINF:-1,Trans7\r?\n)(https?:\/\/[^\r\n]+)/;

const match = playlist.match(blockRegex);

if (!match) {
  console.error(
    "Blok Trans7 tidak ditemukan di os4.m3u."
  );

  process.exit(1);
}

const storedUrl = match[2].trim();

console.log("");
console.log("=================================");
console.log("URL TRANS7 LAMA");
console.log("=================================");
console.log(storedUrl);

// ==========================================
// COMPARE URL ASLI
// ==========================================

const oldCompareUrl =
  normalizeForCompare(storedUrl);

const newCompareUrl =
  normalizeForCompare(originalUrl);

console.log("");
console.log("=================================");
console.log("HASIL COMPARISON");
console.log("=================================");

console.log("URL LAMA:");
console.log(oldCompareUrl);

console.log("");
console.log("URL ASLI BARU:");
console.log(newCompareUrl);

if (oldCompareUrl === newCompareUrl) {
  console.log("");
  console.log("STATUS: URL ASLI TIDAK BERUBAH");
  console.log("TIDAK ADA UPDATE TRANS7.");
  console.log("");

  process.exit(0);
}

console.log("");
console.log("STATUS: URL ASLI BERUBAH");
console.log("TRANS7 AKAN DIPERBARUI.");

// ==========================================
// DEFAULT:
// GUNAKAN URL ASLI
// ==========================================

let finalUrl = originalUrl;

// ==========================================
// COBA 480P
// ==========================================

if (
  originalUrl.includes("live-240.m3u8") ||
  originalUrl.includes("live-720.m3u8") ||
  originalUrl.includes("live-480.m3u8")
) {
  const url480 = originalUrl
    .replace(
      "/live-240.m3u8",
      "/live-480.m3u8"
    )
    .replace(
      "/live-720.m3u8",
      "/live-480.m3u8"
    )
    .replace(
      "/live-480.m3u8",
      "/live-480.m3u8"
    );

  console.log("");
  console.log("=================================");
  console.log("MENCOBA STREAM 480P");
  console.log("=================================");
  console.log(url480);

  try {
    const response480 = await fetch(url480, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": "https://sevenhub.id/"
      },
      redirect: "follow"
    });

    console.log("");
    console.log("STATUS 480P:", response480.status);

    if (response480.status === 200) {
      finalUrl = url480;

      console.log("");
      console.log("=================================");
      console.log("480P TERSEDIA!");
      console.log("=================================");
      console.log("URL 480P AKAN DIGUNAKAN.");
    } else {
      console.log("");
      console.log("=================================");
      console.log("480P TIDAK TERSEDIA");
      console.log("=================================");
      console.log("Kembali menggunakan URL asli.");
    }

  } catch (error) {

    console.log("");
    console.log("GAGAL TEST 480P:");
    console.log(error.message);

    console.log("");
    console.log("Menggunakan URL asli.");
  }

} else {

  console.log("");
  console.log(
    "URL tidak menggunakan pola live-240/480/720.m3u8."
  );

  console.log("URL asli akan digunakan.");
}

// ==========================================
// UPDATE LANGSUNG os4.m3u
// ==========================================

playlist = playlist.replace(
  blockRegex,
  `$1${finalUrl}`
);

fs.writeFileSync(
  PLAYLIST_FILE,
  playlist,
  "utf8"
);

// ==========================================
// SELESAI
// ==========================================

console.log("");
console.log("=================================");
console.log("TRANS7 BERHASIL DIPERBARUI");
console.log("=================================");

console.log("");
console.log("URL ASLI:");
console.log(originalUrl);

console.log("");
console.log("URL YANG DISIMPAN:");
console.log(finalUrl);

console.log("");
console.log("FILE:");
console.log(PLAYLIST_FILE);

console.log("");
console.log("=================================");
