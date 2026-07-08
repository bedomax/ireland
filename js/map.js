const COLOR_STOPS = [
  { t: 0, color: [36, 51, 43] },
  { t: 0.35, color: [54, 102, 74] },
  { t: 0.65, color: [109, 168, 112] },
  { t: 1, color: [214, 232, 168] },
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function colorAt(t) {
  const x = Math.max(0, Math.min(1, t));
  let left = COLOR_STOPS[0];
  let right = COLOR_STOPS[COLOR_STOPS.length - 1];
  for (let i = 0; i < COLOR_STOPS.length - 1; i += 1) {
    if (x >= COLOR_STOPS[i].t && x <= COLOR_STOPS[i + 1].t) {
      left = COLOR_STOPS[i];
      right = COLOR_STOPS[i + 1];
      break;
    }
  }
  const local = (x - left.t) / (right.t - left.t || 1);
  const rgb = left.color.map((c, i) => Math.round(lerp(c, right.color[i], local)));
  return `rgb(${rgb.join(",")})`;
}

function formatNumber(n) {
  return new Intl.NumberFormat("en-IE").format(n);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function locateBadge(via) {
  if (via === "eircode") {
    return `<span class="badge badge-good">Locatable · Eircode</span>`;
  }
  if (via === "address") {
    return `<span class="badge badge-warn">Locatable · address only</span>`;
  }
  return `<span class="badge badge-bad">Not locatable</span>`;
}

function buildLegend(el, max) {
  const steps = [0, 0.25, 0.5, 0.75, 1];
  el.innerHTML = steps
    .map((t) => {
      const value = Math.round(max * t);
      return `<div class="legend-item">
        <span class="swatch" style="background:${colorAt(t)}"></span>
        <span>${t === 0 ? "Fewer" : t === 1 ? "More operators" : ""}</span>
        <span class="count">${formatNumber(value)}</span>
      </div>`;
    })
    .join("");
}

function buildCountyList(el, counties, max, onSelect) {
  el.innerHTML = "";
  counties.forEach((c) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.county = c.county;
    btn.innerHTML = `
      <span>
        <strong>${escapeHTML(c.county)}</strong>
        <div class="bar"><span style="width:${(100 * c.operators) / max}%"></span></div>
      </span>
      <span>${formatNumber(c.operators)}</span>
    `;
    btn.addEventListener("click", () => onSelect(c.county));
    li.appendChild(btn);
    el.appendChild(li);
  });
}

function setActiveCounty(county) {
  document.querySelectorAll(".county-list button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.county === county);
  });
}

function updateGeocodeStatus(stats) {
  const geocoded = stats.geocoded ?? 0;
  const withEircode = stats.eircodes_present ?? 0;
  const total = stats.total;
  const pct = total ? Math.round((100 * geocoded) / total) : 0;
  const eircodePct = total ? ((100 * withEircode) / total).toFixed(1) : "0";

  document.getElementById("stat-total").textContent = formatNumber(total);
  document.getElementById("stat-eircode").textContent = formatNumber(withEircode);
  document.getElementById("stat-geocoded").textContent = formatNumber(geocoded);
  document.getElementById("geocode-progress").style.width = `${pct}%`;

  const statusEl = document.getElementById("geocode-status-text");
  if (geocoded === 0) {
    statusEl.innerHTML = `
      No per-operator coordinates yet.<br>
      <strong>${formatNumber(withEircode)}</strong> of ${formatNumber(total)}
      have an Eircode (${eircodePct}%) ready for geocoding;
      the rest will fall back to address lookup.
    `;
  } else {
    statusEl.innerHTML = `
      <strong>${formatNumber(geocoded)}</strong> / ${formatNumber(total)}
      geocoded (${pct}%). That unlocks the point heat map layer.
    `;
  }

  const note = document.getElementById("pipeline-note");
  if (note) {
    note.textContent =
      geocoded === 0
        ? "Pipeline: CSV ready → county density (now) → geocode address/Eircode → concentration heat map."
        : `Pipeline: ${formatNumber(geocoded)} points geocoded. Next: density heat layer.`;
  }
}

function showSidebarDetail(card, countyMeta, countyDetail) {
  if (!countyMeta) {
    card.classList.add("empty");
    card.innerHTML = `
      <h3>Select a county</h3>
      <p>
        Click a zone to inspect CSV fields and check whether each operator
        can be located via Eircode or address.
      </p>
      <button type="button" class="btn-view-more" id="btn-directory-all">
        View more · all producers
      </button>
    `;
    document.getElementById("btn-directory-all")?.addEventListener("click", () => {
      openDirectory({ operators: window.__allOperators || [] });
    });
    return;
  }

  card.classList.remove("empty");
  card.innerHTML = `
    <h3>${escapeHTML(countyMeta.county)}</h3>
    <p>
      <strong>${formatNumber(countyMeta.operators)}</strong> operators ·
      ${formatNumber(countyDetail?.locatable_eircode ?? 0)} with Eircode ·
      ${formatNumber(countyDetail?.locatable_address ?? 0)} address-only.
    </p>
    <button type="button" class="btn-view-more" id="btn-directory-county">
      View more · ${escapeHTML(countyMeta.county)} directory
    </button>
  `;
  document.getElementById("btn-directory-county")?.addEventListener("click", () => {
    openDirectory({
      county: countyMeta.county,
      operators: window.__allOperators || [],
    });
  });
}

function popupHTML(props, detail) {
  const eircode = detail?.locatable_eircode ?? 0;
  const addressOnly = detail?.locatable_address ?? 0;
  return `
    <div class="map-popup">
      <h3>${escapeHTML(props.county)}</h3>
      <dl>
        <dt>Operators</dt><dd>${formatNumber(props.operators)}</dd>
        <dt>With Eircode</dt><dd>${formatNumber(eircode)}</dd>
        <dt>Address only</dt><dd>${formatNumber(addressOnly)}</dd>
        <dt>Share</dt><dd>${props.share}%</dd>
      </dl>
      <p class="popup-hint">Click for full CSV fields &amp; locate check</p>
    </div>
  `;
}

const INSPECTOR_PREVIEW_LIMIT = 5;

function mapsURL(op) {
  const mapsQuery = encodeURIComponent(
    [op.eircode, op.address, op.county, "Ireland"].filter(Boolean).join(", "),
  );
  return `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
}

function filterOperators(operators, { county, locate = "all", primary = "all", query = "" } = {}) {
  let list = operators;
  if (county) list = list.filter((op) => op.county === county);
  if (locate === "eircode") list = list.filter((op) => op.locate_via === "eircode");
  if (locate === "address") list = list.filter((op) => op.locate_via === "address");
  if (locate === "none") list = list.filter((op) => op.locate_via === "none");
  if (primary === "yes") list = list.filter((op) => op.primary);
  if (primary === "no") list = list.filter((op) => !op.primary);
  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter((op) =>
      [op.name, op.address, op.eircode, op.reference, op.activities, op.categories, op.body]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  return list;
}

function operatorCard(op, { compact = false } = {}) {
  const note = op.data_note
    ? `<p class="op-note"><strong>Data note:</strong> ${escapeHTML(op.data_note)}</p>`
    : "";

  const contactBlock = `
    <div class="contact-block">
      <h5>Contact</h5>
      <dl class="op-fields contact-fields">
        <dt>Operator</dt><dd>${escapeHTML(op.name || "—")}</dd>
        <dt>Postal address</dt><dd>${escapeHTML(op.address || "—")}</dd>
        <dt>Eircode</dt><dd>${escapeHTML(op.eircode || "—")}</dd>
        <dt>County</dt><dd>${escapeHTML(op.county)}</dd>
        <dt>Email / phone</dt><dd class="muted">Not in CSV source</dd>
        <dt>Certification body</dt><dd>${escapeHTML(op.body || "—")}</dd>
      </dl>
    </div>
  `;

  const extraFields = compact
    ? ""
    : `
      <dl class="op-fields">
        <dt>Primary producer</dt><dd>${op.primary ? "Yes" : "No"}</dd>
        <dt>Activities</dt><dd>${escapeHTML(op.activities || "—")}</dd>
        <dt>Product categories</dt><dd>${escapeHTML(op.categories || "—")}</dd>
        <dt>Geo status</dt><dd>${escapeHTML(op.geo_status || "—")}</dd>
        <dt>Locate via</dt><dd>${escapeHTML(op.locate_via)}</dd>
        <dt>Coordinates</dt><dd>Not geocoded yet</dd>
      </dl>
    `;

  return `
    <article class="operator-card" data-via="${escapeHTML(op.locate_via)}">
      <header>
        <div>
          <h4>${escapeHTML(op.name)}</h4>
          <p class="op-ref">${escapeHTML(op.reference)}</p>
        </div>
        ${locateBadge(op.locate_via)}
      </header>
      ${contactBlock}
      ${extraFields}
      ${note}
      <div class="op-actions">
        <a href="${mapsURL(op)}" target="_blank" rel="noopener noreferrer">
          Open address in Google Maps
        </a>
      </div>
    </article>
  `;
}

function renderOperatorList(operators, county) {
  const filter = document.getElementById("locate-filter")?.value || "all";
  const query = (document.getElementById("op-search")?.value || "").trim();
  const countEl = document.getElementById("op-count");
  const listEl = document.getElementById("operator-list");
  const moreWrap = document.getElementById("view-more-wrap");
  if (!listEl) return;

  const list = filterOperators(operators, { county, locate: filter, query });
  const preview = list.slice(0, INSPECTOR_PREVIEW_LIMIT);

  if (countEl) {
    countEl.textContent =
      list.length > INSPECTOR_PREVIEW_LIMIT
        ? `(showing ${formatNumber(preview.length)} of ${formatNumber(list.length)})`
        : `(${formatNumber(list.length)})`;
  }

  listEl.innerHTML = preview.length
    ? preview.map((op) => operatorCard(op, { compact: true })).join("")
    : `<p class="empty-list">No operators match this filter.</p>`;

  if (moreWrap) {
    if (list.length > 0) {
      moreWrap.hidden = false;
      moreWrap.innerHTML = `
        <button type="button" class="btn-view-more" id="btn-view-more">
          View more · full producer directory (${formatNumber(list.length)})
        </button>
      `;
      document.getElementById("btn-view-more")?.addEventListener("click", () => {
        openDirectory({
          county,
          locate: filter,
          query,
          operators,
        });
      });
    } else {
      moreWrap.hidden = true;
      moreWrap.innerHTML = "";
    }
  }
}

function openDirectory({ county = null, locate = "all", primary = "all", query = "", operators }) {
  const modal = document.getElementById("directory-modal");
  if (!modal) return;

  window.__directoryState = { county, locate, primary, query, operators };
  modal.hidden = false;
  document.body.classList.add("modal-open");

  document.getElementById("directory-title").textContent = county
    ? `${county} producers`
    : "All producers";
  document.getElementById("directory-eyebrow").textContent = "Producer directory · contact sheet";
  document.getElementById("directory-sub").textContent =
    "Contact fields from the CSV: operator name, postal address, Eircode, county and certification body. Email and phone are not present in the source file.";

  const search = document.getElementById("directory-search");
  const locateEl = document.getElementById("directory-locate");
  const primaryEl = document.getElementById("directory-primary");
  if (search) search.value = query || "";
  if (locateEl) locateEl.value = locate || "all";
  if (primaryEl) primaryEl.value = primary || "all";

  renderDirectoryList();
  search?.focus();
}

function closeDirectory() {
  const modal = document.getElementById("directory-modal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function renderDirectoryList() {
  const state = window.__directoryState;
  if (!state) return;

  const query = document.getElementById("directory-search")?.value || "";
  const locate = document.getElementById("directory-locate")?.value || "all";
  const primary = document.getElementById("directory-primary")?.value || "all";
  const list = filterOperators(state.operators, {
    county: state.county,
    locate,
    primary,
    query,
  });

  const meta = document.getElementById("directory-meta");
  const listEl = document.getElementById("directory-list");
  if (meta) {
    meta.textContent = `${formatNumber(list.length)} producers · sorted by name · contact = address / Eircode from CSV`;
  }
  if (listEl) {
    const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name, "en"));
    listEl.innerHTML = sorted.length
      ? sorted.map((op) => operatorCard(op, { compact: false })).join("")
      : `<p class="empty-list">No producers match this filter.</p>`;
  }
}

function wireDirectoryControls(operators) {
  window.__allOperators = operators;

  document.querySelectorAll("[data-close-directory]").forEach((el) => {
    el.addEventListener("click", closeDirectory);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDirectory();
  });

  const rerender = () => {
    window.clearTimeout(window.__dirSearchTimer);
    window.__dirSearchTimer = window.setTimeout(renderDirectoryList, 120);
  };

  document.getElementById("directory-search")?.addEventListener("input", rerender);
  document.getElementById("directory-locate")?.addEventListener("change", renderDirectoryList);
  document.getElementById("directory-primary")?.addEventListener("change", renderDirectoryList);
}

function renderInspector({ county, countyMeta, countyDetail, operators }) {
  const panel = document.getElementById("inspector");
  const body = document.getElementById("inspector-body");
  const title = document.getElementById("inspector-title");
  const eyebrow = document.getElementById("inspector-eyebrow");

  if (!county) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;
  eyebrow.textContent = "County inspector · CSV fields";
  title.textContent = county;

  const topActivities = (countyDetail?.top_activities || [])
    .map(([k, v]) => `<li><span>${escapeHTML(k)}</span><strong>${formatNumber(v)}</strong></li>`)
    .join("");
  const topCategories = (countyDetail?.top_categories || [])
    .map(([k, v]) => `<li><span>${escapeHTML(k)}</span><strong>${formatNumber(v)}</strong></li>`)
    .join("");
  const cert = Object.entries(countyMeta?.certification || {})
    .map(([k, v]) => `<li><span>${escapeHTML(k)}</span><strong>${formatNumber(v)}</strong></li>`)
    .join("");

  body.innerHTML = `
    <section class="inspect-summary">
      <div class="metric-grid">
        <div>
          <strong>${formatNumber(countyDetail?.total ?? countyMeta.operators)}</strong>
          <span>Operators</span>
        </div>
        <div>
          <strong>${formatNumber(countyDetail?.locatable_eircode ?? 0)}</strong>
          <span>Eircode (best)</span>
        </div>
        <div>
          <strong>${formatNumber(countyDetail?.locatable_address ?? 0)}</strong>
          <span>Address only</span>
        </div>
        <div>
          <strong>${formatNumber(countyDetail?.primary ?? countyMeta.primary_yes)}</strong>
          <span>Primary producers</span>
        </div>
      </div>
      <p class="inspect-verdict">
        ${
          (countyDetail?.locatable_eircode ?? 0) + (countyDetail?.locatable_address ?? 0) ===
          (countyDetail?.total ?? 0)
            ? "All operators in this county have enough data to attempt geocoding."
            : "Some operators may be hard to place — check locate badges below."
        }
        Prefer Eircode first (${countyDetail?.eircode_pct ?? 0}% coverage here).
      </p>
    </section>

    <section class="inspect-block">
      <h3>Certification bodies</h3>
      <ul class="kv-list">${cert || "<li>No data</li>"}</ul>
    </section>

    <section class="inspect-block">
      <h3>Top activities</h3>
      <ul class="kv-list">${topActivities || "<li>No data</li>"}</ul>
    </section>

    <section class="inspect-block">
      <h3>Top product categories</h3>
      <ul class="kv-list">${topCategories || "<li>No data</li>"}</ul>
    </section>

    <section class="inspect-block inspect-operators">
      <div class="inspect-toolbar">
        <h3>Operators <span id="op-count"></span></h3>
        <div class="toolbar-controls">
          <label class="sr-only" for="op-search">Search operators</label>
          <input id="op-search" type="search" placeholder="Search name, eircode, address…" />
          <label class="sr-only" for="locate-filter">Locate filter</label>
          <select id="locate-filter">
            <option value="all">All locate paths</option>
            <option value="eircode">Eircode</option>
            <option value="address">Address only</option>
            <option value="none">Not locatable</option>
          </select>
        </div>
      </div>
      <div class="operator-list" id="operator-list"></div>
      <div id="view-more-wrap" class="view-more-wrap"></div>
    </section>
  `;

  renderOperatorList(operators, county);

  document.getElementById("op-search")?.addEventListener("input", () => {
    window.clearTimeout(window.__opSearchTimer);
    window.__opSearchTimer = window.setTimeout(() => renderOperatorList(operators, county), 120);
  });
  document.getElementById("locate-filter")?.addEventListener("change", () => {
    renderOperatorList(operators, county);
  });
}

function styleFeature(feature, max) {
  const count = feature.properties.operators || 0;
  const t = max ? count / max : 0;
  return {
    fillColor: colorAt(t),
    weight: 1.4,
    opacity: 1,
    color: "rgba(232, 240, 234, 0.55)",
    fillOpacity: 0.88,
  };
}

async function main() {
  const [stats, geojson, countyDetail, operators] = await Promise.all([
    loadJSON("data/county_stats.json"),
    loadJSON("data/mwbd_counties.geojson"),
    loadJSON("data/county_detail.json"),
    loadJSON("data/operators.json"),
  ]);

  window.__TOTAL__ = stats.total;
  const max = Math.max(...stats.counties.map((c) => c.operators));
  const metaByCounty = Object.fromEntries(stats.counties.map((c) => [c.county, c]));

  updateGeocodeStatus(stats);
  buildLegend(document.getElementById("legend"), max);

  const detailCard = document.getElementById("detail");
  showSidebarDetail(detailCard, null, null);

  const map = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView([53.1, -8.7], 7);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 18,
  }).addTo(map);

  let selected = null;
  const layerByCounty = {};

  const countiesLayer = L.geoJSON(geojson, {
    style: (f) => styleFeature(f, max),
    onEachFeature(feature, layer) {
      const county = feature.properties.county;
      layerByCounty[county] = layerByCounty[county] || [];
      layerByCounty[county].push(layer);

      layer.bindPopup(popupHTML(feature.properties, countyDetail[county]));
      layer.on({
        mouseover(e) {
          e.target.setStyle({
            weight: 2.5,
            color: "#e8f0ea",
            fillOpacity: 0.95,
          });
          e.target.bringToFront();
        },
        mouseout(e) {
          countiesLayer.resetStyle(e.target);
          if (selected) highlightCounty(selected, false);
        },
        click() {
          selectCounty(county, false);
        },
      });
    },
  }).addTo(map);

  map.fitBounds(countiesLayer.getBounds(), { padding: [28, 28] });

  function highlightCounty(county, openPopup) {
    Object.entries(layerByCounty).forEach(([name, layers]) => {
      layers.forEach((layer) => {
        if (name === county) {
          layer.setStyle({
            weight: 2.8,
            color: "#c6e2b0",
            fillOpacity: 0.96,
          });
          layer.bringToFront();
          if (openPopup) layer.openPopup();
        } else {
          countiesLayer.resetStyle(layer);
        }
      });
    });
  }

  function selectCounty(county, openPopup = true) {
    selected = county;
    setActiveCounty(county);
    showSidebarDetail(detailCard, metaByCounty[county], countyDetail[county]);
    highlightCounty(county, openPopup);
    renderInspector({
      county,
      countyMeta: metaByCounty[county],
      countyDetail: countyDetail[county],
      operators,
    });

    const layers = layerByCounty[county] || [];
    if (layers.length) {
      const group = L.featureGroup(layers);
      map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 9 });
    }
  }

  document.getElementById("inspector-close")?.addEventListener("click", () => {
    document.getElementById("inspector").hidden = true;
  });

  wireDirectoryControls(operators);

  buildCountyList(document.getElementById("county-list"), stats.counties, max, (county) => {
    selectCounty(county, true);
  });
}

main().catch((err) => {
  console.error(err);
  document.getElementById("detail").innerHTML = `
    <h3>Could not load data</h3>
    <p>${err.message}. Serve this folder over HTTP (e.g. <code>python3 -m http.server</code>) so <code>fetch</code> can read the JSON files.</p>
  `;
});
