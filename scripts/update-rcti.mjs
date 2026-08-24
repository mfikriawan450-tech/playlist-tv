import { chromium } from "playwright";
import fs from "fs";

const playlistPath = "os4.m3u";

const channels = [
  {
    name: "RCTI",
    url: "https://www.rctiplus.com/tv/rcti",
    pattern: /https:\/\/rcti-linier\.rctiplus\.id\/rcti-sdi\.m3u8\?hdnts=[^\s"']+/
  },
  {
    name: "MNCTV",
    url: "https://www.rctiplus.com/tv/mnctv",
    pattern: /https:\/\/mnctv-linier\.rctiplus\.id\/mnctv-sdi\.m3u8\?hdnts=[^\s"']+/
  },
  {
    name: "GTV",
    url: "https://www.rctiplus.com/tv/gtv",
    pattern: /https:\/\/gtv-linier\.rctiplus\.id\/gtv-sdi\.m3u8\?hdnts=[^\s"']+/
  }
];

if (!fs.existsSync(playlistPath)) {
  console.error(`File tidak ditemukan: ${playlistPath}`);
  process.exit(1);
}

let playlist = fs.readFileSync(playlistPath, "utf8");

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

    if (channel.pattern.test(url) && !streamUrl) {
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
    console.error(
      `${channel.name} gagal dibuka:`,
      error.message
    );
  }

  await page.close();

  if (!streamUrl) {
    console.error(
      `${channel.name}: URL stream tidak ditemukan.`
    );

    await browser.close();
    process.exit(1);
  }

  results.push({
    name: channel.name,
    url: streamUrl
  });
}

await browser.close();

console.log("=================================");
console.log("SEMUA STREAM BERHASIL DITEMUKAN");
console.log("=================================");

for (const result of results) {
  console.log(`${result.name}: ${result.url}`);
}

/*
 * Ganti hanya URL stream di masing-masing blok.
 * Header #EXTVLCOPT dan channel lain tidak disentuh.
 */

for (const result of results) {
  const escapedName = result.name.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const blockRegex = new RegExp(
    `(#[#]EXTINF:-1,${escapedName}\\r?\\n` +
    `(?:#EXTVLCOPT:[^\\r\\n]*\\r?\\n)*)(https?://[^\\r\\n]+)`
  );

  if (!blockRegex.test(playlist)) {
    console.error(
      `Blok ${result.name} tidak ditemukan di ${playlistPath}`
    );

    process.exit(1);
  }

  playlist = playlist.replace(
    blockRegex,
    `$1${result.url}`
  );

  console.log(`${result.name} URL berhasil diperbarui.`);
}

fs.writeFileSync(
  playlistPath,
  playlist,
  "utf8"
);

console.log("=================================");
console.log("os4.m3u BERHASIL DIPERBARUI");
console.log("=================================");
