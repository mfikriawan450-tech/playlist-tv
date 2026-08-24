import { chromium } from "playwright";
import fs from "fs";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding"
  ]
});

const page = await browser.newPage();

let streamUrl = null;

page.on("request", (request) => {
  const url = request.url();

  if (url.includes(".m3u8")) {
    console.log("M3U8 REQUEST:", url);
  }

  if (
    url.includes("/dm/3/x8qckyq/d/") &&
    url.includes(".m3u8")
  ) {
    streamUrl = url;

    console.log("=================================");
    console.log("STREAM TRANS7 DITEMUKAN");
    console.log(streamUrl);
    console.log("=================================");
  }
});

console.log("Membuka Dailymotion Player Trans7...");

await page.goto(
  "https://geo.dailymotion.com/player/x15a7g.html?video=x8qckyq",
  {
    waitUntil: "domcontentloaded",
    timeout: 60000
  }
);

console.log("Player terbuka.");

await page.waitForTimeout(5000);

// Coba memicu playback
await page.mouse.click(640, 360).catch(() => {});

await page.evaluate(() => {
  document.querySelectorAll("video").forEach((video) => {
    video.muted = true;
    video.play().catch(() => {});
  });
}).catch(() => {});

console.log("Menunggu stream HLS...");

for (let i = 0; i < 180 && !streamUrl; i++) {
  await page.waitForTimeout(1000);

  if (i % 10 === 0) {
    console.log(`Menunggu... ${i} detik`);
  }
}

if (!streamUrl) {
  console.error("GAGAL: Stream HLS Trans7 tidak ditemukan.");
  await browser.close();
  process.exit(1);
}

const playlist = `#EXTM3U
#EXTINF:-1,Trans7
${streamUrl}
`;

fs.mkdirSync("playlist", {
  recursive: true
});

fs.writeFileSync(
  "playlist/trans7.m3u",
  playlist
);

await browser.close();

console.log("=================================");
console.log("PLAYLIST TRANS7 BERHASIL DIPERBARUI");
console.log("=================================");
