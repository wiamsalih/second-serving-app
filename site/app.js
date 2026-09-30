(function () {
  const { SSStore: store, SSTrack: t, SS_CONFIG: cfg } = window;
  const $ = (sel) => document.querySelector(sel);

  const ticketsEl = $("#tickets");
  const countEl = $("#count");
  const postDialog = $("#post-dialog");
  const nameDialog = $("#name-dialog");
  const toastEl = $("#toast");
  const claimLabel = cfg.experiment.arms[t.variant];

  let posts = [];
  let activeFilters = new Set();
  const seenThisSession = new Set();
  const myClaims = new Set(JSON.parse(localStorage.getItem("ss_my_claims") || "[]"));

  if (!store.live) {
    const note = $("#mode-note");
    note.hidden = false;
    note.textContent = "Demo mode: posts and claims are saved in this browser only. Add your Supabase keys in config.js to go live.";
  }

  // ---------- helpers ----------
  function minutesLeft(post) {
    return Math.max(0, Math.round((new Date(post.expires_at) - Date.now()) / 60000));
  }
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => toastEl.classList.remove("show"), 3500);
  }
  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function ensureName() {
    if (t.user.name) return Promise.resolve(true);
    return new Promise((resolve) => {
      nameDialog.showModal();
      nameDialog.addEventListener("close", function onClose() {
        nameDialog.removeEventListener("close", onClose);
        const name = new FormData($("#name-form")).get("name")?.trim();
        if (nameDialog.returnValue === "save" && name) {
          t.user.name = name;
          t.saveUser(t.user);
          t.track("signup_completed");
          resolve(true);
        } else resolve(false);
      });
    });
  }

  // ---------- rendering ----------
  function visiblePosts() {
    if (activeFilters.size === 0) return posts;
    return posts.filter((p) => {
      const tags = p.dietary ? p.dietary.split(",") : [];
      return [...activeFilters].every((f) => tags.includes(f));
    });
  }

  function render() {
    const list = visiblePosts().filter((p) => minutesLeft(p) > 0);
    countEl.textContent = list.length === 1 ? "1 spot with food right now" : `${list.length} spots with food right now`;

    if (list.length === 0) {
      ticketsEl.innerHTML = `
        <div class="empty">
          <h2>${posts.length ? "Nothing matches those filters" : "Nothing on the rail right now"}</h2>
          <p>${posts.length ? "Try clearing a filter to see everything available." : "Hosting an event with extra food? Post it and students nearby will see it right away."}</p>
          ${posts.length ? "" : '<button class="btn btn-primary" type="button" data-open-post>Post leftovers</button>'}
        </div>`;
      return;
    }

    ticketsEl.innerHTML = list.map((p) => {
      const mins = minutesLeft(p);
      const left = Math.max(0, p.portions - p.claimed);
      const pct = Math.round((left / p.portions) * 100);
      const tags = p.dietary ? p.dietary.split(",").filter(Boolean) : [];
      const mine = myClaims.has(p.id);
      const time = mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}` : `${mins}`;
      const unit = mins >= 60 ? "left" : "min left";
      return `
        <article class="ticket${mins <= 15 ? " urgent" : ""}" data-id="${p.id}" aria-label="${escapeHtml(p.title)}">
          <p class="countdown">${time}<small>${unit}</small></p>
          <h3>${escapeHtml(p.title)}</h3>
          <p class="where">${escapeHtml(p.location)}</p>
          <div class="meter" aria-hidden="true"><span style="width:${pct}%"></span></div>
          <p class="left">${left} of ${p.portions} portions left</p>
          ${tags.length ? `<ul class="tags">${tags.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
          ${p.notes ? `<p class="notes">${escapeHtml(p.notes)}</p>` : ""}
          ${mine
            ? `<p class="claimed-note">You claimed a portion. Pick it up at ${escapeHtml(p.location)}.</p>`
            : `<button class="btn btn-primary" type="button" data-claim="${p.id}" ${left === 0 ? "disabled" : ""}>${left === 0 ? "All claimed" : claimLabel}</button>`}
        </article>`;
    }).join("");

    observeTickets();
  }

  // Log a view once per post per session, when at least half the ticket is on screen.
  const viewObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const id = e.target.dataset.id;
      if (e.isIntersecting && !seenThisSession.has(id)) {
        seenThisSession.add(id);
        const p = posts.find((x) => x.id === id);
        t.track("post_viewed", { postId: id, minutes_left: p ? minutesLeft(p) : null });
      }
    }
  }, { threshold: 0.5 });
  function observeTickets() {
    viewObserver.disconnect();
    ticketsEl.querySelectorAll(".ticket").forEach((el) => viewObserver.observe(el));
  }

  async function load() {
    try {
      posts = await store.listActivePosts();
      render();
    } catch (err) {
      console.error(err);
      countEl.textContent = "Couldn't load food posts. Check your connection and refresh.";
      t.track("load_failed", { message: String(err.message || err) });
    }
  }

  // ---------- actions ----------
  async function handleClaim(id, button) {
    t.track("claim_clicked", { postId: id, cta_label: claimLabel });
    if (!(await ensureName())) { t.track("claim_abandoned", { postId: id, reason: "no_name" }); return; }
    button.disabled = true;
    try {
      await load(); // refresh counts to avoid claiming the last portion twice
      const p = posts.find((x) => x.id === id);
      if (!p || p.portions - p.claimed <= 0 || minutesLeft(p) <= 0) {
        toast("Sorry, that one's gone. Check the other spots.");
        t.track("claim_failed", { postId: id, reason: "unavailable" });
        render();
        return;
      }
      await store.claim(id, t.user);
      myClaims.add(id);
      localStorage.setItem("ss_my_claims", JSON.stringify([...myClaims]));
      t.track("claim_completed", { postId: id, minutes_left: minutesLeft(p) });
      toast(`Claimed. Pick it up at ${p.location}.`);
      await load();
    } catch (err) {
      console.error(err);
      button.disabled = false;
      toast("Couldn't claim that. Try again.");
      t.track("claim_failed", { postId: id, reason: "error" });
    }
  }

  async function openPost() {
    t.track("post_form_opened");
    if (!(await ensureName())) return;
    $("#post-error").textContent = "";
    postDialog.showModal();
  }

  $("#post-form").addEventListener("submit", async (e) => {
    const submitter = e.submitter;
    if (!submitter || submitter.value !== "post") { t.track("post_form_cancelled"); return; }
    e.preventDefault();
    const form = new FormData(e.target);
    const minutes = Number(form.get("minutes"));
    const post = {
      organizer_id: t.user.id,
      organizer_name: t.user.name,
      title: form.get("title").trim(),
      location: form.get("location").trim(),
      notes: form.get("notes").trim() || null,
      dietary: form.getAll("dietary").join(","),
      portions: Number(form.get("portions")),
      expires_at: new Date(Date.now() + minutes * 60000).toISOString()
    };
    const btn = $("#post-submit");
    btn.disabled = true;
    try {
      const row = await store.createPost(post);
      t.track("post_created", { postId: row.id, portions: post.portions, minutes_available: minutes, dietary: post.dietary });
      postDialog.close();
      e.target.reset();
      toast("Posted. Students can see it now.");
      await load();
    } catch (err) {
      console.error(err);
      $("#post-error").textContent = "Couldn't post that. Check each field and try again.";
      t.track("post_failed", { message: String(err.message || err) });
    } finally {
      btn.disabled = false;
    }
  });

  document.addEventListener("click", (e) => {
    const claimBtn = e.target.closest("[data-claim]");
    if (claimBtn) handleClaim(claimBtn.dataset.claim, claimBtn);
    if (e.target.closest("#open-post, [data-open-post]")) openPost();
  });

  $("#filters").addEventListener("change", (e) => {
    const v = e.target.value;
    e.target.checked ? activeFilters.add(v) : activeFilters.delete(v);
    t.track("filter_changed", { filter: v, enabled: e.target.checked, active: [...activeFilters].join(",") });
    render();
  });

  // ---------- start ----------
  t.track("page_view", { referrer: document.referrer || null, returning: Boolean(t.user.name) });
  load();
  setInterval(load, 30000);  // pick up new posts and claims
  setInterval(render, 15000); // keep countdowns current
})();
