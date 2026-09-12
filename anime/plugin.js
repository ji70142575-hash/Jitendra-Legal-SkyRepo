(function () {

  const API = "https://archive.org/advancedsearch.php";
  const META = "https://archive.org/metadata/";
  const DOWNLOAD = "https://archive.org/download/";

  function makeItem(m) {
    return new MultimediaItem({
      title: m.title || m.identifier,
      url: m.identifier,
      posterUrl:
        DOWNLOAD +
        encodeURIComponent(m.identifier) +
        "/page/n1.jpg",
      type: "anime",
      year: m.year ? Number(m.year) : undefined,
      description: m.description || "",
      playbackPolicy: "none",
      isAdult: false
    });
  }

  async function searchArchive(query) {
    const q = encodeURIComponent(
      'mediatype:movies AND "' + query + '"'
    );

    const url =
      API +
      "?q=" + q +
      "&fl[]=identifier&fl[]=title&fl[]=year&fl[]=description" +
      "&rows=30&page=1&output=json";

    const response = await fetch(url);
    const json = await response.json();

    return json.response?.docs || [];
  }

  async function getHome(cb) {
    try {
      const docs = await searchArchive("anime");

      const items = docs.map(makeItem);

      cb({
        success: true,
        data: {
          "Public Domain Anime": items
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
      const docs = await searchArchive(query);

      cb({
        success: true,
        data: docs.map(makeItem)
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
      const response = await fetch(
        META + encodeURIComponent(url)
      );

      const json = await response.json();
      const m = json.metadata || {};

      cb({
        success: true,
        data: new MultimediaItem({
          title: m.title || url,
          url: url,
          posterUrl:
            DOWNLOAD +
            encodeURIComponent(url) +
            "/page/n1.jpg",
          type: "anime",
          year: m.year ? Number(m.year) : undefined,
          description: m.description || "",
          playbackPolicy: "none",
          isAdult: false
        })
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
      const response = await fetch(
        META + encodeURIComponent(url)
      );

      const json = await response.json();
      const files = json.files || [];
      const streams = [];

      for (const file of files) {
        const name = file.name || "";
        const format =
          String(file.format || "").toLowerCase();

        if (
          format.includes("mpeg4") ||
          format.includes("mp4") ||
          name.toLowerCase().endsWith(".mp4")
        ) {
          streams.push(
            new StreamResult({
              url:
                DOWNLOAD +
                encodeURIComponent(url) +
                "/" +
                name
                  .split("/")
                  .map(encodeURIComponent)
                  .join("/"),
              quality: "Available"
            })
          );
        }

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
