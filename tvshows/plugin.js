(function () {

  const API = "https://archive.org/advancedsearch.php";
  const META = "https://archive.org/metadata/";
  const DOWNLOAD = "https://archive.org/download/";

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

  function makeItem(item) {
    return new MultimediaItem({
      title: item.title || item.identifier,
      url: item.identifier,
      posterUrl:
        DOWNLOAD +
        encodeURIComponent(item.identifier) +
        "/page/n1.jpg",
      type: "series",
      year: item.year ? Number(item.year) : undefined,
      description: item.description || "",
      playbackPolicy: "none",
      isAdult: false
    });
  }

  async function getHome(cb) {
    try {
      const docs = await searchArchive("television");

      const shows = docs.map(makeItem);

      cb({
        success: true,
        data: {
          "Legal TV Shows": shows
        }
      });

    } catch (error) {
      cb({
        success: false,
        errorCode: "NETWORK_ERROR",
        message: String(error)
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

    } catch (error) {
      cb({
        success: false,
        errorCode: "NETWORK_ERROR",
        message: String(error)
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
        data: new MultimediaItem({
          title: metadata.title || url,
          url: url,
          posterUrl:
            DOWNLOAD +
            encodeURIComponent(url) +
            "/page/n1.jpg",
          type: "series",
          year: metadata.year
            ? Number(metadata.year)
            : undefined,
          description: metadata.description || "",
          playbackPolicy: "none",
          isAdult: false
        })
      });

    } catch (error) {
      cb({
        success: false,
        errorCode: "LOAD_ERROR",
        message: String(error)
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

        if (
          format.includes("mpeg4") ||
          format.includes("mp4") ||
          name.toLowerCase().endsWith(".mp4")
        ) {
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

    } catch (error) {
      cb({
        success: false,
        errorCode: "STREAM_ERROR",
        message: String(error)
      });
    }
  }

  globalThis.getHome = getHome;
  globalThis.search = search;
  globalThis.load = load;
  globalThis.loadStreams = loadStreams;

})();
