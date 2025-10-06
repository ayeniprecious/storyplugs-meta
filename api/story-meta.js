import admin from "firebase-admin";


// Initialize Firebase Admin only once
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
    // Find the story with matching slug
    const storiesRef = db.collection("stories");
    const snapshot = await storiesRef.where("slug", "==", slug).limit(1).get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "Story not found" });
    }

    const story = snapshot.docs[0].data();

    // Build Open Graph meta tags
    const metaHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta property="og:title" content="${story.title}" />
        <meta property="og:description" content="${story.excerpt || story.content.slice(0, 150)}" />
        <meta property="og:image" content="${story.coverUrl}" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://your-vercel-app.vercel.app/story/${slug}" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${story.title}" />
        <meta name="twitter:description" content="${story.excerpt || story.content.slice(0, 150)}" />
        <meta name="twitter:image" content="${story.coverUrl}" />
        <title>${story.title}</title>
      </head>
      <body>
        <h1>${story.title}</h1>
        <p>${story.excerpt || story.content.slice(0, 150)}...</p>
        <img src="${story.coverUrl}" alt="cover" style="max-width:400px;" />
      </body>
      </html>
    `;
      console.log("Slug received:", slug);
      console.log("Env:", process.env.FIREBASE_PROJECT_ID);
      console.log("Query result:", snapshot.empty ? "No results" : "Found");


    res.setHeader("Content-Type", "text/html");
    res.status(200).send(metaHtml);

  } catch (error) {
    console.error("Error loading story:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

