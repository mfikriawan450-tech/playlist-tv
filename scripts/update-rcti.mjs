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
      /^https:\/\/gtv-linier\.rctiplus\.id\/.*\/gtv-sdi-avc1_.*\.m3u8$/
  }
];

const browser = await chromium.launch({
  headless: true
});

const results = [];

for (const channel of channels) {
  console.log("");
  console.log("=================================");
  console.log(`MEMBUKA ${channel.name}`);
  console.log("=================================");

  const page = await browser.newPage();

  let streamUrl = null;

  page.on("request", (request) => {
    const url = request.url();

    // ==========================================
    // DEBUG KHUSUS GTV
    // ==========================================

    if (
      channel.name === "GTV" &&
      url.includes("gtv-linier.rctiplus.id")
    ) {
      console.log("GTV REQUEST:");
      console.log(url);
    }

    // ==========================================
    // DETEKSI STREAM
    // ==========================================

    if (channel.name === "GTV") {
      // GTV menggunakan URL dengan hdntl
      // dan playlist gtv-sdi-avc1_....
      if (
        url.includes("gtv-linier.rctiplus.id") &&
        url.includes("/hdntl=") &&
        url.includes("gtv-sdi-avc1_") &&
        url.endsWith(".m3u8") &&
        !streamUrl
      ) {
        streamUrl = url;

        console.log("");
        console.log("GTV STREAM DITEMUKAN:");
        console.log(streamUrl);
        console.log("");
      }
    } else {
      // RCTI dan MNCTV
      if (channel.pattern.test(url) && !streamUrl) {
        streamUrl = url;

        console.log("");
        console.log(`${channel.name} STREAM DITEMUKAN:`);
        console.log(streamUrl);
        console.log("");
      }
    }
  });

  try {
    await page.goto(channel.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    // Tunggu maksimal 60 detik
    for (let i = 0; i < 60 && !streamUrl; i++) {
      await page.waitForTimeout(1000);
    }
  } catch (error) {
    console.error(
      `${channel.name} gagal dibuka:`,
      error.message
    );
  }

  await page.close();

  // ==========================================
  // CEK HASIL
  // ==========================================

  if (!streamUrl) {
    console.error("");
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

// ==========================================
// SEMUA STREAM DITEMUKAN
// ==========================================

console.log("");
console.log("=================================");
console.log("SEMUA STREAM BERHASIL DITEMUKAN");
console.log("=================================");

for (const result of results) {
  console.log("");
  console.log(`${result.name}:`);
  console.log(result.url);
}

// ==========================================
// SIMPAN URL KE FILE
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

// ==========================================
// HASIL AKHIR
// ==========================================

console.log("");
console.log("=================================");
console.log("SEMUA FILE STREAM BERHASIL DIPERBARUI");
console.log("=================================");

for (const result of results) {
  console.log("");
  console.log(`${result.outputFile}:`);
  console.log(result.url);
}
