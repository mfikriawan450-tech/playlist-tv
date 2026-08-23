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

    console.log("=================================");
    console.log("MANIFEST TRANS7 DITEMUKAN");
    console.log(manifestUrl);
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
console.log("Menunggu manifest...");

for (let i = 0; i < 60 && !manifestUrl; i++) {
  await page.waitForTimeout(1000);
}

await browser.close();

if (!manifestUrl) {
  console.error("GAGAL: Manifest Trans7 tidak ditemukan.");
  process.exit(1);
}

const playlist = `#EXTM3U
#EXTINF:-1,Trans7
${manifestUrl}
`;

fs.mkdirSync("playlist", {
  recursive: true
});

fs.writeFileSync(
  "playlist/trans7.m3u",
  playlist
);

console.log("=================================");
console.log("PLAYLIST TRANS7 BERHASIL DIBUAT");
console.log("=================================");
