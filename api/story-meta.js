import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const { id } = req.query;
    const projectId = "story-plugs";

    if (!id) {
      return res.status(400).send("❌ Missing story slug");
    }

    const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

    const query = {
      structuredQuery: {
        from: [{ collectionId: "stories" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "slug" },
            op: "EQUAL",
            value: { stringValue: id },
          },
        },
        limit: 1,
      },
    };

    const response = await fetch(queryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });

    const results = await response.json();
    const storyDoc = results.find((r) => r.document)?.document;

    if (!storyDoc) {
      return res.status(404).send("Story not found");
    }

    const fields = storyDoc.fields;
    const title = fields.title?.stringValue || "StoryPlugs Story";
    const description =
      fields.excerpt?.stringValue ||
      "Plug stories into the world on StoryPlugs.";
    const image =
      fields.coverUrl?.stringValue ||
      "https://storyplugs.netlify.app/storyplugsbanner.png";

    const storyUrl = `https://storyplugs.netlify.app/story/${id}`;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${title}</title>

          <!-- Open Graph Meta -->
          <meta property="og:title" content="${title}" />
          <meta property="og:description" content="${description}" />
          <meta property="og:image" content="${image}" />
          <meta property="og:url" content="${storyUrl}" />
          <meta property="og:type" content="article" />

          <!-- Twitter Meta -->
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="${title}" />
          <meta name="twitter:description" content="${description}" />
          <meta name="twitter:image" content="${image}" />

          <meta name="theme-color" content="#C01918" />

          <script>
            const bots = /(facebook|twitter|linkedin|whatsapp|discord|telegram|bot|crawler|spider)/i;
            if (!bots.test(navigator.userAgent)) {
              window.location.href = "${storyUrl}";
            }
          </script>
        </head>
        <body>
          <p>Redirecting to <a href="${storyUrl}">${storyUrl}</a>...</p>
        </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Server Error: " + error.message);
  }
}
