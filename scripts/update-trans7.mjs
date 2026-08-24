import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true
});

const page = await browser.newPage({
  viewport: {
    width: 1280,
    height: 720
  }
});

let manifestUrl = null;
let streamUrl = null;

console.log("Membuka Dailymotion...");

page.on("response", async (response) => {
  const url = response.url();

  // Manifest yang sudah diberi parameter SEC
  if (
    url.includes("x8qckyq.m3u8?sec=") &&
    response.status() === 200
  ) {
    console.log("");
    console.log("=================================");
    console.log("MANIFEST SEC TRANS7 DITEMUKAN");
    console.log("=================================");
    console.log(url);

    manifestUrl = url;

    try {
      const body = await response.text();

      console.log("Ukuran manifest:", body.length);

      // Ambil URL live-480
      const match = body.match(
        /https:\/\/[^"\s]+\/live-480\.m3u8(?:#[^\s"]+)?/
      );

      if (match && !streamUrl) {
        streamUrl = match[0];

        console.log("");
        console.log("=================================");
        console.log("STREAM TRANS7 DITEMUKAN");
        console.log("=================================");
        console.log(streamUrl);
      }
    } catch (error) {
      console.log(
        "Gagal membaca manifest:",
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
  console.error(
    "Gagal membuka player:",
    error.message
  );

  await browser.close();
  process.exit(1);
}

// Tunggu player selesai inisialisasi
console.log("Menunggu player...");
await page.waitForTimeout(5000);

// Cek video element
const videos = await page.locator("video").count();

console.log("Jumlah video:", videos);

// Paksa player mulai
if (videos > 0) {
  for (let i = 0; i < videos; i++) {
    try {
      const video = page.locator("video").nth(i);

      await video.evaluate((element) => {
        element.muted = true;

        const result = element.play();

        if (result && typeof result.catch === "function") {
          result.catch(() => {});
        }
      });

      console.log(`Video ${i} diperintahkan play.`);
    } catch (error) {
      console.log(
        `Video ${i} gagal play:`,
        error.message
      );
    }
  }
}

// Klik area player juga
try {
  await page.mouse.click(640, 360);
  console.log("Player diklik.");
} catch (error) {
  console.log(
    "Klik player gagal:",
    error.message
  );
}

// Beri waktu HLS.js membuat manifest SEC
for (let i = 0; i < 90 && !streamUrl; i++) {
  await page.waitForTimeout(1000);

  if (i % 5 === 0) {
    console.log(`Menunggu stream... ${i}s`);
  }
}

await browser.close();

console.log("");
console.log("=================================");
console.log("HASIL");
console.log("=================================");

if (manifestUrl) {
  console.log("Manifest SEC: DITEMUKAN");
} else {
  console.log("Manifest SEC: TIDAK DITEMUKAN");
}

if (streamUrl) {
  console.log("Stream 480p: DITEMUKAN");
  console.log(streamUrl);

  console.log("");
  console.log("TRANS7 BERHASIL DIDETEKSI");
} else {
  console.log("Stream 480p: TIDAK DITEMUKAN");

  console.error("");
  console.error(
    "GAGAL: Stream Trans7 tidak ditemukan."
  );

  process.exit(1);
}
