// Data layer: Supabase in production, browser storage in demo mode.
(function () {
  const cfg = window.SS_CONFIG;
  const live = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const db = live ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

  const LOCAL_KEY = "ss_demo_db";
  const readLocal = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_KEY));
      if (raw) return raw;
    } catch (_) { /* fall through to seed */ }
    const now = Date.now();
    const seed = {
      posts: [
        { id: crypto.randomUUID(), created_at: new Date(now - 6e5).toISOString(), organizer_id: "demo", organizer_name: "Startup Studio",
          title: "Veggie wraps and fruit", location: "Bloomberg Center, 2nd floor lounge", notes: "Wraps are labeled. Bring a napkin.",
          dietary: "vegetarian", portions: 18, expires_at: new Date(now + 55 * 6e4).toISOString() },
        { id: crypto.randomUUID(), created_at: new Date(now - 3e5).toISOString(), organizer_id: "demo", organizer_name: "Tata Innovation Center",
          title: "Chicken biryani trays", location: "Tata, ground floor kitchen", notes: "",
          dietary: "halal,gluten-free", portions: 12, expires_at: new Date(now + 25 * 6e4).toISOString() }
      ],
      claims: [],
      events: []
    };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(seed));
    return seed;
  };
  const writeLocal = (data) => localStorage.setItem(LOCAL_KEY, JSON.stringify(data));

  async function listActivePosts() {
    const nowIso = new Date().toISOString();
    if (live) {
      const [{ data: posts, error: e1 }, { data: counts, error: e2 }] = await Promise.all([
        db.from("food_posts").select("*").gt("expires_at", nowIso).order("expires_at"),
        db.from("post_claim_counts").select("*")
      ]);
      if (e1 || e2) throw e1 || e2;
      const byPost = Object.fromEntries(counts.map((c) => [c.post_id, c.claimed]));
      return posts.map((p) => ({ ...p, claimed: byPost[p.id] || 0 }));
    }
    const data = readLocal();
    return data.posts
      .filter((p) => p.expires_at > nowIso)
      .sort((a, b) => a.expires_at.localeCompare(b.expires_at))
      .map((p) => ({ ...p, claimed: data.claims.filter((c) => c.post_id === p.id).length }));
  }

  async function createPost(post) {
    if (live) {
      const { data, error } = await db.from("food_posts").insert(post).select().single();
      if (error) throw error;
      return data;
    }
    const data = readLocal();
    const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...post };
    data.posts.push(row);
    writeLocal(data);
    return row;
  }

  async function claim(postId, user) {
    const row = { post_id: postId, user_id: user.id, user_name: user.name, portions: 1 };
    if (live) {
      const { error } = await db.from("claims").insert(row);
      if (error) throw error;
      return;
    }
    const data = readLocal();
    data.claims.push({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...row });
    writeLocal(data);
  }

  async function logEvents(rows) {
    if (live) {
      const { error } = await db.from("events").insert(rows);
      if (error) throw error;
      return;
    }
    const data = readLocal();
    data.events.push(...rows.map((r) => ({ occurred_at: new Date().toISOString(), ...r })));
    writeLocal(data);
  }

  window.SSStore = { live, listActivePosts, createPost, claim, logEvents };
})();
