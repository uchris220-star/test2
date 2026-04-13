const catalogue = window.maiCatalogue;
const watchRoot = document.getElementById("watch-root");

if (!catalogue) {
  throw new Error("MAI catalogue data was not loaded.");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function joinMeta(...parts) {
  return parts.filter(Boolean).join(" | ");
}

function getArtworkProps(item, imageOverride, baseClass) {
  const imageUrl = imageOverride || catalogue.getArtwork(item);
  const classNames = [baseClass, escapeHtml(item.artClass)];

  if (imageUrl) {
    classNames.push("has-image");
  }

  return {
    className: classNames.join(" "),
    styleAttr: imageUrl
      ? ` style="--poster-image: url('${escapeHtml(imageUrl)}');"`
      : "",
  };
}

function withPreviewParam(url) {
  if (!catalogue.isPreviewMode) {
    return url;
  }

  const [path, hashFragment = ""] = String(url).split("#");
  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}editorPreview=1${hashFragment ? `#${hashFragment}` : ""}`;
}

function getDetailHref(item, episode) {
  const baseUrl = `./watch.html?show=${encodeURIComponent(item.id)}`;

  if (!episode) {
    return withPreviewParam(baseUrl);
  }

  return withPreviewParam(`${baseUrl}&episode=${encodeURIComponent(episode.id)}`);
}

function getPlayHref(item, episode) {
  const baseUrl = `./play.html?show=${encodeURIComponent(item.id)}`;

  if (!episode) {
    return withPreviewParam(baseUrl);
  }

  return withPreviewParam(`${baseUrl}&episode=${encodeURIComponent(episode.id)}`);
}

function getAvailability(entry) {
  return catalogue.getPlaybackAvailability(entry);
}

function getEffectiveAvailability(item, entry) {
  if (!item?.ppvEnabled) {
    return getAvailability(entry);
  }

  const hasMedia = Boolean(entry?.mediaUrl || item?.mediaUrl);

  if (!hasMedia) {
    return {
      state: "missing",
      isPlayable: false,
      label: "Coming Soon",
      detailText: "Media file not added yet.",
    };
  }

  if (!isPpvUnlocked(item)) {
    return {
      state: "locked",
      isPlayable: false,
      label: "PPV Locked",
      detailText: "Complete payment to unlock this title.",
    };
  }

  return {
    state: "unlocked",
    isPlayable: true,
    label: "PPV Unlocked",
    detailText: "Payment completed. Ready to watch.",
  };
}

function getPpvMethods(item) {
  return Array.isArray(item?.ppvMethods)
    ? item.ppvMethods.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];
}

function formatPpvEventDate(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return "";
  }

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return rawValue;
  }

  return new Intl.DateTimeFormat("en-FJ", {
    timeZone: "Pacific/Fiji",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate);
}



const PPV_UNLOCK_STORAGE_KEY = "mai-plus-ppv-unlocks";

function getStoredUnlocks() {
  try {
    const rawValue = window.localStorage.getItem(PPV_UNLOCK_STORAGE_KEY);
    const parsed = rawValue ? JSON.parse(rawValue) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function isPpvUnlocked(item) {
  if (!item?.ppvEnabled) {
    return true;
  }

  const itemId = String(item?.id || "").trim();
  return Boolean(itemId && getStoredUnlocks()[itemId]);
}

function getPpvCheckoutHref(item) {
  const portalUrl = String(item?.ppvPortalUrl || "").trim();

  if (portalUrl) {
    return portalUrl;
  }

  return withPreviewParam(`./checkout.html?show=${encodeURIComponent(item?.id || "")}&return=play`);
}

function isLivePpvEvent(item) {
  return Boolean(item?.ppvEnabled && String(item?.ppvEventType || "locked_title") === "live_event");
}

function hasPpvLiveSource(item) {
  return Boolean(
    String(item?.ppvLiveEmbedUrl || "").trim() ||
    String(item?.ppvLiveStreamUrl || "").trim() ||
    (Array.isArray(item?.ppvLoopFiles) && item.ppvLoopFiles.length)
  );
}

function renderPpvPanel(item) {
  return "";
}

function getPreferredMedia(item) {
  if (isLivePpvEvent(item) && hasPpvLiveSource(item)) {
    return item;
  }

  if (item.kind === "series") {
    return catalogue.getDefaultEpisode(item);
  }

  return item.mediaUrl ? item : null;
}

function renderNotFound() {
  document.title = "MAI+ | Program not found";
  watchRoot.innerHTML = `
    <section class="watch-empty-page">
      <p class="section-heading__eyebrow">Program not found</p>
      <h1>We couldn't find that title.</h1>
      <p>
        The link may be old, or the show id may have changed. Go back to the
        MAI+ catalogue and choose a title again.
      </p>
      <a class="button button--primary" href="${withPreviewParam("./index.html")}">Back to catalogue</a>
    </section>
  `;
}

function renderWatchAction(item, activeEpisode) {
  if (item.ppvEnabled && !isPpvUnlocked(item)) {
    return `
      <a class="button button--primary" href="${escapeHtml(getPpvCheckoutHref(item))}"${String(item.ppvPortalUrl || "").trim() ? ` target="_blank" rel="noopener noreferrer"` : ""}>
        ${escapeHtml(item.ppvButtonLabel || "Buy PPV Access")}
      </a>
    `;
  }

  const playableTarget = activeEpisode || getPreferredMedia(item) || item;
  const availability = getEffectiveAvailability(item, playableTarget);

  if (!playableTarget || !availability.isPlayable) {
    return `
      <span class="button button--secondary button--disabled">${escapeHtml(
        availability.label || "Coming Soon"
      )}</span>
    `;
  }

  return `
    <a class="button button--primary" href="${getPlayHref(item, playableTarget)}">
      ${isLivePpvEvent(item) ? "Watch Live Event" : item.kind === "series" ? "Watch Latest Episode" : "Watch Now"}
    </a>
  `;
}

function renderRow(item, rowData, index, isActive) {
  const availability = getEffectiveAvailability(item, rowData);
  const rowTitle = rowData.title || item.title;
  const rowDescription = rowData.description || item.description;
  const rowMeta = availability.isPlayable
    ? rowData.airedText || rowData.meta || availability.detailText || item.meta
    : availability.detailText || rowData.airedText || rowData.meta || item.meta;
  const rowDuration = availability.isPlayable
    ? rowData.statusLabel || rowData.duration || "Available"
    : availability.label || rowData.statusLabel || rowData.duration || "Coming Soon";
  const rowEyebrow = item.kind === "series" ? `Episode ${rowData.number || index + 1}` : item.kicker;
  const rowArtText = item.kind === "series" ? `EP ${rowData.number || index + 1}` : "PLAY";
  const activeClass = isActive ? " is-active" : "";
  const artwork = getArtworkProps(item, rowData.imageUrl, "episode-row__thumb");
  const rowContent = `
    <div class="${artwork.className}"${artwork.styleAttr}>
      <span>${escapeHtml(rowArtText)}</span>
    </div>
    <div class="episode-row__copy">
      <span class="episode-row__eyebrow">${escapeHtml(rowEyebrow)}</span>
      <strong>${escapeHtml(rowTitle)}</strong>
      <p>${escapeHtml(rowMeta)}</p>
      <p>${escapeHtml(rowDescription)}</p>
    </div>
    <div class="episode-row__meta">${escapeHtml(rowDuration)}</div>
  `;

  if (!availability.isPlayable) {
    const lockedClass = availability.state === "locked" ? " episode-row--locked" : " episode-row--disabled";
    return `<article class="episode-row${lockedClass}${activeClass}">${rowContent}</article>`;
  }

  return `
    <a class="episode-row${activeClass}" href="${getPlayHref(item, rowData)}">
      ${rowContent}
    </a>
  `;
}

function renderEpisodeRows(item, activeEpisode) {
  if (item.kind === "series") {
    return item.episodes
      .map((episode, index) =>
        renderRow(item, episode, index, Boolean(activeEpisode && activeEpisode.id === episode.id))
      )
      .join("");
  }

  return renderRow(
    item,
    {
      title: item.title,
      description: item.description,
      meta: item.meta,
      airedText: "Ready to play on its own dedicated player page.",
      duration: item.mediaUrl ? "Play now" : "Coming soon",
      mediaUrl: item.mediaUrl,
      mediaType: item.mediaType,
    },
    0,
    true
  );
}

function renderWatchPage(item, activeEpisode) {
  const currentSelection = activeEpisode || getPreferredMedia(item);
  const selectionAvailability = getEffectiveAvailability(item, currentSelection || item);
  const currentMeta = activeEpisode
    ? joinMeta(item.meta, activeEpisode.meta || activeEpisode.duration)
    : item.meta;
  const collectionLabel =
    item.collectionLabel || (item.kind === "series" ? "Season 1" : "Replay");
  const artwork = getArtworkProps(item, activeEpisode?.imageUrl || item.imageUrl, "detail-card__art");
  const unlockedBadge = item.ppvEnabled && isPpvUnlocked(item)
    ? '<span class="ppv-unlocked-badge">PPV Unlocked</span>'
    : '';

  watchRoot.innerHTML = `
    <section class="detail-shell">
      <div class="detail-card">
        <div class="${artwork.className}"${artwork.styleAttr}></div>

        <div class="detail-card__content">
          <p class="section-heading__eyebrow">${escapeHtml(item.sectionTitle)}</p>
          <div class="detail-title-row">
            <h1>${escapeHtml(item.title)}</h1>
            ${unlockedBadge}
          </div>
          <p class="detail-card__summary">${escapeHtml(item.description)}</p>
          <p class="detail-card__meta">${escapeHtml(
            selectionAvailability.isPlayable
              ? currentMeta
              : joinMeta(currentMeta, selectionAvailability.detailText)
          )}</p>

          <div class="detail-actions">
            ${renderWatchAction(item, currentSelection)}
            <a class="button button--secondary" href="#episode-list">More Info</a>
          </div>
        </div>
      </div>
    </section>

    ${renderPpvPanel(item)}

    <section class="detail-controls" id="episode-list">
      <div class="detail-controls__group">
        <label class="detail-controls__label" for="detail-collection">Collection</label>
        <select class="detail-select" id="detail-collection" disabled>
          <option>${escapeHtml(collectionLabel)}</option>
        </select>
      </div>
      <button class="button button--secondary button--small button--disabled" type="button" disabled>
        ${escapeHtml(item.sortLabel || "Ascending")}
      </button>
    </section>

    <section class="detail-list">
      ${renderEpisodeRows(item, activeEpisode)}
    </section>
  `;
}

const params = new URLSearchParams(window.location.search);
const showId = params.get("show");
const requestedEpisode = params.get("episode");
const item = catalogue.getItemById(showId);

if (!item) {
  renderNotFound();
} else {
  const activeEpisode =
    item.kind === "series"
      ? (() => {
          const requested = catalogue.getEpisodeById(item, requestedEpisode);
          if (requested) {
            return requested;
          }
          if (item.ppvEnabled) {
            return item.episodes.find((episode) => episode.mediaUrl) || item.episodes[0] || null;
          }
          return catalogue.getDefaultEpisode(item) || item.episodes[0] || null;
        })()
      : null;

  document.title = `MAI+ | ${item.title}`;
  renderWatchPage(item, activeEpisode);
}
