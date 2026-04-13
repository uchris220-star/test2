(function attachMaiCatalogue(global) {
  const CONTENT_STORAGE_KEY = "mai-plus-content";
  const DRAFT_STORAGE_KEY = "mai-plus-content-draft";
  const CONTENT_STORAGE_VERSION = 2;
  const PREVIEW_QUERY_KEY = "editorPreview";

  function createItem(config) {
    return {
      mediaUrl: "",
      mediaType: "video/mp4",
      qualities: [],
      tracks: [],
      availableFrom: "",
      availableUntil: "",
      episodes: [],
      featured: false,
      collectionLabel: "",
      sortLabel: "Ascending",
      episodePlannerCount: "",
      episodeReleaseStart: "",
      episodeReleaseIntervalDays: 7,
      liveChannelId: "",
      imageUrl: "",
      featureImageUrl: "",
      featureMotion: "",
      featureImagePosition: "center center",
      logoUrl: "",
      logoAlt: "",
      logoPosition: "left",
      ppvEnabled: false,
      ppvPrice: "",
      ppvCurrency: "FJD",
      ppvEventDate: "",
      ppvPortalUrl: "",
      ppvProvider: "",
      ppvMethods: [],
      ppvButtonLabel: "Buy PPV Access",
      ppvAccessNote: "",
      ppvTermsUrl: "",
      ppvEventType: "locked_title",
      ppvLiveStreamUrl: "",
      ppvLiveStreamType: "",
      ppvLiveEmbedUrl: "",
      ppvLiveStreamKey: "",
      ppvOfflineMode: "message",
      ppvOfflineMessage: "This event is not live right now. Please check back closer to the event time.",
      ppvLoopFiles: [],
      ...config,
    };
  }

  function createEpisode(config) {
    return {
      mediaUrl: "",
      mediaType: "video/mp4",
      qualities: [],
      tracks: [],
      sourceFile: "",
      availableFrom: "",
      availableUntil: "",
      duration: "",
      airedText: "",
      statusLabel: "",
      imageUrl: "",
      ...config,
    };
  }

  function createSeasonEpisodes(seriesTitle, seasonLabel, totalEpisodes, mediaUrl, mediaType) {
    return Array.from({ length: totalEpisodes }, (_, index) =>
      createEpisode({
        title: `Episode ${index + 1}`,
        kicker: seasonLabel,
        description: `Test episode ${index + 1} for ${seriesTitle}, so you can check how a longer season looks on the show page and inside the player.`,
        meta: `${seasonLabel} | Episode ${index + 1}`,
        duration: `${24 + (index % 4)} min`,
        airedText: `${seriesTitle} ${seasonLabel} test replay episode ${index + 1}, ready to play on MAI+.`,
        mediaUrl,
        mediaType,
      })
    );
  }

  function toTitleCase(value) {
    return String(value || "")
      .replace(/[._]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\b[a-z]/g, (character) => character.toUpperCase());
  }

  function normalizeTagList(value) {
    if (Array.isArray(value)) {
      return value.map((entry) => String(entry || "").trim()).filter(Boolean);
    }

    return String(value || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function parseImportedEpisodeTitle(fileName) {
    const baseName = String(fileName || "").replace(/\.[^.]+$/, "");
    const episodeMatch = baseName.match(/(?:S(\d{1,2})E(\d{1,3})|(\d{1,2})x(\d{1,3}))/i);
    let titlePart = baseName;

    if (episodeMatch) {
      titlePart = baseName.slice(episodeMatch.index + episodeMatch[0].length);
    }

    titlePart = titlePart.replace(/^[\s._-]+/, "");

    const technicalMarkerMatch = titlePart.match(
      /(?:^|[._ -])(?:2160p|1080p|720p|480p|WEB(?:-DL|-HD|Rip)?|BluRay|BRRip|HDTV|DVDRip|NF|AMZN|DSNP|HMAX|x264|x265|h264|h265|HEVC|AAC|AC3|DDP|10Bit|8Bit|Pahe|YTS)\b/i
    );

    if (technicalMarkerMatch) {
      titlePart = titlePart.slice(0, technicalMarkerMatch.index).trim();
    }

    return toTitleCase(titlePart);
  }

  function shouldNormalizeImportedEpisodeTitle(value) {
    const normalizedTitle = String(value || "").trim();

    if (!normalizedTitle) {
      return false;
    }

    return /S\d{1,2}E\d{1,3}|2160p|1080p|720p|480p|WEB(?:-DL|-HD|Rip)?|BluRay|BRRip|HDTV|DVDRip|x264|x265|h264|h265|HEVC|AAC|AC3|DDP|10Bit|8Bit|Pahe|YTS/i.test(
      normalizedTitle
    );
  }

  function isGenericEpisodeTitle(value) {
    const normalizedTitle = String(value || "").trim();

    return !normalizedTitle || /^New Episode$/i.test(normalizedTitle) || /^Episode \d+$/i.test(normalizedTitle);
  }

  function inferEpisodeNumberFromValue(value) {
    const match = String(value || "").match(/(?:S\d{1,2}E(\d{1,3})|\d{1,2}x(\d{1,3}))/i);

    return match ? Number(match[1] || match[2]) : null;
  }

  function resolveImportedEpisodeTitle(value, fallbackIndex = 0) {
    const parsedTitle = parseImportedEpisodeTitle(value);

    if (parsedTitle) {
      return parsedTitle;
    }

    const parsedEpisodeNumber = inferEpisodeNumberFromValue(value);

    return `Episode ${parsedEpisodeNumber || fallbackIndex + 1}`;
  }

  function normalizeTitleComparisonKey(value) {
    return String(value || "").trim().toLowerCase();
  }

  function inferMediaTypeFromPath(value) {
    const normalized = String(value || "").trim().toLowerCase();

    if (normalized.endsWith(".mp4")) {
      return "video/mp4";
    }

    if (normalized.endsWith(".mkv")) {
      return "video/x-matroska";
    }

    if (normalized.endsWith(".webm")) {
      return "video/webm";
    }

    if (normalized.endsWith(".mov")) {
      return "video/quicktime";
    }

    if (normalized.endsWith(".m3u8")) {
      return "application/x-mpegURL";
    }

    return "";
  }

  function normalizeProjectPathSegment(value) {
    return String(value || "")
      .replaceAll("\\", "/")
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .join("/");
  }

  function buildProjectPath(...segments) {
    const normalizedPath = segments
      .map(normalizeProjectPathSegment)
      .filter(Boolean)
      .join("/");

    return normalizedPath ? `./${normalizedPath}` : "";
  }

  function normalizeFsPath(value) {
    let normalized = String(value || "").replaceAll("\\", "/");

    if (/^\/[A-Za-z]:\//.test(normalized)) {
      normalized = normalized.slice(1);
    }

    return normalized.replace(/\/+$/, "");
  }

  function getWorkspaceRootPath(currentGlobal = global) {
    try {
      const url = new URL(".", currentGlobal.location.href);
      return normalizeFsPath(decodeURIComponent(url.pathname));
    } catch (error) {
      return "";
    }
  }

  function decodePathValue(value) {
    try {
      return decodeURIComponent(value);
    } catch (error) {
      return value;
    }
  }

  function isExternalAssetPath(value) {
    const normalized = String(value || "").trim();

    return (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(normalized) && !/^file:/i.test(normalized)) || /^(?:data|blob):/i.test(normalized);
  }

  function stripWorkspaceRoot(pathValue, currentGlobal = global) {
    const workspaceRoot = getWorkspaceRootPath(currentGlobal);
    const normalizedPath = normalizeFsPath(pathValue);

    if (!workspaceRoot) {
      return normalizedPath;
    }

    if (!normalizedPath.toLowerCase().startsWith(workspaceRoot.toLowerCase())) {
      return normalizedPath;
    }

    const relativePath = normalizedPath.slice(workspaceRoot.length).replace(/^\/+/, "");

    return relativePath ? `./${relativePath}` : "";
  }

  function normalizeLocalAssetPath(pathValue, currentGlobal = global) {
    let normalizedPath = decodePathValue(String(pathValue || "").trim());

    if (!normalizedPath) {
      return "";
    }

    if (/^file:/i.test(normalizedPath)) {
      try {
        normalizedPath = decodeURIComponent(new URL(normalizedPath).pathname);
      } catch (error) {
        normalizedPath = normalizedPath.replace(/^file:\/*/i, "");
      }
    }

    if (isExternalAssetPath(normalizedPath)) {
      return normalizedPath;
    }

    normalizedPath = stripWorkspaceRoot(normalizedPath, currentGlobal).replaceAll("\\", "/");

    if (!normalizedPath) {
      return "";
    }

    if (/^[A-Za-z]:\//.test(normalizedPath)) {
      return normalizedPath;
    }

    if (/^\/+(Programs|images|videos)\//i.test(normalizedPath)) {
      return buildProjectPath(normalizedPath);
    }

    if (/^(Programs|images|videos)\//i.test(normalizedPath)) {
      return buildProjectPath(normalizedPath);
    }

    if (/^\.\//.test(normalizedPath)) {
      return buildProjectPath(normalizedPath.slice(2));
    }

    return normalizedPath;
  }

  function buildImportedEpisodeUrl(folderName, fileName) {
    return buildProjectPath(folderName, fileName);
  }

  function createImportedSeasonEpisodes(seriesTitle, seasonLabel, folderName, fileNames, mediaType) {
    return fileNames.map((fileName, index) => {
      const episodeTitle = resolveImportedEpisodeTitle(fileName, index);

      return createEpisode({
        title: episodeTitle,
        kicker: seasonLabel,
        description: `${seriesTitle} ${seasonLabel} episode ${index + 1}.`,
        meta: `Episode ${index + 1}`,
        duration: "",
        airedText: `${seasonLabel} | Episode ${index + 1}`,
        statusLabel: "Ready",
        sourceFile: fileName,
        mediaUrl: buildImportedEpisodeUrl(folderName, fileName),
        mediaType,
      });
    });
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function getStorage() {
    try {
      return global.localStorage || null;
    } catch (error) {
      return null;
    }
  }

  function readStoredContent(storageKey) {
    const storage = getStorage();

    if (!storage) {
      return null;
    }

    try {
      const rawValue = storage.getItem(storageKey);

      if (!rawValue) {
        return null;
      }

      const parsed = JSON.parse(rawValue);

      if (!isRecord(parsed)) {
        return null;
      }

      const version = Number(parsed.version);

      if (!Number.isInteger(version) || version < 1 || version > CONTENT_STORAGE_VERSION) {
        return null;
      }

      return {
        version,
        content: parsed.content || null,
      };
    } catch (error) {
      return null;
    }
  }

  function createMergeKey(entry, fallbackKey) {
    const rawValue = String(entry?.id || entry?.title || entry?.name || fallbackKey || "");

    return rawValue.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || fallbackKey;
  }

  function mergeSectionItems(sourceItems, fallbackItems) {
    const mergedItems = Array.isArray(sourceItems) ? deepClone(sourceItems) : [];
    const existingKeys = new Set(
      mergedItems.map((item, index) => createMergeKey(item, `section-item-${index}`))
    );

    (Array.isArray(fallbackItems) ? fallbackItems : []).forEach((item, index) => {
      const itemKey = createMergeKey(item, `fallback-section-item-${index}`);

      if (existingKeys.has(itemKey)) {
        return;
      }

      existingKeys.add(itemKey);
      mergedItems.push(deepClone(item));
    });

    return mergedItems;
  }

  function mergeLegacySections(sourceSections, fallbackSections) {
    const mergedSections = Array.isArray(sourceSections) ? deepClone(sourceSections) : [];
    const sectionIndexByKey = new Map();

    mergedSections.forEach((section, index) => {
      sectionIndexByKey.set(createMergeKey(section, `section-${index}`), index);
    });

    (Array.isArray(fallbackSections) ? fallbackSections : []).forEach((section, index) => {
      const sectionKey = createMergeKey(section, `fallback-section-${index}`);
      const existingIndex = sectionIndexByKey.get(sectionKey);

      if (existingIndex === undefined) {
        sectionIndexByKey.set(sectionKey, mergedSections.length);
        mergedSections.push(deepClone(section));
        return;
      }

      const existingSection = mergedSections[existingIndex];
      mergedSections[existingIndex] = {
        ...deepClone(section),
        ...existingSection,
        items: mergeSectionItems(existingSection.items, section.items),
      };
    });

    return mergedSections;
  }

  const THEME_FONT_PRESETS = {
    mai: {
      label: "MAI Sans",
      display: '"Bahnschrift SemiBold", "Franklin Gothic Demi", "Segoe UI", sans-serif',
      body: '"Segoe UI Variable", "Segoe UI", "Trebuchet MS", sans-serif',
    },
    studio: {
      label: "Studio Sans",
      display: '"Trebuchet MS", "Gill Sans", "Segoe UI", sans-serif',
      body: '"Verdana", "Segoe UI", sans-serif',
    },
    classic: {
      label: "Classic Serif",
      display: '"Georgia", "Cambria", "Times New Roman", serif',
      body: '"Georgia", "Cambria", "Times New Roman", serif',
    },
    clean: {
      label: "Clean UI",
      display: '"Arial Narrow", "Arial", sans-serif',
      body: '"Calibri", "Arial", sans-serif',
    },
  };

  const DEFAULT_FOOTER_SOCIAL_LINKS = [
    {
      icon: "facebook",
      label: "Facebook",
      url: "https://www.facebook.com/maitvfiji/",
    },
    {
      icon: "twitter",
      label: "X",
      url: "https://twitter.com/MaiTVFiji",
    },
    {
      icon: "youtube",
      label: "YouTube",
      url: "https://www.youtube.com/channel/UCXiYmoWyQcPCIOAUXYpIwng",
    },
    {
      icon: "soundcloud",
      label: "SoundCloud",
      url: "https://soundcloud.com/maitvfiji",
    },
  ];

  const DEFAULT_THEME_SETTINGS = {
    themeBgStart: "#0e0810",
    themeBgMid: "#08060b",
    themeBgEnd: "#06050a",
    themeGlowPrimary: "#ff5a3c",
    themeGlowSecondary: "#ec9a27",
    themePanelColor: "#17111c",
    themeCardColor: "#130f18",
    themeTextColor: "#fff7f2",
    themeMutedColor: "#d8c9c4",
    themeAccentColor: "#ff5a3c",
    themeAccentAltColor: "#ec9a27",
    themeDisplayFont: "mai",
    themeBodyFont: "mai",
    heroDisplayFont: "mai",
    heroTitleColor: "#fff7f2",
    heroCopyColor: "#d8c9c4",
    badgeDisplayFont: "mai",
    badgeTextColor: "#e86c2b",
    badgeBgStart: "#133d92",
    badgeBgEnd: "#205fca",
  };

  function normalizeHexColor(value, fallbackValue) {
    const normalized = String(value || "").trim();

    if (/^#[0-9a-f]{6}$/i.test(normalized)) {
      return normalized.toLowerCase();
    }

    if (/^#[0-9a-f]{3}$/i.test(normalized)) {
      return `#${normalized
        .slice(1)
        .split("")
        .map((character) => character + character)
        .join("")
        .toLowerCase()}`;
    }

    return fallbackValue;
  }

  function resolveThemeFontKey(value, fallbackValue = "mai") {
    return Object.prototype.hasOwnProperty.call(THEME_FONT_PRESETS, value) ? value : fallbackValue;
  }

  function getLegacyFooterSocialLinks(value, fallbackValue) {
    return [
      {
        icon: "facebook",
        label: "Facebook",
        url:
          value?.footerFacebookUrl ||
          fallbackValue?.footerFacebookUrl ||
          DEFAULT_FOOTER_SOCIAL_LINKS[0].url,
      },
      {
        icon: "twitter",
        label: "X",
        url:
          value?.footerTwitterUrl ||
          fallbackValue?.footerTwitterUrl ||
          DEFAULT_FOOTER_SOCIAL_LINKS[1].url,
      },
      {
        icon: "youtube",
        label: "YouTube",
        url:
          value?.footerYouTubeUrl ||
          fallbackValue?.footerYouTubeUrl ||
          DEFAULT_FOOTER_SOCIAL_LINKS[2].url,
      },
      {
        icon: "soundcloud",
        label: "SoundCloud",
        url:
          value?.footerSoundCloudUrl ||
          fallbackValue?.footerSoundCloudUrl ||
          DEFAULT_FOOTER_SOCIAL_LINKS[3].url,
      },
    ];
  }

  function normalizeFooterSocialLinks(value, fallbackValue) {
    const sourceLinks = Array.isArray(value?.footerSocialLinks)
      ? value.footerSocialLinks
      : Array.isArray(fallbackValue?.footerSocialLinks)
        ? fallbackValue.footerSocialLinks
        : getLegacyFooterSocialLinks(value, fallbackValue);

    const normalizedLinks = (Array.isArray(sourceLinks) ? sourceLinks : []).map((entry) => ({
      icon: String(entry?.icon || "website").trim().toLowerCase() || "website",
      label: String(entry?.label || "").trim(),
      url: String(entry?.url || "").trim(),
    }));

    return normalizedLinks.filter(
      (entry) => entry.icon || entry.label || entry.url
    );
  }

  function expandHexColor(value) {
    const normalized = normalizeHexColor(value, "#000000");
    return normalized.length === 4
      ? `#${normalized
          .slice(1)
          .split("")
          .map((character) => character + character)
          .join("")}`
      : normalized;
  }

  function hexToRgba(value, alpha) {
    const normalized = expandHexColor(value).slice(1);
    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  function applyHomepageTheme(settings) {
    const root = global.document?.documentElement;

    if (!root || !settings) {
      return;
    }

    const displayFontKey = resolveThemeFontKey(settings.themeDisplayFont, DEFAULT_THEME_SETTINGS.themeDisplayFont);
    const bodyFontKey = resolveThemeFontKey(settings.themeBodyFont, DEFAULT_THEME_SETTINGS.themeBodyFont);

    root.style.setProperty("--bg-start", settings.themeBgStart || DEFAULT_THEME_SETTINGS.themeBgStart);
    root.style.setProperty("--bg-mid", settings.themeBgMid || DEFAULT_THEME_SETTINGS.themeBgMid);
    root.style.setProperty("--bg-end", settings.themeBgEnd || DEFAULT_THEME_SETTINGS.themeBgEnd);
    root.style.setProperty("--glow-1", hexToRgba(settings.themeGlowPrimary, 0.22));
    root.style.setProperty("--glow-2", hexToRgba(settings.themeGlowSecondary, 0.14));
    root.style.setProperty("--panel", hexToRgba(settings.themePanelColor, 0.88));
    root.style.setProperty("--panel-strong", hexToRgba(settings.themePanelColor, 0.96));
    root.style.setProperty("--card", hexToRgba(settings.themeCardColor, 0.94));
    root.style.setProperty("--text", settings.themeTextColor || DEFAULT_THEME_SETTINGS.themeTextColor);
    root.style.setProperty("--muted", settings.themeMutedColor || DEFAULT_THEME_SETTINGS.themeMutedColor);
    root.style.setProperty("--soft", settings.themeMutedColor || DEFAULT_THEME_SETTINGS.themeMutedColor);
    root.style.setProperty("--accent", settings.themeAccentColor || DEFAULT_THEME_SETTINGS.themeAccentColor);
    root.style.setProperty("--accent-2", settings.themeAccentAltColor || DEFAULT_THEME_SETTINGS.themeAccentAltColor);
    root.style.setProperty("--accent-3", settings.themeAccentColor || DEFAULT_THEME_SETTINGS.themeAccentColor);
    const heroFontKey = resolveThemeFontKey(settings.heroDisplayFont, displayFontKey);
    const badgeFontKey = resolveThemeFontKey(settings.badgeDisplayFont, displayFontKey);
    root.style.setProperty("--display-font", THEME_FONT_PRESETS[displayFontKey].display);
    root.style.setProperty("--body-font", THEME_FONT_PRESETS[bodyFontKey].body);
    root.style.setProperty("--hero-display-font", THEME_FONT_PRESETS[heroFontKey].display);
    root.style.setProperty("--badge-display-font", THEME_FONT_PRESETS[badgeFontKey].display);
    root.style.setProperty("--hero-title-color", settings.heroTitleColor || DEFAULT_THEME_SETTINGS.heroTitleColor);
    root.style.setProperty("--hero-copy-color", settings.heroCopyColor || DEFAULT_THEME_SETTINGS.heroCopyColor);
    root.style.setProperty("--brand-badge-text", settings.badgeTextColor || DEFAULT_THEME_SETTINGS.badgeTextColor);
    root.style.setProperty("--brand-badge-bg-start", settings.badgeBgStart || DEFAULT_THEME_SETTINGS.badgeBgStart);
    root.style.setProperty("--brand-badge-bg-end", settings.badgeBgEnd || DEFAULT_THEME_SETTINGS.badgeBgEnd);
  }

  function normalizeHomepageSettings(value, fallbackValue) {
    const allowedAlignments = new Set(["left", "center", "right"]);
    const allowedFooterButtonModes = new Set(["featured", "live", "browse"]);
    const fallbackAlign = allowedAlignments.has(fallbackValue?.heroContentAlign)
      ? fallbackValue.heroContentAlign
      : "left";
    const fallbackFooterButtonMode = allowedFooterButtonModes.has(fallbackValue?.footerButtonMode)
      ? fallbackValue.footerButtonMode
      : "featured";

    return {
      heroContentAlign: allowedAlignments.has(value?.heroContentAlign)
        ? value.heroContentAlign
        : fallbackAlign,
      heroSlideDurationSeconds: Math.min(
        30,
        Math.max(
          2,
          Number(value?.heroSlideDurationSeconds) ||
            Number(fallbackValue?.heroSlideDurationSeconds) ||
            4.2
        )
      ),
      footerEyebrow: String(value?.footerEyebrow || fallbackValue?.footerEyebrow || "Stream local"),
      footerTitle: String(
        value?.footerTitle ||
          fallbackValue?.footerTitle ||
          "A darker, more premium MAI+ browse screen for local viewing."
      ),
      footerCopy: String(
        value?.footerCopy ||
          fallbackValue?.footerCopy ||
          "Established in 2008, Mai TV was the second free to air television station in the country. Currently you can get coverage via analogue by utilizing a UHF antenna and also via Digital through Walesi."
      ),
      footerButtonLabel: String(
        value?.footerButtonLabel || fallbackValue?.footerButtonLabel || "Start Watching"
      ),
      footerButtonMode: allowedFooterButtonModes.has(value?.footerButtonMode)
        ? value.footerButtonMode
        : fallbackFooterButtonMode,
      footerLiveChannelId: String(
        value?.footerLiveChannelId || fallbackValue?.footerLiveChannelId || "mai-tv"
      ),
      footerFacebookUrl: String(
        value?.footerFacebookUrl ||
          fallbackValue?.footerFacebookUrl ||
          "https://www.facebook.com/maitvfiji/"
      ),
      footerTwitterUrl: String(
        value?.footerTwitterUrl ||
          fallbackValue?.footerTwitterUrl ||
          "https://twitter.com/MaiTVFiji"
      ),
      footerYouTubeUrl: String(
        value?.footerYouTubeUrl ||
          fallbackValue?.footerYouTubeUrl ||
          "https://www.youtube.com/channel/UCXiYmoWyQcPCIOAUXYpIwng"
      ),
      footerSoundCloudUrl: String(
        value?.footerSoundCloudUrl ||
          fallbackValue?.footerSoundCloudUrl ||
          "https://soundcloud.com/maitvfiji"
      ),
      footerSocialLinks: normalizeFooterSocialLinks(value, fallbackValue),
      themeBgStart: normalizeHexColor(
        value?.themeBgStart,
        normalizeHexColor(fallbackValue?.themeBgStart, DEFAULT_THEME_SETTINGS.themeBgStart)
      ),
      themeBgMid: normalizeHexColor(
        value?.themeBgMid,
        normalizeHexColor(fallbackValue?.themeBgMid, DEFAULT_THEME_SETTINGS.themeBgMid)
      ),
      themeBgEnd: normalizeHexColor(
        value?.themeBgEnd,
        normalizeHexColor(fallbackValue?.themeBgEnd, DEFAULT_THEME_SETTINGS.themeBgEnd)
      ),
      themeGlowPrimary: normalizeHexColor(
        value?.themeGlowPrimary,
        normalizeHexColor(fallbackValue?.themeGlowPrimary, DEFAULT_THEME_SETTINGS.themeGlowPrimary)
      ),
      themeGlowSecondary: normalizeHexColor(
        value?.themeGlowSecondary,
        normalizeHexColor(
          fallbackValue?.themeGlowSecondary,
          DEFAULT_THEME_SETTINGS.themeGlowSecondary
        )
      ),
      themePanelColor: normalizeHexColor(
        value?.themePanelColor,
        normalizeHexColor(fallbackValue?.themePanelColor, DEFAULT_THEME_SETTINGS.themePanelColor)
      ),
      themeCardColor: normalizeHexColor(
        value?.themeCardColor,
        normalizeHexColor(fallbackValue?.themeCardColor, DEFAULT_THEME_SETTINGS.themeCardColor)
      ),
      themeTextColor: normalizeHexColor(
        value?.themeTextColor,
        normalizeHexColor(fallbackValue?.themeTextColor, DEFAULT_THEME_SETTINGS.themeTextColor)
      ),
      themeMutedColor: normalizeHexColor(
        value?.themeMutedColor,
        normalizeHexColor(fallbackValue?.themeMutedColor, DEFAULT_THEME_SETTINGS.themeMutedColor)
      ),
      themeAccentColor: normalizeHexColor(
        value?.themeAccentColor,
        normalizeHexColor(fallbackValue?.themeAccentColor, DEFAULT_THEME_SETTINGS.themeAccentColor)
      ),
      themeAccentAltColor: normalizeHexColor(
        value?.themeAccentAltColor,
        normalizeHexColor(
          fallbackValue?.themeAccentAltColor,
          DEFAULT_THEME_SETTINGS.themeAccentAltColor
        )
      ),
      themeDisplayFont: resolveThemeFontKey(
        value?.themeDisplayFont,
        resolveThemeFontKey(fallbackValue?.themeDisplayFont, DEFAULT_THEME_SETTINGS.themeDisplayFont)
      ),
      themeBodyFont: resolveThemeFontKey(
        value?.themeBodyFont,
        resolveThemeFontKey(fallbackValue?.themeBodyFont, DEFAULT_THEME_SETTINGS.themeBodyFont)
      ),
      heroDisplayFont: resolveThemeFontKey(
        value?.heroDisplayFont,
        resolveThemeFontKey(value?.themeDisplayFont || fallbackValue?.heroDisplayFont, DEFAULT_THEME_SETTINGS.heroDisplayFont)
      ),
      heroTitleColor: normalizeHexColor(
        value?.heroTitleColor,
        normalizeHexColor(fallbackValue?.heroTitleColor, DEFAULT_THEME_SETTINGS.heroTitleColor)
      ),
      heroCopyColor: normalizeHexColor(
        value?.heroCopyColor,
        normalizeHexColor(fallbackValue?.heroCopyColor, DEFAULT_THEME_SETTINGS.heroCopyColor)
      ),
      badgeDisplayFont: resolveThemeFontKey(
        value?.badgeDisplayFont,
        resolveThemeFontKey(value?.themeDisplayFont || fallbackValue?.badgeDisplayFont, DEFAULT_THEME_SETTINGS.badgeDisplayFont)
      ),
      badgeTextColor: normalizeHexColor(
        value?.badgeTextColor,
        normalizeHexColor(fallbackValue?.badgeTextColor, DEFAULT_THEME_SETTINGS.badgeTextColor)
      ),
      badgeBgStart: normalizeHexColor(
        value?.badgeBgStart,
        normalizeHexColor(fallbackValue?.badgeBgStart, DEFAULT_THEME_SETTINGS.badgeBgStart)
      ),
      badgeBgEnd: normalizeHexColor(
        value?.badgeBgEnd,
        normalizeHexColor(fallbackValue?.badgeBgEnd, DEFAULT_THEME_SETTINGS.badgeBgEnd)
      ),
    };
  }

  function normalizeContentData(value, fallbackValue, options = {}) {
    const fallback = isRecord(fallbackValue) ? fallbackValue : {};
    const source = isRecord(value) ? value : {};
    const shouldMergeLegacySections = options.mergeLegacySections === true;
    const resolvedSections = Array.isArray(source.sections)
      ? shouldMergeLegacySections
        ? mergeLegacySections(source.sections, fallback.sections || [])
        : deepClone(source.sections)
      : deepClone(fallback.sections || []);
    const normalizedSections = normalizeSectionItemAssets(resolvedSections);
    const resolvedLiveChannels = Array.isArray(source.liveChannels)
      ? deepClone(source.liveChannels)
      : deepClone(fallback.liveChannels || []);

    return {
      homepageSettings: normalizeHomepageSettings(
        source.homepageSettings,
        fallback.homepageSettings
      ),
      sections: normalizedSections,
      liveChannels: normalizeLiveChannelAssets(resolvedLiveChannels),
      liveSchedule: Array.isArray(source.liveSchedule)
        ? deepClone(source.liveSchedule)
        : deepClone(fallback.liveSchedule || []),
    };
  }

  function writeStoredContent(storageKey, value, fallbackValue) {
    const normalized = normalizeContentData(value, fallbackValue);
    const storage = getStorage();

    if (!storage) {
      return normalized;
    }

    try {
      storage.setItem(
        storageKey,
        JSON.stringify({
          version: CONTENT_STORAGE_VERSION,
          updatedAt: new Date().toISOString(),
          content: normalized,
        })
      );
    } catch (error) {
      return normalized;
    }

    return normalized;
  }

  function clearStoredContent(storageKey) {
    const storage = getStorage();

    if (!storage) {
      return;
    }

    try {
      storage.removeItem(storageKey);
    } catch (error) {
      // Ignore storage errors and keep the in-memory defaults.
    }
  }

  function isEditorPreviewMode(currentGlobal) {
    if (!currentGlobal?.location?.search) {
      return false;
    }

    return new URLSearchParams(currentGlobal.location.search).get(PREVIEW_QUERY_KEY) === "1";
  }

  function getPublishedContent(fallbackValue) {
    const bakedPublished = global.maiPublishedContent;

    if (bakedPublished?.content) {
      return normalizeContentData(bakedPublished.content, fallbackValue, {
        mergeLegacySections: Number(bakedPublished.version) < CONTENT_STORAGE_VERSION,
      });
    }

    const stored = readStoredContent(CONTENT_STORAGE_KEY);

    if (!stored?.content) {
      return null;
    }

    return normalizeContentData(stored.content, fallbackValue, {
      mergeLegacySections: stored.version < CONTENT_STORAGE_VERSION,
    });
  }

  function getDraftContent(fallbackValue) {
    const stored = readStoredContent(DRAFT_STORAGE_KEY);

    if (!stored?.content) {
      return null;
    }

    return normalizeContentData(stored.content, fallbackValue, {
      mergeLegacySections: stored.version < CONTENT_STORAGE_VERSION,
    });
  }

  function getActiveContentData(currentGlobal, fallbackValue) {
    const draftContent = isEditorPreviewMode(currentGlobal) ? getDraftContent(fallbackValue) : null;
    const publishedContent = getPublishedContent(fallbackValue);

    return draftContent || publishedContent || normalizeContentData(fallbackValue, fallbackValue);
  }

  function createEditorApi(fallbackValue) {
    return {
      storageKey: CONTENT_STORAGE_KEY,
      draftStorageKey: DRAFT_STORAGE_KEY,
      previewQueryKey: PREVIEW_QUERY_KEY,
      isPreviewMode() {
        return isEditorPreviewMode(global);
      },
      normalizeAssetPath(value) {
        return migrateLegacyProgramAssetPath(value);
      },
      normalizeContent(value) {
        return normalizeContentData(value, fallbackValue);
      },
      getDefaultContent() {
        return normalizeContentData(fallbackValue, fallbackValue);
      },
      hasPublishedContent() {
        return Boolean(readStoredContent(CONTENT_STORAGE_KEY)?.content);
      },
      hasDraftContent() {
        return Boolean(readStoredContent(DRAFT_STORAGE_KEY)?.content);
      },
      getPublishedContent() {
        return getPublishedContent(fallbackValue) || this.getDefaultContent();
      },
      getDraftContent() {
        return getDraftContent(fallbackValue);
      },
      getInitialContent() {
        return this.getDraftContent() || this.getPublishedContent();
      },
      saveDraftContent(value) {
        return writeStoredContent(DRAFT_STORAGE_KEY, value, fallbackValue);
      },
      publishContent(value) {
        const normalized = writeStoredContent(CONTENT_STORAGE_KEY, value, fallbackValue);
        writeStoredContent(DRAFT_STORAGE_KEY, normalized, fallbackValue);
        return normalized;
      },
      discardDraft() {
        clearStoredContent(DRAFT_STORAGE_KEY);
        return this.getPublishedContent();
      },
      restoreDefaultDraft() {
        const normalized = this.getDefaultContent();
        writeStoredContent(DRAFT_STORAGE_KEY, normalized, fallbackValue);
        return normalized;
      },
      publishDefaultContent() {
        clearStoredContent(CONTENT_STORAGE_KEY);
        clearStoredContent(DRAFT_STORAGE_KEY);
        return this.getDefaultContent();
      },
    };
  }

  function parseAvailabilityDate(value, boundary = "start") {
    const rawValue = String(value || "").trim();

    if (!rawValue) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
      return new Date(
        `${rawValue}T${boundary === "end" ? "23:59:59.999" : "00:00:00.000"}+12:00`
      );
    }

    const parsedDate = new Date(rawValue);

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate;
  }

  function formatAvailabilityDate(date) {
    return new Intl.DateTimeFormat("en-FJ", {
      timeZone: "Pacific/Fiji",
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  function getAvailabilityDateKey(date) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Pacific/Fiji",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  function getPlaybackAvailability(entry, now = new Date()) {
    const startDate = parseAvailabilityDate(entry?.availableFrom, "start");
    const endDate = parseAvailabilityDate(entry?.availableUntil, "end");
    const hasMedia = Boolean(entry?.mediaUrl);
    const todayKey = getAvailabilityDateKey(now);
    const startKey = startDate ? getAvailabilityDateKey(startDate) : "";
    const isToday = Boolean(startDate) && startKey === todayKey;
    const isPastDay = Boolean(startDate) && startKey < todayKey;

    if (!hasMedia) {
      return {
        state: startDate ? "upcoming" : "missing",
        isPlayable: false,
        label: startDate ? "Airing Later" : "Coming Soon",
        detailText: startDate
          ? `Scheduled ${formatAvailabilityDate(startDate)}`
          : "Media file not added yet.",
        startDate,
        endDate,
      };
    }

    if (startDate && now < startDate) {
      return {
        state: "upcoming",
        isPlayable: false,
        label: isToday ? "Airing Later" : "Coming Soon",
        detailText: isToday
          ? `Airing later today, ${formatAvailabilityDate(startDate)}`
          : `Scheduled ${formatAvailabilityDate(startDate)}`,
        startDate,
        endDate,
      };
    }

    if (endDate && now > endDate) {
      return {
        state: "expired",
        isPlayable: false,
        label: "Already Aired",
        detailText: `Aired ${formatAvailabilityDate(endDate)}`,
        startDate,
        endDate,
      };
    }

    return {
      state: isPastDay ? "aired" : "airing",
      isPlayable: true,
      label: isPastDay ? "Already Aired" : "Airing",
      detailText: startDate
        ? isPastDay
          ? `Aired ${formatAvailabilityDate(startDate)}`
          : `Airing ${formatAvailabilityDate(startDate)}`
        : "Available now",
      startDate,
      endDate,
    };
  }

  function getPreferredEpisode(item) {
    if (!item || item.kind !== "series") {
      return null;
    }

    const episodes = Array.isArray(item.episodes) ? item.episodes : [];

    if (episodes.length === 0) {
      return null;
    }

    const playableEpisodes = episodes.filter((episode) => getPlaybackAvailability(episode).isPlayable);

    if (playableEpisodes.length) {
      return playableEpisodes[playableEpisodes.length - 1];
    }

    const upcomingEpisodes = episodes
      .map((episode, index) => ({
        episode,
        index,
        availability: getPlaybackAvailability(episode),
      }))
      .filter(({ availability }) => availability.state === "upcoming")
      .sort((left, right) => {
        const leftStart = left.availability.startDate?.getTime() ?? Number.POSITIVE_INFINITY;
        const rightStart = right.availability.startDate?.getTime() ?? Number.POSITIVE_INFINITY;

        return leftStart - rightStart || left.index - right.index;
      });

    if (upcomingEpisodes.length) {
      return upcomingEpisodes[0].episode;
    }

    return episodes.find((episode) => episode.mediaUrl) || episodes[0] || null;
  }

  function migrateLegacyProgramAssetPath(pathValue) {
    const normalizedPath = normalizeLocalAssetPath(pathValue);

    if (!normalizedPath) {
      return "";
    }

    if (normalizedPath === "./images/SASR25.jpg") {
      return buildProjectPath("Programs/SASR25/images", "SASR25.jpg");
    }

    if (normalizedPath === "./images/Bait.jpg") {
      return buildProjectPath("Programs/Bait Season 1/images", "Bait.jpg");
    }

    if (normalizedPath === "./videos/sasr25_dailyhighlights_st3.mp4") {
      return buildProjectPath(
        "Programs/SASR25/videos/sasr25",
        "sasr25_Episode 1 dailyhighlights_st3.mp4"
      );
    }

    if (normalizedPath.startsWith("./videos/Bait Season 1 [10Bit] Complete/")) {
      return normalizedPath.replace(
        "./videos/Bait Season 1 [10Bit] Complete/",
        "./Programs/Bait Season 1/videos/Bait Season 1 [10Bit] Complete/"
      );
    }

    return normalizedPath;
  }

  function normalizeAssetSourceList(value) {
    if (!Array.isArray(value)) {
      return value;
    }

    return value.map((entry) =>
      isRecord(entry)
        ? {
            ...entry,
            src: migrateLegacyProgramAssetPath(entry.src),
            originalSrc: migrateLegacyProgramAssetPath(entry.originalSrc),
          }
        : entry
    );
  }

  function normalizeSectionItemAssets(sections) {
    return (Array.isArray(sections) ? sections : []).map((section) => ({
      ...section,
      items: (Array.isArray(section.items) ? section.items : []).map((item) => {
        const featureImageUrl = migrateLegacyProgramAssetPath(item.featureImageUrl);
        const imageUrl = migrateLegacyProgramAssetPath(item.imageUrl);

        return {
          ...item,
          imageUrl,
          featureImageUrl,
          logoUrl: migrateLegacyProgramAssetPath(item.logoUrl),
          mediaUrl: migrateLegacyProgramAssetPath(item.mediaUrl),
          qualities: normalizeAssetSourceList(item.qualities),
          tracks: normalizeAssetSourceList(item.tracks),
          episodes: (Array.isArray(item.episodes) ? item.episodes : []).map((episode) => ({
            ...episode,
            imageUrl: migrateLegacyProgramAssetPath(episode.imageUrl),
            mediaUrl: migrateLegacyProgramAssetPath(episode.mediaUrl),
            qualities: normalizeAssetSourceList(episode.qualities),
            tracks: normalizeAssetSourceList(episode.tracks),
          })),
        };
      }),
    }));
  }

  function normalizeLiveChannelAssets(channels) {
    return (Array.isArray(channels) ? channels : []).map((channel) => ({
      ...channel,
      logoUrl: migrateLegacyProgramAssetPath(channel.logoUrl),
      streamUrl: migrateLegacyProgramAssetPath(channel.streamUrl),
      sourceMode: String(channel.sourceMode || ""),
      playoutFiles: (Array.isArray(channel.playoutFiles) ? channel.playoutFiles : [])
        .map((entry) => migrateLegacyProgramAssetPath(entry))
        .filter(Boolean),
      qualities: normalizeAssetSourceList(channel.qualities),
    }));
  }

  function slugify(value) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function createPosterImage(palette) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${palette.skyTop}" />
            <stop offset="55%" stop-color="${palette.skyMid}" />
            <stop offset="100%" stop-color="${palette.skyBottom}" />
          </linearGradient>
          <linearGradient id="ridge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${palette.ridgeTop}" />
            <stop offset="100%" stop-color="${palette.ridgeBottom}" />
          </linearGradient>
          <linearGradient id="foreground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${palette.foregroundTop}" />
            <stop offset="100%" stop-color="${palette.foregroundBottom}" />
          </linearGradient>
          <radialGradient id="halo" cx="62%" cy="18%" r="55%">
            <stop offset="0%" stop-color="${palette.halo}" stop-opacity=".88" />
            <stop offset="65%" stop-color="${palette.halo}" stop-opacity=".18" />
            <stop offset="100%" stop-color="${palette.halo}" stop-opacity="0" />
          </radialGradient>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="${palette.grid}" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="960" height="540" fill="url(#sky)" />
        <rect width="960" height="540" fill="url(#grid)" opacity=".32" />
        <circle cx="748" cy="112" r="168" fill="url(#halo)" />
        <path d="M0 282C112 250 218 246 324 268C438 292 572 248 704 228C792 214 878 220 960 244V540H0Z" fill="${palette.midground}" opacity=".58" />
        <path d="M0 324C136 282 244 286 352 318C472 352 590 314 712 280C804 254 882 258 960 288V540H0Z" fill="url(#ridge)" />
        <path d="M0 394C120 352 238 356 354 390C460 420 574 418 960 316V540H0Z" fill="url(#foreground)" />
        <path d="M0 446C158 396 304 400 446 430C560 454 700 444 960 352V540H0Z" fill="${palette.foregroundAccent}" opacity=".94" />
        <circle cx="156" cy="112" r="116" fill="${palette.cornerGlow}" opacity=".26" />
        <circle cx="842" cy="412" r="182" fill="${palette.cornerGlow}" opacity=".18" />
        <path d="M96 138C192 120 276 128 354 152" fill="none" stroke="${palette.spark}" stroke-width="5" stroke-linecap="round" opacity=".72" />
        <path d="M620 118C720 92 818 92 910 126" fill="none" stroke="${palette.spark}" stroke-width="4" stroke-linecap="round" opacity=".44" />
        <path d="M164 452C250 404 314 394 404 412" fill="none" stroke="${palette.spark}" stroke-width="4" stroke-linecap="round" opacity=".28" />
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
  }

  const artworkByClass = {
    "art-live-main": createPosterImage({
      skyTop: "#7b4b1f",
      skyMid: "#315057",
      skyBottom: "#15202a",
      ridgeTop: "#274646",
      ridgeBottom: "#13252b",
      foregroundTop: "#754521",
      foregroundBottom: "#1f1316",
      foregroundAccent: "#0d0f14",
      midground: "#d2a16a",
      halo: "#f5c686",
      cornerGlow: "#7fd8ff",
      spark: "#fff2d2",
      grid: "#ffffff18",
    }),
    "art-live-plus": createPosterImage({
      skyTop: "#6f2f5a",
      skyMid: "#30244f",
      skyBottom: "#140f1f",
      ridgeTop: "#47356b",
      ridgeBottom: "#22173a",
      foregroundTop: "#a36355",
      foregroundBottom: "#2a1422",
      foregroundAccent: "#0b0a12",
      midground: "#e49880",
      halo: "#ffb987",
      cornerGlow: "#ff7ae7",
      spark: "#ffe6ff",
      grid: "#ffffff16",
    }),
    "art-pulse": createPosterImage({
      skyTop: "#7b1f37",
      skyMid: "#3b1f36",
      skyBottom: "#16101a",
      ridgeTop: "#74263f",
      ridgeBottom: "#2f1522",
      foregroundTop: "#c66a6b",
      foregroundBottom: "#31131b",
      foregroundAccent: "#10080c",
      midground: "#f6ae82",
      halo: "#ffd6b3",
      cornerGlow: "#ff8dc0",
      spark: "#fff0e6",
      grid: "#ffffff16",
    }),
    "art-lali": createPosterImage({
      skyTop: "#8d4316",
      skyMid: "#50233d",
      skyBottom: "#170d16",
      ridgeTop: "#8f631a",
      ridgeBottom: "#34161f",
      foregroundTop: "#f48b55",
      foregroundBottom: "#2f1016",
      foregroundAccent: "#11070d",
      midground: "#ffd089",
      halo: "#ffe0a6",
      cornerGlow: "#ff7f6d",
      spark: "#fff4d1",
      grid: "#ffffff16",
    }),
    "art-talanoa": createPosterImage({
      skyTop: "#2c4e78",
      skyMid: "#2f2a61",
      skyBottom: "#12111f",
      ridgeTop: "#2c6188",
      ridgeBottom: "#1a2440",
      foregroundTop: "#3f90a1",
      foregroundBottom: "#16111b",
      foregroundAccent: "#090a11",
      midground: "#7bc7c8",
      halo: "#c5f0f6",
      cornerGlow: "#6ca8ff",
      spark: "#eef8ff",
      grid: "#ffffff16",
    }),
    "art-kitchen": createPosterImage({
      skyTop: "#b46612",
      skyMid: "#6b3a25",
      skyBottom: "#1d1115",
      ridgeTop: "#ca7c2a",
      ridgeBottom: "#412115",
      foregroundTop: "#f8af55",
      foregroundBottom: "#30131a",
      foregroundAccent: "#12090e",
      midground: "#ffd478",
      halo: "#ffe7ac",
      cornerGlow: "#f8a56e",
      spark: "#fff4d2",
      grid: "#ffffff14",
    }),
    "art-breakfast": createPosterImage({
      skyTop: "#c07a2d",
      skyMid: "#8b4a27",
      skyBottom: "#21131a",
      ridgeTop: "#dd9654",
      ridgeBottom: "#4b221c",
      foregroundTop: "#f4cb92",
      foregroundBottom: "#34141a",
      foregroundAccent: "#140b10",
      midground: "#ffd2a2",
      halo: "#ffe7bf",
      cornerGlow: "#ffd080",
      spark: "#fff7de",
      grid: "#ffffff14",
    }),
    "art-roots": createPosterImage({
      skyTop: "#1f6a57",
      skyMid: "#164645",
      skyBottom: "#11141b",
      ridgeTop: "#24846e",
      ridgeBottom: "#16302d",
      foregroundTop: "#77c9af",
      foregroundBottom: "#151018",
      foregroundAccent: "#090a0f",
      midground: "#b5f1d3",
      halo: "#c2f4dd",
      cornerGlow: "#77ffd6",
      spark: "#f2fff8",
      grid: "#ffffff14",
    }),
    "art-market": createPosterImage({
      skyTop: "#8a642a",
      skyMid: "#4e3723",
      skyBottom: "#161114",
      ridgeTop: "#9e7740",
      ridgeBottom: "#342117",
      foregroundTop: "#d1a778",
      foregroundBottom: "#241117",
      foregroundAccent: "#0f080d",
      midground: "#f4d7af",
      halo: "#ffe3b4",
      cornerGlow: "#ffd084",
      spark: "#fff2dc",
      grid: "#ffffff14",
    }),
    "art-youth": createPosterImage({
      skyTop: "#742e7c",
      skyMid: "#462460",
      skyBottom: "#15101d",
      ridgeTop: "#8956b4",
      ridgeBottom: "#261636",
      foregroundTop: "#d08fff",
      foregroundBottom: "#27131d",
      foregroundAccent: "#0d0911",
      midground: "#ffb0f7",
      halo: "#ffe0ff",
      cornerGlow: "#b58cff",
      spark: "#fff0ff",
      grid: "#ffffff16",
    }),
    "art-harbour": createPosterImage({
      skyTop: "#157d93",
      skyMid: "#1f4f73",
      skyBottom: "#12111b",
      ridgeTop: "#3da4a6",
      ridgeBottom: "#173448",
      foregroundTop: "#8fe0d7",
      foregroundBottom: "#15111a",
      foregroundAccent: "#090a11",
      midground: "#c5f6f4",
      halo: "#e4ffff",
      cornerGlow: "#6fdcff",
      spark: "#f0ffff",
      grid: "#ffffff16",
    }),
    "art-street-food": createPosterImage({
      skyTop: "#cc6a10",
      skyMid: "#843a1d",
      skyBottom: "#161014",
      ridgeTop: "#ef8b1d",
      ridgeBottom: "#4d2017",
      foregroundTop: "#ffb868",
      foregroundBottom: "#2a1117",
      foregroundAccent: "#0e080c",
      midground: "#ffd69a",
      halo: "#ffdfab",
      cornerGlow: "#ff9e68",
      spark: "#fff0d4",
      grid: "#ffffff14",
    }),
    "art-comedy": createPosterImage({
      skyTop: "#84252d",
      skyMid: "#5a2131",
      skyBottom: "#171017",
      ridgeTop: "#ab3740",
      ridgeBottom: "#311520",
      foregroundTop: "#f0a58f",
      foregroundBottom: "#251017",
      foregroundAccent: "#0f080d",
      midground: "#fbd2af",
      halo: "#ffe6c4",
      cornerGlow: "#ff8a8a",
      spark: "#fff0e8",
      grid: "#ffffff14",
    }),
    "art-roadshow": createPosterImage({
      skyTop: "#b06d17",
      skyMid: "#78442b",
      skyBottom: "#1b1216",
      ridgeTop: "#cf8d2e",
      ridgeBottom: "#47251c",
      foregroundTop: "#f2c27a",
      foregroundBottom: "#291118",
      foregroundAccent: "#11090d",
      midground: "#ffe4ad",
      halo: "#ffebb9",
      cornerGlow: "#ffab68",
      spark: "#fff4df",
      grid: "#ffffff14",
    }),
    "art-faith": createPosterImage({
      skyTop: "#41558e",
      skyMid: "#253660",
      skyBottom: "#14111b",
      ridgeTop: "#5d79c4",
      ridgeBottom: "#1b213f",
      foregroundTop: "#b5cbff",
      foregroundBottom: "#171119",
      foregroundAccent: "#090910",
      midground: "#dfe7ff",
      halo: "#eef4ff",
      cornerGlow: "#8eb5ff",
      spark: "#f6f9ff",
      grid: "#ffffff16",
    }),
    "art-classroom": createPosterImage({
      skyTop: "#3f6aa8",
      skyMid: "#27477b",
      skyBottom: "#15131b",
      ridgeTop: "#5a8ed6",
      ridgeBottom: "#1d2b4d",
      foregroundTop: "#a8d3ff",
      foregroundBottom: "#17121a",
      foregroundAccent: "#090a10",
      midground: "#d6ebff",
      halo: "#eaf6ff",
      cornerGlow: "#79c7ff",
      spark: "#f2f9ff",
      grid: "#ffffff16",
    }),
    "art-rugby": createPosterImage({
      skyTop: "#0e5b4a",
      skyMid: "#17393d",
      skyBottom: "#0f1217",
      ridgeTop: "#14886f",
      ridgeBottom: "#16302f",
      foregroundTop: "#7addae",
      foregroundBottom: "#121218",
      foregroundAccent: "#08090d",
      midground: "#c0ffdd",
      halo: "#d7ffe8",
      cornerGlow: "#6cf5d1",
      spark: "#effff8",
      grid: "#ffffff14",
    }),
    "art-schools": createPosterImage({
      skyTop: "#255ae0",
      skyMid: "#2740aa",
      skyBottom: "#14111d",
      ridgeTop: "#3f8cff",
      ridgeBottom: "#1a2750",
      foregroundTop: "#8bc9ff",
      foregroundBottom: "#16111a",
      foregroundAccent: "#08090f",
      midground: "#d5ecff",
      halo: "#e7f7ff",
      cornerGlow: "#7bcbff",
      spark: "#f1faff",
      grid: "#ffffff16",
    }),
    "art-netball": createPosterImage({
      skyTop: "#9a2f69",
      skyMid: "#5f2a64",
      skyBottom: "#15101a",
      ridgeTop: "#ca5ea0",
      ridgeBottom: "#321728",
      foregroundTop: "#ffb0d4",
      foregroundBottom: "#221117",
      foregroundAccent: "#0d090d",
      midground: "#ffe1ef",
      halo: "#ffeefd",
      cornerGlow: "#ff8be0",
      spark: "#fff1fb",
      grid: "#ffffff16",
    }),
    "art-events": createPosterImage({
      skyTop: "#5e3188",
      skyMid: "#352251",
      skyBottom: "#110f16",
      ridgeTop: "#8a59c5",
      ridgeBottom: "#241a38",
      foregroundTop: "#d2aaff",
      foregroundBottom: "#1b121a",
      foregroundAccent: "#09080d",
      midground: "#f2dcff",
      halo: "#f6ebff",
      cornerGlow: "#c18bff",
      spark: "#fbf3ff",
      grid: "#ffffff16",
    }),
  };
  const artClassAliases = {
    "art-harbour1": "art-harbour",
  };

  function getArtworkForArtClass(artClass) {
    return artworkByClass[artClass] || artworkByClass[artClassAliases[artClass]] || "";
  }

  const demoReplayUrl = buildProjectPath(
    "Programs/SASR25/videos/sasr25",
    "sasr25_Episode 1 dailyhighlights_st3.mp4"
  );
  const demoReplayType = "video/mp4";
  const blueMountainStateFolder =
    "Programs/Blue Mountain State Season 1/videos/Blue Mountain State Season 1 [10Bit] Complete";
  const blueMountainStateFiles = [
    "Blue.Mountain.State.S01E01.Its.Called.Hazing.Look.It.Up.720p.BluRay.x265.10Bit-Pahe.in.mkv",
    "Blue.Mountain.State.S01E02.Promise.Ring.720p.BluRay.x265.10Bit-Pahe.in.mkv",
    "Blue.Mountain.State.S01E03.Pocket.Pussy.720p.BluRay.x265.10Bit-Pahe.in.mkv",
    "Blue.Mountain.State.S01E04.Rivalry.Weekend.720p.BluRay.x265.10Bit-Pahe.in.mkv",
    "Blue.Mountain.State.S01E05.Theres.Only.One.Second.Best.720p.BluRay.x265.10Bit-Pahe.in.mkv",
    "Blue.Mountain.State.S01E06.The.Drug.Olympics.720p.BluRay.x265.10Bit-Pahe.in.mkv",
    "Blue.Mountain.State.S01E07.The.Legend.of.the.Golden.Arm.720p.BluRay.x265.10Bit-Pahe.in.mkv",
    "Blue.Mountain.State.S01E08.LAX.720p.BluRay.x265.10Bit-Pahe.in.mkv",
    "Blue.Mountain.State.S01E09.Midterms.720p.BluRay.x265.10Bit-Pahe.in.mkv",
    "Blue.Mountain.State.S01E10.Marathon.Monday.720p.BluRay.x265.10Bit-Pahe.in.mkv",
    "Blue.Mountain.State.S01E11.Ransom.720p.BluRay.x265.10Bit-Pahe.in.mkv",
    "Blue.Mountain.State.S01E12.Piss.Test.720p.BluRay.x265.10Bit-Pahe.in.mkv",
    "Blue.Mountain.State.S01E13.Bowl.Game.720p.BluRay.x265.10Bit-Pahe.in.mkv",
  ];
  const blueMountainStateEpisodes = createImportedSeasonEpisodes(
    "Blue Mountain State",
    "Season 1",
    blueMountainStateFolder,
    blueMountainStateFiles,
    "video/x-matroska"
  );
  const baitFolder = "Programs/Bait Season 1/videos/Bait Season 1 [10Bit] Complete";
  const baitFiles = [
    "Bait.2026.S01E01.BLATANT.NOT.SUBTLE.720p.WEB-HD.x265.10Bit-Pahe.in.mkv",
    "Bait.2026.S01E02.TO.TROLL.TO.PROVOKE.720p.WEB-HD.x265.10Bit-Pahe.in.mkv",
    "Bait.2026.S01E03.HOUSE.OR.HOME.720p.WEB-HD.x265.10Bit-Pahe.in.mkv",
    "Bait.2026.S01E04.LOYALTY.ALLEGIANCE.720p.WEB-HD.x265.10Bit-Pahe.in.mkv",
    "Bait.2026.S01E05.LURE.PART.OF.A.TRAP.720p.WEB-HD.x265.10Bit-Pahe.in.mkv",
    "Bait.2026.S01E06.THE.SUBTLE.ONE.720p.WEB-HD.x265.10Bit-Pahe.in.mkv",
  ];
  const baitEpisodes = createImportedSeasonEpisodes(
    "Bait",
    "Season 1",
    baitFolder,
    baitFiles,
    "video/x-matroska"
  );

  const defaultSections = [
    {
      id: "watch-live",
      eyebrow: "Stream now",
      title: "Watch Live",
      columns: "two",
      items: [
        createItem({
          title: "MAI TV",
          kicker: "Channel One",
          artClass: "art-live-main",
          logoUrl: "./images/MaiTV-logo-small.png",
          logoAlt: "MAI TV",
          badgeLabel: "LIVE",
          badgeClass: "live",
          description: "Local programming, news and island entertainment.",
          meta: "Always on | Free to watch",
          filters: ["live", "news", "family"],
          liveChannelId: "mai-tv",
        }),
        createItem({
          title: "MAI Replay",
          kicker: "Pop-up stream",
          artClass: "art-live-plus",
          badgeLabel: "NEW",
          badgeClass: "new",
          description: "Encore blocks and weekend favourite marathons.",
          meta: "Replay lane | Event encore",
          filters: ["live", "catchup"],
        }),
      ],
    },
    {
      id: "new-episodes",
      eyebrow: "Fresh this week",
      title: "New Episodes",
      items: [
        createItem({
          title: "Island Pulse",
          kicker: "News",
          artClass: "art-pulse",
          badgeLabel: "NEW",
          badgeClass: "new",
          description: "Current affairs and the stories shaping Fiji this week.",
          meta: "Weeknights | Current affairs",
          filters: ["new", "news"],
        }),
        createItem({
          title: "Spotlight",
          kicker: "Entertainment",
          artClass: "art-lali",
          badgeLabel: "LOCAL",
          badgeClass: "local",
          description: "A bright local showcase for standout talent, community voices and featured guests.",
          meta: "Magazine | Featured stories",
          filters: ["new", "music", "family"],
        }),
        createItem({
          title: "Sunday Talanoa",
          kicker: "Talk",
          artClass: "art-talanoa",
          badgeLabel: "NEW",
          badgeClass: "new",
          description: "Community voices, culture and conversations that matter.",
          meta: "Talk | Community stories",
          filters: ["new", "news", "family"],
        }),
        createItem({
          title: "Island Kitchen",
          kicker: "Lifestyle",
          artClass: "art-kitchen",
          badgeLabel: "PREMIERE",
          badgeClass: "premiere",
          description: "Local recipes, market ingredients and family favourites.",
          meta: "Food | New season",
          filters: ["new", "family"],
        }),
      ],
    },
    {
      id: "catch-up",
      eyebrow: "Missed it live?",
      title: "Catch Up",
      items: [
        createItem({
          title: "Bula Breakfast",
          kicker: "Morning",
          artClass: "art-breakfast",
          badgeLabel: "CATCH UP",
          badgeClass: "catchup",
          description: "Light news, weather, interviews and local updates.",
          meta: "Daily | Morning show",
          filters: ["catchup", "news"],
        }),
        createItem({
          title: "Vanua Roots",
          kicker: "Culture",
          artClass: "art-roots",
          badgeLabel: "LOCAL",
          badgeClass: "local",
          description: "Heritage stories, traditions and life around the islands.",
          meta: "Culture | Documentary",
          filters: ["catchup", "music", "family"],
        }),
        createItem({
          title: "Market Day",
          kicker: "Lifestyle",
          artClass: "art-market",
          badgeLabel: "CATCH UP",
          badgeClass: "catchup",
          description: "Traders, small business stories and everyday island hustle.",
          meta: "Lifestyle | Business stories",
          filters: ["catchup", "family"],
        }),
        createItem({
          title: "Coral Harbour",
          kicker: "Drama Series",
          artClass: "art-harbour",
          badgeLabel: "SERIES",
          badgeClass: "series",
          description: "A full test series with Season 1.",
          meta: "Drama | Season 1",
          filters: ["catchup", "family", "series"],
          collectionLabel: "Season 1",
          sortLabel: "Episode Order",
          episodes: createSeasonEpisodes(
            "Coral Harbour",
            "Season 1",
            demoReplayUrl,
            demoReplayType
          ),
        }),
        createItem({
          title: "Bait",
          kicker: "Drama Thriller",
          artClass: "art-harbour",
          imageUrl: buildProjectPath("Programs/Bait Season 1/images", "Bait.jpg"),
          badgeLabel: "SERIES",
          badgeClass: "series",
          description: "A full imported season wired to the Bait episode folder.",
          meta: "Drama | Season 1",
          filters: ["catchup", "series", "drama"],
          collectionLabel: "Season 1",
          sortLabel: "Episode Order",
          episodes: baitEpisodes,
        }),
        createItem({
          title: "Street Food Fiji",
          kicker: "Lifestyle",
          artClass: "art-street-food",
          badgeLabel: "CATCH UP",
          badgeClass: "catchup",
          description: "Market stalls, roadside favourites and cooks serving up local flavour after dark.",
          meta: "Food | Night markets",
          filters: ["catchup", "family", "music"],
        }),
      ],
    },
    {
      id: "local-favourites",
      eyebrow: "Crowd favourites",
      title: "Local Favourites",
      items: [
        createItem({
          title: "The Brunch",
          kicker: "Lifestyle",
          artClass: "art-comedy",
          badgeLabel: "HOT",
          badgeClass: "hot",
          description: "Weekend conversations, lifestyle features and easy local viewing over brunch.",
          meta: "Weekend | Lifestyle talk",
          filters: ["family", "catchup", "music"],
        }),
        createItem({
          title: "Women in Sports",
          kicker: "Sports Talk",
          artClass: "art-roadshow",
          badgeLabel: "LOCAL",
          badgeClass: "local",
          description: "Profiles, conversations and matchday stories celebrating women shaping sport in Fiji.",
          meta: "Sport | Profiles and stories",
          filters: ["sport", "family", "catchup"],
        }),
        createItem({
          title: "Women in Leadership",
          kicker: "Leadership",
          artClass: "art-faith",
          badgeLabel: "WEEKLY",
          badgeClass: "catchup",
          description: "Conversations with women leading in business, community service and public life.",
          meta: "Talk | Leadership profiles",
          filters: ["news", "family", "catchup"],
        }),
        createItem({
          title: "Spotlight",
          kicker: "Entertainment",
          artClass: "art-lali",
          badgeLabel: "LOCAL",
          badgeClass: "local",
          description: "A bright local showcase for standout talent, community voices and featured guests.",
          meta: "Magazine | Featured stories",
          filters: ["family", "new", "music"],
        }),
        createItem({
          title: "Young Entrepreneur",
          kicker: "Business",
          artClass: "art-youth",
          badgeLabel: "NEW",
          badgeClass: "new",
          description: "Young business minds, start-up stories and practical ideas from local entrepreneurs.",
          meta: "Youth | Enterprise stories",
          filters: ["catchup", "news", "family"],
        }),
      ],
    },
    {
      id: "sport-events",
      eyebrow: "Replay and events",
      title: "Sport & Events",
      items: [
        createItem({
          title: "Road to 7s",
          kicker: "Rugby",
          artClass: "art-rugby",
          badgeLabel: "TRENDING",
          badgeClass: "hot",
          description: "Tournament updates, player stories and local build-up.",
          meta: "Sport | Rugby coverage",
          filters: ["sport", "news"],
        }),
        createItem({
          title: "SASR25 Daily Highlights",
          kicker: "Schools Series",
          artClass: "art-schools",
          badgeLabel: "SERIES",
          badgeClass: "series",
          description: "Open the show page and choose the episode or daily replay you want to watch.",
          meta: "Sport | Rally ",
          filters: ["sport", "catchup", "series"],
          featured: true,
          imageUrl: buildProjectPath("Programs/SASR25/images", "SASR25.jpg"),
          featureImageUrl: buildProjectPath("Programs/SASR25/images", "SASR25.jpg"),
          featureMotion: "sasr25-pan",
          featureImagePosition: "76% 42%",
          collectionLabel: "Stage 3",
          episodes: [
            createEpisode({
              title: "Episode 1",
              kicker: "Stage 3 Highlights",
              description: "Daily highlights replay for stage 3 school sports coverage.",
              meta: "Episode 1 | Stage 3 video replay",
              duration: "36 min",
              airedText: "Aired on MAI TV, Saturday 28th March 2026 (Fiji Time UTC+12)",
              mediaUrl: demoReplayUrl,
              mediaType: demoReplayType,
            }),
            createEpisode({
              title: "Episode 2",
              kicker: "Next Daily Highlights",
              description: "Add the next replay file here when the next daily package is ready.",
              meta: "Episode 2 | Coming soon",
              duration: "Coming soon",
              airedText: "Next daily package will appear here when the next replay is uploaded.",
              statusLabel: "SOON",
            }),
          ],
        }),
        createItem({
          title: "Netball Nation",
          kicker: "Netball",
          artClass: "art-netball",
          badgeLabel: "LOCAL",
          badgeClass: "local",
          description: "Club games, interviews and standout match replays.",
          meta: "Sport | Club coverage",
          filters: ["sport", "catchup"],
        }),
        createItem({
          title: "Festival Stage",
          kicker: "Events",
          artClass: "art-events",
          badgeLabel: "SPECIAL",
          badgeClass: "catchup",
          description: "Concert nights, local performances and community events.",
          meta: "Events | Performance replays",
          filters: ["sport", "music", "catchup"],
        }),
      ],
    },
  ];

  const defaultLiveChannels = [
    {
      id: "mai-tv",
      title: "MAI TV",
      kicker: "Channel One",
      logoUrl: "./images/MaiTV-logo-small.png",
      logoAlt: "MAI TV",
      description:
        "MAI TV live channel with news, local stories, community programming and island entertainment.",
      sourceMode: "stream",
      streamUrl: "",
      streamType: "",
      embedUrl: "",
      playoutFiles: [],
      timezone: "Pacific/Fiji",
      heroClass: "art-live-main",
      scheduleLabel: "Today in Fiji time",
      isDemo: true,
    },
  ];

  function getFijiTodayDateKey() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Pacific/Fiji",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  function buildLiveScheduleTime(dateKey, timeValue) {
    return `${dateKey}T${timeValue}:00+12:00`;
  }

  const defaultScheduleDateKey = getFijiTodayDateKey();
  const defaultLiveSchedule = [
    {
      channelId: "mai-tv",
      title: "Breakfast Bulletin",
      category: "News",
      start: buildLiveScheduleTime(defaultScheduleDateKey, "06:00"),
      end: buildLiveScheduleTime(defaultScheduleDateKey, "06:30"),
    },
    {
      channelId: "mai-tv",
      title: "Morning Devotion",
      category: "Faith",
      start: buildLiveScheduleTime(defaultScheduleDateKey, "06:30"),
      end: buildLiveScheduleTime(defaultScheduleDateKey, "07:00"),
    },
    {
      channelId: "mai-tv",
      title: "Island Pulse",
      category: "News",
      start: buildLiveScheduleTime(defaultScheduleDateKey, "07:00"),
      end: buildLiveScheduleTime(defaultScheduleDateKey, "07:30"),
    },
    {
      channelId: "mai-tv",
      title: "Market Day",
      category: "Lifestyle",
      start: buildLiveScheduleTime(defaultScheduleDateKey, "07:30"),
      end: buildLiveScheduleTime(defaultScheduleDateKey, "08:00"),
    },
    {
      channelId: "mai-tv",
      title: "Spotlight",
      category: "Entertainment",
      start: buildLiveScheduleTime(defaultScheduleDateKey, "08:00"),
      end: buildLiveScheduleTime(defaultScheduleDateKey, "08:30"),
    },
    {
      channelId: "mai-tv",
      title: "Vanua Roots",
      category: "Culture",
      start: buildLiveScheduleTime(defaultScheduleDateKey, "08:30"),
      end: buildLiveScheduleTime(defaultScheduleDateKey, "09:00"),
    },
    {
      channelId: "mai-tv",
      title: "Midday News",
      category: "News",
      start: buildLiveScheduleTime(defaultScheduleDateKey, "12:00"),
      end: buildLiveScheduleTime(defaultScheduleDateKey, "12:30"),
    },
    {
      channelId: "mai-tv",
      title: "Sunday Talanoa Replay",
      category: "Talk",
      start: buildLiveScheduleTime(defaultScheduleDateKey, "20:00"),
      end: buildLiveScheduleTime(defaultScheduleDateKey, "21:00"),
    },
  ];

  const defaultContentData = {
    homepageSettings: {
      heroContentAlign: "left",
      heroSlideDurationSeconds: 4.2,
      footerEyebrow: "Stream local",
      footerTitle: "A darker, more premium MAI+ browse screen for local viewing.",
      footerCopy:
        "Established in 2008, Mai TV was the second free to air television station in the country. Currently you can get coverage via analogue by utilizing a UHF antenna and also via Digital through Walesi.",
      footerButtonLabel: "Start Watching",
      footerButtonMode: "featured",
      footerLiveChannelId: "mai-tv",
      footerFacebookUrl: "https://www.facebook.com/maitvfiji/",
      footerTwitterUrl: "https://twitter.com/MaiTVFiji",
      footerYouTubeUrl: "https://www.youtube.com/channel/UCXiYmoWyQcPCIOAUXYpIwng",
      footerSoundCloudUrl: "https://soundcloud.com/maitvfiji",
      footerSocialLinks: DEFAULT_FOOTER_SOCIAL_LINKS,
      themeBgStart: DEFAULT_THEME_SETTINGS.themeBgStart,
      themeBgMid: DEFAULT_THEME_SETTINGS.themeBgMid,
      themeBgEnd: DEFAULT_THEME_SETTINGS.themeBgEnd,
      themeGlowPrimary: DEFAULT_THEME_SETTINGS.themeGlowPrimary,
      themeGlowSecondary: DEFAULT_THEME_SETTINGS.themeGlowSecondary,
      themePanelColor: DEFAULT_THEME_SETTINGS.themePanelColor,
      themeCardColor: DEFAULT_THEME_SETTINGS.themeCardColor,
      themeTextColor: DEFAULT_THEME_SETTINGS.themeTextColor,
      themeMutedColor: DEFAULT_THEME_SETTINGS.themeMutedColor,
      themeAccentColor: DEFAULT_THEME_SETTINGS.themeAccentColor,
      themeAccentAltColor: DEFAULT_THEME_SETTINGS.themeAccentAltColor,
      themeDisplayFont: DEFAULT_THEME_SETTINGS.themeDisplayFont,
      themeBodyFont: DEFAULT_THEME_SETTINGS.themeBodyFont,
      heroDisplayFont: DEFAULT_THEME_SETTINGS.heroDisplayFont,
      heroTitleColor: DEFAULT_THEME_SETTINGS.heroTitleColor,
      heroCopyColor: DEFAULT_THEME_SETTINGS.heroCopyColor,
      badgeDisplayFont: DEFAULT_THEME_SETTINGS.badgeDisplayFont,
      badgeTextColor: DEFAULT_THEME_SETTINGS.badgeTextColor,
      badgeBgStart: DEFAULT_THEME_SETTINGS.badgeBgStart,
      badgeBgEnd: DEFAULT_THEME_SETTINGS.badgeBgEnd,
    },
    sections: defaultSections,
    liveChannels: defaultLiveChannels,
    liveSchedule: defaultLiveSchedule,
  };

  const activeContentData = getActiveContentData(global, defaultContentData);
  const homepageSettings = activeContentData.homepageSettings;
  applyHomepageTheme(homepageSettings);
  const sections = deepClone(activeContentData.sections);
  const liveChannels = deepClone(activeContentData.liveChannels);
  const liveSchedule = deepClone(activeContentData.liveSchedule);

  sections.forEach((section) => {
    section.items = Array.isArray(section.items) ? section.items : [];

    section.items.forEach((item) => {
      item.featureImageUrl = migrateLegacyProgramAssetPath(item.featureImageUrl);
      item.imageUrl = migrateLegacyProgramAssetPath(item.imageUrl);
      item.logoUrl = migrateLegacyProgramAssetPath(item.logoUrl);
      item.id = item.id || slugify(`${section.id}-${item.title}`);
      item.sectionId = section.id;
      item.sectionTitle = section.title;
      item.episodes = Array.isArray(item.episodes) ? item.episodes : [];
      item.filters = Array.isArray(item.filters) ? item.filters : [];
      item.logoPosition = ["left", "center", "right"].includes(String(item.logoPosition || ""))
        ? String(item.logoPosition)
        : "left";
      item.ppvEnabled = Boolean(item.ppvEnabled);
      item.ppvPrice = String(item.ppvPrice || "");
      item.ppvCurrency = String(item.ppvCurrency || "FJD");
      item.ppvEventDate = String(item.ppvEventDate || "");
      item.ppvPortalUrl = String(item.ppvPortalUrl || "");
      item.ppvProvider = String(item.ppvProvider || "");
      item.ppvMethods = normalizeTagList(item.ppvMethods);
      item.ppvButtonLabel = String(item.ppvButtonLabel || "Buy PPV Access");
      item.ppvAccessNote = String(item.ppvAccessNote || "");
      item.ppvTermsUrl = String(item.ppvTermsUrl || "");
      item.kind = item.episodes.length > 0 ? "series" : "single";
      item.mediaUrl = migrateLegacyProgramAssetPath(item.mediaUrl);
      item.mediaType = item.mediaType || inferMediaTypeFromPath(item.mediaUrl) || "video/mp4";

      if (item.kind === "series") {
        item.episodes = item.episodes.map((episode, index) => {
          const titleSource = episode.sourceFile || episode.mediaUrl || episode.title;
          const shouldAutofillTitle =
            isGenericEpisodeTitle(episode.title) ||
            shouldNormalizeImportedEpisodeTitle(episode.title) ||
            normalizeTitleComparisonKey(episode.title) === normalizeTitleComparisonKey(item.title);
          const normalizedTitle =
            shouldAutofillTitle
              ? resolveImportedEpisodeTitle(titleSource, index)
              : episode.title;

          return {
            ...episode,
            title: normalizedTitle,
            mediaUrl: migrateLegacyProgramAssetPath(episode.mediaUrl),
            mediaType:
              episode.mediaType ||
              inferMediaTypeFromPath(migrateLegacyProgramAssetPath(episode.mediaUrl)) ||
              "video/mp4",
            number: index + 1,
            imageUrl: migrateLegacyProgramAssetPath(episode.imageUrl),
            id: episode.id || slugify(`${item.id}-${normalizedTitle || `episode-${index + 1}`}`),
          };
        });
      }
    });
  });

  const allItems = sections.flatMap((section) => section.items);
  const sortedLiveSchedule = [...liveSchedule].sort(
    (left, right) => new Date(left.start) - new Date(right.start)
  );

  global.maiCatalogue = {
    homepageSettings,
    sections,
    allItems,
    liveChannels,
    liveSchedule: sortedLiveSchedule,
    isPreviewMode: isEditorPreviewMode(global),
    normalizeAssetPath(value) {
      return migrateLegacyProgramAssetPath(value);
    },
    editor: createEditorApi(defaultContentData),
    getItemById(id) {
      return allItems.find((item) => item.id === id) || null;
    },
    getLiveChannelById(id) {
      return liveChannels.find((channel) => channel.id === id) || null;
    },
    getScheduleForChannel(channelId) {
      return sortedLiveSchedule.filter((entry) => entry.channelId === channelId);
    },
    getEpisodeById(item, episodeId) {
      if (!item || item.kind !== "series") {
        return null;
      }

      return item.episodes.find((episode) => episode.id === episodeId) || null;
    },
    getDefaultEpisode(item) {
      return getPreferredEpisode(item);
    },
    getFeaturedItems() {
      return allItems.filter((item) => item.featured);
    },
    getFeaturedShow() {
      return allItems.find((item) => item.featured) || allItems[0] || null;
    },
    getPrimaryLiveChannel() {
      return liveChannels[0] || null;
    },
    getArtwork(item) {
      return item?.imageUrl || item?.featureImageUrl || getArtworkForArtClass(item?.artClass);
    },
    getPlaybackAvailability(entry, now) {
      return getPlaybackAvailability(entry, now);
    },
  };
})(window);
