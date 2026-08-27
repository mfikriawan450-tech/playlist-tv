import { chromium } from "playwright";
import fs from "fs";

const channels = [
  {
    name: "RCTI",
    url: "https://www.rctiplus.com/tv/rcti",
    outputFile: "stream-rcti.txt"
  },
  {
    name: "MNCTV",
    url: "https://www.rctiplus.com/tv/mnctv",
    outputFile: "stream-mnctv.txt"
  }
];

const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage"
  ]
});

const results = [];

for (const channel of channels) {
  console.log("");
  console.log("=================================");
  console.log(`MEMBUKA ${channel.name}`);
  console.log("=================================");

  const page = await browser.newPage();

  let streamUrl = null;

  // =====================================================
  // TANGKAP REQUEST .M3U8
  // =====================================================

  page.on("request", (request) => {
    const url = request.url();

    if (
      !streamUrl &&
      url.toLowerCase().includes(".m3u8")
    ) {
      streamUrl = url;

      console.log("");
      console.log("=================================");
      console.log(`${channel.name} STREAM DITEMUKAN`);
      console.log("=================================");
      console.log("Sumber: request");
      console.log("");
      console.log(streamUrl);
      console.log("");
    }
  });

  try {
    await page.goto(channel.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    console.log(`${channel.name} halaman berhasil dibuka.`);

    // =====================================================
    // TUNGGU REQUEST .M3U8
    // =====================================================

    for (
      let second = 0;
      second < 60 && !streamUrl;
      second++
    ) {
      await page.waitForTimeout(1000);

      if (second % 5 === 0) {
        console.log(
          `${channel.name} menunggu .m3u8... ${second + 1} detik`
        );
      }
    }

    // =====================================================
    // KALAU BELUM KETEMU, COBA PLAY VIDEO
    // =====================================================

    if (!streamUrl) {
      const videos = await page.locator("video").count();

      console.log(
        `${channel.name} jumlah video element: ${videos}`
      );

      for (
        let i = 0;
        i < videos && !streamUrl;
        i++
      ) {
        try {
          await page
            .locator("video")
            .nth(i)
            .evaluate((video) => {
              video.muted = true;
              video.play().catch(() => {});
            });

          console.log(
            `${channel.name} video ${i + 1} dicoba dijalankan.`
          );
        } catch {
          console.log(
            `${channel.name} video ${i + 1} gagal dijalankan.`
          );
        }
      }

      // ===================================================
      // TUNGGU LAGI SETELAH PLAY
      // ===================================================

      for (
        let second = 0;
        second < 60 && !streamUrl;
        second++
      ) {
        await page.waitForTimeout(1000);

        if (second % 10 === 0) {
          console.log(
            `${channel.name} menunggu .m3u8 setelah Play... ${second} detik`
          );
        }
      }
    }

  } catch (error) {
    console.error(
      `${channel.name} gagal dibuka:`,
      error.message
    );
  }

  // =====================================================
  // TUTUP PAGE
  // =====================================================

  await page.close();

  // =====================================================
  // CEK HASIL
  // =====================================================

  if (!streamUrl) {
    console.error("");
    console.error("=================================");
    console.error(
      `${channel.name}: .m3u8 TIDAK DITEMUKAN`
    );
    console.error("=================================");

    await browser.close();

    process.exit(1);
  }

  results.push({
    name: channel.name,
    outputFile: channel.outputFile,
    url: streamUrl
  });
}

// =======================================================
// TUTUP BROWSER
// =======================================================

await browser.close();

// =======================================================
// TAMPILKAN HASIL
// =======================================================

console.log("");
console.log("=================================");
console.log("SEMUA STREAM BERHASIL DITEMUKAN");
console.log("=================================");

for (const result of results) {
  console.log("");
  console.log(result.name);
  console.log(result.url);
}

// =======================================================
// SIMPAN URL
// =======================================================

console.log("");
console.log("=================================");
console.log("MENYIMPAN STREAM");
console.log("=================================");

for (const result of results) {
  fs.writeFileSync(
    result.outputFile,
    result.url.trim() + "\n",
    "utf8"
  );

  console.log(
    `${result.name} -> ${result.outputFile}`
  );
}

// =======================================================
// SELESAI
// =======================================================

console.log("");
console.log("=================================");
console.log("SEMUA FILE BERHASIL DIPERBARUI");
console.log("=================================");

for (const result of results) {
  console.log("");
  console.log(`${result.outputFile}:`);
  console.log(result.url);
}
