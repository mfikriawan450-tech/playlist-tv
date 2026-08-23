import { chromium } from "playwright";
import fs from "fs";

const browser = await chromium.launch({
  headless: true
});

const page = await browser.newPage();

let streamUrl = null;

page.on("request", (request) => {
  const url = request.url();

  if (
    url.includes(
      "cdndirector.dailymotion.com/cdn/live/video/x8qckyq.m3u8"
    ) &&
    url.includes("?sec=")
  ) {
    streamUrl = url;
    console.log("URL Trans7 ditemukan:");
    console.log(streamUrl);
  }
});

console.log("Membuka SevenHub...");

await page.goto("https://sevenhub.id/live", {
  waitUntil: "domcontentloaded",
  timeout: 60000
});

console.log("Menunggu player Trans7...");

for (let i = 0; i < 60 && !streamUrl; i++) {
  await page.waitForTimeout(1000);
}

await browser.close();

if (!streamUrl) {
  console.error("GAGAL: URL Trans7 tidak ditemukan.");
  process.exit(1);
}

const playlist = `#EXTM3U
#EXTINF:-1,Trans7
${streamUrl}
`;

fs.mkdirSync("playlist", { recursive: true });

fs.writeFileSync(
  "playlist/trans7.m3u",
  playlist
);

console.log("Playlist Trans7 berhasil diperbarui.");
