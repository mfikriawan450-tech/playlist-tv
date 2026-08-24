import { chromium } from "playwright";
import fs from "fs";

const playlistPath = "os4.m3u";

const browser = await chromium.launch({
  headless: true
});

const page = await browser.newPage();

let trans7Url = null;

console.log("Membuka Dailymotion...");

page.on("response", async (response) => {
  const url = response.url();

  // Kita hanya mencari manifest HLS yang sudah memiliki parameter sec
  if (
    url.includes("x8qckyq.m3u8?sec=") &&
    response.status() === 200
  ) {
    console.log("MANIFEST HLS TRANS7 DITEMUKAN:");
    console.log(url);

    try {
      const body = await response.text();

      const matches = body.match(
        /https:\/\/[^"\s]+\/live-480\.m3u8#[^\s"]+/
      );

      if (matches && !trans7Url) {
        trans7Url = matches[0];

        console.log("TRANS7 STREAM DITEMUKAN:");
        console.log(trans7Url);
      }
    } catch (error) {
      console.log(
        "Gagal membaca response manifest:",
        error.message
      );
    }
  }
});

try {
  await page.goto(
    "https://geo.dailymotion.com/player/x15a7g.html?video=x8qckyq",
    {
      waitUntil: "domcontentloaded",
      timeout: 60000
    }
  );

  console.log("Player terbuka.");
} catch (error) {
  console.log("Gagal membuka player:", error.message);
}

// Beri waktu untuk Dailymotion membuat request HLS
for (let i = 0; i < 60 && !trans7Url; i++) {
  await page.waitForTimeout(1000);

  if (i % 5 === 0) {
    console.log(`Menunggu stream... ${i}s`);
  }
}

await browser.close();

if (!trans7Url) {
  console.error("GAGAL: Stream Trans7 tidak ditemukan.");
  process.exit(1);
}

console.log("=================================");
console.log("TRANS7 STREAM BERHASIL DITEMUKAN");
console.log("=================================");
console.log(trans7Url);

// Baca playlist utama
if (!fs.existsSync(playlistPath)) {
  console.error(`File tidak ditemukan: ${playlistPath}`);
  process.exit(1);
}

let playlist = fs.readFileSync(
  playlistPath,
  "utf8"
);

// Cari blok Trans7
const trans7Regex =
  /(#EXTINF:-1,Trans7\r?\n)(https?:\/\/[^\r\n]+)/;

if (!trans7Regex.test(playlist)) {
  console.error("Blok Trans7 tidak ditemukan di os4.m3u");
  process.exit(1);
}

// Ganti URL Trans7 saja
playlist = playlist.replace(
  trans7Regex,
  `$1${trans7Url}`
);

fs.writeFileSync(
  playlistPath,
  playlist,
  "utf8"
);

console.log("=================================");
console.log("os4.m3u BERHASIL DIPERBARUI");
console.log("=================================");
console.log("Trans7 URL berhasil diganti.");
