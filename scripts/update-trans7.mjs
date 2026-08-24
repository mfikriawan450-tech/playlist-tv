import { chromium } from "playwright";
import fs from "fs";

const browser = await chromium.launch({
  headless: true
});

const page = await browser.newPage();

let streamUrl = null;

page.on("request", (request) => {
  const url = request.url();

  if (url.includes("/live-240.m3u8")) {
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
console.log("Menunggu stream HLS...");

for (let i = 0; i < 60 && !streamUrl; i++) {
  await page.waitForTimeout(1000);
}

await browser.close();

if (!streamUrl) {
  console.error("GAGAL: Stream Trans7 tidak ditemukan.");
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

console.log("=================================");
console.log("PLAYLIST TRANS7 BERHASIL DIPERBARUI");
console.log("=================================");
