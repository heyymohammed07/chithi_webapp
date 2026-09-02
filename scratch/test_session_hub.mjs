// test_session_hub.mjs
const BASE = "http://localhost:3000";

async function run() {
  console.log("=== Testing Music Search & Curated List ===");
  const resMusicEmpty = await fetch(`${BASE}/api/music/search`);
  const jsonMusicEmpty = await resMusicEmpty.json();
  console.log("Curated music response ok:", jsonMusicEmpty.ok, "Count:", jsonMusicEmpty.data?.songs?.length);
  if (!jsonMusicEmpty.ok || jsonMusicEmpty.data?.songs?.length !== 6) {
    throw new Error("Failed curated songs test");
  }

  const resMusicSearch = await fetch(`${BASE}/api/music/search?q=tumi`);
  const jsonMusicSearch = await resMusicSearch.json();
  console.log("Search music response ok:", jsonMusicSearch.ok, "Count:", jsonMusicSearch.data?.songs?.length);
  if (!jsonMusicSearch.ok || jsonMusicSearch.data?.songs?.length === 0) {
    throw new Error("Failed music search test");
  }

  console.log("\n=== Testing Mailbox Creation & Profile ===");
  const testUser = "hub_user_" + Math.random().toString(36).slice(2, 7);
  const resCreate = await fetch(`${BASE}/api/mailbox/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: testUser,
      durationKey: "24h",
      gender: "female",
    }),
  });
  const jsonCreate = await resCreate.json();
  console.log("Mailbox create ok:", jsonCreate.ok, "Username:", jsonCreate.data?.username);
  if (!jsonCreate.ok) throw new Error("Mailbox creation failed");

  const token = jsonCreate.data.accessToken;

  // Profile API
  const resProfile = await fetch(`${BASE}/api/mailbox/profile?username=${testUser}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const jsonProfile = await resProfile.json();
  console.log("Profile API ok:", jsonProfile.ok, "Data:", jsonProfile.data);
  if (!jsonProfile.ok || jsonProfile.data?.username !== testUser) {
    throw new Error("Profile API failed");
  }

  console.log("\n=== Testing Sending Letter with Attached Song ===");
  const attachedSong = jsonMusicEmpty.data.songs[0];
  const resSend = await fetch(`${BASE}/api/letters/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: testUser,
      body: "আমার গোপন চিঠি সুরের সাথে ভেসে এলো তোমার কাছে।",
      paper: "parchment",
      stamp: "wax",
      hints: ["এক অচেনা সুর"],
      attachedSong,
      mode: { kind: "none" },
    }),
  });
  const jsonSend = await resSend.json();
  console.log("Send letter with song ok:", jsonSend.ok, "LetterId:", jsonSend.data?.id);
  if (!jsonSend.ok) throw new Error("Send letter failed");

  console.log("\n=== Testing Inbox Listing with Attached Song ===");
  const resInbox = await fetch(`${BASE}/api/letters/list?username=${testUser}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const jsonInbox = await resInbox.json();
  console.log("Inbox letters count:", jsonInbox.data?.letters?.length);
  const firstLetter = jsonInbox.data?.letters?.[0];
  console.log("First letter attachedSong title:", firstLetter?.attachedSong?.title);
  if (firstLetter?.attachedSong?.title !== attachedSong.title) {
    throw new Error("Attached song not preserved in letter");
  }

  console.log("\n=== Testing Home Page (GET /) ===");
  const resHome = await fetch(`${BASE}/`);
  console.log("Home page status:", resHome.status);
  const homeHtml = await resHome.text();
  console.log("Home page HTML includes Chithi:", homeHtml.includes("Chithi"));
  console.log("Home page HTML includes #FAF7F2:", homeHtml.includes("FAF7F2"));

  console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
