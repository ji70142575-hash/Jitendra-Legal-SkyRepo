(function () {

  const API =
    "https://archive.org/advancedsearch.php";

  const META =
    "https://archive.org/metadata/";

  const DOWNLOAD =
    "https://archive.org/download/";

  function item(title, identifier, poster, year, description) {
    return new MultimediaItem({
      title: title || identifier,
      url: identifier,
      posterUrl: poster || "",
      type: "movie",
      year: year ? Number(year) : undefined,
      description: description || "",
      playbackPolicy: "none",
      isAdult: false
    });
  }

  async function searchArchive(query, rows) {
    const q =
      encodeURIComponent(
        'mediatype:movies AND "' + query + '"'
      );

    const url =
      API +
      "?q=" + q +
      "&fl[]=identifier&fl[]=title&fl[]=year&fl[]=description" +
      "&rows=" + rows +
      "&page=1&output=json";

    const response = await fetch(url);
    const json = await response.json();

    return json.response && json.response.docs
      ? json.response.docs
      : [];
  }

  async function getHome(cb) {
    try {
      const docs = await searchArchive(
        "public domain",
        20
      );

      const movies = docs.map(function (m) {
        return item(
          m.title,
          m.identifier,
          DOWNLOAD +
            encodeURIComponent(m.identifier) +
            "/page/n1.jpg",
          m.year,
          m.description
        );
      });

      cb({
        success: true,
        data: {
          "Public Domain Movies": movies
        }
      });

    } catch (e) {
      cb({
        success: false,
        errorCode: "NETWORK_ERROR",
        message: String(e)
      });
    }
  }

  async function search(query, cb) {
    try {
      const docs = await searchArchive(query, 30);

      const movies = docs.map(function (m) {
        return item(
          m.title,
          m.identifier,
          DOWNLOAD +
            encodeURIComponent(m.identifier) +
            "/page/n1.jpg",
          m.year,
          m.description
        );
      });

      cb({
        success: true,
        data: movies
      });

    } catch (e) {
      cb({
        success: false,
        errorCode: "NETWORK_ERROR",
        message: String(e)
      });
    }
  }

  async function load(url, cb) {
    try {
      const response =
        await fetch(META + encodeURIComponent(url));

      const data = await response.json();

      const metadata = data.metadata || {};

      cb({
        success: true,
        data: item(
          metadata.title,
          url,
          DOWNLOAD +
            encodeURIComponent(url) +
            "/page/n1.jpg",
          metadata.year,
          metadata.description
        )
      });

    } catch (e) {
      cb({
        success: false,
        errorCode: "LOAD_ERROR",
        message: String(e)
      });
    }
  }

  async function loadStreams(url, cb) {
    try {
      const response =
        await fetch(META + encodeURIComponent(url));

      const data = await response.json();

      const files = data.files || [];

      const streams = [];

      for (const file of files) {

        const name = file.name || "";
        const format =
          String(file.format || "").toLowerCase();

        const isVideo =
          format.includes("mpeg4") ||
          format.includes("h.264") ||
          format.includes("mp4") ||
          name.toLowerCase().endsWith(".mp4");

        if (!isVideo) continue;

        const videoUrl =
          DOWNLOAD +
          encodeURIComponent(url) +
          "/" +
          name
            .split("/")
            .map(encodeURIComponent)
            .join("/");

        streams.push(
          new StreamResult({
            url: videoUrl,
            quality: "Available",
            headers: {
              "Referer": "https://archive.org/"
            }
          })
        );

        if (streams.length >= 3) break;
      }

      cb({
        success: true,
        data: streams
      });

    } catch (e) {
      cb({
        success: false,
        errorCode: "STREAM_ERROR",
        message: String(e)
      });
    }
  }

  globalThis.getHome = getHome;
  globalThis.search = search;
  globalThis.load = load;
  globalThis.loadStreams = loadStreams;

})();
