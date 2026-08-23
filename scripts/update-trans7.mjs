import { chromium } from "playwright";
import fs from "fs";

const VIDEO_ID = "x8qckyq";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--disable-blink-features=AutomationControlled",
    "--window-size=1280,720"
  ]
});

const context = await browser.newContext({
  viewport: {
    width: 1280,
    height: 720
  },

  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",

  locale: "en-US",
  timezoneId: "Asia/Jakarta"
});

const page = await context.newPage();

const foundStreams = new Set();
const foundManifests = new Set();

function printStream(url, source) {
  if (!url) return;

  const isStream =
    url.includes("live-240.m3u8") ||
    url.includes("live-480.m3u8") ||
    url.includes("live-720.m3u8");

  if (!isStream) return;

  if (foundStreams.has(url)) return;

  foundStreams.add(url);

  console.log("");
  console.log("=================================");
  console.log("STREAM DITEMUKAN");
  console.log("SOURCE:", source);
  console.log("=================================");
  console.log(url);
  console.log("=================================");
}

function printManifest(url, source) {
  if (!url) return;

  if (
    !url.includes(".m3u8") ||
    (
      !url.includes("dailymotion.com") &&
      !url.includes("dmcdn.net")
    )
  ) {
    return;
  }

  if (foundManifests.has(url)) return;

  foundManifests.add(url);

  console.log("");
  console.log("HLS MANIFEST");
  console.log("SOURCE:", source);
  console.log(url);
  console.log("");
}

/*
==================================================
REQUEST LISTENER
==================================================
*/

page.on("request", request => {
  const url = request.url();

  printStream(url, "REQUEST");
  printManifest(url, "REQUEST");
});

/*
==================================================
RESPONSE LISTENER
==================================================
*/

page.on("response", response => {
  const url = response.url();
  const status = response.status();

  if (
    url.includes("live-") &&
    url.includes(".m3u8")
  ) {
    console.log("");
    console.log("HLS RESPONSE:", status);

    printStream(
      url,
      `RESPONSE ${status}`
    );
  }

  printManifest(
    url,
    `RESPONSE ${status}`
  );
});

/*
==================================================
REQUEST FAILED
==================================================
*/

page.on("requestfailed", request => {
  const url = request.url();

  if (
    url.includes(".m3u8") ||
    url.includes("dmcdn.net")
  ) {
    console.log("");
    console.log("REQUEST FAILED");
    console.log(url);
    console.log(
      request.failure()?.errorText || ""
    );
  }
});

/*
==================================================
CONSOLE
==================================================
*/

page.on("console", msg => {
  const text = msg.text();

  if (
    text.includes("m3u8") ||
    text.includes("HLS") ||
    text.includes("buffer") ||
    text.includes("level")
  ) {
    console.log(
      "[BROWSER]",
      text
    );
  }
});

/*
==================================================
PAGE ERROR
==================================================
*/

page.on("pageerror", error => {
  console.log(
    "[PAGE ERROR]",
    error.message
  );
});

/*
==================================================
BUKA PLAYER
==================================================
*/

console.log(
  "Membuka Dailymotion Player Trans7..."
);

await page.goto(
  `https://geo.dailymotion.com/player/x15a7g.html?video=${VIDEO_ID}`,
  {
    waitUntil: "domcontentloaded",
    timeout: 60000
  }
);

console.log(
  "Player terbuka."
);

/*
==================================================
TUNGGU INITIAL PLAYER
==================================================
*/

console.log(
  "Menunggu player melakukan inisialisasi..."
);

await page.waitForTimeout(15000);

/*
==================================================
CEK VIDEO
==================================================
*/

const videoCount =
  await page.locator("video").count();

console.log(
  "Jumlah video:",
  videoCount
);

/*
==================================================
JANGAN LANGSUNG PLAY SEMUA VIDEO
==================================================
*/

for (let i = 0; i < videoCount; i++) {

  try {

    const state =
      await page
        .locator("video")
        .nth(i)
        .evaluate(video => ({
          paused: video.paused,
          readyState: video.readyState,
          src: video.currentSrc || video.src,
          muted: video.muted
        }));

    console.log("");
    console.log(
      `VIDEO ${i}:`
    );

    console.log(state);

  } catch (error) {

    console.log(
      `Gagal membaca video ${i}:`,
      error.message
    );
  }
}

/*
==================================================
COBA PLAY VIDEO YANG MEMILIKI SRC
==================================================
*/

for (let i = 0; i < videoCount; i++) {

  try {

    const hasSrc =
      await page
        .locator("video")
        .nth(i)
        .evaluate(video =>
          Boolean(
            video.currentSrc ||
            video.src
          )
        );

    if (!hasSrc) {
      continue;
    }

    await page
      .locator("video")
      .nth(i)
      .evaluate(video => {

        video.muted = true;

        video.setAttribute(
          "playsinline",
          ""
        );

        const promise =
          video.play();

        if (promise) {
          promise.catch(() => {});
        }
      });

    console.log(
      `Video ${i} diperintahkan PLAY.`
    );

  } catch (error) {

    console.log(
      `PLAY video ${i} gagal:`,
      error.message
    );
  }
}

/*
==================================================
KLIK PLAYER
==================================================
*/

try {

  await page.mouse.click(
    640,
    360
  );

  console.log(
    "Player diklik."
  );

} catch {}

/*
==================================================
TUNGGU STREAM
==================================================
*/

console.log("");
console.log(
  "Menunggu request stream HLS..."
);

const MAX_WAIT = 300;

for (
  let second = 0;
  second < MAX_WAIT;
  second++
) {

  if (foundStreams.size > 0) {
    break;
  }

  if (
    second % 10 === 0
  ) {

    console.log(
      `Menunggu... ${second}s`
    );
  }

  await page.waitForTimeout(
    1000
  );
}

/*
==================================================
HASIL
==================================================
*/

console.log("");
console.log(
  "================================="
);

console.log(
  "HASIL"
);

console.log(
  "================================="
);

console.log(
  "Manifest:",
  foundManifests.size
);

console.log(
  "Stream:",
  foundStreams.size
);

console.log(
  "================================="
);

/*
==================================================
TIDAK DITEMUKAN
==================================================
*/

if (
  foundStreams.size === 0
) {

  console.log("");
  console.log(
    "STREAM BELUM DITEMUKAN."
  );

  console.log("");
  console.log(
    "Manifest yang terlihat:"
  );

  for (
    const url of foundManifests
  ) {
    console.log(url);
  }

  await browser.close();

  process.exit(1);
}

/*
==================================================
PILIH RESOLUSI
==================================================
*/

const streams =
  [...foundStreams];

const selected =
  streams.find(url =>
    url.includes(
      "live-720.m3u8"
    )
  ) ||
  streams.find(url =>
    url.includes(
      "live-480.m3u8"
    )
  ) ||
  streams.find(url =>
    url.includes(
      "live-240.m3u8"
    )
  ) ||
  streams[0];

console.log("");
console.log(
  "STREAM TERPILIH:"
);

console.log(
  selected
);

/*
==================================================
BUAT PLAYLIST
==================================================
*/

fs.mkdirSync(
  "playlist",
  {
    recursive: true
  }
);

const playlist =
`#EXTM3U
#EXTINF:-1,Trans7
${selected}
`;

fs.writeFileSync(
  "playlist/trans7.m3u",
  playlist,
  "utf8"
);

console.log("");
console.log(
  "================================="
);

console.log(
  "PLAYLIST BERHASIL DISIMPAN"
);

console.log(
  "playlist/trans7.m3u"
);

console.log(
  "================================="
);

await browser.close();
