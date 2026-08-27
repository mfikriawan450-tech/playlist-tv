import { chromium } from "playwright";
import fs from "fs";

const channels = [
  {
    name: "RCTI",
    url: "https://www.rctiplus.com/tv/rcti",
    outputFile: "stream-rcti.txt",
    pattern:
      /https:\/\/rcti-linier\.rctiplus\.id\/rcti-sdi\.m3u8\?hdnts=[^\s"']+/
  },
  {
    name: "MNCTV",
    url: "https://www.rctiplus.com/tv/mnctv",
    outputFile: "stream-mnctv.txt",
    pattern:
      /https:\/\/mnctv-linier\.rctiplus\.id\/mnctv-sdi\.m3u8\?hdnts=[^\s"']+/
  },
{
  name: "GTV",
  url: "https://www.rctiplus.com/tv/gtv",
  outputFile: "stream-gtv.txt",
  pattern:
    /^https:\/\/gtv-linier\.rctiplus\.id\/.*\.m3u8/
}
];

const browser = await chromium.launch({
  headless: true
});

const results = [];

for (const channel of channels) {
  console.log("");
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
    outputFile: channel.outputFile,
    url: streamUrl
  });
}

await browser.close();

console.log("");
console.log("=================================");
console.log("SEMUA STREAM BERHASIL DITEMUKAN");
console.log("=================================");

for (const result of results) {
  console.log(`${result.name}: ${result.url}`);
}

// ==========================================
// SIMPAN URL KE FILE MASING-MASING
// ==========================================

for (const result of results) {
  fs.writeFileSync(
    result.outputFile,
    result.url.trim() + "\n",
    "utf8"
  );

  console.log(
    `${result.name} URL berhasil disimpan ke ${result.outputFile}.`
  );
}

console.log("");
console.log("=================================");
console.log("SEMUA FILE STREAM BERHASIL DIPERBARUI");
console.log("=================================");

for (const result of results) {
  console.log(`${result.outputFile}:`);
  console.log(result.url);
}
