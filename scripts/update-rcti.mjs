import { chromium } from "playwright";
import fs from "fs";

const channels = [
  {
    name: "RCTI",
    url: "https://www.rctiplus.com/tv/rcti",
    outputFile: "stream-rcti.txt",
    host: "rcti-linier.rctiplus.id"
  },
  {
    name: "MNCTV",
    url: "https://www.rctiplus.com/tv/mnctv",
    outputFile: "stream-mnctv.txt",
    host: "mnctv-linier.rctiplus.id"
  },
  {
    name: "GTV",
    url: "https://www.rctiplus.com/tv/gtv",
    outputFile: "stream-gtv.txt",
    host: "gtv-linier.rctiplus.id"
  }
];

const browser = await chromium.launch({
  headless: true
});

const results = [];

/*
 * =========================================================
 * CEK URL M3U8
 * =========================================================
 */

function isM3U8(url) {
  return (
    typeof url === "string" &&
    url.toLowerCase().includes(".m3u8")
  );
}

/*
 * =========================================================
 * CEK URL SESUAI CHANNEL
 * =========================================================
 */

function isChannelStream(url, channel) {
  if (!isM3U8(url)) {
    return false;
  }

  const lower = url.toLowerCase();

  return lower.includes(
    channel.host.toLowerCase()
  );
}

/*
 * =========================================================
 * CARI STREAM CHANNEL
 * =========================================================
 */

async function findStream(channel) {
  console.log("");
  console.log("=================================");
  console.log(`MEMBUKA ${channel.name}`);
  console.log("=================================");

  const page = await browser.newPage();

  let streamUrl = null;

  /*
   * =======================================================
   * REQUEST
   * =======================================================
   */

  page.on("request", request => {
    if (streamUrl) {
      return;
    }

    const url = request.url();

    /*
     * HANYA TERIMA URL M3U8
     */

    if (isChannelStream(url, channel)) {
      streamUrl = url;

      console.log("");
      console.log("=================================");
      console.log(`${channel.name} M3U8 DITEMUKAN`);
      console.log("=================================");
      console.log("Sumber: request");
      console.log("");
      console.log(streamUrl);
      console.log("");
    }
  });

  /*
   * =======================================================
   * RESPONSE
   * =======================================================
   */

  page.on("response", response => {
    if (streamUrl) {
      return;
    }

    const url = response.url();

    /*
     * HANYA TERIMA URL M3U8
     */

    if (isChannelStream(url, channel)) {
      streamUrl = url;

      console.log("");
      console.log("=================================");
      console.log(`${channel.name} M3U8 DITEMUKAN`);
      console.log("=================================");
      console.log("Sumber: response");
      console.log("");
      console.log(streamUrl);
      console.log("");
    }
  });

  /*
   * =======================================================
   * BUKA HALAMAN
   * =======================================================
   */

  try {
    await page.goto(channel.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    console.log(
      `${channel.name} halaman berhasil dibuka.`
    );

    /*
     * =====================================================
     * TUNGGU PLAYER
     * =====================================================
     */

    for (
      let second = 0;
      second < 20 && !streamUrl;
      second++
    ) {
      await page.waitForTimeout(1000);

      console.log(
        `${channel.name} menunggu player... ${second + 1} detik`
      );
    }

    /*
     * =====================================================
     * COBA PLAY SEMUA VIDEO
     * =====================================================
     */

    if (!streamUrl) {
      const videos =
        await page.locator("video").count();

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
            .evaluate(video => {
              video.muted = true;

              const promise = video.play();

              if (promise) {
                promise.catch(() => {});
              }
            });

          console.log(
            `${channel.name} video ${i + 1} dicoba dijalankan.`
          );

          /*
           * Beri waktu request M3U8 muncul
           */

          await page.waitForTimeout(2000);

        } catch {
          console.log(
            `${channel.name} video ${i + 1} gagal dijalankan.`
          );
        }
      }
    }

    /*
     * =====================================================
     * COBA TOMBOL PLAY JWPLAYER
     * =====================================================
     */

    if (!streamUrl) {
      const selectors = [
        '[aria-label*="Play"]',
        'button[class*="play"]',
        ".jw-icon-playback",
        ".jw-display-icon-container",
        ".jw-display-icon-display"
      ];

      for (const selector of selectors) {
        if (streamUrl) {
          break;
        }

        try {
          const count =
            await page.locator(selector).count();

          if (count > 0) {
            console.log(
              `${channel.name} menemukan tombol: ${selector}`
            );

            for (
              let i = 0;
              i < count && !streamUrl;
              i++
            ) {
              try {
                await page
                  .locator(selector)
                  .nth(i)
                  .click({
                    force: true,
                    timeout: 3000
                  });

                console.log(
                  `${channel.name} tombol play diklik.`
                );

                await page.waitForTimeout(2000);

              } catch {
                // abaikan
              }
            }
          }

        } catch {
          // abaikan
        }
      }
    }

    /*
     * =====================================================
     * KHUSUS GTV
     * =====================================================
     *
     * GTV biasanya perlu waktu lebih lama untuk
     * mengeluarkan request M3U8.
     */

    if (!streamUrl && channel.name === "GTV") {
      console.log("");
      console.log("=================================");
      console.log("MODE KHUSUS GTV");
      console.log("=================================");
      console.log("Fokus mencari request .m3u8 GTV.");

      for (
        let second = 0;
        second < 90 && !streamUrl;
        second++
      ) {
        await page.waitForTimeout(1000);

        if (second % 10 === 0) {
          console.log(
            `GTV masih mencari .m3u8... ${second} detik`
          );
        }
      }
    }

    /*
     * =====================================================
     * RCTI / MNCTV
     * =====================================================
     */

    if (
      !streamUrl &&
      channel.name !== "GTV"
    ) {
      console.log("");
      console.log(
        `${channel.name} menunggu URL M3U8 setelah Play...`
      );

      for (
        let second = 0;
        second < 60 && !streamUrl;
        second++
      ) {
        await page.waitForTimeout(1000);

        if (second % 10 === 0) {
          console.log(
            `${channel.name} masih menunggu... ${second} detik`
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

  /*
   * =======================================================
   * TUTUP PAGE
   * =======================================================
   */

  await page.close();

  return streamUrl;
}

/*
 * =========================================================
 * PROSES SEMUA CHANNEL
 * =========================================================
 */

for (const channel of channels) {
  const streamUrl =
    await findStream(channel);

  if (!streamUrl) {
    console.error("");
    console.error("=================================");
    console.error(
      `${channel.name}: M3U8 TIDAK DITEMUKAN`
    );
    console.error("=================================");

    continue;
  }

  results.push({
    name: channel.name,
    outputFile: channel.outputFile,
    url: streamUrl
  });
}

/*
 * =========================================================
 * TUTUP BROWSER
 * =========================================================
 */

await browser.close();

/*
 * =========================================================
 * HASIL
 * =========================================================
 */

console.log("");
console.log("=================================");
console.log("HASIL DETEKSI M3U8");
console.log("=================================");

for (const result of results) {
  console.log("");
  console.log(result.name);
  console.log(result.url);
}

/*
 * =========================================================
 * SIMPAN HASIL
 * =========================================================
 */

console.log("");
console.log("=================================");
console.log("MENYIMPAN M3U8");
console.log("=================================");

for (const result of results) {
  /*
   * Pastikan sekali lagi hanya M3U8
   */

  if (!isM3U8(result.url)) {
    console.error(
      `${result.name}: URL bukan M3U8, tidak disimpan.`
    );

    continue;
  }

  fs.writeFileSync(
    result.outputFile,
    result.url.trim() + "\n",
    "utf8"
  );

  console.log(
    `${result.name} -> ${result.outputFile}`
  );
}

/*
 * =========================================================
 * SELESAI
 * =========================================================
 */

console.log("");
console.log("=================================");
console.log("SEMUA FILE M3U8 BERHASIL DIPERBARUI");
console.log("=================================");

for (const result of results) {
  console.log("");
  console.log(`${result.outputFile}:`);
  console.log(result.url);
}
