// Types the headline, then cycles through a few prompts and settles back on "Second serving?".
(function () {
  const el = document.getElementById("typed");
  if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const phrases = [
    ["Second ", "serving?"],
    ["Still ", "hungry?"],
    ["Free ", "lunch?"],
    ["Save a ", "plate?"]
  ];
  const TYPE = 85, ERASE = 40, HOLD = 2600, HOLD_HOME = 5200, GAP = 350;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function draw([plain, accent], n) {
    const a = plain.slice(0, n);
    const b = accent.slice(0, Math.max(0, n - plain.length));
    el.innerHTML = a.replace(/ /g, "&nbsp;") + (b ? `<em>${b}</em>` : "");
  }

  async function run() {
    let i = 0;
    for (;;) {
      const p = phrases[i];
      const len = p[0].length + p[1].length;
      for (let n = 0; n <= len; n++) { draw(p, n); await sleep(TYPE + Math.random() * 40); }
      await sleep(i === 0 ? HOLD_HOME : HOLD);
      for (let n = len; n >= 0; n--) { draw(p, n); await sleep(ERASE); }
      await sleep(GAP);
      i = (i + 1) % phrases.length;
    }
  }

  el.textContent = "";
  sleep(400).then(run);
})();
