import { chromium } from "playwright";
import fs from "fs";

const browser = await chromium.launch({
  headless: true
});

const page = await browser.newPage();

let manifestUrl = null;

page.on("request", (request) => {
  const url = request.url();

  if (
    url.includes(
      "dmxleo.dailymotion.com/cdn/manifest/video/x8qckyq.m3u8"
    )
  ) {
    manifestUrl = url;

    console.log("MANIFEST DITEMUKAN:");
    console.log(manifestUrl);
  }
});

console.log("Membuka Dailymotion...");

await page.goto(
  "https://geo.dailymotion.com/player/x15a7g.html?video=x8qckyq",
  {
    waitUntil: "domcontentloaded",
    timeout: 60000
  }
);

for (let i = 0; i < 60 && !manifestUrl; i++) {
  await page.waitForTimeout(1000);
}

if (!manifestUrl) {
  await browser.close();
  console.error("Manifest tidak ditemukan.");
  process.exit(1);
}

console.log("Mengambil isi manifest...");

const response = await page.request.get(manifestUrl);

console.log("STATUS MANIFEST:", response.status());

const body = await response.text();

console.log("UKURAN RESPONSE:", body.length);

console.log("MENCARI URL STREAM...");

const matches = body.match(
  /https?:\/\/[^"'<>\\s]+\.m3u8[^"'<>\\s]*/g
) || [];

console.log("JUMLAH URL STREAM:", matches.length);

for (const url of matches) {
  console.log("STREAM:", url);
}

await browser.close();

if (matches.length === 0) {
  console.error("URL stream tidak ditemukan di manifest.");
  process.exit(1);
}

const streamUrl = matches[0];

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

console.log("Playlist Trans7 berhasil dibuat.");
