import { chromium } from "playwright";

const PAGE_URL = "https://20.detik.com/live/trans-7";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--disable-blink-features=AutomationControlled",
    "--no-sandbox"
  ]
});

const context = await browser.newContext({
  viewport: {
    width: 1280,
    height: 720
  },

  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/151.0.0.0 Safari/537.36"
});

const page = await context.newPage();

let masterRequest = null;
let chunkRequest = null;

// ==========================================
// REQUEST HLS
// ==========================================

page.on("request", request => {
  const url = request.url();

  if (
    url.includes("video.detik.com/trans7-sec/") &&
    url.includes(".m3u8")
  ) {
    const headers = request.headers();

    if (url.includes("playlist.m3u8")) {

      if (!masterRequest) {
        masterRequest = {
          url,
          headers
        };

        console.log("");
        console.log("=================================");
        console.log("MASTER PLAYLIST DITEMUKAN");
        console.log("=================================");
        console.log(url);

        console.log("");
        console.log("MASTER HEADERS:");

        console.log(
          JSON.stringify(
            headers,
            null,
            2
          )
        );
      }

    } else if (
      url.includes("chunklist")
    ) {

      if (!chunkRequest) {
        chunkRequest = {
          url,
          headers
        };

        console.log("");
        console.log("=================================");
        console.log("CHUNKLIST DITEMUKAN");
        console.log("=================================");
        console.log(url);

        console.log("");
        console.log("CHUNKLIST HEADERS:");

        console.log(
          JSON.stringify(
            headers,
            null,
            2
          )
        );
      }
    }
  }
});

// ==========================================
// RESPONSE HLS
// ==========================================

page.on("response", response => {

  const url = response.url();

  if (
    url.includes("video.detik.com/trans7-sec/") &&
    url.includes(".m3u8")
  ) {

    console.log("");
    console.log("HLS RESPONSE:");
    console.log("STATUS:", response.status());
    console.log(url);
  }
});

// ==========================================
// BUKA HALAMAN
// ==========================================

try {

  console.log(
    "Membuka Live Trans7 20Detik..."
  );

  await page.goto(PAGE_URL, {
    waitUntil: "domcontentloaded",
    timeout: 90000
  });

  console.log(
    "Halaman Trans7 terbuka."
  );

} catch (error) {

  console.log("");
  console.log(
    "Navigasi bermasalah:"
  );

  console.log(
    error.message
  );

  console.log(
    "Tetap menunggu request HLS..."
  );
}

// ==========================================
// TUNGGU PLAYER
// ==========================================

await page.waitForTimeout(10000);

// ==========================================
// PLAY VIDEO
// ==========================================

console.log("");
console.log(
  "Mencari video player..."
);

for (const frame of page.frames()) {

  try {

    const count = await frame
      .locator("video")
      .count();

    if (count > 0) {

      console.log(
        `Frame memiliki ${count} video.`
      );

      for (let i = 0; i < count; i++) {

        try {

          await frame
            .locator("video")
            .nth(i)
            .evaluate(video => {

              video.muted = true;

              const p = video.play();

              if (
                p &&
                typeof p.catch === "function"
              ) {
                p.catch(() => {});
              }

            });

          console.log(
            `Video ${i} diperintahkan play.`
          );

        } catch (error) {

          console.log(
            `Video ${i} gagal play:`,
            error.message
          );

        }
      }
    }

  } catch {}
}

// ==========================================
// KLIK PLAYER
// ==========================================

try {

  await page.mouse.click(
    640,
    360
  );

  console.log(
    "Player diklik."
  );

} catch {}

// ==========================================
// TUNGGU REQUEST
// ==========================================

console.log("");
console.log(
  "Menunggu master + chunklist..."
);

for (
  let i = 0;
  i < 60 &&
  (!masterRequest || !chunkRequest);
  i++
) {

  await page.waitForTimeout(2000);

  if (i % 5 === 0) {

    console.log(
      `Menunggu... ${i * 2}s`
    );

  }
}

// ==========================================
// COOKIES
// ==========================================

console.log("");
console.log("=================================");
console.log("COOKIES BROWSER");
console.log("=================================");

const cookies =
  await context.cookies(
    [
      "https://20.detik.com/",
      "https://video.detik.com/"
    ]
  );

if (cookies.length === 0) {

  console.log(
    "Tidak ada cookie."
  );

} else {

  for (const cookie of cookies) {

    console.log(
      `${cookie.name}=${cookie.value}`
    );

    console.log(
      `domain=${cookie.domain}`
    );

    console.log(
      `path=${cookie.path}`
    );

    console.log("");
  }
}

// ==========================================
// HASIL
// ==========================================

console.log("");
console.log("=================================");
console.log("HASIL");
console.log("=================================");

console.log(
  "MASTER:",
  masterRequest
    ? "DITEMUKAN"
    : "TIDAK DITEMUKAN"
);

console.log(
  "CHUNKLIST:",
  chunkRequest
    ? "DITEMUKAN"
    : "TIDAK DITEMUKAN"
);

// ==========================================
// TEST DENGAN REQUEST CONTEXT BROWSER
// ==========================================

async function testRequest(
  name,
  target
) {

  if (!target) {
    return;
  }

  console.log("");
  console.log("=================================");
  console.log(name);
  console.log("=================================");

  try {

    const response =
      await context.request.get(
        target.url,
        {
          headers: target.headers,
          timeout: 30000
        }
      );

    console.log(
      "STATUS:",
      response.status()
    );

    console.log(
      "CONTENT-TYPE:",
      response.headers()[
        "content-type"
      ]
    );

    const body =
      await response.text();

    console.log(
      "RESPONSE SIZE:",
      body.length
    );

    console.log("");
    console.log(
      "RESPONSE AWAL:"
    );

    console.log(
      body.substring(0, 500)
    );

  } catch (error) {

    console.log(
      "ERROR:",
      error.message
    );

  }
}

// ==========================================
// TEST MASTER
// ==========================================

await testRequest(
  "TEST MASTER DENGAN SESSION BROWSER",
  masterRequest
);

// ==========================================
// TEST CHUNKLIST
// ==========================================

await testRequest(
  "TEST CHUNKLIST DENGAN SESSION BROWSER",
  chunkRequest
);

// ==========================================
// SELESAI
// ==========================================

await browser.close();

console.log("");
console.log("=================================");
console.log("DIAGNOSTIK SELESAI");
console.log("=================================");
