const catalogue = window.maiCatalogue;
const playerUi = window.maiPlayer;
const playRoot = document.getElementById("play-root");

if (!catalogue) {
  throw new Error("MAI catalogue data was not loaded.");
}

if (!playerUi) {
  throw new Error("MAI player UI was not loaded.");
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

  const ppvLiveState = isLivePpvEvent(item) ? getPpvLivePlaybackState(item) : null;
  const hasMedia = isLivePpvEvent(item)
    ? ppvLiveState.mode === "stream" || ppvLiveState.mode === "embed" || ppvLiveState.mode === "loop"
    : Boolean(entry?.mediaUrl || item?.mediaUrl);

  if (!hasMedia) {
    return {
      state: "missing",
      isPlayable: false,
      label: isLivePpvEvent(item) ? "Event Offline" : "Coming Soon",
      detailText: isLivePpvEvent(item)
        ? (ppvLiveState?.message || "This event is not live right now.")
        : "Media file not added yet.",
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

function inferMediaTypeFromPath(value) {
  const lowerValue = String(value || "").trim().toLowerCase();

  if (lowerValue.endsWith(".m3u8")) return "application/x-mpegURL";
  if (lowerValue.endsWith(".mp4")) return "video/mp4";
  if (lowerValue.endsWith(".webm")) return "video/webm";
  if (lowerValue.endsWith(".mov")) return "video/quicktime";
  return "";
}

function getPpvLivePlaybackState(item) {
  const embedUrl = String(item?.ppvLiveEmbedUrl || "").trim();
  const streamUrl = String(item?.ppvLiveStreamUrl || "").trim();
  const loopFiles = Array.isArray(item?.ppvLoopFiles)
    ? item.ppvLoopFiles.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];
  const offlineMode = String(item?.ppvOfflineMode || "message").trim().toLowerCase();

  if (embedUrl) {
    return { mode: "embed", embedUrl };
  }

  if (streamUrl) {
    return {
      mode: "stream",
      src: streamUrl,
      type: String(item?.ppvLiveStreamType || "").trim() || inferMediaTypeFromPath(streamUrl) || "",
    };
  }

  if (offlineMode === "loop" && loopFiles.length) {
    return {
      mode: "loop",
      src: loopFiles[0],
      type: inferMediaTypeFromPath(loopFiles[0]) || "",
    };
  }

  return {
    mode: "message",
    message: String(item?.ppvOfflineMessage || "This event is not live right now. Please check back later."),
  };
}

function renderPpvLiveOfflineState(item, message) {
  return `
    <div class="player-stage__empty ppv-lock-state">
      <p class="section-heading__eyebrow">Live event offline</p>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(message)}</p>
      <div class="ppv-panel__actions">
        <a class="button button--secondary" href="${getDetailHref(item)}">Back to event page</a>
      </div>
    </div>
  `;
}

function getPpvMethods(item) {
  return Array.isArray(item?.ppvMethods)
    ? item.ppvMethods.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];
}

function renderPpvLockState(item) {
  const methods = getPpvMethods(item);
  const priceLabel = item.ppvPrice
    ? `${item.ppvCurrency || "FJD"} ${item.ppvPrice}`
    : "Price set in payment portal";

  return `
    <div class="player-stage__empty ppv-lock-state">
      <p class="section-heading__eyebrow">PPV Access Required</p>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.ppvAccessNote || "Buy access in the payment portal before opening this PPV event.")}</p>
      <p class="player-stage__status">${escapeHtml(priceLabel)}</p>
      ${
        methods.length
          ? `<div class="ppv-panel__methods">${methods
              .map((method) => `<span class="ppv-chip">${escapeHtml(method)}</span>`)
              .join("")}</div>`
          : ""
      }
      <div class="ppv-panel__actions">
        <a class="button button--primary" href="${escapeHtml(getPpvCheckoutHref(item))}"${String(item.ppvPortalUrl || "").trim() ? ' target="_blank" rel="noopener noreferrer"' : ''}>${
          escapeHtml(item.ppvButtonLabel || "Buy PPV Access")
        }</a>
        <a class="button button--secondary" href="${getDetailHref(item)}">Back to event page</a>
      </div>
    </div>
  `;
}

function buildSources(mediaItem) {
  if (Array.isArray(mediaItem?.qualities) && mediaItem.qualities.length > 0) {
    return mediaItem.qualities.map((source) => ({
      label: source.label,
      src: source.src,
      type: source.type,
      width: source.width,
      height: source.height,
    }));
  }

  return [];
}

function renderNotFound() {
  document.title = "MAI+ | Playback unavailable";
  playRoot.innerHTML = `
    <section class="watch-empty-page">
      <p class="section-heading__eyebrow">Playback unavailable</p>
      <h1>We couldn't load that media selection.</h1>
      <p>
        Go back to the show page and pick another episode or replay.
      </p>
      <a class="button button--primary" href="${withPreviewParam("./index.html")}">Back to catalogue</a>
    </section>
  `;
}

function resolvePlaybackHeading(item, activeEpisode) {
  if (!activeEpisode) {
    return {
      eyebrow: item.kicker,
      title: item.title,
      description: item.description,
    };
  }

  return {
    eyebrow: item.title,
    title: activeEpisode.title,
    description: item.description,
  };
}

function renderEpisodeRow(item, episode, isActive) {
  const availability = getAvailability(episode);
  const activeClass = isActive ? " is-active" : "";
  const availabilityClass = !availability.isPlayable ? " episode-row--disabled" : "";
  const rowMeta = escapeHtml(
    availability.isPlayable
      ? episode.airedText || episode.meta || availability.detailText || item.collectionLabel || item.kicker
      : availability.detailText ||
          episode.airedText ||
          episode.meta ||
          item.collectionLabel ||
          item.kicker
  );
  const duration = escapeHtml(
    availability.isPlayable
      ? episode.statusLabel || episode.duration || "Available"
      : availability.label || episode.statusLabel || episode.duration || "Coming Soon"
  );
  const artwork = getArtworkProps(item, episode.imageUrl, "episode-row__thumb");
  const content = `
    <div class="${artwork.className}"${artwork.styleAttr}>
      <span>EP ${episode.number}</span>
    </div>
    <div class="episode-row__copy">
      <span class="episode-row__eyebrow">Episode ${episode.number}</span>
      <strong>${escapeHtml(episode.title)}</strong>
      <p>${rowMeta}</p>
    </div>
    <div class="episode-row__meta">${duration}</div>
  `;

  if (!availability.isPlayable) {
    return `<article class="episode-row${availabilityClass}${activeClass}">${content}</article>`;
  }

  return `
    <a class="episode-row${activeClass}" href="${getPlayHref(item, episode)}">
      ${content}
    </a>
  `;
}

function renderSidePanel(item, activeEpisode) {
  if (item.kind !== "series") {
    return `
      <div class="watch-side-panel__header">
        <p class="section-heading__eyebrow">About this title</p>
        <h2>${escapeHtml(item.title)}</h2>
      </div>
      <div class="watch-info-card">
        <p>${escapeHtml(item.description)}</p>
      </div>
      <a class="button button--secondary" href="${getDetailHref(item)}">Back to show page</a>
    `;
  }

  return `
    <div class="watch-side-panel__header">
      <p class="section-heading__eyebrow">${escapeHtml(item.collectionLabel || "Series")}</p>
      <h2>Episodes</h2>
      <p class="watch-side-panel__copy">
        Pick another episode without leaving the player.
      </p>
    </div>
    <div class="play-episode-list">
      ${item.episodes
        .map((episode) => renderEpisodeRow(item, episode, Boolean(activeEpisode && episode.id === activeEpisode.id)))
        .join("")}
    </div>
  `;
}

function renderPlayPage(item, activeEpisode) {
  const selectedMedia = activeEpisode || item;
  const availability = getEffectiveAvailability(item, selectedMedia);
  const heading = resolvePlaybackHeading(item, activeEpisode);
  const currentMeta = activeEpisode
    ? joinMeta(activeEpisode.kicker || item.collectionLabel, `Episode ${activeEpisode.number}`, activeEpisode.statusLabel || activeEpisode.duration || "")
    : item.meta;

  playRoot.innerHTML = `
    <section class="play-shell">
      <div class="play-main">
        <a class="watch-backlink" href="${getDetailHref(item, activeEpisode)}">Back to show page</a>

        <div class="player-stage play-player-stage" id="play-player-mount"></div>

        <div class="player-details play-player-details">
          <p class="section-heading__eyebrow">${escapeHtml(heading.eyebrow)}</p>
          <h2>${escapeHtml(heading.title)}</h2>
          <p class="player-details__description">${escapeHtml(heading.description)}</p>
          <p class="player-details__meta" id="play-meta">${escapeHtml(
            availability.isPlayable ? currentMeta : joinMeta(currentMeta, availability.detailText)
          )}</p>
        </div>
      </div>

      <section class="play-side-panel">
        ${renderSidePanel(item, activeEpisode)}
      </section>
    </section>
  `;

  return selectedMedia;
}

function initPlayer(item, activeEpisode) {
  const mountNode = document.getElementById("play-player-mount");
  const meta = document.getElementById("play-meta");
  const selectedMedia = activeEpisode || item;
  const availability = getEffectiveAvailability(item, selectedMedia);
  const metaBase = activeEpisode
    ? joinMeta(activeEpisode.kicker || item.collectionLabel, `Episode ${activeEpisode.number}`)
    : item.meta;
  const sourceList = availability.isPlayable ? buildSources(selectedMedia) : [];
  const activeIndex =
    item.kind === "series" && activeEpisode
      ? item.episodes.findIndex((episode) => episode.id === activeEpisode.id)
      : -1;
  const previousEpisode =
    item.kind === "series" && activeIndex > 0 ? item.episodes[activeIndex - 1] : null;
  const nextEpisode =
    item.kind === "series" && activeIndex >= 0 && activeIndex < item.episodes.length - 1
      ? item.episodes[activeIndex + 1]
      : null;

  if (item.ppvEnabled && !isPpvUnlocked(item)) {
    mountNode.innerHTML = renderPpvLockState(item);

    if (meta) {
      meta.textContent = joinMeta(metaBase, "PPV access required");
    }

    return;
  }

  if (isLivePpvEvent(item)) {
    const liveState = getPpvLivePlaybackState(item);

    if (liveState.mode === "embed") {
      mountNode.innerHTML = `
        <div class="live-embed-frame-wrap">
          <iframe
            class="live-embed-frame"
            src="${escapeHtml(liveState.embedUrl)}"
            title="${escapeHtml(item.title)} live stream"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
        </div>
      `;
      if (meta) {
        meta.textContent = joinMeta(metaBase, "Live event stream");
      }
      return;
    }

    if (liveState.mode === "message") {
      mountNode.innerHTML = renderPpvLiveOfflineState(item, liveState.message);
      if (meta) {
        meta.textContent = joinMeta(metaBase, "Event offline");
      }
      return;
    }

    playerUi.mountPlayer({
      container: mountNode,
      title: item.title,
      subtitle: item.kicker,
      annotationText: item.ppvAccessNote || item.description || "Live PPV event",
      annotationsVisible: false,
      posterClass: item.artClass,
      isLive: liveState.mode === "stream",
      kind: undefined,
      sources: [{ src: liveState.src, type: liveState.type, label: liveState.mode === "loop" ? "Loop" : "Live" }],
      src: liveState.src,
      type: liveState.type,
      tracks: item.tracks || [],
      autoplay: true,
      muted: false,
      loop: liveState.mode === "loop",
      autoHideControls: true,
      controlsHideDelay: 1400,
      emptyTitle: liveState.mode === "loop" ? "Loop file not available." : "Live stream not available.",
      emptyCopy: liveState.mode === "loop"
        ? "Add a valid loop file in the editor to play something while the event is offline."
        : "Add a valid live stream URL or embed URL in the editor for this event.",
      emptyStatus: liveState.mode === "loop" ? "Loop offline" : "Live stream offline",
      showNotice: false,
      onStatusChange(statusText) {
        meta.textContent = `${metaBase} | ${statusText}`;
      },
    });
    return;
  }

  playerUi.mountPlayer({
    container: mountNode,
    title: activeEpisode ? `${item.title} - ${activeEpisode.title}` : item.title,
    subtitle: activeEpisode ? activeEpisode.kicker || item.kicker : item.kicker,
    annotationText:
      activeEpisode?.airedText ||
      activeEpisode?.description ||
      item.description ||
      "Playback ready",
    annotationsVisible: false,
    posterClass: item.artClass,
    kind: undefined,
    sources: sourceList,
    src: availability.isPlayable ? selectedMedia.mediaUrl : "",
    type: availability.isPlayable ? selectedMedia.mediaType : "",
    tracks: selectedMedia.tracks || item.tracks || [],
    autoplay: true,
    muted: false,
    autoHideControls: true,
    controlsHideDelay: 1400,
    prevAction: previousEpisode
      ? () => {
          window.location.href = getPlayHref(item, previousEpisode);
        }
      : null,
    nextAction: nextEpisode
      ? () => {
          window.location.href = getPlayHref(item, nextEpisode);
        }
      : null,
    prevLabel: previousEpisode ? `Previous episode: ${previousEpisode.title}` : "Previous episode",
    nextLabel: nextEpisode ? `Next episode: ${nextEpisode.title}` : "Next episode",
    emptyTitle: availability.isPlayable
      ? item.kind === "series"
        ? "This episode does not have a media file yet."
        : "This program does not have a media file yet."
      : availability.state === "upcoming"
        ? item.kind === "series"
          ? "This episode is coming soon."
          : "This title is coming soon."
        : availability.state === "expired"
          ? "This replay window has ended."
          : item.kind === "series"
            ? "This episode does not have a media file yet."
            : "This program does not have a media file yet.",
    emptyCopy: availability.isPlayable
      ? item.kind === "series"
        ? "Add a mediaUrl or quality source to this episode in data.js and it will play here."
        : "Add a mediaUrl or quality source to this title in data.js and it will play here."
      : availability.detailText,
    emptyStatus: availability.isPlayable
      ? "File not added yet"
      : availability.label,
    showNotice: false,
    onStatusChange(statusText) {
      meta.textContent = `${metaBase} | ${statusText}`;
    },
  });
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

  document.title = `MAI+ | ${activeEpisode ? `${item.title} - ${activeEpisode.title}` : item.title}`;
  renderPlayPage(item, activeEpisode);
  initPlayer(item, activeEpisode);
}
