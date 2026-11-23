// Eleventy config for loukiah.com.
// Films live in src/films (one file per film); texts and lists in src/_data.
// Both are edited through Pages CMS (see .pages.yml).

function vimeo(url) {
  if (!url) return "";
  const m = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+)|\?h=(\w+))?/);
  if (!m) return "";
  const h = m[2] || m[3];
  return `https://player.vimeo.com/video/${m[1]}?autoplay=1&title=0&byline=0&portrait=0&dnt=1${h ? "&h=" + h : ""}`;
}

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/media": "media" });
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
  eleventyConfig.addPassthroughCopy({ "src/.nojekyll": ".nojekyll" });

  eleventyConfig.addFilter("vimeo", vimeo);
  eleventyConfig.addFilter("year", () => new Date().getFullYear());
  eleventyConfig.addFilter("pad", (n) => String(n).padStart(2, "0"));
  eleventyConfig.addFilter("isoDate", (d) => new Date(d).toISOString().slice(0, 10));
  eleventyConfig.addFilter("filmData", (films) =>
    JSON.stringify(
      films.map((f) => {
        const d = f.data;
        const parts = (d.parts || []).map((p) => ({ n: p.name, embed: vimeo(p.video) }));
        return {
          c: d.title, t: d.type, url: f.url, loop: d.loop || "", poster: d.poster || "",
          embed: vimeo(d.video), parts, about: d.about || "",
          credits: (d.credits || []).map((c) => ({ r: c.role, n: c.name })),
          laurels: (d.laurels || []).map((l) => ({ t: l.text, img: l.image })),
        };
      })
    ).replace(/</g, "\\u003c")
  );

  eleventyConfig.addCollection("films", (api) =>
    api.getFilteredByGlob("src/films/*.md").filter((f) => f.data.published !== false).sort((a, b) => (a.data.order || 0) - (b.data.order || 0))
  );

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "md"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
