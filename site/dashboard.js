(async function () {
  const css = getComputedStyle(document.documentElement);
  const color = (name) => css.getPropertyValue(name).trim();
  const fmtPct = (x) => (x == null ? "–" : `${(x * 100).toFixed(1)}%`);
  const fmtWeek = (iso) => new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

  let d;
  try {
    const res = await fetch("data/metrics.json", { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    d = await res.json();
  } catch (err) {
    document.getElementById("updated").textContent = "No metrics yet. They appear after the first GitHub Actions pipeline run.";
    return;
  }

  document.getElementById("updated").textContent =
    `Warehouse last built ${new Date(d.generated_at).toLocaleString()}.`;
  if (d.source !== "production") document.getElementById("sample-note").hidden = false;

  const t = d.totals;
  document.getElementById("meals").textContent = t.meals_saved.toLocaleString();
  document.getElementById("ns-sub").textContent =
    `${fmtPct(t.portions_posted ? t.meals_saved / t.portions_posted : null)} of ${t.portions_posted.toLocaleString()} posted portions were claimed. ` +
    `${t.users_who_claimed} of ${t.users} visitors have claimed food.`;

  Chart.defaults.font.family = css.getPropertyValue("--body");
  Chart.defaults.color = color("--muted");
  Chart.defaults.borderColor = color("--line");

  new Chart(document.getElementById("weekly"), {
    data: {
      labels: d.weekly.map((w) => fmtWeek(w.week_start)),
      datasets: [
        { type: "bar", label: "Meals saved", data: d.weekly.map((w) => w.meals_saved), backgroundColor: color("--accent"), yAxisID: "y" },
        { type: "line", label: "Rescue rate", data: d.weekly.map((w) => w.rescue_rate), borderColor: color("--ink"),
          backgroundColor: color("--ink"), yAxisID: "y1", tension: 0.3 }
      ]
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Meals" } },
        y1: { beginAtZero: true, position: "right", grid: { drawOnChartArea: false },
              ticks: { callback: (v) => `${Math.round(v * 100)}%` } }
      },
      plugins: { tooltip: { callbacks: { label: (c) => c.dataset.yAxisID === "y1" ? `Rescue rate: ${fmtPct(c.raw)}` : `Meals saved: ${c.raw}` } } }
    }
  });

  new Chart(document.getElementById("daily"), {
    type: "line",
    data: {
      labels: d.daily.map((x) => fmtWeek(x.date_day)),
      datasets: [
        { label: "Active users", data: d.daily.map((x) => x.active_users), borderColor: color("--accent"), backgroundColor: color("--accent"), tension: 0.25, pointRadius: 0 },
        { label: "New users", data: d.daily.map((x) => x.new_users), borderColor: color("--rose"), backgroundColor: color("--rose"), tension: 0.25, pointRadius: 0 }
      ]
    },
    options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, interaction: { mode: "index", intersect: false } }
  });

  // Funnel + A/B
  const arms = (window.SS_CONFIG && window.SS_CONFIG.experiment.arms) || {};
  document.getElementById("funnel").innerHTML = `
    <thead><tr><th>Button wording</th><th>Saw a post</th><th>Clicked claim</th><th>Completed claim</th><th>View to click</th><th>Click to complete</th></tr></thead>
    <tbody>${d.funnel.map((f) => `
      <tr><td>${f.variant}: “${arms[f.variant] || ""}”</td><td>${f.users_viewed}</td><td>${f.users_clicked}</td>
      <td>${f.users_completed}</td><td>${fmtPct(f.view_to_click)}</td><td>${fmtPct(f.click_to_complete)}</td></tr>`).join("")}
    </tbody>`;

  const ab = d.ab_test;
  document.getElementById("ab-summary").textContent = !ab
    ? "Not enough data in both arms yet."
    : `B's click rate is ${fmtPct(ab.rate_b)} versus ${fmtPct(ab.rate_a)} for A (${ab.lift >= 0 ? "+" : ""}${fmtPct(ab.lift)} relative). ` +
      (ab.significant
        ? `That difference is statistically significant (p = ${ab.p_value}).`
        : `That difference is not statistically significant yet (p = ${ab.p_value}, ${ab.n_a + ab.n_b} users), so keep the test running.`);

  // Retention heatmap
  const cohorts = [...new Set(d.retention.map((r) => r.cohort_week))];
  const maxWeek = Math.max(0, ...d.retention.map((r) => r.weeks_since_first_visit));
  const cell = (c, k) => d.retention.find((r) => r.cohort_week === c && r.weeks_since_first_visit === k);
  document.getElementById("retention").innerHTML = `
    <thead><tr><th>First week</th><th>Users</th>${Array.from({ length: maxWeek + 1 }, (_, k) => `<th>Week ${k}</th>`).join("")}</tr></thead>
    <tbody>${cohorts.map((c) => {
      const size = cell(c, 0)?.cohort_size ?? "";
      return `<tr><td>${fmtWeek(c)}</td><td>${size}</td>${Array.from({ length: maxWeek + 1 }, (_, k) => {
        const r = cell(c, k);
        return r ? `<td data-v style="--v:${Math.min(1, r.retention_rate) * 0.8}">${fmtPct(r.retention_rate)}</td>` : "<td></td>";
      }).join("")}</tr>`;
    }).join("")}</tbody>`;
})();
