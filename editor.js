const catalogue = window.maiCatalogue;
const editorApi = catalogue?.editor;
const workbookParser = window.maiWorkbookParser;
const outlineRoot = document.getElementById("editor-outline");
const formRoot = document.getElementById("editor-form");
const statusRoot = document.getElementById("editor-status");
const previewFrame = document.getElementById("editor-preview-frame");
const inlinePreviewMode = document.body?.classList.contains("editor-page--inline");
const publishButton = document.getElementById("publish-button");
const saveDraftButton = document.getElementById("save-draft-button");
const openPreviewButton = document.getElementById("open-preview-button");
const reloadPreviewButton = document.getElementById("reload-preview-button");
const resetDraftButton = document.getElementById("reset-draft-button");
const restoreDefaultButton = document.getElementById("restore-default-button");
const downloadBackupButton = document.getElementById("download-backup-button");
const importBackupButton = document.getElementById("import-backup-button");
const importBackupInput = document.getElementById("import-backup-input");
const editorSearchInput = document.getElementById("editor-search-input");
const openSiteLink = document.getElementById("editor-open-site-link");
const watchLiveLink = document.getElementById("editor-watch-live-link");
const mediaBrowseInput = document.getElementById("editor-media-browse-input");
const mediaFolderInput = document.getElementById("editor-media-folder-input");
const scheduleUploadInput = document.getElementById("editor-schedule-upload-input");

if (
  !catalogue ||
  !editorApi ||
  !outlineRoot ||
  !formRoot ||
  (!previewFrame && !inlinePreviewMode)
) {
  throw new Error("MAI editor could not initialize because its dependencies were not available.");
}

const builtInArtClasses = [
  "art-live-main",
  "art-live-sport",
  "art-live-plus",
  "art-pulse",
  "art-lali",
  "art-talanoa",
  "art-kitchen",
  "art-breakfast",
  "art-roots",
  "art-market",
  "art-youth",
  "art-harbour",
  "art-harbour1",
  "art-street-food",
  "art-comedy",
  "art-roadshow",
  "art-faith",
  "art-classroom",
  "art-rugby",
  "art-schools",
  "art-netball",
  "art-events",
];
const availableArtClasses = [
  ...new Set([...builtInArtClasses, ...catalogue.allItems.map((item) => item.artClass).filter(Boolean)]),
];
const availableBadgeClasses = [
  ...new Set(catalogue.allItems.map((item) => item.badgeClass).filter(Boolean)),
  "live",
  "new",
  "local",
  "premiere",
  "catchup",
  "series",
  "hot",
];
const availableMediaTypes = [
  "video/mp4",
  "video/x-matroska",
  "video/webm",
  "video/quicktime",
  "application/x-mpegURL",
];
const availableLiveStreamTypes = [
  { value: "", label: "Auto detect" },
  { value: "application/x-mpegURL", label: "HLS (.m3u8)" },
  { value: "video/mp4", label: "MP4" },
  { value: "video/webm", label: "WebM" },
  { value: "video/quicktime", label: "QuickTime" },
];
const availableLiveSourceModes = [
  { value: "stream", label: "Stream URL / quality sources" },
  { value: "embed", label: "Embedded player" },
  { value: "playout", label: "Playout videos" },
];
const availableThemeFontPresets = [
  { value: "mai", label: "MAI Sans" },
  { value: "studio", label: "Studio Sans" },
  { value: "classic", label: "Classic Serif" },
  { value: "clean", label: "Clean UI" },
];
const availableFooterSocialIcons = [
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "X / Twitter" },
  { value: "youtube", label: "YouTube" },
  { value: "soundcloud", label: "SoundCloud" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "website", label: "Website / Link" },
  { value: "email", label: "Email" },
];
const availableFeatureMotions = [
  { value: "", label: "No motion" },
  { value: "sasr25-pan", label: "Slow cinematic pan" },
  { value: "slow-zoom-in", label: "Slow zoom in" },
  { value: "slow-zoom-out", label: "Slow zoom out" },
  { value: "drift-left", label: "Drift left" },
  { value: "drift-right", label: "Drift right" },
  { value: "tilt-up", label: "Tilt up" },
  { value: "tilt-down", label: "Tilt down" },
  { value: "parallax-float", label: "Parallax float" },
  { value: "pulse-focus", label: "Pulse focus" },
  { value: "ken-burns-soft", label: "Ken Burns soft" },
  { value: "cinema-sweep", label: "Cinema sweep" },
];
const availableLogoPositions = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];
const availablePpvEventTypes = [
  { value: "locked_title", label: "Movie / series unlock" },
  { value: "live_event", label: "Live PPV event" },
];
const availablePpvOfflineModes = [
  { value: "message", label: "Show offline message" },
  { value: "loop", label: "Play loop file" },
];
const availablePpvStreamTypes = [
  { value: "", label: "Auto detect" },
  { value: "application/x-mpegURL", label: "HLS (.m3u8)" },
  { value: "video/mp4", label: "MP4" },
  { value: "video/webm", label: "WebM" },
  { value: "video/quicktime", label: "QuickTime" },
];
const heroAlignOptions = ["left", "center", "right"];
const availableKickerSuggestions = [
  ...new Set(
    [
      "Daily",
      "Morning",
      "Morning Show",
      "News",
      "Live",
      "Catch Up",
      "Sport",
      "Events",
      "Highlights",
      ...catalogue.allItems.map((item) => item.kicker).filter(Boolean),
      ...catalogue.allItems.flatMap((item) =>
        Array.isArray(item.episodes) ? item.episodes.map((episode) => episode.kicker) : []
      ),
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  ),
];
const availableFilterSuggestions = [
  ...new Set(
    [
      "catchup",
      "news",
      "local",
      "series",
      "sport",
      "live",
      "events",
      "movie",
      "faith",
      "entertainment",
      ...catalogue.allItems.flatMap((item) => item.filters || []),
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean)
  ),
];
const supportedVideoExtensions = [".mp4", ".mkv", ".webm", ".mov", ".m3u8"];
const supportedSubtitleExtensions = [".vtt", ".srt"];
const subtitleLanguageMap = {
  en: { srclang: "en", label: "English" },
  eng: { srclang: "en", label: "English" },
  english: { srclang: "en", label: "English" },
  es: { srclang: "es", label: "Spanish" },
  spa: { srclang: "es", label: "Spanish" },
  spanish: { srclang: "es", label: "Spanish" },
  fr: { srclang: "fr", label: "French" },
  fre: { srclang: "fr", label: "French" },
  french: { srclang: "fr", label: "French" },
  de: { srclang: "de", label: "German" },
  ger: { srclang: "de", label: "German" },
  german: { srclang: "de", label: "German" },
  hi: { srclang: "hi", label: "Hindi" },
  hin: { srclang: "hi", label: "Hindi" },
  hindi: { srclang: "hi", label: "Hindi" },
};
const subtitleHintTokens = new Set([
  "sub",
  "subs",
  "subtitle",
  "subtitles",
  "caption",
  "captions",
  "cc",
  "sdh",
  "forced",
  "default",
  ...Object.keys(subtitleLanguageMap),
]);
const normalizedAssetFields = new Set(["imageUrl", "featureImageUrl", "logoUrl", "mediaUrl", "streamUrl"]);
const XLSX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);
const DEFAULT_SCHEDULE_IMPORT_FEEDBACK = {
  tone: "muted",
  text: "Upload a CSV or Excel schedule here. Save Draft first, then Publish Live to update the live page.",
};
let scheduleImportFeedback = { ...DEFAULT_SCHEDULE_IMPORT_FEEDBACK };

const initialContent = ensureEditableContent(editorApi.getInitialContent());
const state = {
  content: initialContent,
  selection: findInitialSelection(initialContent),
  lastSavedDraftFingerprint: getContentFingerprint(initialContent),
  searchQuery: "",
  drag: null,
  pendingMediaField: null,
  pendingMediaFolder: null,
  scheduleUploadChannelId: "",
  hideSavePrompt: false,
  statusText: "Live site ready. Save changes here to update the homepage and player pages.",
  statusTone: "muted",
};

let previewRefreshTimer = 0;

renderAll();
refreshPreview();

outlineRoot.addEventListener("click", handleOutlineClick);
outlineRoot.addEventListener("dragstart", handleDragStart);
outlineRoot.addEventListener("dragover", handleDragOver);
outlineRoot.addEventListener("dragleave", handleDragLeave);
outlineRoot.addEventListener("drop", handleDrop);
outlineRoot.addEventListener("dragend", clearDropTargets);
previewFrame?.addEventListener("load", handlePreviewLoad);
formRoot.addEventListener("click", handleFormClick);
formRoot.addEventListener("input", handleFormInput);
formRoot.addEventListener("change", handleFormInput);
statusRoot?.addEventListener("click", handleStatusClick);
saveDraftButton?.addEventListener("click", () => {
  if (!hasUnsavedChanges()) {
    setStatus("No new changes to save right now.", "muted");
    return;
  }

  if (!window.confirm("Would you like to save these changes to the draft preview?")) {
    setStatus("Changes are still not saved.", "warn");
    state.hideSavePrompt = true;
    renderStatus();
    return;
  }

  saveCurrentDraft("Changes saved to draft preview.", "success");
});
publishButton?.addEventListener("click", handlePublish);
openPreviewButton?.addEventListener("click", () => {
  if (hasUnsavedChanges()) {
    state.hideSavePrompt = false;
    setStatus("Save the draft first to open the latest preview.", "warn");
    return;
  }

  window.open(getPreviewUrl(), "_blank", "noopener");
});
reloadPreviewButton?.addEventListener("click", () => {
  if (hasUnsavedChanges()) {
    state.hideSavePrompt = false;
    setStatus("Save the draft first to refresh the draft preview.", "warn");
    return;
  }

  refreshPreview({ reloadPage: inlinePreviewMode });
  setStatus("Draft preview refreshed.", "muted");
});
resetDraftButton?.addEventListener("click", () => {
  if (!confirmDiscardUnsavedChanges("Discard the unsaved changes and reset to the live version?")) {
    return;
  }

  state.content = ensureEditableContent(editorApi.discardDraft());
  state.lastSavedDraftFingerprint = getContentFingerprint(state.content);
  state.hideSavePrompt = false;
  state.selection = findInitialSelection(state.content);
  resetScheduleImportFeedback();
  renderAll();
  refreshPreview();
  setStatus("Editor reset to the live version.", "muted");
});
restoreDefaultButton?.addEventListener("click", () => {
  if (!confirmDiscardUnsavedChanges("Discard the unsaved changes and restore the default baseline?")) {
    return;
  }

  state.content = ensureEditableContent(editorApi.restoreDefaultDraft());
  state.lastSavedDraftFingerprint = getContentFingerprint(state.content);
  state.hideSavePrompt = false;
  state.selection = findInitialSelection(state.content);
  resetScheduleImportFeedback();
  renderAll();
  refreshPreview();
  setStatus("Default baseline loaded in the editor. Save changes to make it live.", "warn");
});
downloadBackupButton?.addEventListener("click", handleDownloadBackup);
importBackupButton?.addEventListener("click", () => {
  importBackupInput?.click();
});
importBackupInput?.addEventListener("change", handleImportBackup);
editorSearchInput?.addEventListener("input", handleSearchInput);
mediaBrowseInput?.addEventListener("change", handleMediaBrowseInput);
mediaFolderInput?.addEventListener("change", handleMediaFolderInput);
scheduleUploadInput?.addEventListener("change", handleScheduleUploadInput);
window.addEventListener("beforeunload", handleBeforeUnload);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createEditorId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeFsPath(value) {
  let normalized = String(value || "").replaceAll("\\", "/");

  if (/^\/[A-Za-z]:\//.test(normalized)) {
    normalized = normalized.slice(1);
  }

  return normalized.replace(/\/+$/, "");
}

function getWorkspaceRootPath() {
  try {
    const url = new URL(".", window.location.href);
    return normalizeFsPath(decodeURIComponent(url.pathname));
  } catch (error) {
    return "";
  }
}

function deriveWorkspaceRelativePath(file) {
  const workspaceRoot = getWorkspaceRootPath();
  const nativePath =
    typeof file?.path === "string" && file.path.trim() ? normalizeFsPath(file.path) : "";

  if (!workspaceRoot || !nativePath) {
    return "";
  }

  const lowerRoot = workspaceRoot.toLowerCase();
  const lowerPath = nativePath.toLowerCase();

  if (!lowerPath.startsWith(lowerRoot)) {
    return "";
  }

  const relativePath = nativePath.slice(workspaceRoot.length).replace(/^\/+/, "");

  return relativePath ? `./${relativePath}` : "";
}

function getFileExtension(value) {
  const match = String(value || "").trim().toLowerCase().match(/(\.[a-z0-9]+)(?:[?#].*)?$/);
  return match ? match[1] : "";
}

function getFileStem(value) {
  return String(value || "").replace(/\.[^.]+$/, "");
}

function normalizeLookupKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeEditorSourceList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      return {
        ...entry,
        src: String(entry.src || ""),
        label: String(entry.label || ""),
        srclang: String(entry.srclang || ""),
        kind: String(entry.kind || ""),
        type: String(entry.type || ""),
        originalSrc: String(entry.originalSrc || ""),
        sourceFile: String(entry.sourceFile || ""),
        default: Boolean(entry.default),
        autoDetected: Boolean(entry.autoDetected),
      };
    })
    .filter((entry) => entry?.src);
}

function buildSelectOptions(values, currentValue = "", getLabel = (value) => value) {
  const orderedValues = [...new Set([...(Array.isArray(values) ? values : []), currentValue].filter(Boolean))];
  return orderedValues.map((value) => ({
    value,
    label: getLabel(value),
  }));
}

function getArtClassOptions(currentValue = "") {
  return buildSelectOptions(availableArtClasses, currentValue, (value) => value);
}

function getFeatureMotionOptions(currentValue = "") {
  const options = [...availableFeatureMotions];

  if (currentValue && !options.some((option) => option.value === currentValue)) {
    options.push({ value: currentValue, label: currentValue });
  }

  return options;
}

function getLiveStreamTypeOptions(currentValue = "") {
  const options = [...availableLiveStreamTypes];

  if (currentValue && !options.some((option) => option.value === currentValue)) {
    options.push({ value: currentValue, label: currentValue });
  }

  return options;
}

function getLiveSourceModeOptions(currentValue = "") {
  const options = [...availableLiveSourceModes];

  if (currentValue && !options.some((option) => option.value === currentValue)) {
    options.push({ value: currentValue, label: currentValue });
  }

  return options;
}

function getPpvEventTypeOptions(currentValue = "") {
  const options = [...availablePpvEventTypes];

  if (currentValue && !options.some((option) => option.value === currentValue)) {
    options.push({ value: currentValue, label: currentValue });
  }

  return options;
}

function getPpvOfflineModeOptions(currentValue = "") {
  const options = [...availablePpvOfflineModes];

  if (currentValue && !options.some((option) => option.value === currentValue)) {
    options.push({ value: currentValue, label: currentValue });
  }

  return options;
}

function getPpvStreamTypeOptions(currentValue = "") {
  const options = [...availablePpvStreamTypes];

  if (currentValue && !options.some((option) => option.value === currentValue)) {
    options.push({ value: currentValue, label: currentValue });
  }

  return options;
}

function getThemeFontOptions(currentValue = "") {
  const options = [...availableThemeFontPresets];

  if (currentValue && !options.some((option) => option.value === currentValue)) {
    options.push({ value: currentValue, label: currentValue });
  }

  return options;
}

function getFooterSocialIconOptions(currentValue = "") {
  const options = [...availableFooterSocialIcons];

  if (currentValue && !options.some((option) => option.value === currentValue)) {
    options.push({ value: currentValue, label: currentValue });
  }

  return options;
}

function getLiveChannelOptions(currentValue = "", { includeEmpty = true } = {}) {
  const liveChannels = Array.isArray(state.content.liveChannels) ? state.content.liveChannels : [];
  const options = liveChannels
    .map((channel) => {
      const channelId = String(channel?.id || "").trim();

      if (!channelId) {
        return null;
      }

      const channelTitle = String(channel?.title || channelId).trim();

      return {
        value: channelId,
        label: channelTitle === channelId ? channelTitle : `${channelTitle} (${channelId})`,
      };
    })
    .filter(Boolean);

  if (includeEmpty) {
    options.unshift({ value: "", label: "Not a live channel" });
  }

  if (currentValue && !options.some((option) => option.value === currentValue)) {
    options.push({ value: currentValue, label: currentValue });
  }

  return options;
}

function getLiveChannelLabel(channelId) {
  const channel = (Array.isArray(state.content.liveChannels) ? state.content.liveChannels : []).find(
    (entry) => String(entry?.id || "").trim().toLowerCase() === String(channelId || "").trim().toLowerCase()
  );

  return channel ? String(channel.title || channel.id || "").trim() || String(channelId || "") : String(channelId || "");
}

function getFooterButtonModeOptions() {
  return [
    { value: "featured", label: "Open featured title" },
    { value: "live", label: "Open live channel" },
    { value: "browse", label: "Jump to browse section" },
  ];
}

function getDefaultFooterSocialLinks(homepageSettings = {}) {
  return [
    {
      icon: "facebook",
      label: "Facebook",
      url: String(homepageSettings.footerFacebookUrl || "https://www.facebook.com/maitvfiji/"),
    },
    {
      icon: "twitter",
      label: "X",
      url: String(homepageSettings.footerTwitterUrl || "https://twitter.com/MaiTVFiji"),
    },
    {
      icon: "youtube",
      label: "YouTube",
      url: String(
        homepageSettings.footerYouTubeUrl || "https://www.youtube.com/channel/UCXiYmoWyQcPCIOAUXYpIwng"
      ),
    },
    {
      icon: "soundcloud",
      label: "SoundCloud",
      url: String(homepageSettings.footerSoundCloudUrl || "https://soundcloud.com/maitvfiji"),
    },
  ];
}

function normalizeFooterSocialLinks(homepageSettings = {}) {
  const sourceLinks = Array.isArray(homepageSettings.footerSocialLinks)
    ? homepageSettings.footerSocialLinks
    : getDefaultFooterSocialLinks(homepageSettings);

  return sourceLinks.map((entry) => ({
    icon: String(entry?.icon || "website").trim().toLowerCase() || "website",
    label: String(entry?.label || "").trim(),
    url: String(entry?.url || "").trim(),
  }));
}

function getActiveScheduleImportChannelId(overrideChannelId = "") {
  return String(
    overrideChannelId || state.scheduleUploadChannelId || getScheduleImportDefaultChannelId() || ""
  )
    .trim()
    .toLowerCase();
}

function inferMediaTypeFromPath(value) {
  const extension = getFileExtension(value);

  if (extension === ".mp4") {
    return "video/mp4";
  }

  if (extension === ".mkv") {
    return "video/x-matroska";
  }

  if (extension === ".webm") {
    return "video/webm";
  }

  if (extension === ".mov") {
    return "video/quicktime";
  }

  if (extension === ".m3u8") {
    return "application/x-mpegURL";
  }

  return "";
}

function isSupportedVideoFile(file) {
  return supportedVideoExtensions.includes(getFileExtension(file?.name || ""));
}

function isSupportedSubtitleFile(file) {
  return supportedSubtitleExtensions.includes(getFileExtension(file?.name || ""));
}

function inferSubtitleLanguageInfo(fileName) {
  const tokens = getFileStem(fileName)
    .toLowerCase()
    .split(/[\s._-]+/)
    .filter(Boolean);

  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const matchedLanguage = subtitleLanguageMap[tokens[index]];

    if (matchedLanguage) {
      return matchedLanguage;
    }
  }

  return {
    srclang: "en",
    label: "Subtitles",
  };
}

function subtitleMatchesVideoFile(videoFile, subtitleFile) {
  const videoBase = getFileStem(videoFile?.name || "").toLowerCase();
  const subtitleBase = getFileStem(subtitleFile?.name || "").toLowerCase();

  if (!videoBase || !subtitleBase) {
    return false;
  }

  if (subtitleBase === videoBase) {
    return true;
  }

  if (!subtitleBase.startsWith(videoBase)) {
    return false;
  }

  const suffixTokens = subtitleBase
    .slice(videoBase.length)
    .replace(/^[\s._-]+/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);

  return suffixTokens.length > 0 && suffixTokens.every((token) => subtitleHintTokens.has(token));
}

function findSubtitleFilesForVideo(files, videoFile) {
  return sortFilesByName(files).filter(
    (file) => isSupportedSubtitleFile(file) && subtitleMatchesVideoFile(videoFile, file)
  );
}

function convertSrtToVtt(value) {
  const normalized = String(value || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();

  if (!normalized) {
    return "WEBVTT\n\n";
  }

  const body = normalized.replace(
    /(\d{2}:\d{2}:\d{2}),(\d{3})\s-->\s(\d{2}:\d{2}:\d{2}),(\d{3})/g,
    "$1.$2 --> $3.$4"
  );

  return body.startsWith("WEBVTT") ? `${body}\n` : `WEBVTT\n\n${body}\n`;
}

async function createSubtitleTrackFromFile(file, folderBasePath, index = 0) {
  const extension = getFileExtension(file?.name || "");
  const { srclang, label } = inferSubtitleLanguageInfo(file?.name || "");
  const relativeSrc = `${folderBasePath}/${file.name}`;
  const track = {
    kind: "subtitles",
    label,
    srclang,
    default: index === 0,
    autoDetected: true,
    sourceFile: String(file?.name || ""),
  };

  if (extension === ".srt") {
    const vttText = convertSrtToVtt(await file.text());
    return {
      ...track,
      src: `data:text/vtt;charset=utf-8,${encodeURIComponent(vttText)}`,
      type: "text/vtt",
      originalSrc: relativeSrc,
    };
  }

  return {
    ...track,
    src: relativeSrc,
    type: "text/vtt",
    originalSrc: relativeSrc,
  };
}

function removeAutoDetectedTracks(tracks) {
  return normalizeEditorSourceList(tracks).filter((track) => !track.autoDetected);
}

function assignTracksToTarget(target, tracks) {
  const normalizedTracks = normalizeEditorSourceList(tracks);

  if (target === "item") {
    const item = getSelectedItem();

    if (item) {
      item.tracks = normalizedTracks;
    }
  }

  if (target === "episode") {
    const episode = getSelectedEpisode();

    if (episode) {
      episode.tracks = normalizedTracks;
    }
  }
}

function mergeDetectedTracks(existingTracks, detectedTracks) {
  return [...removeAutoDetectedTracks(existingTracks), ...normalizeEditorSourceList(detectedTracks)];
}

async function applyDetectedSubtitleTracks(target, files, videoFile, folderBasePath) {
  if (!videoFile || !folderBasePath) {
    return 0;
  }

  const subtitleFiles = findSubtitleFilesForVideo(files, videoFile);

  if (!subtitleFiles.length) {
    if ((Array.isArray(files) ? files.length : 0) <= 1) {
      return 0;
    }

    assignTracksToTarget(target, removeAutoDetectedTracks(target === "item" ? getSelectedItem()?.tracks : getSelectedEpisode()?.tracks));
    return 0;
  }

  const nextTracks = await Promise.all(
    subtitleFiles.map((file, index) => createSubtitleTrackFromFile(file, folderBasePath, index))
  );

  const existingTracks = target === "item" ? getSelectedItem()?.tracks : getSelectedEpisode()?.tracks;
  assignTracksToTarget(target, mergeDetectedTracks(existingTracks, nextTracks));
  return nextTracks.length;
}

function getSubtitleImportStatusText(trackCount) {
  if (!trackCount) {
    return "";
  }

  return trackCount === 1
    ? " A matching subtitle track was linked automatically."
    : ` ${trackCount} matching subtitle tracks were linked automatically.`;
}

function formatTitleFromFileName(fileName, fallbackIndex = 0) {
  const parsed = parseEpisodeFileName(fileName);

  if (parsed.title) {
    return parsed.title;
  }

  return `Episode ${parsed.episodeNumber || fallbackIndex + 1}`;
}

function toDisplayTitle(value) {
  return String(value || "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, (character) => character.toUpperCase());
}

function parseEpisodeFileName(fileName) {
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

  const cleanedTitle = toDisplayTitle(titlePart);

  return {
    seasonNumber: episodeMatch ? Number(episodeMatch[1] || episodeMatch[3]) : null,
    episodeNumber: episodeMatch ? Number(episodeMatch[2] || episodeMatch[4]) : null,
    title: cleanedTitle,
  };
}

function shouldReplaceImportedEpisodeTitle(currentTitle, itemTitle = "") {
  const normalizedTitle = String(currentTitle || "").trim();
  const normalizedItemTitle = String(itemTitle || "").trim().toLowerCase();

  if (!normalizedTitle || /^New Episode$/i.test(normalizedTitle) || /^Episode \d+$/i.test(normalizedTitle)) {
    return true;
  }

  if (normalizedItemTitle && normalizedTitle.toLowerCase() === normalizedItemTitle) {
    return true;
  }

  return /S\d{1,2}E\d{1,3}|2160p|1080p|720p|480p|WEB(?:-DL|-HD|Rip)?|BluRay|BRRip|HDTV|DVDRip|x264|x265|h264|h265|HEVC|AAC|AC3|DDP|10Bit|8Bit|Pahe|YTS/i.test(
    normalizedTitle
  );
}

function getMediaSupportWarning(mediaPath) {
  if (inferMediaTypeFromPath(mediaPath) !== "video/x-matroska") {
    return "";
  }

  return "MKV playback depends on the codec inside the file. MP4 with H.264 video and AAC audio is the safest browser format.";
}

function parseScheduleDateValue(rawValue) {
  const value = String(rawValue || "").trim();

  if (!value) {
    return null;
  }

  const isoOffsetMatch = value.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?(Z|[+-]\d{2}:\d{2})$/i
  );

  if (isoOffsetMatch) {
    const [, year, month, day, hours = "0", minutes = "0", seconds = "0", zone = "+12:00"] =
      isoOffsetMatch;

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(
      hours
    ).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}${zone.toUpperCase()}`;
  }

  const isoLikeMatch = value.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?(?:\s?(AM|PM))?$/i
  );

  if (isoLikeMatch) {
    let [, year, month, day, hours = "0", minutes = "0", seconds = "0", meridiem = ""] =
      isoLikeMatch;
    let normalizedHours = Number(hours);

    if (meridiem) {
      const upperMeridiem = meridiem.toUpperCase();

      if (upperMeridiem === "PM" && normalizedHours < 12) {
        normalizedHours += 12;
      }

      if (upperMeridiem === "AM" && normalizedHours === 12) {
        normalizedHours = 0;
      }
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(
      normalizedHours
    ).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}+12:00`;
  }

  const slashMatch = value.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?(?:\s?(AM|PM))?$/i
  );

  if (slashMatch) {
    let [, first, second, year, hours = "0", minutes = "0", seconds = "0", meridiem = ""] =
      slashMatch;
    let day = Number(first);
    let month = Number(second);
    let normalizedHours = Number(hours);

    if (Number(first) <= 12 && Number(second) > 12) {
      month = Number(first);
      day = Number(second);
    }

    if (meridiem) {
      const upperMeridiem = meridiem.toUpperCase();

      if (upperMeridiem === "PM" && normalizedHours < 12) {
        normalizedHours += 12;
      }

      if (upperMeridiem === "AM" && normalizedHours === 12) {
        normalizedHours = 0;
      }
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(
      normalizedHours
    ).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}+12:00`;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}

function normalizeScheduleEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const normalizedStart = parseScheduleDateValue(entry.start);
  const normalizedEnd = parseScheduleDateValue(entry.end);
  const normalizedEntry = {
    channelId: String(entry.channelId || "").trim().toLowerCase(),
    title: String(entry.title || "").trim(),
    category: String(entry.category || "General").trim() || "General",
    start: normalizedStart || "",
    end: normalizedEnd || "",
  };

  if (
    !normalizedEntry.channelId ||
    !normalizedEntry.title ||
    !normalizedEntry.start ||
    !normalizedEntry.end
  ) {
    return null;
  }

  if (
    Number.isNaN(new Date(normalizedEntry.start).getTime()) ||
    Number.isNaN(new Date(normalizedEntry.end).getTime())
  ) {
    return null;
  }

  if (new Date(normalizedEntry.end) <= new Date(normalizedEntry.start)) {
    return null;
  }

  return normalizedEntry;
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function splitCsvLine(line) {
  const values = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(currentValue);
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue);
  return values.map((value) => value.trim());
}

function getScheduleCellValue(columns, index) {
  return String(columns?.[index] || "").trim();
}

function isScheduleRowEmpty(columns) {
  return !columns.some((value) => String(value || "").trim());
}

function extractScheduleDatePart(rawValue) {
  const value = String(rawValue || "").trim();
  const directIsoDateMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);

  if (directIsoDateMatch) {
    return directIsoDateMatch[1];
  }

  const normalizedValue = parseScheduleDateValue(rawValue);

  if (normalizedValue) {
    return normalizedValue.slice(0, 10);
  }

  const isoDateMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return isoDateMatch ? isoDateMatch[1] : "";
}

function extractScheduleTimePart(rawValue) {
  const value = String(rawValue || "").trim();

  if (!value) {
    return "";
  }

  const isoTimeMatch = value.match(/T(\d{2}:\d{2}:\d{2})/);

  if (isoTimeMatch) {
    return isoTimeMatch[1];
  }

  const timeMatch = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM)?$/i);

  if (timeMatch) {
    let [, hours, minutes, seconds = "00", meridiem = ""] = timeMatch;
    let normalizedHours = Number(hours);

    if (meridiem) {
      const upperMeridiem = meridiem.toUpperCase();

      if (upperMeridiem === "PM" && normalizedHours < 12) {
        normalizedHours += 12;
      }

      if (upperMeridiem === "AM" && normalizedHours === 12) {
        normalizedHours = 0;
      }
    }

    return `${String(normalizedHours).padStart(2, "0")}:${minutes}:${seconds}`;
  }

  const normalizedValue = parseScheduleDateValue(value);
  const normalizedTimeMatch = normalizedValue?.match(/T(\d{2}:\d{2}:\d{2})/);
  return normalizedTimeMatch ? normalizedTimeMatch[1] : "";
}

function combineScheduleDateAndTime(dateValue, timeValue) {
  const datePart = extractScheduleDatePart(dateValue);
  const timePart = extractScheduleTimePart(timeValue);

  if (!datePart || !timePart) {
    return "";
  }

  return `${datePart}T${timePart}+12:00`;
}

function isLikelyWalesiGridRow(columns) {
  const programmeTitle = getScheduleCellValue(columns, 4) || getScheduleCellValue(columns, 5);

  return Boolean(
    programmeTitle &&
      extractScheduleDatePart(columns[0]) &&
      extractScheduleTimePart(columns[1]) &&
      extractScheduleDatePart(columns[2]) &&
      extractScheduleTimePart(columns[3])
  );
}

function looksLikeWalesiGrid(rowValueRows) {
  const sampleRows = rowValueRows.filter((columns) => !isScheduleRowEmpty(columns)).slice(0, 8);

  if (sampleRows.length === 0) {
    return false;
  }

  const matchingRows = sampleRows.filter(isLikelyWalesiGridRow).length;

  if (sampleRows.length === 1) {
    return matchingRows === 1;
  }

  return matchingRows >= Math.ceil(sampleRows.length * 0.6);
}

function getScheduleImportDefaultChannelId() {
  const liveChannels = Array.isArray(state.content.liveChannels) ? state.content.liveChannels : [];

  return liveChannels.length === 1 ? String(liveChannels[0].id || "").trim().toLowerCase() : "";
}

function buildScheduleEntriesFromWalesiGrid(rowValueRows, options = {}) {
  const defaultChannelId = String(options.defaultChannelId || "").trim().toLowerCase();

  if (!defaultChannelId) {
    throw new Error(
      "This spreadsheet needs a channelId column because the editor currently has more than one live channel."
    );
  }

  const entries = [];
  const skippedRows = [];

  rowValueRows.forEach((columns, rowIndex) => {
    if (isScheduleRowEmpty(columns)) {
      return;
    }

    const candidate = normalizeScheduleEntry({
      channelId: defaultChannelId,
      title: getScheduleCellValue(columns, 4) || getScheduleCellValue(columns, 5),
      category: "General",
      start: combineScheduleDateAndTime(columns[0], columns[1]),
      end: combineScheduleDateAndTime(columns[2], columns[3]),
    });

    if (!candidate) {
      skippedRows.push(rowIndex + 1);
      return;
    }

    entries.push(candidate);
  });

  if (entries.length === 0) {
    throw new Error("No valid Walesi schedule rows were found in that workbook.");
  }

  return {
    entries: entries.sort((left, right) => new Date(left.start) - new Date(right.start)),
    skippedRows,
  };
}

function buildScheduleEntriesFromTable(headerCells, rowValueRows, options = {}) {
  const defaultChannelId = String(options.defaultChannelId || "").trim().toLowerCase();
  const normalizedHeaders = headerCells.map(normalizeHeader);
  const headerAliases = {
    channelId: ["channelid", "channel", "channelcode"],
    title: [
      "title",
      "program",
      "programme",
      "show",
      "name",
      "programtitle",
      "programmename",
      "event",
      "eventtitle",
      "listing",
      "content",
      "description",
    ],
    category: ["category", "genre", "type"],
    start: ["start", "starttime", "startdatetime", "from"],
    end: ["end", "endtime", "enddatetime", "to"],
  };

  function findHeaderIndex(key) {
    return normalizedHeaders.findIndex((header) => headerAliases[key].includes(header));
  }

  const startIndex = findHeaderIndex("start");
  const endIndex = findHeaderIndex("end");
  const channelIndex = findHeaderIndex("channelId");
  const categoryIndex = findHeaderIndex("category");
  const titleIndex = findHeaderIndex("title");
  const fallbackTitleIndex = normalizedHeaders.findIndex(
    (header, index) =>
      index !== channelIndex &&
      index !== categoryIndex &&
      index !== startIndex &&
      index !== endIndex &&
      header
  );
  const resolvedTitleIndex = titleIndex !== -1 ? titleIndex : fallbackTitleIndex;

  if (startIndex === -1 || endIndex === -1 || resolvedTitleIndex === -1) {
    throw new Error(
      "Your file needs a programme column plus start and end. Add channelId too if you manage more than one live channel."
    );
  }

  if (channelIndex === -1 && !defaultChannelId) {
    throw new Error("Add a channelId column because the editor currently has more than one live channel.");
  }

  const entries = [];
  const skippedRows = [];

  rowValueRows.forEach((columns, rowIndex) => {
    const candidate = normalizeScheduleEntry({
      channelId: channelIndex === -1 ? defaultChannelId : columns[channelIndex],
      title: columns[resolvedTitleIndex],
      category: categoryIndex === -1 ? "General" : columns[categoryIndex],
      start: columns[startIndex],
      end: columns[endIndex],
    });

    if (!candidate) {
      skippedRows.push(rowIndex + 2);
      return;
    }

    entries.push(candidate);
  });

  if (entries.length === 0) {
    throw new Error("No valid schedule rows were found in that file.");
  }

  return {
    entries: entries.sort((left, right) => new Date(left.start) - new Date(right.start)),
    skippedRows,
  };
}

function parseScheduleCsv(csvText, options = {}) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error("The CSV file is empty. Add a header row and at least one schedule row.");
  }

  const rows = lines.map(splitCsvLine);
  return buildScheduleEntriesFromTable(rows[0], rows.slice(1), options);
}

async function parseScheduleWorkbook(arrayBuffer, options = {}) {
  if (!workbookParser) {
    throw new Error("Excel upload is not available in this build yet. Use CSV for now.");
  }

  const workbookData = await workbookParser.parseWorkbook(arrayBuffer);

  try {
    return {
      ...buildScheduleEntriesFromTable(workbookData.headers, workbookData.rows, options),
      sheetName: workbookData.sheetName,
    };
  } catch (tableError) {
    if (looksLikeWalesiGrid(workbookData.allRows || [])) {
      return {
        ...buildScheduleEntriesFromWalesiGrid(workbookData.allRows || [], options),
        sheetName: workbookData.sheetName,
      };
    }

    throw tableError;
  }
}

async function parseScheduleFile(file, options = {}) {
  const normalizedName = String(file?.name || "").toLowerCase();

  if (normalizedName.endsWith(".xlsx")) {
    return parseScheduleWorkbook(await file.arrayBuffer(), options);
  }

  if (normalizedName.endsWith(".csv")) {
    return parseScheduleCsv(await file.text(), options);
  }

  if (XLSX_MIME_TYPES.has(file.type)) {
    return parseScheduleWorkbook(await file.arrayBuffer(), options);
  }

  return parseScheduleCsv(await file.text(), options);
}

function sortFilesByName(files) {
  return [...files].sort((left, right) =>
    String(left?.name || "").localeCompare(String(right?.name || ""), undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );
}

function getSelectedFolderName(files) {
  const firstRelative = String(files?.[0]?.webkitRelativePath || "");

  if (firstRelative.includes("/")) {
    return firstRelative.split("/")[0];
  }

  return "";
}

function parseFilters(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseLineSeparatedValues(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/\r?\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatLineSeparatedValues(values) {
  return parseLineSeparatedValues(values).join("\n");
}

function ensureEditableContent(content) {
  const normalized = editorApi.normalizeContent(content);

  normalized.homepageSettings = {
    heroContentAlign: heroAlignOptions.includes(normalized.homepageSettings?.heroContentAlign)
      ? normalized.homepageSettings.heroContentAlign
      : "left",
    heroSlideDurationSeconds: Math.min(
      30,
      Math.max(2, Number(normalized.homepageSettings?.heroSlideDurationSeconds) || 4.2)
    ),
    footerEyebrow: String(normalized.homepageSettings?.footerEyebrow || "Stream local"),
    footerTitle: String(
      normalized.homepageSettings?.footerTitle ||
        "A darker, more premium MAI+ browse screen for local viewing."
    ),
    footerCopy: String(
      normalized.homepageSettings?.footerCopy ||
        "Established in 2008, Mai TV was the second free to air television station in the country. Currently you can get coverage via analogue by utilizing a UHF antenna and also via Digital through Walesi."
    ),
    footerButtonLabel: String(normalized.homepageSettings?.footerButtonLabel || "Start Watching"),
    footerButtonMode: ["featured", "live", "browse"].includes(
      String(normalized.homepageSettings?.footerButtonMode || "")
    )
      ? String(normalized.homepageSettings.footerButtonMode)
      : "featured",
    footerLiveChannelId: String(
      normalized.homepageSettings?.footerLiveChannelId ||
        normalized.liveChannels?.[0]?.id ||
        "mai-tv"
    ),
    footerFacebookUrl: String(
      normalized.homepageSettings?.footerFacebookUrl || "https://www.facebook.com/maitvfiji/"
    ),
    footerTwitterUrl: String(
      normalized.homepageSettings?.footerTwitterUrl || "https://twitter.com/MaiTVFiji"
    ),
    footerYouTubeUrl: String(
      normalized.homepageSettings?.footerYouTubeUrl ||
        "https://www.youtube.com/channel/UCXiYmoWyQcPCIOAUXYpIwng"
    ),
    footerSoundCloudUrl: String(
      normalized.homepageSettings?.footerSoundCloudUrl || "https://soundcloud.com/maitvfiji"
    ),
    footerSocialLinks: normalizeFooterSocialLinks(normalized.homepageSettings),
    themeBgStart: String(normalized.homepageSettings?.themeBgStart || "#0e0810"),
    themeBgMid: String(normalized.homepageSettings?.themeBgMid || "#08060b"),
    themeBgEnd: String(normalized.homepageSettings?.themeBgEnd || "#06050a"),
    themeGlowPrimary: String(normalized.homepageSettings?.themeGlowPrimary || "#ff5a3c"),
    themeGlowSecondary: String(normalized.homepageSettings?.themeGlowSecondary || "#ec9a27"),
    themePanelColor: String(normalized.homepageSettings?.themePanelColor || "#17111c"),
    themeCardColor: String(normalized.homepageSettings?.themeCardColor || "#130f18"),
    themeTextColor: String(normalized.homepageSettings?.themeTextColor || "#fff7f2"),
    themeMutedColor: String(normalized.homepageSettings?.themeMutedColor || "#d8c9c4"),
    themeAccentColor: String(normalized.homepageSettings?.themeAccentColor || "#ff5a3c"),
    themeAccentAltColor: String(normalized.homepageSettings?.themeAccentAltColor || "#ec9a27"),
    themeDisplayFont: String(normalized.homepageSettings?.themeDisplayFont || "mai"),
    themeBodyFont: String(normalized.homepageSettings?.themeBodyFont || "mai"),
    heroDisplayFont: String(normalized.homepageSettings?.heroDisplayFont || normalized.homepageSettings?.themeDisplayFont || "mai"),
    heroTitleColor: String(normalized.homepageSettings?.heroTitleColor || "#fff7f2"),
    heroCopyColor: String(normalized.homepageSettings?.heroCopyColor || "#d8c9c4"),
    badgeDisplayFont: String(normalized.homepageSettings?.badgeDisplayFont || normalized.homepageSettings?.themeDisplayFont || "mai"),
    badgeTextColor: String(normalized.homepageSettings?.badgeTextColor || "#e86c2b"),
    badgeBgStart: String(normalized.homepageSettings?.badgeBgStart || "#133d92"),
    badgeBgEnd: String(normalized.homepageSettings?.badgeBgEnd || "#205fca"),
  };

  normalized.sections = (Array.isArray(normalized.sections) ? normalized.sections : []).map(
    (section, sectionIndex) => {
      const safeSectionId =
        section.id ||
        slugify(section.title || section.eyebrow || `section-${sectionIndex + 1}`) ||
        createEditorId("section");

      return {
        id: safeSectionId,
        eyebrow: String(section.eyebrow || ""),
        title: String(section.title || `Section ${sectionIndex + 1}`),
        columns: section.columns === "two" ? "two" : "",
        items: (Array.isArray(section.items) ? section.items : []).map((item, itemIndex) => {
          const safeItemId =
            item.id ||
            slugify(`${safeSectionId}-${item.title || `item-${itemIndex + 1}`}`) ||
            createEditorId("item");

          return {
            id: safeItemId,
            title: String(item.title || `New title ${itemIndex + 1}`),
            kicker: String(item.kicker || ""),
            artClass: String(item.artClass || availableArtClasses[0] || "art-live-main"),
            badgeLabel: String(item.badgeLabel || ""),
            badgeClass: String(item.badgeClass || "new"),
            description: String(item.description || ""),
            meta: String(item.meta || ""),
            filters: Array.isArray(item.filters)
              ? item.filters.map((entry) => String(entry).trim()).filter(Boolean)
              : parseFilters(item.filters),
            featured: Boolean(item.featured),
            collectionLabel: String(item.collectionLabel || ""),
            sortLabel: String(item.sortLabel || "Ascending"),
            availableFrom: String(item.availableFrom || ""),
            availableUntil: String(item.availableUntil || ""),
            episodePlannerCount: String(item.episodePlannerCount || ""),
            episodeReleaseStart: String(item.episodeReleaseStart || ""),
            episodeReleaseIntervalDays: String(item.episodeReleaseIntervalDays ?? 7),
            liveChannelId: String(item.liveChannelId || ""),
            imageUrl: String(item.imageUrl || ""),
            featureImageUrl: String(item.featureImageUrl || ""),
            featureMotion: String(item.featureMotion || ""),
            featureImagePosition: String(item.featureImagePosition || "center center"),
            logoUrl: String(item.logoUrl || ""),
            logoAlt: String(item.logoAlt || ""),
            logoPosition: ["left", "center", "right"].includes(String(item.logoPosition || ""))
              ? String(item.logoPosition)
              : "left",
            ppvEnabled: Boolean(item.ppvEnabled),
            ppvPrice: String(item.ppvPrice || ""),
            ppvCurrency: String(item.ppvCurrency || "FJD"),
            ppvEventDate: String(item.ppvEventDate || ""),
            ppvPortalUrl: String(item.ppvPortalUrl || ""),
            ppvProvider: String(item.ppvProvider || ""),
            ppvMethods: Array.isArray(item.ppvMethods)
              ? item.ppvMethods.map((entry) => String(entry || "").trim()).filter(Boolean)
              : parseFilters(item.ppvMethods),
            ppvButtonLabel: String(item.ppvButtonLabel || "Buy PPV Access"),
            ppvAccessNote: String(item.ppvAccessNote || ""),
            ppvTermsUrl: String(item.ppvTermsUrl || ""),
            ppvEventType: String(item.ppvEventType || "locked_title"),
            ppvLiveStreamUrl: String(item.ppvLiveStreamUrl || ""),
            ppvLiveStreamType: String(item.ppvLiveStreamType || ""),
            ppvLiveEmbedUrl: String(item.ppvLiveEmbedUrl || ""),
            ppvLiveStreamKey: String(item.ppvLiveStreamKey || ""),
            ppvOfflineMode: String(item.ppvOfflineMode || "message"),
            ppvOfflineMessage: String(item.ppvOfflineMessage || "This event is not live right now. Please check back closer to the event time."),
            ppvLoopFiles: parseLineSeparatedValues(item.ppvLoopFiles),
            mediaUrl: String(item.mediaUrl || ""),
            mediaType: String(item.mediaType || "video/mp4"),
            qualities: normalizeEditorSourceList(item.qualities),
            tracks: normalizeEditorSourceList(item.tracks),
            episodes: (Array.isArray(item.episodes) ? item.episodes : []).map(
              (episode, episodeIndex) => {
                const sourceFile = String(episode.sourceFile || "");
                const inferredTitle = shouldReplaceImportedEpisodeTitle(episode.title, item.title)
                  ? formatTitleFromFileName(
                      sourceFile || episode.mediaUrl || episode.title,
                      episodeIndex
                    )
                  : String(episode.title || `Episode ${episodeIndex + 1}`);

                return {
                  id:
                    episode.id ||
                    slugify(`${safeItemId}-${episode.title || `episode-${episodeIndex + 1}`}`) ||
                    createEditorId("episode"),
                  title: inferredTitle,
                  kicker: String(episode.kicker || ""),
                  description: String(episode.description || ""),
                  meta: String(episode.meta || ""),
                  duration: String(episode.duration || ""),
                  sourceFile,
                  airedText: String(episode.airedText || ""),
                  statusLabel: String(episode.statusLabel || ""),
                  availableFrom: String(episode.availableFrom || ""),
                  availableUntil: String(episode.availableUntil || ""),
                  imageUrl: String(episode.imageUrl || ""),
                  mediaUrl: String(episode.mediaUrl || ""),
                  mediaType: String(episode.mediaType || "video/mp4"),
                  qualities: normalizeEditorSourceList(episode.qualities),
                  tracks: normalizeEditorSourceList(episode.tracks),
                };
              }
            ),
          };
        }),
      };
    }
  );

  normalized.liveChannels = (Array.isArray(normalized.liveChannels) ? normalized.liveChannels : []).map(
    (channel, channelIndex) => ({
      sourceMode: ["stream", "embed", "playout"].includes(String(channel.sourceMode || ""))
        ? String(channel.sourceMode || "")
        : String(channel.embedUrl || "").trim()
          ? "embed"
          : parseLineSeparatedValues(channel.playoutFiles).length
            ? "playout"
            : "stream",
      id: String(channel.id || `live-channel-${channelIndex + 1}`),
      title: String(channel.title || `Live Channel ${channelIndex + 1}`),
      kicker: String(channel.kicker || "Live"),
      logoUrl: String(channel.logoUrl || ""),
      logoAlt: String(channel.logoAlt || channel.title || ""),
      description: String(channel.description || ""),
      streamUrl: String(channel.streamUrl || ""),
      streamType: String(channel.streamType || ""),
      embedUrl: String(channel.embedUrl || ""),
      playoutFiles: parseLineSeparatedValues(channel.playoutFiles),
      timezone: String(channel.timezone || "Pacific/Fiji"),
      heroClass: String(channel.heroClass || "art-live-main"),
      scheduleLabel: String(channel.scheduleLabel || "Today in Fiji time"),
      isDemo: Boolean(channel.isDemo),
      qualities: normalizeEditorSourceList(channel.qualities),
    })
  );
  normalized.liveSchedule = Array.isArray(normalized.liveSchedule) ? normalized.liveSchedule : [];

  return normalized;
}

function findInitialSelection(content) {
  for (let sectionIndex = 0; sectionIndex < content.sections.length; sectionIndex += 1) {
    const section = content.sections[sectionIndex];

    for (let itemIndex = 0; itemIndex < section.items.length; itemIndex += 1) {
      if (section.items[itemIndex].featured) {
        return {
          mode: "item",
          sectionIndex,
          itemIndex,
          episodeIndex: null,
        };
      }
    }
  }

  if (content.sections[0]?.items[0]) {
    return {
      mode: "item",
      sectionIndex: 0,
      itemIndex: 0,
      episodeIndex: null,
    };
  }

  if (content.sections[0]) {
    return {
      mode: "section",
      sectionIndex: 0,
      itemIndex: null,
      episodeIndex: null,
    };
  }

  return {
    mode: "site",
    sectionIndex: null,
    itemIndex: null,
    episodeIndex: null,
  };
}

function ensureSelection() {
  if (!state.content.sections.length) {
    state.selection = {
      mode: "site",
      sectionIndex: null,
      itemIndex: null,
      episodeIndex: null,
    };
    return;
  }

  const sectionIndex = Math.min(
    Math.max(state.selection.sectionIndex ?? 0, 0),
    state.content.sections.length - 1
  );
  const section = state.content.sections[sectionIndex];

  if (state.selection.mode === "site") {
    state.selection.sectionIndex = sectionIndex;
    return;
  }

  if (!section) {
    state.selection = findInitialSelection(state.content);
    return;
  }

  if (state.selection.mode === "section") {
    state.selection.sectionIndex = sectionIndex;
    state.selection.itemIndex = null;
    state.selection.episodeIndex = null;
    return;
  }

  if (!section.items.length) {
    state.selection = {
      mode: "section",
      sectionIndex,
      itemIndex: null,
      episodeIndex: null,
    };
    return;
  }

  const itemIndex = Math.min(
    Math.max(state.selection.itemIndex ?? 0, 0),
    section.items.length - 1
  );
  const item = section.items[itemIndex];

  if (state.selection.mode === "item") {
    state.selection.sectionIndex = sectionIndex;
    state.selection.itemIndex = itemIndex;
    state.selection.episodeIndex = null;
    return;
  }

  if (!item?.episodes?.length) {
    state.selection = {
      mode: "item",
      sectionIndex,
      itemIndex,
      episodeIndex: null,
    };
    return;
  }

  const episodeIndex = Math.min(
    Math.max(state.selection.episodeIndex ?? 0, 0),
    item.episodes.length - 1
  );

  state.selection = {
    mode: "episode",
    sectionIndex,
    itemIndex,
    episodeIndex,
  };
}

function getSelectedSection() {
  ensureSelection();
  return state.selection.sectionIndex == null
    ? null
    : state.content.sections[state.selection.sectionIndex] || null;
}

function getSelectedItem() {
  const section = getSelectedSection();

  if (!section || state.selection.itemIndex == null) {
    return null;
  }

  return section.items[state.selection.itemIndex] || null;
}

function getSelectedEpisode() {
  const item = getSelectedItem();

  if (!item || state.selection.episodeIndex == null) {
    return null;
  }

  return item.episodes[state.selection.episodeIndex] || null;
}

function getSelectionSearchText(section, item) {
  return [
    section?.title,
    section?.eyebrow,
    item?.title,
    item?.kicker,
    item?.description,
    item?.meta,
  ]
    .join(" ")
    .toLowerCase();
}

function getFilteredSectionEntries() {
  const query = state.searchQuery.trim().toLowerCase();

  return state.content.sections
    .map((section, sectionIndex) => {
      const items = section.items
        .map((item, itemIndex) => ({ item, itemIndex }))
        .filter(({ item }) => {
        if (!query) {
          return true;
        }

        return getSelectionSearchText(section, item).includes(query);
      });
      const sectionMatches = !query
        ? true
        : [section.title, section.eyebrow].join(" ").toLowerCase().includes(query);

      if (!query || sectionMatches || items.length > 0) {
        return {
          section,
          sectionIndex,
          items:
            query && sectionMatches && items.length === 0
              ? section.items.map((item, itemIndex) => ({ item, itemIndex }))
              : items,
        };
      }

      return null;
    })
    .filter(Boolean);
}

function getCurrentFieldValue(target, field, index = null) {
  if (target === "siteSocial") {
    const socialLinks = Array.isArray(state.content.homepageSettings.footerSocialLinks)
      ? state.content.homepageSettings.footerSocialLinks
      : [];
    const link = Number.isInteger(index) ? socialLinks[index] || null : null;

    return link?.[field] || "";
  }

  if (target === "channel") {
    const channel = getLiveChannelByIndex(index);

    if (!channel) {
      return "";
    }

    if (field === "playoutFiles" || field === "playoutFilesText") {
      return Array.isArray(channel.playoutFiles) ? channel.playoutFiles[0] || "" : "";
    }

    return channel[field] || "";
  }

  if (target === "site") {
    return state.content.homepageSettings[field] || "";
  }

  if (target === "section") {
    return getSelectedSection()?.[field] || "";
  }

  if (target === "item") {
    return getSelectedItem()?.[field] || "";
  }

  if (target === "episode") {
    return getSelectedEpisode()?.[field] || "";
  }

  return "";
}

function getMediaLibraryBaseFolder(assetKind) {
  return assetKind === "video" ? "videos" : "images";
}

function sanitizeFolderSegment(value) {
  return String(value || "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildProgramAssetFolder(assetKind, folderName = getSuggestedShowFolderName()) {
  return `./Programs/${sanitizeFolderSegment(folderName) || "Media"}/${getMediaLibraryBaseFolder(
    assetKind
  )}`;
}

function getSuggestedShowFolderName() {
  const item = getSelectedItem();
  const section = getSelectedSection();

  return (
    sanitizeFolderSegment(item?.title || item?.collectionLabel || section?.title || "Media") ||
    "Media"
  );
}

function getLiveChannelByIndex(index) {
  if (!Number.isInteger(index)) {
    return null;
  }

  return Array.isArray(state.content.liveChannels) ? state.content.liveChannels[index] || null : null;
}

function getSuggestedChannelFolderName(index) {
  const channel = getLiveChannelByIndex(index);

  return sanitizeFolderSegment(channel?.title || channel?.id || "Live Channel") || "Live Channel";
}

function getSectionTitleSuggestions() {
  return [...new Set(state.content.sections.map((section) => String(section.title || "").trim()).filter(Boolean))];
}

function extractProgramAssetContext(pathValue) {
  const normalized = String(pathValue || "").trim().replaceAll("\\", "/");
  const match = normalized.match(/^\.\/Programs\/([^/]+)\/(images|videos)(?:\/(.*))?$/i);

  if (!match) {
    return null;
  }

  return {
    programFolder: match[1],
    assetFolder: match[2].toLowerCase(),
    remainder: match[3] || "",
  };
}

function getRelatedProgramFolderName(target, field, index = null) {
  const item = getSelectedItem();
  const episode = getSelectedEpisode();
  const channel = getLiveChannelByIndex(index);
  const candidates = [getCurrentFieldValue(target, field, index)];

  if (target === "channel" && channel) {
    candidates.push(
      channel.logoUrl,
      channel.streamUrl,
      ...(Array.isArray(channel.playoutFiles) ? channel.playoutFiles : [])
    );
  }

  if (target === "episode" && episode) {
    candidates.push(episode.imageUrl, episode.mediaUrl);
  }

  if (item) {
    candidates.push(item.imageUrl, item.featureImageUrl, item.logoUrl, item.mediaUrl);

    item.episodes.forEach((entry) => {
      candidates.push(entry?.imageUrl, entry?.mediaUrl);
    });
  }

  for (const candidate of candidates) {
    const context = extractProgramAssetContext(candidate);

    if (context?.programFolder) {
      return context.programFolder;
    }
  }

  return "";
}

function getExistingAssetFolder(currentPath, assetKind) {
  const normalized = String(currentPath || "").trim().replaceAll("\\", "/");
  const assetFolderName = getMediaLibraryBaseFolder(assetKind);
  const basePrefix = `./${assetFolderName}/`;
  const programsPattern = new RegExp(
    `^\\.\\/Programs\\/.+\\/${assetFolderName}(?:\\/.*)?$`,
    "i"
  );

  if (!normalized.includes("/")) {
    return "";
  }

  const folderPath = normalized.slice(0, normalized.lastIndexOf("/"));

  if (normalized.startsWith(basePrefix) || programsPattern.test(folderPath)) {
    return folderPath;
  }

  return "";
}

function buildSuggestedAssetPath(fileName, target, field, assetKind, index = null) {
  const currentPath = getCurrentFieldValue(target, field, index);
  const existingFolder = getExistingAssetFolder(currentPath, assetKind);
  const relatedProgramFolder = getRelatedProgramFolderName(target, field, index);
  const suggestedFolderName =
    target === "channel" ? getSuggestedChannelFolderName(index) : getSuggestedShowFolderName();
  const folderPath =
    existingFolder ||
    (relatedProgramFolder
      ? buildProgramAssetFolder(assetKind, relatedProgramFolder)
      : buildProgramAssetFolder(assetKind, suggestedFolderName));

  return `${folderPath}/${fileName}`;
}

function buildSuggestedFolderPath(files, context, assetKind) {
  const currentPath = getCurrentFieldValue(context.target, context.field, context.index);
  const existingFolder = getExistingAssetFolder(currentPath, assetKind);

  if (existingFolder) {
    return existingFolder;
  }

  const nativeFolderPath = deriveWorkspaceRelativePath(files[0]);

  if (nativeFolderPath && nativeFolderPath.includes("/")) {
    return nativeFolderPath.slice(0, nativeFolderPath.lastIndexOf("/"));
  }

  const relatedProgramFolder = getRelatedProgramFolderName(context.target, context.field, context.index);
  const pickedFolderName = sanitizeFolderSegment(
    context.pickedFolderName || getSelectedFolderName(files)
  );
  const assetFolderName = getMediaLibraryBaseFolder(assetKind);
  const normalizedPickedFolder = normalizeLookupKey(pickedFolderName);
  const normalizedRelatedProgram = normalizeLookupKey(relatedProgramFolder);
  const suggestedProgramFolder =
    context.target === "channel" ? getSuggestedChannelFolderName(context.index) : getSuggestedShowFolderName();
  const normalizedSuggestedProgram = normalizeLookupKey(suggestedProgramFolder);

  if (relatedProgramFolder) {
    if (
      !pickedFolderName ||
      normalizedPickedFolder === normalizeLookupKey(assetFolderName) ||
      normalizedPickedFolder === normalizedRelatedProgram ||
      normalizedPickedFolder === normalizedSuggestedProgram
    ) {
      return buildProgramAssetFolder(assetKind, relatedProgramFolder);
    }

    return `${buildProgramAssetFolder(assetKind, relatedProgramFolder)}/${pickedFolderName}`;
  }

  if (!pickedFolderName || normalizedPickedFolder === normalizeLookupKey(assetFolderName)) {
    return buildProgramAssetFolder(assetKind, suggestedProgramFolder);
  }

  if (context.target === "channel") {
    return `${buildProgramAssetFolder(assetKind, suggestedProgramFolder)}/${pickedFolderName}`;
  }

  return buildProgramAssetFolder(assetKind, pickedFolderName);
}

function getPreviewUrl() {
  return buildPreviewUrl("./index.html");
}

function buildPreviewUrl(path = "./index.html", extraParams = {}, options = {}) {
  const params = new URLSearchParams();
  const previewQueryKey = editorApi.previewQueryKey || "editorPreview";
  const includePreviewSeed = options.includePreviewSeed !== false;

  params.set(previewQueryKey, "1");

  Object.entries(extraParams || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || String(value).trim() === "") {
      return;
    }

    params.set(key, String(value));
  });

  if (includePreviewSeed) {
    params.set("previewSeed", String(Date.now()));
  }

  return `${path}?${params.toString()}`;
}

function getPreviewLiveUrl(channelId = "", options = {}) {
  return buildPreviewUrl(
    "./live.html",
    channelId ? { channel: channelId } : {},
    options
  );
}

function syncTopbarPreviewLinks() {
  if (openSiteLink) {
    openSiteLink.href = getPreviewUrl();
  }

  if (watchLiveLink) {
    const firstLiveChannelId = String(state.content.liveChannels?.[0]?.id || "mai-tv").trim();
    watchLiveLink.href = getPreviewLiveUrl(firstLiveChannelId);
  }
}

function getPreviewDocument() {
  if (previewFrame?.contentDocument) {
    return previewFrame.contentDocument;
  }

  if (inlinePreviewMode) {
    return document;
  }

  return null;
}

function getContentFingerprint(content) {
  return JSON.stringify(editorApi.normalizeContent(content));
}

function hasUnsavedChanges() {
  return getContentFingerprint(state.content) !== state.lastSavedDraftFingerprint;
}

function setStatus(text, tone = "muted") {
  state.statusText = text;
  state.statusTone = tone;
  renderStatus();
}

function markDirty(statusText, tone = "muted", options = {}) {
  const { rerenderStatus = true } = options;
  state.hideSavePrompt = false;
  state.statusText = statusText;
  state.statusTone = tone;

  if (rerenderStatus) {
    renderStatus();
  }
}

function saveCurrentDraft(statusText = "Draft saved.", tone = "success") {
  state.content = ensureEditableContent(editorApi.saveDraftContent(state.content));
  state.lastSavedDraftFingerprint = getContentFingerprint(state.content);
  state.hideSavePrompt = false;
  setStatus(statusText, tone);
  schedulePreviewRefresh();
}

function confirmDiscardUnsavedChanges(message) {
  if (!hasUnsavedChanges()) {
    return true;
  }

  return window.confirm(message);
}

function schedulePreviewRefresh() {
  window.clearTimeout(previewRefreshTimer);
  previewRefreshTimer = window.setTimeout(() => {
    refreshPreview({ reloadPage: inlinePreviewMode });
  }, 450);
}

function refreshPreview(options = {}) {
  if (inlinePreviewMode) {
    if (options.reloadPage) {
      window.location.href = getPreviewUrl();
      return;
    }

    handlePreviewLoad();
    return;
  }

  previewFrame.src = getPreviewUrl();
}

function handleBeforeUnload(event) {
  if (!hasUnsavedChanges()) {
    return;
  }

  event.preventDefault();
  event.returnValue = "";
}

function renderAll() {
  ensureSelection();
  renderOutline();
  renderForm();
  renderStatus();
  syncTopbarPreviewLinks();
  updatePreviewSelection();
}

function handlePreviewLoad() {
  const previewDocument = getPreviewDocument();

  if (!previewDocument) {
    return;
  }

  let previewStyle = previewDocument.getElementById("editor-preview-selection-style");

  if (!previewStyle) {
    previewStyle = previewDocument.createElement("style");
    previewStyle.id = "editor-preview-selection-style";
    previewStyle.textContent = `
      [data-editor-highlight="true"] {
        position: relative;
        outline: 3px solid rgba(255, 179, 71, 0.96) !important;
        outline-offset: 4px;
        box-shadow: 0 0 0 6px rgba(255, 179, 71, 0.16) !important;
      }

      .show-card[data-editor-highlight="true"] {
        transform: translateY(-2px);
      }
    `;
    previewDocument.head?.append(previewStyle);
  }

  if (previewDocument.documentElement?.dataset.editorPreviewBound !== "1") {
    previewDocument.addEventListener("click", handlePreviewClick, true);

    if (previewDocument.documentElement) {
      previewDocument.documentElement.dataset.editorPreviewBound = "1";
    }
  }

  updatePreviewSelection();
}

function handlePreviewClick(event) {
  const previewDocument = getPreviewDocument();

  if (!previewDocument) {
    return;
  }

  const itemNode = event.target.closest("[data-editor-item-id]");
  const sectionNode = event.target.closest("[data-editor-section-id]");

  if (!itemNode && !sectionNode) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (itemNode) {
    const itemId = itemNode.getAttribute("data-editor-item-id");
    const match = findItemSelectionById(itemId);

    if (!match) {
      return;
    }

    state.selection = {
      mode: "item",
      sectionIndex: match.sectionIndex,
      itemIndex: match.itemIndex,
      episodeIndex: null,
    };
    renderAll();
    return;
  }

  if (sectionNode) {
    const sectionId = sectionNode.getAttribute("data-editor-section-id");
    const sectionIndex = state.content.sections.findIndex((section) => section.id === sectionId);

    if (sectionIndex === -1) {
      return;
    }

    state.selection = {
      mode: "section",
      sectionIndex,
      itemIndex: null,
      episodeIndex: null,
    };
    renderAll();
  }
}

function updatePreviewSelection() {
  const previewDocument = getPreviewDocument();

  if (!previewDocument) {
    return;
  }

  previewDocument
    .querySelectorAll("[data-editor-highlight='true']")
    .forEach((node) => node.removeAttribute("data-editor-highlight"));

  if (state.selection.mode === "site") {
    return;
  }

  if (state.selection.mode === "section") {
    const section = getSelectedSection();

    if (!section) {
      return;
    }

    previewDocument
      .querySelectorAll(`.content-section[data-editor-section-id="${cssEscape(section.id)}"]`)
      .forEach((node) => node.setAttribute("data-editor-highlight", "true"));
    return;
  }

  const item = getSelectedItem();

  if (!item) {
    return;
  }

  previewDocument
    .querySelectorAll(`[data-editor-item-id="${cssEscape(item.id)}"]`)
    .forEach((node) => node.setAttribute("data-editor-highlight", "true"));
}

function findItemSelectionById(itemId) {
  for (let sectionIndex = 0; sectionIndex < state.content.sections.length; sectionIndex += 1) {
    const itemIndex = state.content.sections[sectionIndex].items.findIndex(
      (item) => item.id === itemId
    );

    if (itemIndex !== -1) {
      return { sectionIndex, itemIndex };
    }
  }

  return null;
}

function cssEscape(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function renderStatus() {
  if (!statusRoot) {
    return;
  }

  const publishedFingerprint = getContentFingerprint(editorApi.getPublishedContent());
  const draftFingerprint = getContentFingerprint(state.content);
  const unsavedChanges = hasUnsavedChanges();
  const hasUnpublishedChanges = publishedFingerprint !== draftFingerprint;
  const liveBadge = editorApi.hasPublishedContent() ? "Custom live content" : "Default live content";

  statusRoot.innerHTML = `
    <div class="editor-status__line">
      <span class="editor-status__badge" data-tone="${escapeHtml(state.statusTone)}">${escapeHtml(
        state.statusText
      )}</span>
      <span class="editor-chip">${escapeHtml(getSelectionLabel())}</span>
      <span class="editor-chip">${escapeHtml(liveBadge)}</span>
      <span class="editor-chip">${escapeHtml(unsavedChanges ? "Unsaved draft edits" : "Draft saved")}</span>
      <span class="editor-chip">${escapeHtml(
        hasUnpublishedChanges ? "Draft not published" : "Live site matches published draft"
      )}</span>
    </div>
    <p class="editor-status__copy">
      Save Draft stores your admin edits in preview mode first. Publish Live pushes the saved draft to the homepage, watch pages, player pages and live page in this browser.
    </p>
    ${
      unsavedChanges && !state.hideSavePrompt
        ? `
      <div class="editor-save-prompt">
        <p class="editor-save-prompt__copy">Save these edits to the draft preview first?</p>
        <div class="editor-form__actions">
          <button class="button button--primary button--small" type="button" data-action="status-save-yes">
            Yes, Save Draft
          </button>
          <button class="button button--secondary button--small" type="button" data-action="status-save-no">
            Not Yet
          </button>
        </div>
      </div>
    `
        : ""
    }
  `;

  if (publishButton) {
    publishButton.disabled = !hasUnpublishedChanges;
  }

  if (saveDraftButton) {
    saveDraftButton.disabled = !unsavedChanges;
  }
}

function renderOutline() {
  const filteredSections = getFilteredSectionEntries();
  const selectedSection = getSelectedSection();
  const selectedItem = getSelectedItem();
  const searchActive = Boolean(state.searchQuery.trim());

  outlineRoot.innerHTML = `
    <section class="editor-panel">
      <div class="editor-outline-section">
        <div class="editor-outline-card">
          <div class="editor-outline-card__header">
            <div>
              <p class="section-heading__eyebrow">Global</p>
              <h2>Site Settings</h2>
            </div>
          </div>
          <button
            class="editor-list__row${state.selection.mode === "site" ? " is-active" : ""}"
            type="button"
            data-action="select-site"
          >
            <span class="editor-list__handle">Edit</span>
            <span class="editor-list__copy">
              <strong>Homepage settings</strong>
              <small>Hero alignment and featured slide behavior</small>
            </span>
            <span class="editor-list__meta">1 panel</span>
          </button>
        </div>

        <div class="editor-outline-card">
          <div class="editor-outline-card__header">
            <div>
              <p class="section-heading__eyebrow">Order</p>
              <h2>Sections</h2>
            </div>
            <button class="button button--secondary button--small" type="button" data-action="add-section">
              Add Section
            </button>
          </div>
          ${
            searchActive
              ? `<p class="editor-field__hint">Showing results for "${escapeHtml(
                  state.searchQuery.trim()
                )}"</p>`
              : ""
          }
          <div class="editor-list" data-list-kind="section">
            ${
              filteredSections.length
                ? filteredSections
                    .map((section, sectionIndex) => renderSectionRow(section, sectionIndex))
                    .join("")
                : `<div class="editor-empty">${
                    searchActive
                      ? "No sections or cards matched that search."
                      : "No sections yet. Add a section to start building the homepage."
                  }</div>`
            }
          </div>
        </div>
        ${renderSelectedSectionOutline(selectedSection, filteredSections)}
        ${renderSelectedItemOutline(selectedItem)}
      </div>
    </section>
  `;
}

function renderSectionRow(entry) {
  const { section, sectionIndex } = entry;
  const isActive =
    state.selection.sectionIndex === sectionIndex &&
    (state.selection.mode === "section" ||
      state.selection.mode === "item" ||
      state.selection.mode === "episode");

  return `
    <button
      class="editor-list__row${isActive ? " is-active" : ""}"
      type="button"
      draggable="true"
      data-action="select-section"
      data-drag-kind="section"
      data-section-index="${sectionIndex}"
    >
      <span class="editor-list__handle">Drag</span>
      <span class="editor-list__copy">
        <strong>${escapeHtml(section.title)}</strong>
        <small>${escapeHtml(section.eyebrow || "No eyebrow")} • ${section.items.length} item${
    section.items.length === 1 ? "" : "s"
  }</small>
      </span>
      <span class="editor-list__meta">${escapeHtml(section.columns === "two" ? "Wide" : "Standard")}</span>
    </button>
  `;
}

function renderItemRow(item, sectionIndex, itemIndex) {
  const isActive =
    state.selection.sectionIndex === sectionIndex &&
    state.selection.itemIndex === itemIndex &&
    (state.selection.mode === "item" || state.selection.mode === "episode");

  return `
    <button
      class="editor-list__row${isActive ? " is-active" : ""}"
      type="button"
      draggable="true"
      data-action="select-item"
      data-drag-kind="item"
      data-section-index="${sectionIndex}"
      data-item-index="${itemIndex}"
    >
      <span class="editor-list__handle">Drag</span>
      <span class="editor-list__copy">
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.kicker || "No kicker")} • ${
    item.episodes.length ? `${item.episodes.length} episode${item.episodes.length === 1 ? "" : "s"}` : "single title"
  }</small>
      </span>
      <span class="editor-list__meta">${escapeHtml(item.featured ? "Featured" : item.badgeLabel || "Card")}</span>
    </button>
  `;
}

function renderEpisodeRow(episode, sectionIndex, itemIndex, episodeIndex) {
  const isActive =
    state.selection.sectionIndex === sectionIndex &&
    state.selection.itemIndex === itemIndex &&
    state.selection.episodeIndex === episodeIndex &&
    state.selection.mode === "episode";

  return `
    <button
      class="editor-list__row${isActive ? " is-active" : ""}"
      type="button"
      draggable="true"
      data-action="select-episode"
      data-drag-kind="episode"
      data-section-index="${sectionIndex}"
      data-item-index="${itemIndex}"
      data-episode-index="${episodeIndex}"
    >
      <span class="editor-list__handle">Drag</span>
      <span class="editor-list__copy">
        <strong>${escapeHtml(episode.title)}</strong>
        <small>${escapeHtml(episode.kicker || "Episode")} • ${escapeHtml(
    episode.statusLabel || episode.duration || "Available"
  )}</small>
      </span>
      <span class="editor-list__meta">${escapeHtml(episode.mediaUrl ? "Ready" : "Soon")}</span>
    </button>
  `;
}

function renderSelectedSectionOutline(section, filteredSections) {
  if (!section) {
    return "";
  }

  const filteredEntry = filteredSections.find((entry) => entry.sectionIndex === state.selection.sectionIndex);
  const visibleItems = filteredEntry ? filteredEntry.items : section.items;

  return `
    <div class="editor-outline-card">
      <div class="editor-outline-card__header">
        <div>
          <p class="section-heading__eyebrow">Cards</p>
          <h2>${escapeHtml(section.title)}</h2>
        </div>
        <div class="editor-form__actions">
          <button class="button button--secondary button--small" type="button" data-action="add-item">
            Add Item
          </button>
        </div>
      </div>
      <div class="editor-list" data-list-kind="item">
        ${
          visibleItems.length
            ? visibleItems
                .map(({ item, itemIndex }) =>
                  renderItemRow(item, state.selection.sectionIndex, itemIndex)
                )
                .join("")
            : `<div class="editor-empty">${
                state.searchQuery.trim()
                  ? "No cards in this section match the current search."
                  : "This section is empty. Add an item to create a new card."
              }</div>`
        }
      </div>
    </div>
  `;
}

function renderSelectedItemOutline(item) {
  if (!item || !item.episodes.length) {
    return "";
  }

  return `
    <div class="editor-outline-card">
      <div class="editor-outline-card__header">
        <div>
          <p class="section-heading__eyebrow">Episodes</p>
          <h2>${escapeHtml(item.title)}</h2>
        </div>
        <button class="button button--secondary button--small" type="button" data-action="add-episode">
          Add Episode
        </button>
      </div>
      <div class="editor-list" data-list-kind="episode">
        ${item.episodes
          .map((episode, episodeIndex) =>
            renderEpisodeRow(
              episode,
              state.selection.sectionIndex,
              state.selection.itemIndex,
              episodeIndex
            )
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderForm() {
  const selectedSection = getSelectedSection();
  const selectedItem = getSelectedItem();
  const selectedEpisode = getSelectedEpisode();

  if (state.selection.mode === "site") {
    formRoot.innerHTML = renderSiteSettingsForm();
    return;
  }

  if (state.selection.mode === "section" && selectedSection) {
    formRoot.innerHTML = renderSectionForm(selectedSection);
    return;
  }

  if (state.selection.mode === "episode" && selectedSection && selectedItem && selectedEpisode) {
    formRoot.innerHTML = renderEpisodeForm(selectedSection, selectedItem, selectedEpisode);
    return;
  }

  if (selectedSection && selectedItem) {
    formRoot.innerHTML = renderItemForm(selectedSection, selectedItem);
    return;
  }

  formRoot.innerHTML = `
    <div class="editor-empty">
      Choose a section, card or episode from the left to start editing.
    </div>
  `;
}

function renderLiveChannelSettingsSection() {
  if (!state.content.liveChannels.length) {
    return renderFormSection({
      title: "Live Channel Streams",
      description: "Choose a stream URL, embedded player, or playout videos for each channel here. Keep private encoder stream keys out of the public site.",
      content: `<div class="editor-callout">No live channels are set up in this draft yet.</div>`,
      open: true,
    });
  }

  return renderFormSection({
    title: "Live Channel Streams",
    description: "Choose a stream URL, embedded player, or playout videos for each channel here. Keep private encoder stream keys out of the public site.",
    open: true,
    content: `
      ${state.content.liveChannels
        .map((channel, channelIndex) => {
          const channelId = String(channel.id || "").trim();
          const liveHref = channelId
            ? getPreviewLiveUrl(channelId, { includePreviewSeed: false })
            : "";

          return renderFormSection({
            title: channel.title || `Live Channel ${channelIndex + 1}`,
            description: "Stream, embed, or playout settings for this live channel.",
            open: channelIndex === 0,
            className: "editor-form__subsection",
            content: `
              <div class="editor-callout">
                Channel code: <strong>${escapeHtml(channelId || "Set in data.js")}</strong>
                ${liveHref ? `<br />Live page: <code>${escapeHtml(liveHref)}</code>` : ""}
              </div>
              <div class="editor-grid editor-grid--2">
                ${renderSelectField({
                  label: "Playback source",
                  target: "channel",
                  field: "sourceMode",
                  value: channel.sourceMode,
                  options: getLiveSourceModeOptions(channel.sourceMode),
                  hint: "Choose whether this channel uses a stream URL, embedded player, or local playout videos.",
                  index: channelIndex,
                })}
                ${renderInputField({
                  label: "Channel title",
                  target: "channel",
                  field: "title",
                  value: channel.title,
                  placeholder: "MAI TV",
                  index: channelIndex,
                })}
                ${renderInputField({
                  label: "Kicker",
                  target: "channel",
                  field: "kicker",
                  value: channel.kicker,
                  placeholder: "Channel One",
                  index: channelIndex,
                })}
                ${renderInputField({
                  label: "Timezone",
                  target: "channel",
                  field: "timezone",
                  value: channel.timezone,
                  placeholder: "Pacific/Fiji",
                  index: channelIndex,
                })}
                ${renderInputField({
                  label: "Schedule label",
                  target: "channel",
                  field: "scheduleLabel",
                  value: channel.scheduleLabel,
                  placeholder: "Today in Fiji time",
                  index: channelIndex,
                })}
                ${renderInputField({
                  label: "Logo image path",
                  target: "channel",
                  field: "logoUrl",
                  value: channel.logoUrl,
                  placeholder: "./images/MaiTV-logo-small.png",
                  hint: "Optional local logo used on the live page.",
                  index: channelIndex,
                })}
                ${renderInputField({
                  label: "Logo alt text",
                  target: "channel",
                  field: "logoAlt",
                  value: channel.logoAlt,
                  placeholder: "MAI TV",
                  index: channelIndex,
                })}
                ${renderInputField({
                  label: "Stream URL",
                  target: "channel",
                  field: "streamUrl",
                  value: channel.streamUrl,
                  placeholder: "https://example.com/live/playlist.m3u8",
                  hint: "Used when Playback source is set to Stream URL / quality sources.",
                  index: channelIndex,
                })}
                ${renderSelectField({
                  label: "Stream type",
                  target: "channel",
                  field: "streamType",
                  value: channel.streamType,
                  options: getLiveStreamTypeOptions(channel.streamType),
                  hint: "Choose HLS for most .m3u8 live streams.",
                  index: channelIndex,
                })}
                ${renderInputField({
                  label: "Embed URL",
                  target: "channel",
                  field: "embedUrl",
                  value: channel.embedUrl,
                  placeholder: "https://player.example.com/embed/...",
                  hint: "Used when Playback source is set to Embedded player.",
                  index: channelIndex,
                })}
              </div>
              ${renderTextareaField({
                label: "Playout video files",
                target: "channel",
                field: "playoutFilesText",
                value: formatLineSeparatedValues(channel.playoutFiles),
                placeholder: "./Programs/MAI TV/videos/block-1.mp4\n./Programs/MAI TV/videos/block-2.mp4",
                hint: "Used when Playback source is set to Playout videos. One video path per line, played in this order and looped.",
                rows: 5,
                index: channelIndex,
              })}
              <div class="editor-form__actions">
                <button
                  class="button button--secondary button--small"
                  type="button"
                  data-action="browse-media-file"
                  data-target="channel"
                  data-field="playoutFiles"
                  data-asset-kind="video"
                  data-index="${escapeHtml(String(channelIndex))}"
                >
                  Add One Video
                </button>
                <button
                  class="button button--secondary button--small"
                  type="button"
                  data-action="browse-media-folder"
                  data-target="channel"
                  data-field="playoutFiles"
                  data-asset-kind="video"
                  data-index="${escapeHtml(String(channelIndex))}"
                >
                  Add Video Folder
                </button>
              </div>
              ${renderTextareaField({
                label: "Description",
                target: "channel",
                field: "description",
                value: channel.description,
                placeholder: "Describe what viewers will see on this channel.",
                rows: 3,
                index: channelIndex,
              })}
            `,
          });
        })
        .join("")}
      <ul class="editor-note-list">
        <li>Use <strong>streamUrl</strong> for the custom MAI player with the hover-to-show controls.</li>
        <li>Use <strong>embedUrl</strong> only when your provider gives you an embed player link. That keeps the provider's own player controls.</li>
        <li>Use <strong>Playout videos</strong> when you want the live channel to run local video files in order like a looped channel feed.</li>
        <li>Do not place a private RTMP or encoder stream key in this editor because the site data is viewer-facing.</li>
      </ul>
    `,
  });
}

function renderFooterSocialLinksEditor() {
  const socialLinks = Array.isArray(state.content.homepageSettings.footerSocialLinks)
    ? state.content.homepageSettings.footerSocialLinks
    : [];

  return renderFormSection({
    title: "Footer Social Icons",
    description: "Add as many social icons as you want. Each icon opens its saved link on the homepage footer.",
    open: false,
    content: `
      ${
        socialLinks.length
          ? socialLinks
              .map(
                (entry, index) => `
            <div class="editor-form__subsection">
              <div class="editor-grid editor-grid--3">
                ${renderSelectField({
                  label: "Icon",
                  target: "siteSocial",
                  field: "icon",
                  value: entry.icon,
                  options: getFooterSocialIconOptions(entry.icon),
                  index,
                })}
                ${renderInputField({
                  label: "Label",
                  target: "siteSocial",
                  field: "label",
                  value: entry.label,
                  placeholder: "Facebook",
                  index,
                })}
                ${renderInputField({
                  label: "Link URL",
                  target: "siteSocial",
                  field: "url",
                  value: entry.url,
                  placeholder: "https://example.com",
                  index,
                })}
              </div>
              <div class="editor-form__actions">
                <button
                  class="button button--secondary button--small"
                  type="button"
                  data-action="remove-footer-social-link"
                  data-index="${escapeHtml(String(index))}"
                >
                  Remove Icon
                </button>
              </div>
            </div>
          `
              )
              .join("")
          : `<div class="editor-callout">No footer social icons yet. Add one below to start.</div>`
      }
      <div class="editor-form__actions">
        <button class="button button--secondary button--small" type="button" data-action="add-footer-social-link">
          Add Social Icon
        </button>
      </div>
    `,
  });
}

function renderFormSection({ title, description = "", content = "", open = false, className = "" }) {
  const sectionClassName = ["editor-form__section", "editor-form__section--collapsible", className].filter(Boolean).join(" ");

  return `
    <details class="${sectionClassName}" ${open ? "open" : ""}>
      <summary class="editor-form__section-summary">
        <div class="editor-form__section-title">
          ${title ? `<h3>${escapeHtml(title)}</h3>` : ""}
          ${description ? `<p>${escapeHtml(description)}</p>` : ""}
        </div>
      </summary>
      <div class="editor-form__section-body">
        ${content}
      </div>
    </details>
  `;
}

function renderSiteSettingsForm() {
  const featuredLabel = getFeaturedItemLabel();
  const featuredCount = getFeaturedItemCount();
  const defaultScheduleChannelId = getScheduleImportDefaultChannelId();
  const activeScheduleChannelId = getActiveScheduleImportChannelId();
  const scheduleHint = defaultScheduleChannelId
    ? `If your file has no channelId column, the editor will use ${defaultScheduleChannelId}.`
    : "If you manage more than one live channel, include a channelId column in the file.";
  const scheduleTargetHint = activeScheduleChannelId
    ? `Quick upload target: ${getLiveChannelLabel(activeScheduleChannelId)} (${activeScheduleChannelId}).`
    : "Upload applies to every channel row included in the file.";

  return `
    <form class="editor-form" autocomplete="off">
      <div class="editor-form__headline">
        <p class="section-heading__eyebrow">Global controls</p>
        <h2>Homepage Settings</h2>
        <p class="editor-form__intro">
          Use this panel for layout changes that affect the homepage without editing code.
        </p>
      </div>

      ${renderFormSection({
        title: "Hero Slide Layout",
        description: "The homepage hero rotates through every card that is marked as featured.",
        open: true,
        content: `
          <div class="editor-grid editor-grid--2">
            ${renderSelectField({
              label: "Hero text alignment",
              target: "site",
              field: "heroContentAlign",
              value: state.content.homepageSettings.heroContentAlign,
              options: heroAlignOptions.map((option) => ({
                value: option,
                label: option.charAt(0).toUpperCase() + option.slice(1),
              })),
              hint: "Move the hero text block left, center or right.",
            })}
            ${renderInputField({
              label: "Slide change time (seconds)",
              target: "site",
              field: "heroSlideDurationSeconds",
              value: state.content.homepageSettings.heroSlideDurationSeconds,
              type: "number",
              min: 2,
              max: 30,
              step: 0.5,
              hint: "Controls how long each featured hero slide stays on screen.",
            })}
          </div>
          <div class="editor-callout">
            Featured hero slides selected: <strong>${escapeHtml(String(featuredCount))}</strong>
          </div>
          <div class="editor-callout">
            Current hero rotation: <strong>${escapeHtml(featuredLabel)}</strong>
          </div>
        `,
      })}

      ${renderFormSection({
        title: "Theme & Layout",
        description: "Change the page background, fonts, and accent colors here. These settings flow across the site.",
        open: true,
        content: `
          <div class="editor-grid editor-grid--2">
            ${renderSelectField({
              label: "Display font",
              target: "site",
              field: "themeDisplayFont",
              value: state.content.homepageSettings.themeDisplayFont,
              options: getThemeFontOptions(state.content.homepageSettings.themeDisplayFont),
              hint: "Used on hero titles and major headings.",
            })}
            ${renderSelectField({
              label: "Body font",
              target: "site",
              field: "themeBodyFont",
              value: state.content.homepageSettings.themeBodyFont,
              options: getThemeFontOptions(state.content.homepageSettings.themeBodyFont),
              hint: "Used on descriptions, buttons, and supporting text.",
            })}
            ${renderInputField({
              label: "Background start",
              target: "site",
              field: "themeBgStart",
              value: state.content.homepageSettings.themeBgStart,
              type: "color",
            })}
            ${renderInputField({
              label: "Background mid",
              target: "site",
              field: "themeBgMid",
              value: state.content.homepageSettings.themeBgMid,
              type: "color",
            })}
            ${renderInputField({
              label: "Background end",
              target: "site",
              field: "themeBgEnd",
              value: state.content.homepageSettings.themeBgEnd,
              type: "color",
            })}
            ${renderInputField({
              label: "Glow color 1",
              target: "site",
              field: "themeGlowPrimary",
              value: state.content.homepageSettings.themeGlowPrimary,
              type: "color",
            })}
            ${renderInputField({
              label: "Glow color 2",
              target: "site",
              field: "themeGlowSecondary",
              value: state.content.homepageSettings.themeGlowSecondary,
              type: "color",
            })}
            ${renderInputField({
              label: "Panel color",
              target: "site",
              field: "themePanelColor",
              value: state.content.homepageSettings.themePanelColor,
              type: "color",
            })}
            ${renderInputField({
              label: "Card color",
              target: "site",
              field: "themeCardColor",
              value: state.content.homepageSettings.themeCardColor,
              type: "color",
            })}
            ${renderInputField({
              label: "Text color",
              target: "site",
              field: "themeTextColor",
              value: state.content.homepageSettings.themeTextColor,
              type: "color",
            })}
            ${renderInputField({
              label: "Muted text color",
              target: "site",
              field: "themeMutedColor",
              value: state.content.homepageSettings.themeMutedColor,
              type: "color",
            })}
            ${renderInputField({
              label: "Accent color",
              target: "site",
              field: "themeAccentColor",
              value: state.content.homepageSettings.themeAccentColor,
              type: "color",
            })}
            ${renderInputField({
              label: "Accent alt color",
              target: "site",
              field: "themeAccentAltColor",
              value: state.content.homepageSettings.themeAccentAltColor,
              type: "color",
            })}
          </div>
          <ul class="editor-note-list">
            <li>Sections render top to bottom in the same order shown in the left panel.</li>
            <li>Cards render left to right in each row in the same order shown in the left panel.</li>
            <li>When you add more cards, the row continues with more cards in that saved order.</li>
            <li>You can already drag sections, cards, and episodes in the left panel to change the live order.</li>
          </ul>
        `,
      })}

      ${renderFormSection({
        title: "Homepage Footer",
        description: "Update the footer text here. The social icons are managed in the next section.",
        open: false,
        content: `
          ${renderTextareaField({
            label: "Footer copy",
            target: "site",
            field: "footerCopy",
            value: state.content.homepageSettings.footerCopy,
            placeholder: "Established in 2008, Mai TV was the second free to air television station in the country...",
            rows: 3,
          })}
          <ul class="editor-note-list">
            <li>The footer now blends into the page instead of using the white card background.</li>
            <li>Button, title, and eyebrow settings are kept in the data for compatibility, but they are no longer shown in the new footer layout.</li>
          </ul>
        `,
      })}

      ${renderFooterSocialLinksEditor()}

      ${renderLiveChannelSettingsSection()}

      ${renderFormSection({
        title: "Live Channel TV Guide",
        description: "Upload the live TV guide here in the editor. The public live page is now read-only.",
        open: true,
        content: `
          <div class="editor-callout">
            Current draft schedule: <strong>${escapeHtml(getScheduleImportMetaLabel())}</strong>
          </div>
          <p class="editor-field__hint">${escapeHtml(scheduleImportFeedback.text)}</p>
          <p class="editor-field__hint">${escapeHtml(scheduleHint)}</p>
          <p class="editor-field__hint">${escapeHtml(scheduleTargetHint)}</p>
          <div class="editor-form__actions">
            <button class="button button--secondary button--small" type="button" data-action="upload-live-schedule">
              Choose CSV / XLSX
            </button>
            <button class="button button--secondary button--small" type="button" data-action="restore-live-schedule">
              Restore Built-in Schedule
            </button>
          </div>
          <ul class="editor-note-list">
            <li>Upload here first, then use <strong>Save Draft</strong> and <strong>Publish Live</strong> to push the schedule to the live page.</li>
            <li>Your file needs programme, start, and end columns. Walesi-style grid exports are supported too.</li>
            <li>Schedule changes live inside the editor data now, not in the public page browser storage.</li>
          </ul>
          <div class="editor-callout">
            Status: <strong>${escapeHtml(scheduleImportFeedback.tone.toUpperCase())}</strong>
          </div>
        `,
      })}

    </form>
  `;
}

function renderLiveChannelTools(item) {
  if (!item?.liveChannelId) {
    return "";
  }

  const channelId = String(item.liveChannelId || "").trim();
  const channelLabel = getLiveChannelLabel(channelId);

  return renderFormSection({
    title: "Live Channel Tools",
    description: "Use these shortcuts when this card opens a live channel page.",
    open: false,
    content: `
      <div class="editor-callout">
        Linked live channel: <strong>${escapeHtml(channelLabel || channelId)}</strong>
      </div>
      <p class="editor-field__hint">
        Uploading from here will use <strong>${escapeHtml(channelId)}</strong> when the file does not include a channelId column.
      </p>
      <p class="editor-field__hint">${escapeHtml(scheduleImportFeedback.text)}</p>
      <div class="editor-form__actions">
        <button
          class="button button--secondary button--small"
          type="button"
          data-action="upload-live-schedule"
          data-channel-id="${escapeHtml(channelId)}"
        >
          Upload TV Guide
        </button>
      </div>
    `,
  });
}

function renderSectionForm(section) {
  return `
    <form class="editor-form" autocomplete="off">
      <div class="editor-form__headline">
        <p class="section-heading__eyebrow">Section settings</p>
        <h2>${escapeHtml(section.title)}</h2>
        <p class="editor-form__intro">
          Edit the rail title and how wide the cards should appear on the homepage.
        </p>
      </div>

      ${renderFormSection({
        title: "Section basics",
        description: "Set the rail title and how wide the cards should appear on the homepage.",
        open: true,
        content: `
          <div class="editor-grid editor-grid--2">
            ${renderInputField({
              label: "Section title",
              target: "section",
              field: "title",
              value: section.title,
              placeholder: "Sport & Events",
              hint: "Shown above the card row.",
            })}
            ${renderInputField({
              label: "Eyebrow",
              target: "section",
              field: "eyebrow",
              value: section.eyebrow,
              placeholder: "Replay and events",
              hint: "Small label above the section title.",
            })}
            ${renderSelectField({
              label: "Layout",
              target: "section",
              field: "columns",
              value: section.columns,
              options: [
                { value: "", label: "Standard cards" },
                { value: "two", label: "Wide cards" },
              ],
              hint: "Wide cards are useful for live channels or bigger content blocks.",
            })}
          </div>
        `,
      })}

      ${renderFormSection({
        title: "Section actions",
        description: "Drag this section in the left panel to move it higher or lower on the homepage.",
        open: false,
        content: `
          <div class="editor-form__actions">
            <button class="button button--secondary button--small" type="button" data-action="remove-section">
              Remove Section
            </button>
          </div>
        `,
      })}
    </form>
  `;
}

function renderItemForm(section, item) {
  return `
    <form class="editor-form" autocomplete="off">
      <div class="editor-form__headline">
        <p class="section-heading__eyebrow">Card settings</p>
        <h2>${escapeHtml(item.title)}</h2>
        <p class="editor-form__intro">
          Update the text, artwork, badge, media path and hero settings for this card.
        </p>
      </div>

      <section class="editor-form__section">
        <div class="editor-form__section-title">
          <h3>Basic content</h3>
          <p>These are the main words your audience will see first.</p>
        </div>
        <div class="editor-grid editor-grid--2">
          ${renderInputField({
            label: "Title",
            target: "item",
            field: "title",
            value: item.title,
            placeholder: "SASR25 Daily Highlights",
          })}
          ${renderInputField({
            label: "Kicker",
            target: "item",
            field: "kicker",
            value: item.kicker,
            placeholder: "Schools Series",
            list: "editor-kicker-options",
            suggestions: availableKickerSuggestions,
          })}
          ${renderInputField({
            label: "Meta line",
            target: "item",
            field: "meta",
            value: item.meta,
            placeholder: "Sport | Rally",
            hint: "Shows under the description and on detail pages.",
          })}
          ${renderInputField({
            label: "Filters",
            target: "item",
            field: "filtersText",
            value: item.filters.join(", "),
            placeholder: "sport, catchup, series",
            list: "editor-filter-options",
            hint: "Comma-separated tags used by search and filtering.",
            suggestions: availableFilterSuggestions,
            suggestionMode: "append-comma",
          })}
        </div>
        ${renderTextareaField({
          label: "Description",
          target: "item",
          field: "description",
          value: item.description,
          placeholder: "Describe what viewers will watch here.",
        })}
      </section>

      <section class="editor-form__section">
        <div class="editor-form__section-title">
          <h3>Placement and badges</h3>
          <p>Control where this card appears and how it is labeled.</p>
        </div>
        <div class="editor-grid editor-grid--2">
          ${renderInputField({
            label: "Section",
            target: "item",
            field: "sectionTitle",
            value: section.title,
            placeholder: "Catch Up",
            hint: "Choose an existing section below or type a new one to create it.",
            suggestions: getSectionTitleSuggestions(),
          })}
          ${renderInputField({
            label: "Badge label",
            target: "item",
            field: "badgeLabel",
            value: item.badgeLabel,
            placeholder: "LIVE",
          })}
          ${renderSelectField({
            label: "Badge style",
            target: "item",
            field: "badgeClass",
            value: item.badgeClass,
            options: buildSelectOptions(availableBadgeClasses, item.badgeClass, (value) => value),
            hint: "Examples: live, new, local, series, catchup, hot.",
          })}
          ${renderCheckboxField({
            label: "Use this card as the featured homepage slide",
            target: "item",
            field: "featured",
            checked: item.featured,
            hint: "Check as many cards as you want to include in the homepage hero rotation.",
          })}
        </div>
      </section>

      <section class="editor-form__section">
        <div class="editor-form__section-title">
          <h3>Artwork</h3>
          <p>Leave the card image empty to keep the built-in art style for the chosen art class.</p>
        </div>
        <div class="editor-grid editor-grid--2">
          ${renderSelectField({
            label: "Art class",
            target: "item",
            field: "artClass",
            value: item.artClass,
            options: getArtClassOptions(item.artClass),
            hint: "Choose the built-in background style for this card.",
          })}
          ${renderInputField({
            label: "Card image path",
            target: "item",
            field: "imageUrl",
            value: item.imageUrl,
            placeholder: "./Programs/SASR25/images/poster.jpg",
            hint: "Browse to a file already in this project, or pick one and the editor will suggest a matching Programs path.",
            browse: { kind: "image" },
          })}
          ${renderInputField({
            label: "Logo image path",
            target: "item",
            field: "logoUrl",
            value: item.logoUrl,
            placeholder: "./Programs/Show Name/images/logo.png",
            browse: { kind: "image" },
          })}
          ${renderInputField({
            label: "Logo alt text",
            target: "item",
            field: "logoAlt",
            value: item.logoAlt,
            placeholder: "Program logo",
          })}
          ${renderSelectField({
            label: "Logo position",
            target: "item",
            field: "logoPosition",
            value: item.logoPosition,
            options: availableLogoPositions,
            hint: "Controls where the logo sits in the homepage card and hero.",
          })}
        </div>
      </section>

      <section class="editor-form__section">
        <div class="editor-form__section-title">
          <h3>Hero slide settings</h3>
          <p>These fields matter most when the card is marked as featured.</p>
        </div>
        <div class="editor-grid editor-grid--2">
          ${renderInputField({
            label: "Hero image path",
            target: "item",
            field: "featureImageUrl",
            value: item.featureImageUrl,
            placeholder: "./Programs/SASR25/images/hero.jpg",
            hint: "Shown in the homepage hero slideshow.",
            browse: { kind: "image" },
          })}
          ${renderSelectField({
            label: "Hero image motion",
            target: "item",
            field: "featureMotion",
            value: item.featureMotion,
            options: getFeatureMotionOptions(item.featureMotion),
            hint: "Use slide animation only when you want motion on that hero image.",
          })}
          ${renderInputField({
            label: "Hero image position",
            target: "item",
            field: "featureImagePosition",
            value: item.featureImagePosition,
            placeholder: "center center",
            hint: "Examples: center center, 76% 42%, right center.",
          })}
        </div>
      </section>

      <section class="editor-form__section editor-form__section--ppv-simplified">
        <div class="editor-form__section-title">
          <h3>PPV Access</h3>
          <p>Use movie / series unlock for normal PPV titles. Use live PPV event when payment should unlock a live stream, embed, or offline loop on the player page.</p>
        </div>
        <div class="editor-grid editor-grid--2">
          ${renderCheckboxField({
            label: "Enable PPV",
            target: "item",
            field: "ppvEnabled",
            checked: item.ppvEnabled,
            hint: "When turned on, this title stays greyed out until payment is made.",
          })}
          ${renderSelectField({
            label: "PPV type",
            target: "item",
            field: "ppvEventType",
            value: item.ppvEventType,
            options: getPpvEventTypeOptions(item.ppvEventType),
            hint: "Live PPV is for event streams. Movie / series unlock is for normal catalog PPV.",
          })}
          ${renderInputField({
            label: "Buy button label",
            target: "item",
            field: "ppvButtonLabel",
            value: item.ppvButtonLabel,
            placeholder: "Buy PPV Access",
          })}
          ${renderInputField({
            label: "Price",
            target: "item",
            field: "ppvPrice",
            value: item.ppvPrice,
            placeholder: "19.99",
          })}
          ${renderInputField({
            label: "Currency",
            target: "item",
            field: "ppvCurrency",
            value: item.ppvCurrency,
            placeholder: "FJD",
          })}
          ${renderInputField({
            label: "Payment methods",
            target: "item",
            field: "ppvMethodsText",
            value: item.ppvMethods.join(", "),
            placeholder: "M-PAiSA, MyCash, Visa, Mastercard",
          })}
          ${renderInputField({
            label: "Event date & time",
            target: "item",
            field: "ppvEventDate",
            value: item.ppvEventDate,
            placeholder: "13-Apr-2026 01:58 PM",
          })}
        </div>

        ${item.ppvEventType === "live_event" ? `
          <div class="editor-grid editor-grid--2">
            ${renderInputField({
              label: "Live stream URL",
              target: "item",
              field: "ppvLiveStreamUrl",
              value: item.ppvLiveStreamUrl,
              placeholder: "https://example.com/live.m3u8",
              hint: "Paste a browser-playable HLS or video URL here.",
            })}
            ${renderSelectField({
              label: "Stream type",
              target: "item",
              field: "ppvLiveStreamType",
              value: item.ppvLiveStreamType,
              options: getPpvStreamTypeOptions(item.ppvLiveStreamType),
              hint: "Leave on auto detect unless the player needs a forced type.",
            })}
            ${renderInputField({
              label: "Embed URL",
              target: "item",
              field: "ppvLiveEmbedUrl",
              value: item.ppvLiveEmbedUrl,
              placeholder: "https://player.example.com/embed/...",
              hint: "Use this when your provider gives you an embed player.",
            })}
            ${renderInputField({
              label: "Encoder stream key",
              target: "item",
              field: "ppvLiveStreamKey",
              value: item.ppvLiveStreamKey,
              placeholder: "Paste your vMix or encoder stream key here",
              hint: "For operator reference only. Browsers cannot play a raw RTMP stream key directly.",
            })}
            ${renderSelectField({
              label: "When no live event is happening",
              target: "item",
              field: "ppvOfflineMode",
              value: item.ppvOfflineMode,
              options: getPpvOfflineModeOptions(item.ppvOfflineMode),
            })}
            ${renderTextareaField({
              label: "Offline message",
              target: "item",
              field: "ppvOfflineMessage",
              value: item.ppvOfflineMessage,
              placeholder: "This event is not live right now. Please check back later.",
              rows: 2,
            })}
            ${renderTextareaField({
              label: "Loop files",
              target: "item",
              field: "ppvLoopFilesText",
              value: formatLineSeparatedValues(item.ppvLoopFiles),
              placeholder: "./videos/holding-loop.mp4",
              rows: 3,
              hint: "One file per line. Used only when the event is offline and Loop mode is selected.",
            })}
          </div>
        ` : renderTextareaField({
          label: "Access note",
          target: "item",
          field: "ppvAccessNote",
          value: item.ppvAccessNote,
          placeholder: "Short note shown on the payment page.",
          rows: 2,
        })}
      </section>

      <section class="editor-form__section">
        <div class="editor-form__section-title">
          <h3>Playback settings</h3>
          <p>Single titles use one media path. Series titles use the episode list in the left panel.</p>
        </div>
        <div class="editor-grid editor-grid--2">
          ${renderSelectField({
            label: "Live channel",
            target: "item",
            field: "liveChannelId",
            value: item.liveChannelId,
            options: getLiveChannelOptions(item.liveChannelId),
            hint: "Choose a live channel here when this card should open the live page instead of a replay page.",
          })}
          ${renderInputField({
            label: "Collection label",
            target: "item",
            field: "collectionLabel",
            value: item.collectionLabel,
            placeholder: "Season 1 or Stage 3",
          })}
          ${renderInputField({
            label: "Sort label",
            target: "item",
            field: "sortLabel",
            value: item.sortLabel,
            placeholder: "Ascending",
          })}
          ${
            item.episodes.length === 0
              ? renderInputField({
                  label: "Available from",
                  target: "item",
                  field: "availableFrom",
                  value: item.availableFrom,
                  type: "date",
                  hint: "Leave blank to make it available immediately.",
                })
              : ""
          }
          ${
            item.episodes.length === 0
              ? renderInputField({
                  label: "Available until",
                  target: "item",
                  field: "availableUntil",
                  value: item.availableUntil,
                  type: "date",
                  hint: "Optional end date for replay availability.",
                })
              : ""
          }
          ${
            item.episodes.length === 0
              ? renderInputField({
                  label: "Media path",
                  target: "item",
                  field: "mediaUrl",
                  value: item.mediaUrl,
                  placeholder: "./Programs/Show Name/videos/clip.mp4",
                  hint: "Browse to a video in this project, or use Folder to auto-link matching .vtt or .srt subtitle files in that show's video folder.",
                  browse: { kind: "video", allowFolder: true },
                })
              : ""
          }
          ${
            item.episodes.length === 0
              ? renderInputField({
                  label: "Media type",
                  target: "item",
                  field: "mediaType",
                  value: item.mediaType,
                  placeholder: "video/mp4",
                  list: "editor-media-type-options",
                  hint: "MP4 is the safest browser format. MKV works only when the browser supports the codec inside the file.",
                })
              : ""
          }
          </div>
        ${
          item.episodes.length
            ? `
          <div class="editor-callout">
            This title is currently a <strong>series</strong>. Use the episode list on the left to edit each episode's
            image, text, video path and air date.
          </div>
          <div class="editor-form__actions">
            <button
              class="button button--secondary button--small"
              type="button"
              data-action="browse-media-folder"
              data-target="item"
              data-field="mediaUrl"
              data-asset-kind="video"
            >
              Load Video Folder Into Episodes
            </button>
          </div>
        `
            : `
          <div class="editor-callout">
            This title is currently a <strong>single card</strong>. Convert it to a series if you want separate episode entries.
          </div>
        `
        }
      </section>

      ${renderLiveChannelTools(item)}

      <section class="editor-form__section">
        <div class="editor-form__section-title">
          <h3>Episode Planner</h3>
          <p>Create a whole season quickly, then let future episodes stay as Coming Soon until their air date.</p>
        </div>
        <div class="editor-grid editor-grid--2">
          ${renderInputField({
            label: "Episode count",
            target: "item",
            field: "episodePlannerCount",
            value: item.episodePlannerCount,
            type: "number",
            min: "1",
            step: "1",
            hint: "Adds missing episodes up to this number.",
          })}
          ${renderInputField({
            label: "First air date",
            target: "item",
            field: "episodeReleaseStart",
            value: item.episodeReleaseStart,
            type: "date",
            hint: "Used as Episode 1 release date.",
          })}
          ${renderInputField({
            label: "Release every (days)",
            target: "item",
            field: "episodeReleaseIntervalDays",
            value: item.episodeReleaseIntervalDays,
            type: "number",
            min: "1",
            step: "1",
            hint: "Use 7 for weekly, 1 for daily.",
          })}
        </div>
        <div class="editor-form__actions">
          <button class="button button--secondary button--small" type="button" data-action="build-episode-plan">
            Create / Schedule Episodes
          </button>
        </div>
      </section>

      <section class="editor-form__section">
        <div class="editor-form__section-title">
          <h3>Card actions</h3>
          <p>Use these when you need to change the structure, not just the text.</p>
        </div>
        <div class="editor-form__actions">
          <button
            class="button button--secondary button--small"
            type="button"
            data-action="${item.episodes.length ? "convert-to-single" : "convert-to-series"}"
          >
            ${item.episodes.length ? "Convert to Single Title" : "Convert to Series"}
          </button>
          ${
            item.episodes.length
              ? `
            <button class="button button--secondary button--small" type="button" data-action="add-episode">
              Add Episode
            </button>
          `
              : ""
          }
          <button class="button button--secondary button--small" type="button" data-action="remove-item">
            Remove Card
          </button>
        </div>
      </section>

      ${renderEditorDataLists()}
    </form>
  `;
}

function renderEpisodeForm(section, item, episode) {
  return `
    <form class="editor-form" autocomplete="off">
      <div class="editor-form__headline">
        <p class="section-heading__eyebrow">Episode settings</p>
        <h2>${escapeHtml(episode.title)}</h2>
        <p class="editor-form__intro">
          Edit the episode metadata and playback file for <strong>${escapeHtml(item.title)}</strong>.
        </p>
      </div>

      <section class="editor-form__section">
        <div class="editor-form__section-title">
          <h3>Episode copy</h3>
          <p>These details appear on the watch page and in the player sidebar.</p>
        </div>
        <div class="editor-grid editor-grid--2">
          ${renderInputField({
            label: "Episode title",
            target: "episode",
            field: "title",
            value: episode.title,
            placeholder: "Episode 1",
          })}
          ${renderInputField({
            label: "Kicker",
            target: "episode",
            field: "kicker",
            value: episode.kicker,
            placeholder: "Stage 3 Highlights",
            list: "editor-kicker-options",
            suggestions: availableKickerSuggestions,
          })}
          ${renderInputField({
            label: "Meta line",
            target: "episode",
            field: "meta",
            value: episode.meta,
            placeholder: "Episode 1 | Stage 3 video replay",
          })}
          ${renderInputField({
            label: "Duration",
            target: "episode",
            field: "duration",
            value: episode.duration,
            placeholder: "36 min",
          })}
          ${renderInputField({
            label: "Status label",
            target: "episode",
            field: "statusLabel",
            value: episode.statusLabel,
            placeholder: "SOON",
            hint: "Use this instead of duration for labels like SOON.",
          })}
        </div>
        ${renderTextareaField({
          label: "Description",
          target: "episode",
          field: "description",
          value: episode.description,
          placeholder: "Describe this episode for the watch page.",
        })}
        ${renderTextareaField({
          label: "Aired / info text",
          target: "episode",
          field: "airedText",
          value: episode.airedText,
          placeholder: "Aired on MAI TV...",
          rows: 3,
        })}
      </section>

      <section class="editor-form__section">
        <div class="editor-form__section-title">
          <h3>Episode media</h3>
          <p>Point this episode to the right image and video file path, then control when it goes live.</p>
        </div>
        <div class="editor-grid editor-grid--2">
          ${renderInputField({
            label: "Episode image path",
            target: "episode",
            field: "imageUrl",
            value: episode.imageUrl,
            placeholder: "./Programs/SASR25/images/episode-1.jpg",
            browse: { kind: "image" },
          })}
          ${renderInputField({
            label: "Video path",
            target: "episode",
            field: "mediaUrl",
            value: episode.mediaUrl,
            placeholder: "./Programs/SASR25/videos/sasr25/episode-1.mp4",
            hint: "Use Folder when you want matching .vtt or .srt subtitle files in that video folder to auto-link.",
            browse: { kind: "video", allowFolder: true },
          })}
          ${renderInputField({
            label: "Media type",
            target: "episode",
            field: "mediaType",
            value: episode.mediaType,
            placeholder: "video/mp4",
            list: "editor-media-type-options",
            suggestions: availableMediaTypes,
            hint: "MP4 is the safest browser format. MKV works only when the browser supports the codec inside the file.",
          })}
          ${renderInputField({
            label: "Available from",
            target: "episode",
            field: "availableFrom",
            value: episode.availableFrom,
            type: "date",
            hint: "Before this date the player will show Coming Soon.",
          })}
          ${renderInputField({
            label: "Available until",
            target: "episode",
            field: "availableUntil",
            value: episode.availableUntil,
            type: "date",
            hint: "Optional end date for replay availability.",
          })}
        </div>
      </section>

      <section class="editor-form__section">
        <div class="editor-form__section-title">
          <h3>Episode actions</h3>
          <p>Drag the episode list on the left to change order inside this series.</p>
        </div>
        <div class="editor-form__actions">
          <button class="button button--secondary button--small" type="button" data-action="remove-episode">
            Remove Episode
          </button>
          <button class="button button--secondary button--small" type="button" data-action="select-item-parent">
            Back to Card Settings
          </button>
        </div>
      </section>

      ${renderEditorDataLists()}
    </form>
  `;
}

function renderInputField({
  label,
  target,
  field,
  value,
  placeholder = "",
  hint = "",
  list = "",
  type = "text",
  min = "",
  step = "",
  browse = null,
  suggestions = [],
  suggestionMode = "replace",
  index = null,
}) {
  return `
    <label class="editor-field">
      <span class="editor-field__label">${escapeHtml(label)}</span>
      <span class="editor-field__control">
        <input
          class="editor-input"
          type="${escapeHtml(type)}"
          data-target="${escapeHtml(target)}"
          data-field="${escapeHtml(field)}"
          ${index === null ? "" : `data-index="${escapeHtml(String(index))}"`}
          value="${escapeHtml(value)}"
          placeholder="${escapeHtml(placeholder)}"
          ${list ? `list="${escapeHtml(list)}"` : ""}
          ${min !== "" ? `min="${escapeHtml(min)}"` : ""}
          ${step !== "" ? `step="${escapeHtml(step)}"` : ""}
        />
        ${
          browse
            ? `<span class="editor-field__browse-actions">
                <button
                  class="button button--secondary button--small editor-field__browse"
                  type="button"
                  data-action="browse-media-file"
                  data-target="${escapeHtml(target)}"
                  data-field="${escapeHtml(field)}"
                  data-asset-kind="${escapeHtml(browse.kind)}"
                  ${index === null ? "" : `data-index="${escapeHtml(String(index))}"`}
                >File</button>
                ${
                  browse.allowFolder
                    ? `<button
                        class="button button--secondary button--small editor-field__browse"
                        type="button"
                        data-action="browse-media-folder"
                        data-target="${escapeHtml(target)}"
                        data-field="${escapeHtml(field)}"
                        data-asset-kind="${escapeHtml(browse.kind)}"
                        ${index === null ? "" : `data-index="${escapeHtml(String(index))}"`}
                      >Folder</button>`
                    : ""
                }
              </span>`
            : ""
        }
      </span>
      ${list ? "" : renderSuggestionButtons({ target, field, suggestions, mode: suggestionMode })}
      ${hint ? `<p class="editor-field__hint">${escapeHtml(hint)}</p>` : ""}
    </label>
  `;
}

function renderSuggestionButtons({ target, field, suggestions, mode = "replace" }) {
  const uniqueSuggestions = [...new Set((Array.isArray(suggestions) ? suggestions : []).map((value) => String(value || "").trim()).filter(Boolean))];

  if (uniqueSuggestions.length === 0) {
    return "";
  }

  return `
    <span class="editor-field__suggestions">
      <span class="editor-field__hint">${
        mode === "append-comma" ? "Quick add from the dropdown" : "Quick pick from the dropdown"
      }</span>
      <select
        class="editor-select editor-select--compact"
        data-suggestion-target="${escapeHtml(target)}"
        data-suggestion-field="${escapeHtml(field)}"
        data-suggestion-mode="${escapeHtml(mode)}"
      >
        <option value="">${
          mode === "append-comma" ? "Choose an option to add" : "Choose an option"
        }</option>
        ${uniqueSuggestions
          .map(
            (suggestion) => `
          <option value="${escapeHtml(suggestion)}">${escapeHtml(suggestion)}</option>
        `
          )
          .join("")}
      </select>
    </span>
  `;
}

function renderTextareaField({
  label,
  target,
  field,
  value,
  placeholder = "",
  hint = "",
  rows = 5,
  index = null,
}) {
  return `
    <label class="editor-field">
      <span class="editor-field__label">${escapeHtml(label)}</span>
      <textarea
        class="editor-textarea"
        rows="${rows}"
        data-target="${escapeHtml(target)}"
        data-field="${escapeHtml(field)}"
        ${index === null ? "" : `data-index="${escapeHtml(String(index))}"`}
        placeholder="${escapeHtml(placeholder)}"
      >${escapeHtml(value)}</textarea>
      ${hint ? `<p class="editor-field__hint">${escapeHtml(hint)}</p>` : ""}
    </label>
  `;
}

function renderSelectField({ label, target, field, value, options, hint = "", index = null }) {
  return `
    <label class="editor-field">
      <span class="editor-field__label">${escapeHtml(label)}</span>
      <select
        class="editor-select"
        data-target="${escapeHtml(target)}"
        data-field="${escapeHtml(field)}"
        ${index === null ? "" : `data-index="${escapeHtml(String(index))}"`}
      >
        ${options
          .map(
            (option) => `
          <option value="${escapeHtml(option.value)}"${option.value === value ? " selected" : ""}>
            ${escapeHtml(option.label)}
          </option>
        `
          )
          .join("")}
      </select>
      ${hint ? `<p class="editor-field__hint">${escapeHtml(hint)}</p>` : ""}
    </label>
  `;
}

function renderCheckboxField({ label, target, field, checked, hint = "" }) {
  return `
    <label class="editor-field">
      <span class="editor-field__label">${escapeHtml(label)}</span>
      <span class="editor-toggle">
        <input
          type="checkbox"
          data-target="${escapeHtml(target)}"
          data-field="${escapeHtml(field)}"
          ${checked ? "checked" : ""}
        />
        <span>${checked ? "Enabled" : "Disabled"}</span>
      </span>
      ${hint ? `<p class="editor-field__hint">${escapeHtml(hint)}</p>` : ""}
    </label>
  `;
}

function renderEditorDataLists() {
  return `
    <datalist id="editor-art-class-options">
      ${availableArtClasses
        .map((artClass) => `<option value="${escapeHtml(artClass)}"></option>`)
        .join("")}
    </datalist>
    <datalist id="editor-badge-class-options">
      ${availableBadgeClasses
        .map((badgeClass) => `<option value="${escapeHtml(badgeClass)}"></option>`)
        .join("")}
    </datalist>
    <datalist id="editor-media-type-options">
      ${availableMediaTypes
        .map((mediaType) => `<option value="${escapeHtml(mediaType)}"></option>`)
        .join("")}
    </datalist>
    <datalist id="editor-kicker-options">
      ${availableKickerSuggestions
        .map((kicker) => `<option value="${escapeHtml(kicker)}"></option>`)
        .join("")}
    </datalist>
    <datalist id="editor-filter-options">
      ${availableFilterSuggestions
        .map((filterName) => `<option value="${escapeHtml(filterName)}"></option>`)
        .join("")}
    </datalist>
  `;
}

function getFeaturedItemLabel() {
  const featuredItems = [];

  for (const section of state.content.sections) {
    for (const item of section.items) {
      if (item.featured) {
        featuredItems.push(`${item.title} in ${section.title}`);
      }
    }
  }

  if (featuredItems.length === 0) {
    return "None selected";
  }

  if (featuredItems.length <= 3) {
    return featuredItems.join(" | ");
  }

  return `${featuredItems.slice(0, 3).join(" | ")} | +${featuredItems.length - 3} more`;
}

function getFeaturedItemCount() {
  return state.content.sections.reduce(
    (total, section) => total + section.items.filter((item) => item.featured).length,
    0
  );
}

function getScheduleImportMetaLabel() {
  const liveSchedule = Array.isArray(state.content.liveSchedule) ? state.content.liveSchedule : [];

  if (!liveSchedule.length) {
    return "No live schedule rows in the current draft.";
  }

  const channelCount = new Set(
    liveSchedule.map((entry) => String(entry.channelId || "").trim().toLowerCase()).filter(Boolean)
  ).size;
  const sortedEntries = [...liveSchedule].sort((left, right) => new Date(left.start) - new Date(right.start));
  const firstEntry = sortedEntries[0];
  const lastEntry = sortedEntries[sortedEntries.length - 1];

  return `${liveSchedule.length} rows across ${channelCount || 1} channel${
    channelCount === 1 ? "" : "s"
  } from ${firstEntry?.start?.slice(0, 10) || "unknown"} to ${lastEntry?.end?.slice(0, 10) || "unknown"}.`;
}

function resetScheduleImportFeedback() {
  scheduleImportFeedback = { ...DEFAULT_SCHEDULE_IMPORT_FEEDBACK };
}

function getSelectionLabel() {
  const section = getSelectedSection();
  const item = getSelectedItem();
  const episode = getSelectedEpisode();

  if (state.selection.mode === "site") {
    return "Homepage settings";
  }

  if (state.selection.mode === "section" && section) {
    return `${section.title} section`;
  }

  if (state.selection.mode === "episode" && section && item && episode) {
    return `${section.title} / ${item.title} / ${episode.title}`;
  }

  if (section && item) {
    return `${section.title} / ${item.title}`;
  }

  return "No selection";
}

function handleSearchInput(event) {
  state.searchQuery = String(event.target.value || "");
  renderOutline();
}

function handleStatusClick(event) {
  const trigger = event.target.closest("[data-action]");

  if (!trigger) {
    return;
  }

  const action = trigger.getAttribute("data-action");

  if (action === "status-save-yes") {
    saveCurrentDraft("Changes saved to draft preview.", "success");
    return;
  }

  if (action === "status-save-no") {
    state.hideSavePrompt = true;
    setStatus("Changes are still not saved.", "warn");
  }
}

async function openMediaPickerForField(target, field, assetKind, index = null) {
  state.pendingMediaField = { target, field, assetKind, index };

  const accept = assetKind === "video" ? "video/*,.mp4,.mkv,.mov,.m3u8" : "image/*,.png,.jpg,.jpeg,.webp,.svg";

  if (typeof window.showOpenFilePicker === "function") {
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        excludeAcceptAllOption: false,
        types: [
          {
            description: assetKind === "video" ? "Video files" : "Image files",
            accept:
              assetKind === "video"
                ? { "video/*": [".mp4", ".mkv", ".mov", ".m3u8"] }
                : { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".svg"] },
          },
        ],
      });

      if (handle) {
        const file = await handle.getFile();
        await applyPickedMediaFile(file, state.pendingMediaField);
        return;
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        setStatus("File browser fell back to standard picker.", "warn");
      } else {
        state.pendingMediaField = null;
        return;
      }
    }
  }

  if (mediaBrowseInput) {
    mediaBrowseInput.value = "";
    mediaBrowseInput.accept = accept;
    mediaBrowseInput.click();
  }
}

async function openMediaFolderPickerForField(target, field, assetKind, index = null) {
  state.pendingMediaFolder = { target, field, assetKind, index };

  if (typeof window.showDirectoryPicker === "function") {
    try {
      const directoryHandle = await window.showDirectoryPicker();

      if (directoryHandle) {
        const collectedFiles = [];

        for await (const entry of directoryHandle.values()) {
          if (entry.kind !== "file") {
            continue;
          }

          const file = await entry.getFile();
          collectedFiles.push(file);
        }

        await applyPickedMediaFolder(collectedFiles, {
          ...state.pendingMediaFolder,
          pickedFolderName: directoryHandle.name,
        });
        return;
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        setStatus("Folder browser fell back to standard picker.", "warn");
      } else {
        state.pendingMediaFolder = null;
        return;
      }
    }
  }

  if (mediaFolderInput) {
    mediaFolderInput.value = "";
    mediaFolderInput.click();
  }
}

async function handleMediaBrowseInput(event) {
  const file = event.target.files?.[0];

  if (!file || !state.pendingMediaField) {
    return;
  }

  await applyPickedMediaFile(file, state.pendingMediaField);
  event.target.value = "";
}

async function handleMediaFolderInput(event) {
  const files = Array.from(event.target.files || []);

  if (!files.length || !state.pendingMediaFolder) {
    return;
  }

  await applyPickedMediaFolder(files, state.pendingMediaFolder);
  event.target.value = "";
}

function syncMediaTypeForTarget(target, mediaType) {
  if (!mediaType) {
    return;
  }

  if (target === "item") {
    const item = getSelectedItem();

    if (item) {
      item.mediaType = mediaType;
    }
  }

  if (target === "episode") {
    const episode = getSelectedEpisode();

    if (episode) {
      episode.mediaType = mediaType;
    }
  }

  if (target === "channel") {
    const channel = getLiveChannelByIndex(state.pendingMediaField?.index ?? state.pendingMediaFolder?.index ?? null);

    if (channel) {
      channel.streamType = mediaType;
    }
  }
}

async function applyPickedMediaFile(file, context) {
  if (!context) {
    return;
  }

  const nativeRelativePath = deriveWorkspaceRelativePath(file);
  const nextPath =
    nativeRelativePath ||
    buildSuggestedAssetPath(file.name, context.target, context.field, context.assetKind, context.index);
  const mediaSupportWarning = context.assetKind === "video" ? getMediaSupportWarning(nextPath) : "";

  if (context.target === "channel" && context.field === "playoutFiles") {
    const channel = getLiveChannelByIndex(context.index);

    if (!channel) {
      state.pendingMediaField = null;
      return;
    }

    channel.playoutFiles = [nextPath];
    channel.sourceMode = "playout";
    markDirty(
      mediaSupportWarning ||
        `Added 1 playout video to ${channel.title || "this live channel"}. Save the changes when ready.`,
      mediaSupportWarning ? "warn" : nativeRelativePath ? "success" : "warn"
    );
    renderAll();
    state.pendingMediaField = null;
    return;
  }

  applyFieldChange(context.target, context.field, nextPath);
  syncMediaTypeForTarget(context.target, inferMediaTypeFromPath(nextPath));

  let detectedSubtitleCount = 0;

  if (context.assetKind === "video") {
    const folderBasePath = nextPath.includes("/") ? nextPath.slice(0, nextPath.lastIndexOf("/")) : "";
    detectedSubtitleCount = await applyDetectedSubtitleTracks(context.target, [file], file, folderBasePath);
  }

  if (context.assetKind === "video" && context.target === "episode") {
    const episode = getSelectedEpisode();
    const item = getSelectedItem();

    if (episode) {
      episode.sourceFile = file.name;

      if (shouldReplaceImportedEpisodeTitle(episode.title, item?.title)) {
        episode.title = formatTitleFromFileName(file.name, state.selection.episodeIndex || 0);
      }
    }
  }

  markDirty(mediaSupportWarning || (
    nativeRelativePath
      ? `Linked ${context.assetKind} file from the project folder.${getSubtitleImportStatusText(
          detectedSubtitleCount
        )} Save the changes when ready.`
      : `Filled a suggested ${context.assetKind} path. Put the file into ${nextPath.replace(
          /\/[^/]+$/,
          ""
        )} if needed.${getSubtitleImportStatusText(detectedSubtitleCount)} Save the changes when ready.`
  ), mediaSupportWarning ? "warn" : nativeRelativePath ? "success" : "warn");
  renderAll();
  state.pendingMediaField = null;
}

async function applyPickedMediaFolder(files, context) {
  if (!context) {
    return;
  }

  const sortedFiles = sortFilesByName(files).filter((file) =>
    context.assetKind === "video" ? isSupportedVideoFile(file) : true
  );
  const containsMkv = sortedFiles.some(
    (file) => inferMediaTypeFromPath(file.name) === "video/x-matroska"
  );
  const mkvWarning =
    context.assetKind === "video" && containsMkv
      ? "MKV files were loaded. Playback depends on the codec inside each file. MP4 with H.264 video and AAC audio is the safest browser format."
      : "";

  if (!sortedFiles.length) {
    setStatus(
      context.assetKind === "video"
        ? "No supported video files were found in that folder."
        : "No files were found in that folder.",
      "warn"
    );
    state.pendingMediaFolder = null;
    return;
  }

  const folderBasePath = buildSuggestedFolderPath(sortedFiles, context, context.assetKind);

  if (context.target === "channel" && context.field === "playoutFiles") {
    const channel = getLiveChannelByIndex(context.index);

    if (!channel) {
      state.pendingMediaFolder = null;
      return;
    }

    channel.playoutFiles = sortedFiles.map((file) => `${folderBasePath}/${file.name}`);
    channel.sourceMode = "playout";
    markDirty(
      mkvWarning ||
        `Loaded ${sortedFiles.length} playout video file${
          sortedFiles.length === 1 ? "" : "s"
        } into ${channel.title || "this live channel"}. Save the changes when ready.`,
      mkvWarning ? "warn" : "success"
    );
    renderAll();
    state.pendingMediaFolder = null;
    return;
  }

  if (context.assetKind !== "video") {
    const firstFile = sortedFiles[0];
    const nextPath = `${folderBasePath}/${firstFile.name}`;
    applyFieldChange(context.target, context.field, nextPath);
    markDirty("Folder selected. The first image file was linked. Save the changes when ready.", "success");
    renderAll();
    state.pendingMediaFolder = null;
    return;
  }

  if (context.target === "episode") {
    const firstFile = sortedFiles[0];
    const nextPath = `${folderBasePath}/${firstFile.name}`;
    applyFieldChange("episode", context.field, nextPath);
    syncMediaTypeForTarget("episode", inferMediaTypeFromPath(nextPath));
    const detectedSubtitleCount = await applyDetectedSubtitleTracks(
      "episode",
      files,
      firstFile,
      folderBasePath
    );
    const episode = getSelectedEpisode();
    const item = getSelectedItem();

    if (episode) {
      episode.sourceFile = firstFile.name;

      if (shouldReplaceImportedEpisodeTitle(episode.title, item?.title)) {
        episode.title = formatTitleFromFileName(firstFile.name, state.selection.episodeIndex || 0);
      }
    }

    markDirty(mkvWarning || (
      sortedFiles.length > 1
        ? `Folder selected. The first video in that folder was linked to this episode.${getSubtitleImportStatusText(
            detectedSubtitleCount
          )} Save the changes when ready.`
        : `Video folder linked to this episode.${getSubtitleImportStatusText(
            detectedSubtitleCount
          )} Save the changes when ready.`
    ), mkvWarning ? "warn" : "success");
    renderAll();
    state.pendingMediaFolder = null;
    return;
  }

  const item = getSelectedItem();

  if (!item) {
    state.pendingMediaFolder = null;
    return;
  }

  if (sortedFiles.length === 1 && item.episodes.length === 0) {
    const nextPath = `${folderBasePath}/${sortedFiles[0].name}`;
    applyFieldChange("item", context.field, nextPath);
    syncMediaTypeForTarget("item", inferMediaTypeFromPath(nextPath));
    const detectedSubtitleCount = await applyDetectedSubtitleTracks(
      "item",
      files,
      sortedFiles[0],
      folderBasePath
    );
    markDirty(
      mkvWarning ||
        `Video folder selected. The media path was updated.${getSubtitleImportStatusText(
          detectedSubtitleCount
        )} Save the changes when ready.`,
      mkvWarning ? "warn" : "success"
    );
    renderAll();
    state.pendingMediaFolder = null;
    return;
  }

  if (item.episodes.length === 0) {
    item.episodes = [];
    item.mediaUrl = "";
  }

  while (item.episodes.length < sortedFiles.length) {
    item.episodes.push(createBlankEpisode());
  }

  let detectedSubtitleCount = 0;

  for (let index = 0; index < sortedFiles.length; index += 1) {
    const file = sortedFiles[index];
    const episode = item.episodes[index];
    const nextPath = `${folderBasePath}/${file.name}`;
    episode.mediaUrl = nextPath;
    episode.mediaType = inferMediaTypeFromPath(nextPath) || episode.mediaType || "video/mp4";
    episode.sourceFile = file.name;
    const subtitleFiles = findSubtitleFilesForVideo(files, file);

    if (subtitleFiles.length) {
      const nextTracks = await Promise.all(
        subtitleFiles.map((subtitleFile, subtitleIndex) =>
          createSubtitleTrackFromFile(subtitleFile, folderBasePath, subtitleIndex)
        )
      );
      episode.tracks = mergeDetectedTracks(episode.tracks, nextTracks);
      detectedSubtitleCount += nextTracks.length;
    } else {
      episode.tracks = removeAutoDetectedTracks(episode.tracks);
    }

    if (shouldReplaceImportedEpisodeTitle(episode.title, item.title)) {
      episode.title = formatTitleFromFileName(file.name, index);
    }

    if (!episode.kicker) {
      episode.kicker = item.collectionLabel || item.kicker || "Episode";
    }
  }

  state.selection = {
    mode: "episode",
    sectionIndex: state.selection.sectionIndex,
    itemIndex: state.selection.itemIndex,
    episodeIndex: 0,
  };
  markDirty(
    mkvWarning ||
      `Loaded ${sortedFiles.length} video file${sortedFiles.length === 1 ? "" : "s"} from the folder into this title.${getSubtitleImportStatusText(
        detectedSubtitleCount
      )} Save the changes when ready.`,
    mkvWarning ? "warn" : "success"
  );
  renderAll();
  state.pendingMediaFolder = null;
}

function handleOutlineClick(event) {
  const trigger = event.target.closest("[data-action]");

  if (!trigger) {
    return;
  }

  const action = trigger.getAttribute("data-action");

  if (action === "select-site") {
    state.selection = {
      mode: "site",
      sectionIndex: state.selection.sectionIndex,
      itemIndex: null,
      episodeIndex: null,
    };
    renderAll();
    return;
  }

  if (action === "select-section") {
    state.selection = {
      mode: "section",
      sectionIndex: Number(trigger.getAttribute("data-section-index")),
      itemIndex: null,
      episodeIndex: null,
    };
    renderAll();
    return;
  }

  if (action === "select-item") {
    state.selection = {
      mode: "item",
      sectionIndex: Number(trigger.getAttribute("data-section-index")),
      itemIndex: Number(trigger.getAttribute("data-item-index")),
      episodeIndex: null,
    };
    renderAll();
    return;
  }

  if (action === "select-episode") {
    state.selection = {
      mode: "episode",
      sectionIndex: Number(trigger.getAttribute("data-section-index")),
      itemIndex: Number(trigger.getAttribute("data-item-index")),
      episodeIndex: Number(trigger.getAttribute("data-episode-index")),
    };
    renderAll();
    return;
  }

  if (action === "add-section") {
    state.content.sections.push(createBlankSection());
    state.selection = {
      mode: "section",
      sectionIndex: state.content.sections.length - 1,
      itemIndex: null,
      episodeIndex: null,
    };
    markDirty("New section added. Save the changes when ready.", "muted");
    renderAll();
    return;
  }

  if (action === "add-item") {
    const section = getSelectedSection();

    if (!section) {
      return;
    }

    section.items.push(createBlankItem(section.id));
    state.selection = {
      mode: "item",
      sectionIndex: state.selection.sectionIndex,
      itemIndex: section.items.length - 1,
      episodeIndex: null,
    };
    markDirty("New card added. Save the changes when ready.", "muted");
    renderAll();
    return;
  }

  if (action === "add-ppv-item") {
    const section = getSelectedSection();

    if (!section) {
      return;
    }

    section.items.push(createBlankPpvItem(section.id));
    state.selection = {
      mode: "item",
      sectionIndex: state.selection.sectionIndex,
      itemIndex: section.items.length - 1,
      episodeIndex: null,
    };
    markDirty("New PPV card added. Save the changes when ready.", "muted");
    renderAll();
    return;
  }

  if (action === "add-episode") {
    addEpisodeToSelectedItem();
  }
}

async function handleFormClick(event) {
  const trigger = event.target.closest("[data-action]");

  if (!trigger) {
    return;
  }

  const action = trigger.getAttribute("data-action");

  if (action === "apply-suggestion") {
    event.preventDefault();
    applySuggestedFieldValue(
      String(trigger.getAttribute("data-target") || ""),
      String(trigger.getAttribute("data-field") || ""),
      String(trigger.getAttribute("data-value") || ""),
      String(trigger.getAttribute("data-mode") || "replace")
    );
    return;
  }

  if (action === "browse-media-file") {
    event.preventDefault();
    const indexAttr = trigger.getAttribute("data-index");
    const index = indexAttr === null || indexAttr === "" ? null : Number(indexAttr);
    await openMediaPickerForField(
      String(trigger.getAttribute("data-target") || ""),
      String(trigger.getAttribute("data-field") || ""),
      String(trigger.getAttribute("data-asset-kind") || "image"),
      index
    );
    return;
  }

  if (action === "browse-media-folder") {
    event.preventDefault();
    const indexAttr = trigger.getAttribute("data-index");
    const index = indexAttr === null || indexAttr === "" ? null : Number(indexAttr);
    await openMediaFolderPickerForField(
      String(trigger.getAttribute("data-target") || ""),
      String(trigger.getAttribute("data-field") || ""),
      String(trigger.getAttribute("data-asset-kind") || "video"),
      index
    );
    return;
  }

  if (action === "upload-live-schedule") {
    event.preventDefault();
    state.scheduleUploadChannelId = String(trigger.getAttribute("data-channel-id") || "")
      .trim()
      .toLowerCase();
    scheduleUploadInput?.click();
    return;
  }

  if (action === "restore-live-schedule") {
    event.preventDefault();
    state.scheduleUploadChannelId = "";

    if (
      !window.confirm("Restore the built-in live schedule in this draft and remove the uploaded one?")
    ) {
      return;
    }

    state.content.liveSchedule = ensureEditableContent(editorApi.getDefaultContent()).liveSchedule;
    scheduleImportFeedback = {
      tone: "muted",
      text: "Restored the built-in live schedule in the draft. Save the changes when ready.",
    };
    markDirty("Built-in live schedule restored. Save the changes when ready.", "success");
    renderAll();
    return;
  }

  if (action === "add-footer-social-link") {
    if (!Array.isArray(state.content.homepageSettings.footerSocialLinks)) {
      state.content.homepageSettings.footerSocialLinks = [];
    }

    state.content.homepageSettings.footerSocialLinks.push({
      icon: "website",
      label: "",
      url: "",
    });
    markDirty("Footer social icon added. Save the changes when ready.", "muted");
    renderAll();
    return;
  }

  if (action === "remove-footer-social-link") {
    const indexAttr = trigger.getAttribute("data-index");
    const index = indexAttr === null || indexAttr === "" ? -1 : Number(indexAttr);

    if (
      !Array.isArray(state.content.homepageSettings.footerSocialLinks) ||
      index < 0 ||
      index >= state.content.homepageSettings.footerSocialLinks.length
    ) {
      return;
    }

    state.content.homepageSettings.footerSocialLinks.splice(index, 1);
    markDirty("Footer social icon removed. Save the changes when ready.", "warn");
    renderAll();
    return;
  }

  if (action === "remove-section") {
    const section = getSelectedSection();

    if (!section || !window.confirm(`Remove the section "${section.title}" from the editor?`)) {
      return;
    }

    state.content.sections.splice(state.selection.sectionIndex, 1);
    state.selection = findInitialSelection(state.content);
    markDirty("Section removed. Save the changes when ready.", "warn");
    renderAll();
    return;
  }

  if (action === "remove-item") {
    const section = getSelectedSection();
    const item = getSelectedItem();

    if (!section || !item || !window.confirm(`Remove "${item.title}" from this section?`)) {
      return;
    }

    section.items.splice(state.selection.itemIndex, 1);
    state.selection = {
      mode: section.items.length ? "item" : "section",
      sectionIndex: state.selection.sectionIndex,
      itemIndex: section.items.length ? Math.max(0, state.selection.itemIndex - 1) : null,
      episodeIndex: null,
    };
    markDirty("Card removed. Save the changes when ready.", "warn");
    renderAll();
    return;
  }

  if (action === "remove-episode") {
    const item = getSelectedItem();
    const episode = getSelectedEpisode();

    if (!item || !episode || !window.confirm(`Remove "${episode.title}" from this series?`)) {
      return;
    }

    item.episodes.splice(state.selection.episodeIndex, 1);
    state.selection = {
      mode: item.episodes.length ? "episode" : "item",
      sectionIndex: state.selection.sectionIndex,
      itemIndex: state.selection.itemIndex,
      episodeIndex: item.episodes.length ? Math.max(0, state.selection.episodeIndex - 1) : null,
    };
    markDirty("Episode removed. Save the changes when ready.", "warn");
    renderAll();
    return;
  }

  if (action === "convert-to-series") {
    convertSelectedItemToSeries();
    return;
  }

  if (action === "build-episode-plan") {
    buildEpisodePlanForSelectedItem();
    return;
  }

  if (action === "convert-to-single") {
    convertSelectedItemToSingle();
    return;
  }

  if (action === "select-item-parent") {
    state.selection = {
      mode: "item",
      sectionIndex: state.selection.sectionIndex,
      itemIndex: state.selection.itemIndex,
      episodeIndex: null,
    };
    renderAll();
  }
}

function handleFormInput(event) {
  const suggestionTarget = event.target.getAttribute("data-suggestion-target");
  const suggestionField = event.target.getAttribute("data-suggestion-field");

  if (suggestionTarget && suggestionField) {
    const suggestionValue = String(event.target.value || "");

    if (!suggestionValue) {
      return;
    }

    applySuggestedFieldValue(
      suggestionTarget,
      suggestionField,
      suggestionValue,
      String(event.target.getAttribute("data-suggestion-mode") || "replace")
    );

    if (typeof event.target.value === "string") {
      event.target.value = "";
    }

    return;
  }

  const field = event.target.getAttribute("data-field");
  const target = event.target.getAttribute("data-target");
  const indexAttr = event.target.getAttribute("data-index");
  const index = indexAttr === null || indexAttr === "" ? null : Number(indexAttr);

  if (!field || !target) {
    return;
  }

  if (field === "sectionTitle" && event.type !== "change") {
    return;
  }

  const rawValue =
    event.target.type === "checkbox" ? Boolean(event.target.checked) : event.target.value;
  const value =
    event.type === "change" && shouldNormalizeAssetField(target, field) && typeof rawValue === "string"
      ? editorApi.normalizeAssetPath(rawValue)
      : rawValue;

  if (value !== rawValue && typeof event.target.value === "string") {
    event.target.value = value;
  }

  applyFieldChange(target, field, value, index);
  markDirty("Changes ready to save.", "muted");

  const requiresFullRender =
    event.type === "change" ||
    event.target.tagName === "SELECT" ||
    event.target.type === "checkbox" ||
    field === "sectionId";

  if (requiresFullRender) {
    renderAll();
    return;
  }

  renderOutline();
}

function shouldNormalizeAssetField(target, field) {
  return (target === "item" || target === "episode" || target === "channel") && normalizedAssetFields.has(field);
}

function applySuggestedFieldValue(target, field, suggestion, mode = "replace") {
  const currentValue = String(getCurrentFieldValue(target, field) || "");
  let nextValue = suggestion;

  if (mode === "append-comma") {
    const existingValues = parseFilters(currentValue);

    if (!existingValues.includes(suggestion)) {
      existingValues.push(suggestion);
    }

    nextValue = existingValues.join(", ");
  }

  applyFieldChange(target, field, nextValue);
  markDirty("Suggestion applied. Save the changes when ready.", "muted");
  renderAll();
}

function applyFieldChange(target, field, value, index = null) {
  if (target === "siteSocial") {
    const socialLinks = Array.isArray(state.content.homepageSettings.footerSocialLinks)
      ? state.content.homepageSettings.footerSocialLinks
      : [];

    if (!Number.isInteger(index) || !socialLinks[index]) {
      return;
    }

    socialLinks[index][field] =
      field === "icon" ? String(value || "").trim().toLowerCase() : String(value || "");
    return;
  }

  if (target === "site") {
    state.content.homepageSettings[field] =
      field === "heroContentAlign" ? String(value || "left") : String(value || "");
    return;
  }

  if (target === "section") {
    const section = getSelectedSection();

    if (!section) {
      return;
    }

    section[field] = String(value || "");
    return;
  }

  if (target === "item") {
    const item = getSelectedItem();

    if (!item) {
      return;
    }

    if (field === "filtersText") {
      item.filters = parseFilters(value);
      return;
    }

    if (field === "ppvMethodsText") {
      item.ppvMethods = parseFilters(value);
      return;
    }

    if (field === "featured") {
      item.featured = Boolean(value);
      return;
    }

    if (field === "sectionId") {
      moveSelectedItemToSection(String(value || ""));
      return;
    }

    if (field === "sectionTitle") {
      moveSelectedItemToSectionByTitle(String(value || ""));
      return;
    }

    item[field] = typeof value === "boolean" ? value : String(value || "");

    if (field === "mediaUrl" && !String(value || "").trim()) {
      item.tracks = removeAutoDetectedTracks(item.tracks);
    }

    return;
  }

  if (target === "channel") {
    const channel =
      index === null || !Number.isInteger(index)
        ? null
        : (Array.isArray(state.content.liveChannels) ? state.content.liveChannels[index] : null);

    if (!channel) {
      return;
    }

    if (field === "playoutFilesText") {
      channel.playoutFiles = parseLineSeparatedValues(value).map((entry) => editorApi.normalizeAssetPath(entry));

      if (channel.playoutFiles.length && channel.sourceMode !== "playout") {
        channel.sourceMode = "playout";
      }

      return;
    }

    channel[field] = typeof value === "boolean" ? value : String(value || "");
    return;
  }

  if (target === "episode") {
    const episode = getSelectedEpisode();

    if (!episode) {
      return;
    }

    episode[field] = String(value || "");

    if (field === "mediaUrl" && !String(value || "").trim()) {
      episode.tracks = removeAutoDetectedTracks(episode.tracks);
    }
  }
}

function moveSelectedItemToSection(sectionId) {
  const currentSection = getSelectedSection();
  const item = getSelectedItem();

  if (!currentSection || !item || currentSection.id === sectionId) {
    return;
  }

  const nextSectionIndex = state.content.sections.findIndex((section) => section.id === sectionId);

  if (nextSectionIndex === -1) {
    return;
  }

  const [movedItem] = currentSection.items.splice(state.selection.itemIndex, 1);
  const nextSection = state.content.sections[nextSectionIndex];
  nextSection.items.push(movedItem);
  state.selection = {
    mode: "item",
    sectionIndex: nextSectionIndex,
    itemIndex: nextSection.items.length - 1,
    episodeIndex: null,
  };
}

function moveSelectedItemToSectionByTitle(sectionTitle) {
  const nextTitle = String(sectionTitle || "").trim();

  if (!nextTitle) {
    return;
  }

  const currentSection = getSelectedSection();

  if (currentSection && currentSection.title.trim().toLowerCase() === nextTitle.toLowerCase()) {
    return;
  }

  const existingSection = state.content.sections.find(
    (section) => String(section.title || "").trim().toLowerCase() === nextTitle.toLowerCase()
  );

  if (existingSection) {
    moveSelectedItemToSection(existingSection.id);
    return;
  }

  const newSection = createBlankSection();
  newSection.title = nextTitle;
  newSection.eyebrow = nextTitle;
  state.content.sections.push(newSection);
  moveSelectedItemToSection(newSection.id);
}

function createBlankSection() {
  const nextNumber = state.content.sections.length + 1;

  return {
    id: createEditorId("section"),
    eyebrow: "New section",
    title: `New Section ${nextNumber}`,
    columns: "",
    items: [],
  };
}

function createBlankItem(sectionId) {
  return {
    id: createEditorId("item"),
    title: "New Card",
    kicker: "Category",
    artClass: availableArtClasses[0] || "art-live-main",
    badgeLabel: "NEW",
    badgeClass: "new",
    description: "Describe what should appear on this card.",
    meta: "Add a short meta line",
    filters: [],
    featured: false,
    collectionLabel: "",
    sortLabel: "Ascending",
    availableFrom: "",
    availableUntil: "",
    episodePlannerCount: "",
    episodeReleaseStart: "",
    episodeReleaseIntervalDays: "7",
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
    mediaUrl: "",
    mediaType: "video/mp4",
    qualities: [],
    tracks: [],
    episodes: [],
    sectionId,
  };
}

function createBlankPpvItem(sectionId) {
  return {
    ...createBlankItem(sectionId),
    title: "New PPV Event",
    kicker: "Pay Per View",
    badgeLabel: "PPV",
    badgeClass: "hot",
    description: "Add your event details, payment methods, and the live stream or offline fallback for this PPV event.",
    meta: "PPV Event",
    ppvEnabled: true,
    ppvEventType: "live_event",
    ppvButtonLabel: "Buy PPV Access",
    ppvCurrency: "FJD",
    ppvMethods: ["M-PAiSA", "MyCash", "Card"],
  };
}

function createBlankEpisode() {
  return {
    id: createEditorId("episode"),
    title: "New Episode",
    kicker: "Episode",
    description: "Add episode details here.",
    meta: "",
    duration: "",
    sourceFile: "",
    airedText: "",
    statusLabel: "",
    availableFrom: "",
    availableUntil: "",
    imageUrl: "",
    mediaUrl: "",
    mediaType: "video/mp4",
    qualities: [],
    tracks: [],
  };
}

function addEpisodeToSelectedItem() {
  const item = getSelectedItem();

  if (!item) {
    return;
  }

  item.episodes.push(createBlankEpisode());
  state.selection = {
    mode: "episode",
    sectionIndex: state.selection.sectionIndex,
    itemIndex: state.selection.itemIndex,
    episodeIndex: item.episodes.length - 1,
  };
  markDirty("Episode added. Save the changes when ready.", "muted");
  renderAll();
}

function convertSelectedItemToSeries() {
  const item = getSelectedItem();

  if (!item || item.episodes.length) {
    return;
  }

  const firstEpisode = createBlankEpisode();
  firstEpisode.title = item.title || firstEpisode.title;
  firstEpisode.kicker = item.kicker || firstEpisode.kicker;
  firstEpisode.description = item.description || firstEpisode.description;
  firstEpisode.meta = item.meta || "";
  firstEpisode.imageUrl = item.imageUrl || "";
  firstEpisode.mediaUrl = item.mediaUrl || "";
  firstEpisode.mediaType = item.mediaType || "video/mp4";
  firstEpisode.qualities = normalizeEditorSourceList(item.qualities);
  firstEpisode.tracks = normalizeEditorSourceList(item.tracks);
  item.mediaUrl = "";
  item.qualities = [];
  item.tracks = [];
  item.episodes = [firstEpisode];
  state.selection = {
    mode: "episode",
    sectionIndex: state.selection.sectionIndex,
    itemIndex: state.selection.itemIndex,
    episodeIndex: 0,
  };
  markDirty("Card converted to a series. Save the changes when ready.", "muted");
  renderAll();
}

function buildEpisodePlanForSelectedItem() {
  const item = getSelectedItem();

  if (!item) {
    return;
  }

  const requestedCount = Number(item.episodePlannerCount || "0");
  const safeCount = Math.max(item.episodes.length || 0, requestedCount);
  const cadenceDays = Math.max(1, Number(item.episodeReleaseIntervalDays || "7"));

  if (!safeCount) {
    setStatus("Set an episode count before building the schedule.", "warn");
    return;
  }

  if (!item.episodes.length) {
    item.episodes = [];
    item.mediaUrl = "";
  }

  while (item.episodes.length < safeCount) {
    const nextEpisode = createBlankEpisode();
    nextEpisode.title = `Episode ${item.episodes.length + 1}`;
    item.episodes.push(nextEpisode);
  }

  item.episodes.forEach((episode, index) => {
    if (!episode.title || /^New Episode$/i.test(episode.title)) {
      episode.title = `Episode ${index + 1}`;
    }

    if (!episode.kicker) {
      episode.kicker = item.collectionLabel || item.kicker || "Episode";
    }

    if (item.episodeReleaseStart) {
      episode.availableFrom = addDaysToDateString(item.episodeReleaseStart, cadenceDays * index);
    }
  });

  state.selection = {
    mode: "item",
    sectionIndex: state.selection.sectionIndex,
    itemIndex: state.selection.itemIndex,
    episodeIndex: null,
  };
  markDirty("Episodes created and scheduled. Save the changes when ready.", "success");
  renderAll();
}

function convertSelectedItemToSingle() {
  const item = getSelectedItem();

  if (!item || !item.episodes.length) {
    return;
  }

  const firstEpisode = item.episodes[0];

  if (!item.mediaUrl && firstEpisode?.mediaUrl) {
    item.mediaUrl = firstEpisode.mediaUrl;
    item.mediaType = firstEpisode.mediaType || item.mediaType || "video/mp4";
  }

  if ((!item.qualities || !item.qualities.length) && firstEpisode?.qualities?.length) {
    item.qualities = normalizeEditorSourceList(firstEpisode.qualities);
  }

  if ((!item.tracks || !item.tracks.length) && firstEpisode?.tracks?.length) {
    item.tracks = normalizeEditorSourceList(firstEpisode.tracks);
  }

  item.episodes = [];
  state.selection = {
    mode: "item",
    sectionIndex: state.selection.sectionIndex,
    itemIndex: state.selection.itemIndex,
    episodeIndex: null,
  };
  markDirty("Series converted to a single title. Save the changes when ready.", "muted");
  renderAll();
}

function addDaysToDateString(dateString, daysToAdd) {
  const [year, month, day] = String(dateString || "")
    .split("-")
    .map((entry) => Number(entry));

  if (!year || !month || !day) {
    return "";
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + daysToAdd);

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

function handlePublish() {
  if (hasUnsavedChanges()) {
    state.hideSavePrompt = false;
    setStatus("Save the draft first before publishing it live.", "warn");
    return;
  }

  if (!window.confirm("Publish the saved draft to the live homepage and player pages?")) {
    setStatus("Publish canceled. The live site was not updated.", "muted");
    return;
  }

  state.content = ensureEditableContent(editorApi.publishContent(state.content));
  state.lastSavedDraftFingerprint = getContentFingerprint(state.content);
  state.hideSavePrompt = false;
  setStatus("Draft published to the live site.", "success");
  schedulePreviewRefresh();
}

function handleDownloadBackup() {
  const snapshot = ensureEditableContent(state.content);
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mai-plus-content-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  setStatus("JSON backup downloaded.", "success");
}

function handleImportBackup(event) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  if (
    hasUnsavedChanges() &&
    !window.confirm("Discard the current unsaved changes and load this JSON backup?")
  ) {
    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      state.content = ensureEditableContent(parsed);
      state.selection = findInitialSelection(state.content);
      resetScheduleImportFeedback();
      markDirty("JSON backup loaded into the editor. Save the changes when ready.", "success");
      renderAll();
    } catch (error) {
      setStatus("That JSON backup could not be read.", "warn");
    } finally {
      event.target.value = "";
    }
  });

  reader.readAsText(file);
}

async function handleScheduleUploadInput(event) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  const activeScheduleChannelId = getActiveScheduleImportChannelId();
  const activeScheduleChannelLabel = activeScheduleChannelId
    ? getLiveChannelLabel(activeScheduleChannelId)
    : "";

  try {
    const parsedSchedule = await parseScheduleFile(file, {
      defaultChannelId: activeScheduleChannelId,
    });

    state.content.liveSchedule = parsedSchedule.entries;
    scheduleImportFeedback = {
      tone: "success",
      text: `Loaded ${parsedSchedule.entries.length} schedule row${
        parsedSchedule.entries.length === 1 ? "" : "s"
      } from ${file.name}${
        parsedSchedule.sheetName ? ` (${parsedSchedule.sheetName})` : ""
      }${
        activeScheduleChannelId
          ? ` using ${activeScheduleChannelLabel || activeScheduleChannelId} for rows without channelId`
          : ""
      }. Save Draft, then Publish Live when you're ready.`,
    };
    markDirty("Live schedule imported into the draft. Save the changes when ready.", "success");
    renderAll();
  } catch (error) {
    scheduleImportFeedback = {
      tone: "error",
      text: error instanceof Error ? error.message : "That schedule file could not be read.",
    };
    setStatus(scheduleImportFeedback.text, "warn");
    renderAll();
  } finally {
    state.scheduleUploadChannelId = "";
    event.target.value = "";
  }
}

function handleDragStart(event) {
  const row = event.target.closest("[data-drag-kind]");

  if (!row) {
    return;
  }

  state.drag = {
    kind: row.getAttribute("data-drag-kind"),
    sectionIndex: Number(row.getAttribute("data-section-index")),
    itemIndex: row.hasAttribute("data-item-index")
      ? Number(row.getAttribute("data-item-index"))
      : null,
    episodeIndex: row.hasAttribute("data-episode-index")
      ? Number(row.getAttribute("data-episode-index"))
      : null,
  };

  row.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", JSON.stringify(state.drag));
}

function handleDragOver(event) {
  const row = event.target.closest("[data-drag-kind]");

  if (!row || !state.drag) {
    return;
  }

  const targetKind = row.getAttribute("data-drag-kind");

  if (targetKind !== state.drag.kind) {
    return;
  }

  if (
    targetKind === "item" &&
    Number(row.getAttribute("data-section-index")) !== state.drag.sectionIndex
  ) {
    return;
  }

  if (
    targetKind === "episode" &&
    (Number(row.getAttribute("data-section-index")) !== state.drag.sectionIndex ||
      Number(row.getAttribute("data-item-index")) !== state.drag.itemIndex)
  ) {
    return;
  }

  event.preventDefault();
  row.classList.add("is-drop-target");
}

function handleDragLeave(event) {
  const row = event.target.closest("[data-drag-kind]");

  if (!row) {
    return;
  }

  row.classList.remove("is-drop-target");
}

function handleDrop(event) {
  const row = event.target.closest("[data-drag-kind]");

  if (!row || !state.drag) {
    return;
  }

  const targetKind = row.getAttribute("data-drag-kind");

  if (targetKind !== state.drag.kind) {
    return;
  }

  event.preventDefault();

  if (targetKind === "section") {
    moveArrayEntry(
      state.content.sections,
      state.drag.sectionIndex,
      Number(row.getAttribute("data-section-index"))
    );
    state.selection.sectionIndex = Number(row.getAttribute("data-section-index"));
  }

  if (targetKind === "item") {
    const section = state.content.sections[state.drag.sectionIndex];
    moveArrayEntry(section.items, state.drag.itemIndex, Number(row.getAttribute("data-item-index")));
    state.selection = {
      mode: "item",
      sectionIndex: state.drag.sectionIndex,
      itemIndex: Number(row.getAttribute("data-item-index")),
      episodeIndex: null,
    };
  }

  if (targetKind === "episode") {
    const item =
      state.content.sections[state.drag.sectionIndex].items[state.drag.itemIndex];
    moveArrayEntry(
      item.episodes,
      state.drag.episodeIndex,
      Number(row.getAttribute("data-episode-index"))
    );
    state.selection = {
      mode: "episode",
      sectionIndex: state.drag.sectionIndex,
      itemIndex: state.drag.itemIndex,
      episodeIndex: Number(row.getAttribute("data-episode-index")),
    };
  }

  clearDropTargets();
  markDirty("Order updated. Save the changes when ready.", "muted");
  renderAll();
}

function clearDropTargets() {
  outlineRoot.querySelectorAll(".is-drop-target, .is-dragging").forEach((element) => {
    element.classList.remove("is-drop-target", "is-dragging");
  });
  state.drag = null;
}

function moveArrayEntry(list, fromIndex, toIndex) {
  if (
    !Array.isArray(list) ||
    fromIndex == null ||
    toIndex == null ||
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length
  ) {
    return;
  }

  const [movedEntry] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, movedEntry);
}
