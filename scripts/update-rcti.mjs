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
 * URL HARUS BENAR-BENAR M3U8
 * =========================================================
 */

function isRealM3U8(url) {
  if (!url || typeof url !== "string") {
    return false;
  }

  try {
    const parsed = new URL(url);

    return (
      parsed.pathname
        .toLowerCase()
        .endsWith(".m3u8")
    );
  } catch {
    return false;
  }
}

/*
 * =========================================================
 * CEK M3U8 CHANNEL
 * =========================================================
 */

function isChannelM3U8(url, channel) {
  if (!isRealM3U8(url)) {
    return false;
  }

  try {
    const parsed = new URL(url);

    return (
      parsed.hostname
        .toLowerCase()
        .includes(channel.host.toLowerCase())
    );

  } catch {
    return false;
  }
}

/*
 * =========================================================
 * EKSTRAK M3U8 DARI JWPLAYER PING
 * =========================================================
 *
 * Contoh:
 *
 * https://prd.jwpltx.com/v1/jwplayer6/ping.gif?...&mu=https%3A%2F%2Frcti-linier...
 *
 * Kita ambil parameter mu.
 */

function extractM3U8FromPing(url, channel) {
  if (!url || typeof url !== "string") {
    return null;
  }

  try {
    const parsed = new URL(url);

    const mu = parsed.searchParams.get("mu");

    if (!mu) {
      return null;
    }

    let decoded;

    try {
      decoded = decodeURIComponent(mu);
    } catch {
      decoded = mu;
    }

    decoded = decoded.trim();

    if (
      isChannelM3U8(decoded, channel)
    ) {
      return decoded;
    }

  } catch {
    return null;
  }

  return null;
}

/*
 * =========================================================
 * NORMALISASI URL M3U8
 * =========================================================
 */

function normalizeM3U8(url) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);

    if (
      !parsed.pathname
        .toLowerCase()
        .endsWith(".m3u8")
    ) {
      return null;
    }

    return parsed.href;

  } catch {
    return null;
  }
}

/*
 * =========================================================
 * CARI STREAM
 * =========================================================
 */

async function findStream(channel) {

  console.log("");
  console.log("=================================");
  console.log(`MEMBUKA ${channel.name}`);
  console.log("=================================");

  const page = await browser.newPage();

  let streamUrl = null;

  function acceptCandidate(candidate, source) {

    if (streamUrl) {
      return;
    }

    if (!candidate) {
      return;
    }

    /*
     * 1. Coba URL langsung
     */

    const direct = normalizeM3U8(
      candidate
    );

    if (
      direct &&
      isChannelM3U8(
        direct,
        channel
      )
    ) {
      streamUrl = direct;

      console.log("");
      console.log("=================================");
      console.log(
        `${channel.name} M3U8 DITEMUKAN`
      );
      console.log("=================================");
      console.log(`Sumber: ${source}`);
      console.log("");
      console.log(streamUrl);
      console.log("");

      return;
    }

    /*
     * 2. Coba ekstrak dari ping.gif
     */

    const extracted =
      extractM3U8FromPing(
        candidate,
        channel
      );

    if (extracted) {

      streamUrl = extracted;

      console.log("");
      console.log("=================================");
      console.log(
        `${channel.name} M3U8 DITEMUKAN`
      );
      console.log("=================================");
      console.log(
        `Sumber: ${source} -> parameter mu`
      );
      console.log("");
      console.log(streamUrl);
      console.log("");

      return;
    }
  }

  /*
   * =======================================================
   * REQUEST
   * =======================================================
   */

  page.on(
    "request",
    request => {

      if (streamUrl) {
        return;
      }

      const url =
        request.url();

      /*
       * URL M3U8 langsung
       */

      if (
        isChannelM3U8(
          url,
          channel
        )
      ) {
        acceptCandidate(
          url,
          "request"
        );

        return;
      }

      /*
       * JWPlayer ping.gif
       * dengan parameter mu=M3U8
       */

      if (
        url.includes(
          "jwplayer6/ping.gif"
        )
      ) {
        acceptCandidate(
          url,
          "JWPlayer ping"
        );
      }
    }
  );

  /*
   * =======================================================
   * RESPONSE
   * =======================================================
   */

  page.on(
    "response",
    response => {

      if (streamUrl) {
        return;
      }

      const url =
        response.url();

      if (
        isChannelM3U8(
          url,
          channel
        )
      ) {
        acceptCandidate(
          url,
          "response"
        );
      }
    }
  );

  /*
   * =======================================================
   * BUKA HALAMAN
   * =======================================================
   */

  try {

    await page.goto(
      channel.url,
      {
        waitUntil:
          "domcontentloaded",
        timeout: 60000
      }
    );

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
      second < 20 &&
      !streamUrl;
      second++
    ) {

      await page.waitForTimeout(
        1000
      );

      console.log(
        `${channel.name} menunggu player... ${second + 1} detik`
      );
    }

    /*
     * =====================================================
     * COBA VIDEO
     * =====================================================
     */

    if (!streamUrl) {

      const videos =
        await page
          .locator("video")
          .count();

      console.log(
        `${channel.name} jumlah video element: ${videos}`
      );

      for (
        let i = 0;
        i < videos &&
        !streamUrl;
        i++
      ) {

        try {

          await page
            .locator("video")
            .nth(i)
            .evaluate(video => {

              video.muted = true;

              const promise =
                video.play();

              if (promise) {
                promise.catch(
                  () => {}
                );
              }

            });

          console.log(
            `${channel.name} video ${i + 1} dicoba dijalankan.`
          );

          await page.waitForTimeout(
            2000
          );

        } catch {

          console.log(
            `${channel.name} video ${i + 1} gagal dijalankan.`
          );
        }
      }
    }

    /*
     * =====================================================
     * TOMBOL PLAY
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

      for (
        const selector
        of selectors
      ) {

        if (streamUrl) {
          break;
        }

        try {

          const count =
            await page
              .locator(selector)
              .count();

          if (count > 0) {

            console.log(
              `${channel.name} menemukan tombol: ${selector}`
            );

            for (
              let i = 0;
              i < count &&
              !streamUrl;
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

                await page.waitForTimeout(
                  2000
                );

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
     * MODE KHUSUS GTV
     * =====================================================
     */

    if (
      !streamUrl &&
      channel.name === "GTV"
    ) {

      console.log("");
      console.log(
        "================================="
      );
      console.log(
        "MODE KHUSUS GTV"
      );
      console.log(
        "================================="
      );

      for (
        let second = 0;
        second < 90 &&
        !streamUrl;
        second++
      ) {

        await page.waitForTimeout(
          1000
        );

        if (
          second % 10 === 0
        ) {

          console.log(
            `GTV masih mencari M3U8... ${second} detik`
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
        `${channel.name} menunggu M3U8...`
      );

      for (
        let second = 0;
        second < 60 &&
        !streamUrl;
        second++
      ) {

        await page.waitForTimeout(
          1000
        );

        if (
          second % 10 === 0
        ) {

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

  await page.close();

  return streamUrl;
}

/*
 * =========================================================
 * PROSES SEMUA CHANNEL
 * =========================================================
 */

for (
  const channel
  of channels
) {

  const streamUrl =
    await findStream(channel);

  if (!streamUrl) {

    console.error("");
    console.error(
      "================================="
    );
    console.error(
      `${channel.name}: M3U8 TIDAK DITEMUKAN`
    );
    console.error(
      "================================="
    );

    continue;
  }

  /*
   * FINAL CHECK
   * Pastikan benar-benar M3U8
   */

  const finalUrl =
    normalizeM3U8(
      streamUrl
    );

  if (
    !finalUrl ||
    !isChannelM3U8(
      finalUrl,
      channel
    )
  ) {

    console.error(
      `${channel.name}: HASIL BUKAN M3U8, TIDAK DISIMPAN.`
    );

    continue;
  }

  results.push({
    name: channel.name,
    outputFile: channel.outputFile,
    url: finalUrl
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
console.log(
  "================================="
);
console.log(
  "HASIL AKHIR M3U8"
);
console.log(
  "================================="
);

for (
  const result
  of results
) {

  console.log("");
  console.log(
    `${result.name}:`
  );
  console.log(
    result.url
  );
}

/*
 * =========================================================
 * SIMPAN
 * =========================================================
 */

console.log("");
console.log(
  "================================="
);
console.log(
  "MENYIMPAN FILE M3U8"
);
console.log(
  "================================="
);

for (
  const result
  of results
) {

  /*
   * Proteksi terakhir.
   * Tidak akan pernah menulis
   * ping.gif ke file.
   */

  if (
    !isRealM3U8(
      result.url
    )
  ) {

    console.error(
      `${result.name}: BUKAN M3U8, DILEWATI.`
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
console.log(
  "================================="
);
console.log(
  "SEMUA FILE BERISI M3U8"
);
console.log(
  "================================="
);
