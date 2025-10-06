import admin from "firebase-admin";

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    })
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
const { slug } = req.query;
  const userAgent = req.headers["user-agent"] || "";
  const isBot = /bot|facebook|twitter|whatsapp|linkedin|telegram|instagram|threads|crawler|spider|preview/i.test(userAgent);

  try {
    // Use same query logic as your React app
    const storiesRef = db.collection("stories");
    const snapshot = await storiesRef
      .where("slug", "==", slug)
      .where("status", "==", "approved")
      .limit(1)
    .get();

    if (snapshot.docs.length === 0) {
      return res.status(404).send("<h1>Story not found</h1>");
      console.log("No Story Found!");
    }

    const docSnap = snapshot.docs[0];
    const storyId = docSnap.id;
    const story = { id: storyId, ...docSnap.data() };

    // Increment view count for bot requests as well
    await storiesRef.doc(storyId).update({ views: admin.firestore.FieldValue.increment(1) });

    if (!isBot) {
      // Humans -> SPA handles story page
      return res.redirect(302, `/story/${slug}`);
    }


    const metaHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta property="og:title" content="${story.title}" />
        <meta property="og:description" content="${story.excerpt || story.content.slice(0, 150)}" />
        <meta property="og:image" content="${story.coverUrl}" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://storyplugs.vercel.app/story/${slug}" />
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
    console.log(metaHtml);
    console.log(story);

    if (snapshot.docs.length === 0) {
      return res.status(404).send("<h1>Story not found</h1>");
      console.log("No Story Found!");
    }

    
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(metaHtml);
  } catch (err) {
    console.error(err);
    res.status(500).send("<h1>Internal Server Error</h1>");
  }
}
