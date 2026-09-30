// Product telemetry. Every event carries user, session, experiment arm, and page,
// so the warehouse can build funnels, retention cohorts, and A/B results.
(function () {
  const cfg = window.SS_CONFIG;

  function getUser() {
    let user;
    try { user = JSON.parse(localStorage.getItem("ss_user")); } catch (_) { user = null; }
    if (!user || !user.id) {
      user = { id: crypto.randomUUID(), name: "" };
      saveUser(user);
    }
    return user;
  }
  function saveUser(user) {
    try { localStorage.setItem("ss_user", JSON.stringify(user)); } catch (_) { /* private mode */ }
  }
  function getSessionId() {
    let id = null;
    try { id = sessionStorage.getItem("ss_session"); } catch (_) { /* ignore */ }
    if (!id) {
      id = crypto.randomUUID();
      try { sessionStorage.setItem("ss_session", id); } catch (_) { /* ignore */ }
    }
    return id;
  }

  // Deterministic assignment: the same user always sees the same arm.
  function assignVariant(userId) {
    let h = 0;
    for (const ch of userId + cfg.experiment.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h % 2 === 0 ? "A" : "B";
  }

  const user = getUser();
  const sessionId = getSessionId();
  const variant = assignVariant(user.id);
  const queue = [];
  let flushing = false;

  async function flush() {
    if (flushing || queue.length === 0) return;
    flushing = true;
    const batch = queue.splice(0, queue.length);
    try {
      await window.SSStore.logEvents(batch);
    } catch (err) {
      queue.unshift(...batch); // retry on the next flush
      console.warn("Event logging failed; will retry", err);
    } finally {
      flushing = false;
    }
  }

  function track(eventName, { postId = null, ...properties } = {}) {
    queue.push({
      user_id: user.id,
      session_id: sessionId,
      event_name: eventName,
      post_id: postId,
      variant,
      page: location.pathname.split("/").pop() || "index.html",
      properties
    });
    if (queue.length >= 10) flush();
  }

  setInterval(flush, 3000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });

  window.SSTrack = { track, flush, user, saveUser, variant };
})();
