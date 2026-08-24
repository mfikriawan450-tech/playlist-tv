const URL =
  "https://video.detik.com/trans7-sec/smil:trans7.smil/playlist.m3u8?wowzatokenstarttime=0&wowzatokenendtime=1787570009556&wowzatokenhash=JVURLtfSgrkOBjFcUBqgFCiIFzuOWgpOpykcZp9lRN0%3D";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/151.0.0.0 Safari/537.36";

const tests = [
  {
    name: "TANPA HEADER",
    headers: {}
  },

  {
    name: "USER-AGENT",
    headers: {
      "User-Agent": USER_AGENT
    }
  },

  {
    name: "REFERER",
    headers: {
      "Referer": "https://20.detik.com/",
      "User-Agent": USER_AGENT
    }
  },

  {
    name: "REFERER + ORIGIN",
    headers: {
      "Referer": "https://20.detik.com/",
      "Origin": "https://20.detik.com",
      "User-Agent": USER_AGENT
    }
  },

  {
    name: "REFERER LIVE TRANS7",
    headers: {
      "Referer": "https://20.detik.com/live/trans-7",
      "Origin": "https://20.detik.com",
      "User-Agent": USER_AGENT
    }
  },

  {
    name: "DETIK",
    headers: {
      "Referer": "https://20.detik.com/",
      "Origin": "https://20.detik.com",
      "User-Agent": USER_AGENT,
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9"
    }
  }
];

console.log("=================================");
console.log("TEST URL TRANS7");
console.log("=================================");
console.log(URL);

for (const test of tests) {
  console.log("");
  console.log("=================================");
  console.log(test.name);
  console.log("=================================");

  try {
    const response = await fetch(URL, {
      method: "GET",
      headers: test.headers,
      redirect: "follow"
    });

    console.log("STATUS:", response.status);
    console.log(
      "CONTENT-TYPE:",
      response.headers.get("content-type")
    );

    console.log(
      "SERVER:",
      response.headers.get("server")
    );

    const text = await response.text();

    console.log(
      "RESPONSE SIZE:",
      text.length
    );

    console.log("");
    console.log("RESPONSE AWAL:");

    console.log(
      text.substring(0, 500)
    );

  } catch (error) {

    console.log(
      "ERROR:",
      error.message
    );
  }
}

console.log("");
console.log("=================================");
console.log("TEST SELESAI");
console.log("=================================");
