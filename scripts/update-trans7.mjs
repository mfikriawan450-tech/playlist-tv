import { chromium } from "playwright";
import fs from "fs";

const browser = await chromium.launch({
  headless: true
});

const page = await browser.newPage();

let streamUrl = null;

page.on("request", (request) => {
  const url = request.url();

  if (url.includes("dailymotion.com")) {
    console.log("DM REQUEST:", url);
  }

  if (
    url.includes(
      "dmxleo.dailymotion.com/cdn/manifest/video/x8qckyq.m3u8"
    )
  ) {
    streamUrl = url;

    console.log("=================================");
    console.log("URL TRANS7 DITEMUKAN:");
    console.log(streamUrl);
    console.log("=================================");
  }
});

page.on("response", (response) => {
  const url = response.url();

  if (url.includes("dailymotion.com")) {
    console.log(
      "DM RESPONSE:",
      response.status(),
      url
    );
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
console.log("Menunggu URL stream...");

for (let i = 0; i < 60 && !streamUrl; i++) {
  await page.waitForTimeout(1000);
}

if (!streamUrl) {
  await browser.close();

  console.error(
    "GAGAL: URL manifest Trans7 tidak ditemukan."
  );

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

console.log(
  "Playlist Trans7 berhasil diperbarui."
);
