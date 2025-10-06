import admin from "firebase-admin";

// ✅ Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  const { slug } = req.query;

  try {
    const storiesRef = db.collection("stories");
    const snapshot = await storiesRef.where("slug", "==", slug).limit(1).get();

    if (snapshot.empty) {
      console.log("❌ No story found for slug:", slug);
      return res.status(404).json({ error: "Story not found" });
    }

    const story = snapshot.docs[0].data();

    // ✅ Detect if request comes from a social media crawler (bot)
    const userAgent = req.headers["user-agent"] || "";
    const isBot = /bot|facebook|twitter|whatsapp|crawler|spider|threads|preview|linkedin|telegram|instagram/i.test(userAgent);

    // ✅ If it's a real human, redirect to your React app (with hash route to prevent Netlify loop)
    if (!isBot) {
      return res.redirect(302, `https://storyplugs.netlify.app/#/story/${slug}`);
    }

    // ✅ Otherwise, serve the meta tags HTML for bots (link previews)
    const description =
      story.excerpt ||
      (story.content ? story.content.slice(0, 150) : "Read this story on StoryPlugs");

    const metaHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <!-- Open Graph (Facebook, WhatsApp, LinkedIn, Threads) -->
        <meta property="og:title" content="${story.title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${story.coverUrl}" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://storyplugs.netlify.app/story/${slug}" />

        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${story.title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${story.coverUrl}" />

        <title>${story.title}</title>
      </head>
      <body style="font-family: sans-serif; text-align: center; padding: 2rem;">
        <h1>${story.title}</h1>
        <p>${description}...</p>
        <img src="${story.coverUrl}" alt="cover" style="max-width:400px;border-radius:10px;" />
      </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(metaHtml);

  } catch (error) {
    console.error("🔥 Error loading story:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
