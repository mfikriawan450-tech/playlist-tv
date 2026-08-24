import { chromium } from "playwright";
import fs from "fs";

const channels = [
  {
    name: "RCTI",
    url: "https://www.rctiplus.com/tv/rcti"
  },
  {
    name: "MNCTV",
    url: "https://www.rctiplus.com/tv/mnctv"
  },
  {
    name: "GTV",
    url: "https://www.rctiplus.com/tv/gtv"
  }
];

const browser = await chromium.launch({
  headless: true
});

const results = [];

for (const channel of channels) {
  console.log(`Membuka ${channel.name}...`);

  const page = await browser.newPage();

  let streamUrl = null;

  page.on("request", (request) => {
    const url = request.url();

    if (
      url.includes("-linier.rctiplus.id/") &&
      url.includes(".m3u8")
    ) {
      streamUrl = url;

      console.log(`${channel.name} STREAM DITEMUKAN:`);
      console.log(streamUrl);
    }
  });

  try {
    await page.goto(channel.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    for (let i = 0; i < 30 && !streamUrl; i++) {
      await page.waitForTimeout(1000);
    }
  } catch (error) {
    console.error(`${channel.name} gagal dibuka:`, error.message);
  }

  await page.close();

  if (streamUrl) {
    results.push({
      name: channel.name,
      url: streamUrl
    });
  } else {
    console.error(`${channel.name}: URL stream tidak ditemukan.`);
  }
}

await browser.close();

if (results.length !== channels.length) {
  console.error(
    `Hanya ${results.length}/${channels.length} channel ditemukan.`
  );
  process.exit(1);
}

const playlist = [
  "#EXTM3U",
  "",
  ...results.flatMap((channel) => [
    `#EXTINF:-1 tvg-id="${channel.name}" tvg-name="${channel.name}" group-title="Indonesia",${channel.name}`,
    channel.url,
    ""
  ])
].join("\n");

fs.mkdirSync("playlist", {
  recursive: true
});

fs.writeFileSync(
  "playlist/tv.m3u",
  playlist
);

console.log("=================================");
console.log("PLAYLIST BERHASIL DIPERBARUI");
console.log("=================================");
console.log(playlist);
