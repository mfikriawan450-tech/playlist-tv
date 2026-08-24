import { chromium } from "playwright";
import fs from "fs";

const PAGE_URL = "https://20.detik.com/live/trans-7";
const PLAYLIST = "os4.m3u";

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
    "Chrome/151.0.0.0 Safari/537.36"
});

const page = await context.newPage();

let trans7Url = null;

page.on("request", request => {
  const url = request.url();

  if (
    url.includes("video.detik.com/trans7-sec/") &&
    url.includes("playlist.m3u8")
  ) {
    console.log("TRANS7 HLS DITEMUKAN:");
    console.log(url);

    trans7Url = url;
  }
});

try {
  console.log("Membuka Live Trans7 20Detik...");

  await page.goto(PAGE_URL, {
    waitUntil: "commit",
    timeout: 30000
  });

  console.log("Halaman terbuka.");

  // Beri waktu iframe/player dimuat
  await page.waitForTimeout(8000);

  // Cari semua frame/player
  for (const frame of page.frames()) {
    try {
      const videos = await frame.locator("video").count();

      if (videos > 0) {
        console.log(
          `Frame ${frame.url()} memiliki ${videos} video.`
        );

        for (let i = 0; i < videos; i++) {
          try {
            await frame.locator("video").nth(i).evaluate(video => {
              video.muted = true;
              video.play().catch(() => {});
            });
          } catch {}
        }
      }
    } catch {}
  }

  // Klik video jika memungkinkan
  try {
    await page.mouse.click(640, 360);
  } catch {}

  // Tunggu request HLS
  for (let i = 0; i < 30 && !trans7Url; i++) {
    console.log(`Menunggu HLS... ${i * 2}s`);
    await page.waitForTimeout(2000);
  }

} catch (error) {
  console.error("Gagal membuka halaman:");
  console.error(error.message);

  await browser.close();
  process.exit(1);
}

await browser.close();

if (!trans7Url) {
  console.error("GAGAL: URL HLS Trans7 tidak ditemukan.");
  process.exit(1);
}

console.log("");
console.log("=================================");
console.log("TRANS7 HLS BERHASIL DITEMUKAN");
console.log("=================================");
console.log(trans7Url);

// ========================================
// UPDATE os4.m3u
// ========================================

if (!fs.existsSync(PLAYLIST)) {
  console.error(`File tidak ditemukan: ${PLAYLIST}`);
  process.exit(1);
}

let playlist = fs.readFileSync(PLAYLIST, "utf8");

// Cari blok Trans7
const trans7Regex =
  /(#EXTINF:-1,Trans7\s*\n)([^\n]*)/i;

if (!trans7Regex.test(playlist)) {
  console.error("Blok Trans7 tidak ditemukan di os4.m3u");
  process.exit(1);
}

// Ganti hanya URL setelah EXTINF Trans7
playlist = playlist.replace(
  trans7Regex,
  `$1${trans7Url}`
);

fs.writeFileSync(PLAYLIST, playlist);

console.log("");
console.log("=================================");
console.log("PLAYLIST BERHASIL DIPERBARUI");
console.log("=================================");
console.log("");
console.log("Trans7:");
console.log(trans7Url);
