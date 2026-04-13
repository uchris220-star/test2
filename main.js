const catalogue = window.maiCatalogue;

if (!catalogue) {
  throw new Error("MAI catalogue data was not loaded.");
}

const state = {
  query: "",
  searchOpen: false,
};

const sectionsRoot = document.getElementById("sections-root");
const searchPanel = document.getElementById("search-panel");
const searchToggle = document.getElementById("search-toggle");
const searchInput = document.getElementById("show-search");
const featuredWatchLink = document.getElementById("featured-watch-link");
const footerFeaturedLink = document.getElementById("footer-featured-link");
const footerPanelEyebrow = document.getElementById("footer-panel-eyebrow");
const footerPanelTitle = document.getElementById("footer-panel-title");
const footerPanelCopy = document.getElementById("footer-panel-copy");
const footerSocialLinks = document.getElementById("footer-social-links");
const featurePanel = document.querySelector(".feature-panel");
const featurePanelVisual = document.querySelector(".feature-panel__visual");
const featurePanelTitle = document.querySelector(".feature-panel__title");
const featurePanelTease = document.querySelector(".feature-panel__tease");
const featurePanelCount = document.getElementById("feature-panel-count");
const featurePanelDots = document.getElementById("feature-panel-dots");
const featuredItems = catalogue.getFeaturedItems ? catalogue.getFeaturedItems() : [];
const featuredShow = catalogue.getFeaturedShow();
const homepageSettings = catalogue.homepageSettings || {};
const allArtClasses = [...new Set(catalogue.allItems.map((item) => item.artClass).filter(Boolean))];
let featureSlides = [];
let activeFeatureSlideIndex = 0;
let featureSlideTimer = 0;
let railResizeBound = false;

if (featurePanel) {
  featurePanel.dataset.heroAlign = homepageSettings.heroContentAlign || "left";
}

function getHeroSlideDurationMs() {
  const rawValue = Number(homepageSettings?.heroSlideDurationSeconds);

  if (!Number.isFinite(rawValue)) {
    return 4200;
  }

  const normalizedSeconds = Math.min(30, Math.max(2, rawValue));
  return Math.round(normalizedSeconds * 1000);
}

function setSearchOpen(isOpen, options = {}) {
  if (!searchPanel || !searchToggle || !searchInput) {
    return;
  }

  const keepOpen = Boolean(state.query.trim());
  state.searchOpen = isOpen || keepOpen;
  searchPanel.classList.toggle("is-open", state.searchOpen);
  searchToggle.setAttribute("aria-expanded", String(state.searchOpen));
  searchToggle.setAttribute("aria-label", state.searchOpen ? "Close search" : "Open search");

  if (state.searchOpen && options.focusInput) {
    searchInput.focus();
    searchInput.select();
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function matchesFilters(item) {
  const normalizedQuery = state.query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const searchableText = [
    item.title,
    item.kicker,
    item.description,
    item.meta,
    item.badgeLabel,
    item.filters.join(" "),
    item.episodes.map((episode) => `${episode.title} ${episode.description}`).join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
}

function getArtworkProps(item, baseClass, imageOverride) {
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

function getLogoMarkup(logoUrl, altText, className, position = "left") {
  const safePosition = ["left", "center", "right"].includes(String(position || "").trim().toLowerCase())
    ? String(position || "").trim().toLowerCase()
    : "left";

  return `<img class="${className}" data-logo-position="${escapeHtml(safePosition)}" src="${escapeHtml(
    logoUrl
  )}" alt="${escapeHtml(altText || "Logo")}" />`;
}

function withPreviewParam(url) {
  if (!catalogue.isPreviewMode) {
    return url;
  }

  const [path, hashFragment = ""] = String(url).split("#");
  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}editorPreview=1${hashFragment ? `#${hashFragment}` : ""}`;
}

function getWatchHref(item) {
  if (item.liveChannelId) {
    return withPreviewParam(`./live.html?channel=${encodeURIComponent(item.liveChannelId)}`);
  }

  const baseUrl = `./watch.html?show=${encodeURIComponent(item.id)}`;

  if (item.kind !== "series") {
    return withPreviewParam(baseUrl);
  }

  const defaultEpisode = catalogue.getDefaultEpisode(item);

  if (!defaultEpisode) {
    return withPreviewParam(baseUrl);
  }

  return withPreviewParam(`${baseUrl}&episode=${encodeURIComponent(defaultEpisode.id)}`);
}

function getFooterButtonHref(featuredItem) {
  const footerButtonMode = homepageSettings.footerButtonMode || "featured";

  if (footerButtonMode === "live") {
    const liveChannelId =
      homepageSettings.footerLiveChannelId || catalogue.getPrimaryLiveChannel()?.id || "";

    return liveChannelId
      ? withPreviewParam(`./live.html?channel=${encodeURIComponent(liveChannelId)}`)
      : "#sections-root";
  }

  if (footerButtonMode === "browse") {
    return "#sections-root";
  }

  return featuredItem ? getWatchHref(featuredItem) : "#sections-root";
}

function getFooterSocialIconMarkup(icon) {
  const normalizedIcon = String(icon || "").trim().toLowerCase();

  if (normalizedIcon === "facebook") {
    return '<svg viewBox="0 0 24 24" focusable="false"><path d="M13.5 21v-7h2.4l.4-3h-2.8V9.3c0-.9.3-1.6 1.6-1.6H16V5.1c-.4-.1-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.2V11H7v3h2.6v7h3.9Z" /></svg>';
  }

  if (normalizedIcon === "twitter") {
    return '<svg viewBox="0 0 24 24" focusable="false"><path d="M4.5 5.5h4.1l3.2 4.2 3.7-4.2h2.4l-5 5.7 5.9 7.3h-4.1l-3.7-4.7-4.1 4.7H4.5l5.4-6.1-5.4-6.9Zm2.9 1.6 7.3 9.6h1.4L8.8 7.1H7.4Z" /></svg>';
  }

  if (normalizedIcon === "youtube") {
    return '<svg viewBox="0 0 24 24" focusable="false"><path d="M21 12.1c0-1.6-.2-3.2-.5-4-.3-.7-.8-1.2-1.5-1.5C18.2 6.3 12 6.3 12 6.3s-6.2 0-7 .3c-.7.3-1.2.8-1.5 1.5-.3.8-.5 2.4-.5 4s.2 3.2.5 4c.3.7.8 1.2 1.5 1.5.8.3 7 .3 7 .3s6.2 0 7-.3c.7-.3 1.2-.8 1.5-1.5.3-.8.5-2.4.5-4ZM10 15.5v-6.9l6 3.4-6 3.5Z" /></svg>';
  }

  if (normalizedIcon === "soundcloud") {
    return '<svg viewBox="0 0 24 24" focusable="false"><path d="M7.1 17.7H5.8v-4.4h1.3v4.4Zm2 0H7.8v-5.9h1.3v5.9Zm2 0H9.8V10.6h1.3v7.1Zm2 0h-1.3V9.9h1.3v7.8Zm1.8 0h-1.1v-6.4h1.1v6.4Zm.9 0a2.8 2.8 0 1 0-.3-5.6 4.6 4.6 0 0 0-4.4-3.7 4.5 4.5 0 0 0-1.1.1v9.2h5.8Z" /></svg>';
  }

  if (normalizedIcon === "instagram") {
    return '<svg viewBox="0 0 24 24" focusable="false"><path d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9A4.5 4.5 0 0 1 16.5 21h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3Zm0 1.8A2.7 2.7 0 0 0 4.8 7.5v9a2.7 2.7 0 0 0 2.7 2.7h9a2.7 2.7 0 0 0 2.7-2.7v-9a2.7 2.7 0 0 0-2.7-2.7h-9Zm9.5 1.4a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 7.2A4.8 4.8 0 1 1 7.2 12 4.8 4.8 0 0 1 12 7.2Zm0 1.8A3 3 0 1 0 15 12 3 3 0 0 0 12 9Z" /></svg>';
  }

  if (normalizedIcon === "tiktok") {
    return '<svg viewBox="0 0 24 24" focusable="false"><path d="M14.2 3c.3 2 1.5 3.5 3.3 4.1v2.5a6.1 6.1 0 0 1-3.3-1V15a4.8 4.8 0 1 1-4.8-4.8c.4 0 .8 0 1.2.1v2.6a2.2 2.2 0 1 0 1.4 2.1V3h2.2Z" /></svg>';
  }

  if (normalizedIcon === "linkedin") {
    return '<svg viewBox="0 0 24 24" focusable="false"><path d="M6.4 8.2a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM5.2 9.5h2.3V19H5.2V9.5Zm5.1 0h2.2v1.3h.1c.4-.8 1.3-1.6 2.8-1.6 3 0 3.6 2 3.6 4.6V19h-2.3v-4.7c0-1.1 0-2.6-1.6-2.6s-1.8 1.2-1.8 2.5V19h-2.3V9.5Z" /></svg>';
  }

  if (normalizedIcon === "whatsapp") {
    return '<svg viewBox="0 0 24 24" focusable="false"><path d="M12 4.2a7.8 7.8 0 0 1 6.8 11.7l.9 3.9-4-.8A7.8 7.8 0 1 1 12 4.2Zm0 1.8a6 6 0 0 0-5.1 9.2l.3.5-.5 2 2-.4.5.3A6 6 0 1 0 12 6Zm3.2 8.1c-.2-.1-1.2-.6-1.4-.7s-.3-.1-.5.1l-.6.7c-.1.2-.3.2-.5.1-.2-.1-.9-.3-1.7-1.1-.6-.5-1.1-1.2-1.2-1.4-.1-.2 0-.3.1-.4l.3-.4.2-.4c.1-.1 0-.3 0-.4l-.6-1.5c-.1-.2-.3-.2-.5-.2h-.4c-.1 0-.4 0-.6.2-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 4 3.4.5.2.9.3 1.2.4.5.2 1 .1 1.3.1.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1-.1-.1-.2-.2-.4-.3Z" /></svg>';
  }

  if (normalizedIcon === "email") {
    return '<svg viewBox="0 0 24 24" focusable="false"><path d="M4 6.5h16A1.5 1.5 0 0 1 21.5 8v8A1.5 1.5 0 0 1 20 17.5H4A1.5 1.5 0 0 1 2.5 16V8A1.5 1.5 0 0 1 4 6.5Zm0 1.6.2.2 7.3 5.2c.3.2.7.2 1 0l7.3-5.2.2-.2H4Zm15.9 7.8V9.8l-6.5 4.7a2.5 2.5 0 0 1-2.9 0L4.1 9.8v6.1h15.8Z" /></svg>';
  }

  return '<svg viewBox="0 0 24 24" focusable="false"><path d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Zm0 1.8a6.7 6.7 0 0 0-4.8 11.4h1.1c.2-1.6.9-3 1.9-4.1-1-.9-1.6-2.2-1.6-3.6V8.6h1.7v.5c0 1 .4 2 1.1 2.7.7-.7 1.1-1.7 1.1-2.7v-.5h1.7v.5c0 1.4-.6 2.7-1.6 3.6 1 1.1 1.7 2.5 1.9 4.1h1.1A6.7 6.7 0 0 0 12 5.3Zm0 9a5.2 5.2 0 0 0-1.8 2.4h3.6a5.2 5.2 0 0 0-1.8-2.4Z" /></svg>';
}

function getFooterSocialLinks() {
  const dynamicLinks = Array.isArray(homepageSettings.footerSocialLinks)
    ? homepageSettings.footerSocialLinks
    : [];

  if (dynamicLinks.length) {
    return dynamicLinks.filter((entry) => String(entry?.url || "").trim());
  }

  return [
    { icon: "facebook", label: "Facebook", url: homepageSettings.footerFacebookUrl },
    { icon: "twitter", label: "X", url: homepageSettings.footerTwitterUrl },
    { icon: "youtube", label: "YouTube", url: homepageSettings.footerYouTubeUrl },
    { icon: "soundcloud", label: "SoundCloud", url: homepageSettings.footerSoundCloudUrl },
  ].filter((entry) => String(entry.url || "").trim());
}

function renderFooterSocialLinks() {
  if (!footerSocialLinks) {
    return;
  }

  const links = getFooterSocialLinks();
  footerSocialLinks.hidden = links.length === 0;
  footerSocialLinks.innerHTML = links
    .map((entry) => {
      const label = String(entry.label || entry.icon || "Social link").trim();
      const href = String(entry.url || "").trim();

      return `
        <a
          class="footer-panel__social"
          href="${escapeHtml(href)}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="${escapeHtml(`Mai TV on ${label}`)}"
          title="${escapeHtml(label)}"
        >
          ${getFooterSocialIconMarkup(entry.icon)}
        </a>
      `;
    })
    .join("");
}

function applyFooterPanelSettings(featuredItem) {
  if (footerPanelEyebrow) {
    footerPanelEyebrow.textContent = homepageSettings.footerEyebrow || "Stream local";
  }

  if (footerPanelTitle) {
    footerPanelTitle.textContent =
      homepageSettings.footerTitle || "A darker, more premium MAI+ browse screen for local viewing.";
  }

  if (footerPanelCopy) {
    footerPanelCopy.textContent =
      homepageSettings.footerCopy ||
      "Established in 2008, Mai TV was the second free to air television station in the country. Currently you can get coverage via analogue by utilizing a UHF antenna and also via Digital through Walesi.";
  }

  if (footerFeaturedLink) {
    footerFeaturedLink.textContent = homepageSettings.footerButtonLabel || "Start Watching";
    footerFeaturedLink.href = getFooterButtonHref(featuredItem);
  }

  renderFooterSocialLinks();
}

function buildFeatureSlides() {
  if (featuredItems.length) {
    return featuredItems.filter(
      (item, index, items) =>
        item &&
        catalogue.getArtwork(item) &&
        items.findIndex((candidate) => candidate?.id === item.id) === index
    );
  }

  const picks = [
    featuredShow,
    catalogue.sections.find((section) => section.id === "new-episodes")?.items[0] || null,
    catalogue.allItems.find((item) => item.id !== featuredShow?.id && item.kind === "series") || null,
    catalogue.allItems.find((item) => item.id !== featuredShow?.id && item.filters.includes("catchup")) || null,
    catalogue.allItems.find((item) => item.id !== featuredShow?.id && item.filters.includes("sport")) || null,
  ];

  return picks.filter(
    (item, index, items) =>
      item &&
      catalogue.getArtwork(item) &&
      items.findIndex((candidate) => candidate?.id === item.id) === index
  );
}

function renderFeatureDots() {
  if (!featurePanelDots) {
    return;
  }

  if (featureSlides.length <= 1) {
    featurePanelDots.innerHTML = "";
    featurePanelDots.hidden = true;
    return;
  }

  featurePanelDots.hidden = false;
  featurePanelDots.innerHTML = featureSlides
    .map(
      (_, index) => `
        <button
          class="feature-panel__dot${index === activeFeatureSlideIndex ? " is-active" : ""}"
          type="button"
          data-feature-dot="${index}"
          aria-label="Go to featured slide ${index + 1}"
        ></button>
      `
    )
    .join("");
}

function setFeatureSlide(index) {
  if (!featurePanel || featureSlides.length === 0) {
    return;
  }

  activeFeatureSlideIndex = (index + featureSlides.length) % featureSlides.length;
  const item = featureSlides[activeFeatureSlideIndex];
  const imageUrl = item.featureImageUrl || catalogue.getArtwork(item);
  const imagePosition = item.featureImagePosition || "center center";

  if (featurePanelVisual) {
    featurePanelVisual.classList.remove(...allArtClasses);
    featurePanelVisual.classList.add(item.artClass);
    featurePanelVisual.classList.toggle("has-feature-photo", Boolean(item.featureImageUrl));
    featurePanelVisual.classList.toggle("has-feature-motion", Boolean(item.featureMotion));
    featurePanelVisual.style.setProperty("--feature-image-position", imagePosition);

    if (item.featureMotion) {
      featurePanelVisual.dataset.featureMotion = item.featureMotion;
    } else {
      delete featurePanelVisual.dataset.featureMotion;
    }
  }

  if (imageUrl) {
    if (featurePanelVisual) {
      featurePanelVisual.classList.add("has-image");
      featurePanelVisual.style.setProperty("--poster-image", `url("${imageUrl}")`);
    }
  } else {
    if (featurePanelVisual) {
      featurePanelVisual.classList.remove("has-image");
      featurePanelVisual.style.removeProperty("--poster-image");
      featurePanelVisual.style.removeProperty("--feature-image-position");
    }
  }

  if (featurePanelTitle) {
    if (item.logoUrl) {
      featurePanelTitle.innerHTML = getLogoMarkup(
        item.logoUrl,
        item.logoAlt || item.title,
        "feature-panel__logo",
        item.logoPosition
      );
    } else {
      featurePanelTitle.textContent = item.title;
    }
  }

  if (featurePanelTease) {
    featurePanelTease.textContent = item.description;
  }

  if (featurePanelCount) {
    featurePanelCount.textContent = `${activeFeatureSlideIndex + 1} / ${featureSlides.length}`;
  }

  if (featuredWatchLink) {
    featuredWatchLink.href = getWatchHref(item);
  }

  if (featurePanel) {
    featurePanel.dataset.editorItemId = item.id || "";
    featurePanel.dataset.editorSectionId = item.sectionId || "";
  }

  renderFeatureDots();
}

function stopFeatureRotation() {
  if (featureSlideTimer) {
    window.clearInterval(featureSlideTimer);
    featureSlideTimer = 0;
  }
}

function startFeatureRotation() {
  stopFeatureRotation();

  if (featureSlides.length <= 1) {
    return;
  }

  featureSlideTimer = window.setInterval(() => {
    setFeatureSlide(activeFeatureSlideIndex + 1);
  }, getHeroSlideDurationMs());
}

if (featuredShow) {
  featureSlides = buildFeatureSlides();

  if (featureSlides.length === 0) {
    featureSlides = [featuredShow];
  }

  if (featurePanel) {
    setFeatureSlide(0);
    startFeatureRotation();

    featurePanel.addEventListener("mouseenter", stopFeatureRotation);
    featurePanel.addEventListener("mouseleave", startFeatureRotation);
    featurePanel.addEventListener("focusin", stopFeatureRotation);
    featurePanel.addEventListener("focusout", startFeatureRotation);
  }

  if (featurePanelDots) {
    featurePanelDots.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-feature-dot]");

      if (!trigger) {
        return;
      }

      const nextIndex = Number(trigger.getAttribute("data-feature-dot"));

      if (!Number.isNaN(nextIndex)) {
        setFeatureSlide(nextIndex);
        startFeatureRotation();
      }
    });
  }

  applyFooterPanelSettings(featuredShow);

} else {
  applyFooterPanelSettings(null);
}

function renderCard(item) {
  const art = getArtworkProps(item, "show-card__art");

  return `
    <a
      class="show-card"
      href="${getWatchHref(item)}"
      aria-label="Open ${escapeHtml(item.title)}"
      data-editor-item-id="${escapeHtml(item.id)}"
      data-editor-section-id="${escapeHtml(item.sectionId || "")}"
    >
      <div class="${art.className}"${art.styleAttr}>
        <span class="show-card__kicker">${escapeHtml(item.kicker)}</span>
        ${
        item.logoUrl
            ? getLogoMarkup(item.logoUrl, item.logoAlt || item.title, "show-card__logo", item.logoPosition)
            : `<strong>${escapeHtml(item.title)}</strong>`
        }
      </div>
      <div class="show-card__body">
        <div class="show-card__footer">
          ${
            item.ppvEnabled
              ? `<span class="tag tag--ppv">PPV</span>`
              : ""
          }
          <span class="tag tag--${escapeHtml(item.badgeClass)}">${escapeHtml(
            item.badgeLabel
          )}</span>
          <p class="show-card__meta">${escapeHtml(item.meta)}</p>
        </div>
        <p class="show-card__description">${escapeHtml(item.description)}</p>
      </div>
    </a>
  `;
}

function renderSection(section, items, options = {}) {
  const railClass =
    section.columns === "two" ? "card-rail card-rail--wide" : "card-rail";
  const ppvAnchor = options.includePpvAnchor
    ? '<div class="content-section__anchor" id="ppv-events" aria-hidden="true"></div>'
    : "";

  return `
    <section
      class="content-section"
      id="${escapeHtml(section.id)}"
      data-editor-section-id="${escapeHtml(section.id)}"
    >
      ${ppvAnchor}
      <div class="section-heading">
        <div>
          <p class="section-heading__eyebrow">${escapeHtml(section.eyebrow)}</p>
          <h2>${escapeHtml(section.title)}</h2>
        </div>
      </div>
      <div class="card-rail-shell">
        <button
          class="card-rail__arrow card-rail__arrow--prev"
          type="button"
          data-rail-arrow="prev"
          aria-label="Scroll ${escapeHtml(section.title)} left"
        >
          <span aria-hidden="true">&#8249;</span>
        </button>
        <div class="${railClass}" data-card-rail>
          ${items.map(renderCard).join("")}
        </div>
        <button
          class="card-rail__arrow card-rail__arrow--next"
          type="button"
          data-rail-arrow="next"
          aria-label="Scroll ${escapeHtml(section.title)} right"
        >
          <span aria-hidden="true">&#8250;</span>
        </button>
      </div>
    </section>
  `;
}

function renderEmptyState() {
  return `
    <section class="catalogue-empty">
      <p class="section-heading__eyebrow">No exact matches</p>
      <h2>Try a different search or category.</h2>
      <p>
        Search by show name to explore more MAI TV local content on MAI+.
      </p>
    </section>
  `;
}

function renderCatalogue() {
  let ppvAnchorAssigned = false;
  const markup = catalogue.sections
    .map((section) => {
      const visibleItems = section.items.filter(matchesFilters);

      if (visibleItems.length === 0) {
        return "";
      }

      const includePpvAnchor = !ppvAnchorAssigned && visibleItems.some((item) => item.ppvEnabled);

      if (includePpvAnchor) {
        ppvAnchorAssigned = true;
      }

      return renderSection(section, visibleItems, { includePpvAnchor });
    })
    .join("");

  sectionsRoot.innerHTML = markup || renderEmptyState();
  setupRailControls();
}

function getRailStep(rail) {
  const card = rail.querySelector(".show-card");

  if (!card) {
    return Math.max(rail.clientWidth * 0.84, 220);
  }

  const railStyles = window.getComputedStyle(rail);
  const gap = Number.parseFloat(railStyles.columnGap || railStyles.gap || "0") || 0;

  return card.getBoundingClientRect().width + gap;
}

function updateRailControls(rail) {
  const shell = rail.closest(".card-rail-shell");

  if (!shell) {
    return;
  }

  const previousButton = shell.querySelector('[data-rail-arrow="prev"]');
  const nextButton = shell.querySelector('[data-rail-arrow="next"]');
  const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth - 2);
  const isStatic = maxScrollLeft <= 2;

  shell.classList.toggle("is-static", isStatic);

  if (previousButton) {
    previousButton.disabled = isStatic || rail.scrollLeft <= 2;
  }

  if (nextButton) {
    nextButton.disabled = isStatic || rail.scrollLeft >= maxScrollLeft;
  }
}

function setupRailControls() {
  const rails = Array.from(sectionsRoot.querySelectorAll("[data-card-rail]"));

  rails.forEach((rail) => {
    const shell = rail.closest(".card-rail-shell");
    const previousButton = shell?.querySelector('[data-rail-arrow="prev"]');
    const nextButton = shell?.querySelector('[data-rail-arrow="next"]');

    rail.addEventListener(
      "scroll",
      () => {
        updateRailControls(rail);
      },
      { passive: true }
    );

    previousButton?.addEventListener("click", () => {
      rail.scrollBy({ left: -getRailStep(rail), behavior: "smooth" });
    });

    nextButton?.addEventListener("click", () => {
      rail.scrollBy({ left: getRailStep(rail), behavior: "smooth" });
    });

    updateRailControls(rail);
  });

  if (!railResizeBound) {
    window.addEventListener(
      "resize",
      () => {
        document
          .querySelectorAll("[data-card-rail]")
          .forEach((rail) => updateRailControls(rail));
      },
      { passive: true }
    );

    railResizeBound = true;
  }
}

if (searchToggle && searchInput) {
  searchToggle.addEventListener("click", () => {
    setSearchOpen(!state.searchOpen, { focusInput: !state.searchOpen });
  });

  searchInput.addEventListener("focus", () => {
    setSearchOpen(true);
  });

  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderCatalogue();
    setSearchOpen(Boolean(state.query.trim()));
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (state.query.trim()) {
        searchInput.value = "";
        state.query = "";
        renderCatalogue();
      }

      setSearchOpen(false);
      searchToggle.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (!searchPanel?.contains(event.target) && !state.query.trim()) {
      setSearchOpen(false);
    }
  });
}

renderCatalogue();
setSearchOpen(false);
