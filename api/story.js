import admin from "firebase-admin";

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  const { slug } = req.query;
  const userAgent = req.headers["user-agent"] || "";
  const isBot = /bot|facebook|twitter|whatsapp|linkedin|telegram|instagram|threads|crawler|spider|preview/i.test(
    userAgent
  );

  try {
    if (!slug) {
      return res.status(400).send("<h1>Missing story slug</h1>");
    }

    // Fetch story from Firestore (same logic as React app)
    const snapshot = await db
      .collection("stories")
      .where("slug", "==", slug)
      .where("status", "==", "approved")
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("❌ No Story Found!");
      return res.status(404).send("<h1>Story not found</h1>");
    }

    const docSnap = snapshot.docs[0];
    const storyId = docSnap.id;
    const story = { id: storyId, ...docSnap.data() };

    // Increment views for both human and bot
    await db
      .collection("stories")
      .doc(storyId)
      .update({ views: admin.firestore.FieldValue.increment(1) });

    const title = story.title || "Untitled Story";
    const description =
      story.excerpt ||
      (story.content ? story.content.slice(0, 150) : "Read amazing stories on StoryPlugs.");
    const image =
      story.coverUrl ||
      "https://storyplugs.vercel.app/default-preview.jpg";
    const storyUrl = `https://storyplugs.vercel.app/story/${slug}`;

    // For humans, redirect to SPA page
    if (!isBot) {
      return res.redirect(302, storyUrl);
    }

    // For bots, render HTML with meta tags
    const metaHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta property="og:title" content="${title}" />
          <meta property="og:description" content="${description}" />
          <meta property="og:image" content="${image}" />
          <meta property="og:type" content="article" />
          <meta property="og:url" content="${storyUrl}" />

          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="${title}" />
          <meta name="twitter:description" content="${description}" />
          <meta name="twitter:image" content="${image}" />

          <meta property="og:site_name" content="StoryPlugs" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${title}</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 50px;
              color: #333;
              text-align: center;
            }
            img {
              max-width: 400px;
              margin-top: 20px;
              border-radius: 10px;
              box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>${description}...</p>
          <img src="${image}" alt="cover image" />
        </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(metaHtml);
  } catch (err) {
    console.error("🔥 Meta Function Error:", err);
    res.status(500).send("<h1>Internal Server Error</h1>");
  }
}
