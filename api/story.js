// api/story.js
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
  if (!slug) return res.status(400).send("Missing slug");

  try {
    const storiesRef = db.collection("stories");
    const snapshot = await storiesRef.where("slug", "==", slug).limit(1).get();

    if (snapshot.empty) {
      console.log("No story found for slug:", slug);
      return res.status(404).send("Story not found");
    }

    const story = snapshot.docs[0].data();

    const title = (story.title || "Story").replace(/"/g, "&quot;");
    const desc = (story.excerpt || (story.content || "").slice(0, 150)).replace(/"/g, "&quot;");
    const image = story.coverUrl || "";

    const metaHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://storyplugs.netlify.app/story/${slug}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${image}" />
  <title>${title}</title>
</head>
<body>
  <h1>${title}</h1>
  <p>${desc}...</p>
  ${ image ? `<img src="${image}" alt="cover" style="max-width:400px"/>` : "" }
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(metaHtml);
  } catch (err) {
    console.error("Error in story API:", err);
    return res.status(500).send("Internal Server Error");
  }
}
