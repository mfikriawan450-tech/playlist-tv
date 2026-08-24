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

let streamUrl = null;

console.log("Membuka Live Streaming Trans7 20Detik...");

page.on("request", (request) => {
  const url = request.url();

  if (
    url.includes("video.detik.com/trans7-sec/") &&
    url.includes(".m3u8")
  ) {
    streamUrl = url;

    console.log("");
    console.log("=================================");
    console.log("TRANS7 HLS DITEMUKAN");
    console.log("=================================");
    console.log(streamUrl);
  }
});

try {
  await page.goto(
    "https://20.detik.com/live/trans-7",
    {
      waitUntil: "domcontentloaded",
      timeout: 60000
    }
  );

  console.log("Halaman Trans7 terbuka.");
} catch (error) {
  console.error(
    "Gagal membuka halaman:",
    error.message
  );

  await browser.close();
  process.exit(1);
}

for (let i = 0; i < 60 && !streamUrl; i++) {
  await page.waitForTimeout(1000);

  if (i % 5 === 0) {
    console.log(`Menunggu HLS... ${i}s`);
  }
}

await browser.close();

console.log("");
console.log("=================================");
console.log("HASIL");
console.log("=================================");

if (!streamUrl) {
  console.error(
    "GAGAL: URL HLS Trans7 tidak ditemukan."
  );

  process.exit(1);
}

console.log("URL Trans7:");
console.log(streamUrl);
console.log("");
console.log("TRANS7 BERHASIL DIDETEKSI");
