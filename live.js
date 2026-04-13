const catalogue = window.maiCatalogue;
const playerUi = window.maiPlayer;
const workbookParser = window.maiWorkbookParser;
const liveRoot = document.getElementById("live-root");
const SCHEDULE_STORAGE_KEY = "mai-tv-uploaded-epg";
const SCHEDULE_STORAGE_VERSION = 2;
const DEFAULT_IMPORT_MESSAGE = {
  tone: "muted",
  text: "Using the built-in schedule from data.js. Upload a CSV or Excel workbook to replace it in this browser.",
};
const LIVE_SCHEDULE_REFRESH_MS = 30000;
const GUIDE_SLOT_MINUTES = 30;
const GUIDE_LOOKBACK_MINUTES = 90;
const GUIDE_LOOKAHEAD_MINUTES = 270;
const GUIDE_MIN_WINDOW_MINUTES = 360;
const XLSX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

let uploadedScheduleState = loadUploadedScheduleState();
let liveScheduleRefreshTimer = 0;
let liveContentRefreshTimer = 0;
let selectedGuideDateKey = "";
let guideSelectionMode = "auto";
let schedulePanelOpen = false;
let importMessage = { ...DEFAULT_IMPORT_MESSAGE };
let livePlayoutState = {
  channelId: "",
  sourceIndex: 0,
};

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

function withPreviewParam(url) {
  if (!catalogue.isPreviewMode) {
    return url;
  }

  const [path, hashFragment = ""] = String(url).split("#");
  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}editorPreview=1${hashFragment ? `#${hashFragment}` : ""}`;
}

function getDateKey(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatTime(dateString, timeZone) {
  return new Intl.DateTimeFormat("en-FJ", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatDateLabel(dateString, timeZone) {
  return new Intl.DateTimeFormat("en-FJ", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatImportTimestamp(dateString) {
  return new Intl.DateTimeFormat("en-FJ", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatNowLabel(timeZone) {
  return new Intl.DateTimeFormat("en-FJ", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

function getDateTimeParts(dateString, timeZone) {
  const partMap = {};
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(dateString));

  parts.forEach((part) => {
    if (part.type !== "literal") {
      partMap[part.type] = part.value;
    }
  });

  return {
    year: partMap.year || "0000",
    month: partMap.month || "01",
    day: partMap.day || "01",
    hour: Number(partMap.hour || "0"),
    minute: Number(partMap.minute || "0"),
  };
}

function formatGuideDayLabel(dateKey, timeZone) {
  return new Intl.DateTimeFormat("en-FJ", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${dateKey}T12:00:00+12:00`));
}

function buildGuideTimeValue(dateKey, hour) {
  return `${dateKey}T${String(hour).padStart(2, "0")}:00:00+12:00`;
}

function buildGuideDateTimeValue(dateKey, totalMinutes) {
  const safeMinutes = Math.min(1439, Math.max(0, totalMinutes));
  const hour = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;

  return `${dateKey}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+12:00`;
}

function getResolvedLiveSourceMode(channel) {
  const configuredMode = String(channel?.sourceMode || "")
    .trim()
    .toLowerCase();

  if (configuredMode === "stream" || configuredMode === "embed" || configuredMode === "playout") {
    return configuredMode;
  }

  if (String(channel?.embedUrl || "").trim()) {
    return "embed";
  }

  if (getPlayoutSources(channel).length) {
    return "playout";
  }

  return "stream";
}

function getFileBaseName(pathValue) {
  const normalized = String(pathValue || "")
    .trim()
    .replaceAll("\\", "/")
    .split(/[?#]/, 1)[0];

  if (!normalized) {
    return "";
  }

  const segments = normalized.split("/").filter(Boolean);
  return segments.length ? segments[segments.length - 1] : normalized;
}

function inferLiveSourceType(pathValue) {
  const lowerPath = getFileBaseName(pathValue).toLowerCase();

  if (lowerPath.endsWith(".m3u8")) {
    return "application/x-mpegURL";
  }

  if (lowerPath.endsWith(".mp4")) {
    return "video/mp4";
  }

  if (lowerPath.endsWith(".webm")) {
    return "video/webm";
  }

  if (lowerPath.endsWith(".mov")) {
    return "video/quicktime";
  }

  if (lowerPath.endsWith(".mkv")) {
    return "video/x-matroska";
  }

  return "";
}

function formatPlayoutLabel(pathValue, index) {
  const baseName = getFileBaseName(pathValue).replace(/\.[^.]+$/, "");
  const cleaned = baseName.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();

  return cleaned || `Playout ${index + 1}`;
}

function getPlayoutSources(channel) {
  return (Array.isArray(channel?.playoutFiles) ? channel.playoutFiles : [])
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .map((src, index) => ({
      label: formatPlayoutLabel(src, index),
      src,
      type: inferLiveSourceType(src),
    }));
}

function getCurrentPlayoutContext(channel, options = {}) {
  const sources = getPlayoutSources(channel);
  const channelId = String(channel?.id || "");
  const shouldPreserveIndex = options.preservePlayoutIndex === true;

  if (livePlayoutState.channelId !== channelId) {
    livePlayoutState.channelId = channelId;
    livePlayoutState.sourceIndex = 0;
  } else if (!shouldPreserveIndex) {
    livePlayoutState.sourceIndex = 0;
  }

  if (!sources.length) {
    return {
      currentSource: null,
      currentIndex: 0,
      sources: [],
    };
  }

  livePlayoutState.sourceIndex =
    ((livePlayoutState.sourceIndex % sources.length) + sources.length) % sources.length;

  return {
    currentSource: sources[livePlayoutState.sourceIndex] || null,
    currentIndex: livePlayoutState.sourceIndex,
    sources,
  };
}

function advanceLivePlayout(channel) {
  const sources = getPlayoutSources(channel);

  if (!sources.length) {
    return;
  }

  if (livePlayoutState.channelId !== String(channel?.id || "")) {
    livePlayoutState.channelId = String(channel?.id || "");
    livePlayoutState.sourceIndex = 0;
  } else {
    livePlayoutState.sourceIndex = (livePlayoutState.sourceIndex + 1) % sources.length;
  }

  initLivePlayer(channel, {
    autoplay: true,
    preservePlayoutIndex: true,
  });
}

function buildSources(channel) {
  if (Array.isArray(channel?.qualities) && channel.qualities.length > 0) {
    return channel.qualities.map((source) => ({
      label: source.label,
      src: source.src,
      type: source.type,
      width: source.width,
      height: source.height,
    }));
  }

  return [];
}

function hasUploadedSchedule() {
  return uploadedScheduleState.entries.length > 0;
}

if (hasUploadedSchedule()) {
  importMessage = {
    tone: "success",
    text: uploadedScheduleState.sourceName
      ? `Using the saved schedule from ${uploadedScheduleState.sourceName} in this browser.`
      : "Using the saved imported schedule in this browser.",
  };
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

function loadUploadedScheduleState() {
  try {
    const rawValue = window.localStorage.getItem(SCHEDULE_STORAGE_KEY);

    if (!rawValue) {
      return {
        entries: [],
        sourceName: "",
        importedAt: "",
      };
    }

    const parsedValue = JSON.parse(rawValue);
    const sourceName = String(parsedValue?.sourceName || "").trim();
    const storageVersion = Number(parsedValue?.version || 1);
    let migratedLegacyWorkbook = false;
    let entries = Array.isArray(parsedValue?.entries)
      ? parsedValue.entries.map(normalizeScheduleEntry).filter(Boolean)
      : [];

    if (storageVersion < SCHEDULE_STORAGE_VERSION && /\.xlsx$/i.test(sourceName)) {
      migratedLegacyWorkbook = true;
      entries = entries
        .map((entry) => {
          const startDate = new Date(entry.start);
          const endDate = new Date(entry.end);

          if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            return entry;
          }

          startDate.setUTCDate(startDate.getUTCDate() + 1);
          endDate.setUTCDate(endDate.getUTCDate() + 1);

          return {
            ...entry,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          };
        })
        .map(normalizeScheduleEntry)
        .filter(Boolean);
    }

    const importedAt = String(parsedValue?.importedAt || "").trim();

    if (migratedLegacyWorkbook) {
      window.localStorage.setItem(
        SCHEDULE_STORAGE_KEY,
        JSON.stringify({
          entries,
          sourceName,
          importedAt,
          version: SCHEDULE_STORAGE_VERSION,
        })
      );
    }

    return {
      entries: entries.sort((left, right) => new Date(left.start) - new Date(right.start)),
      sourceName,
      importedAt,
    };
  } catch {
    return {
      entries: [],
      sourceName: "",
      importedAt: "",
    };
  }
}

function persistUploadedScheduleState(nextState) {
  uploadedScheduleState = {
    entries: [...nextState.entries].sort((left, right) => new Date(left.start) - new Date(right.start)),
    sourceName: nextState.sourceName || "",
    importedAt: nextState.importedAt || new Date().toISOString(),
    version: SCHEDULE_STORAGE_VERSION,
  };

  window.localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(uploadedScheduleState));
}

function clearUploadedScheduleState() {
  uploadedScheduleState = {
    entries: [],
    sourceName: "",
    importedAt: "",
  };
  window.localStorage.removeItem(SCHEDULE_STORAGE_KEY);
}

function getScheduleSourceEntries() {
  return catalogue.liveSchedule;
}

function getScheduleEntriesForChannel(channelId) {
  const sourceEntries = getScheduleSourceEntries();

  return sourceEntries
    .filter((entry) => entry.channelId === channelId)
    .sort((left, right) => new Date(left.start) - new Date(right.start));
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

function buildScheduleEntriesFromWalesiGrid(rowValueRows, options = {}) {
  const defaultChannelId = String(options.defaultChannelId || "").trim().toLowerCase();

  if (!defaultChannelId) {
    throw new Error(
      "Upload this Walesi workbook from the live channel page you want to update so the imported rows know which channel to use."
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
      "Your file needs a programme column plus start and end. ChannelId is optional if you're uploading on the current live channel page."
    );
  }

  if (channelIndex === -1 && !defaultChannelId) {
    throw new Error(
      "Add a channelId column, or upload the schedule while you're already on the channel page you want to update."
    );
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
  const normalizedName = file.name.toLowerCase();

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

function renderNotFound() {
  document.title = "MAI+ | Live unavailable";
  liveRoot.innerHTML = `
    <section class="watch-empty-page">
      <p class="section-heading__eyebrow">Channel not found</p>
      <h1>We couldn't find that live channel.</h1>
      <p>
        Go back to the homepage and choose a live channel again.
      </p>
      <a class="button button--primary" href="${withPreviewParam("./index.html")}">Back to homepage</a>
    </section>
  `;
}

function getScheduleContext(channel) {
  const allEntries = getScheduleEntriesForChannel(channel.id);

  if (allEntries.length === 0) {
    return {
      allEntries,
      dayEntries: [],
      activeDateKey: "",
      currentEntry: null,
      nextEntry: null,
      activeDateLabel: "No schedule added",
    };
  }

  const now = new Date();
  const availableDateKeys = [
    ...new Set(allEntries.map((entry) => getDateKey(new Date(entry.start), channel.timezone))),
  ];
  const activeDateKey = resolveActiveGuideDateKey(availableDateKeys, channel.timezone);
  const dayEntries = allEntries.filter(
    (entry) => getDateKey(new Date(entry.start), channel.timezone) === activeDateKey
  );
  const currentEntry =
    dayEntries.find((entry) => {
      const start = new Date(entry.start);
      const end = new Date(entry.end);
      return now >= start && now < end;
    }) || null;
  const nextEntry =
    dayEntries.find((entry) => new Date(entry.start) > now) ||
    allEntries.find((entry) => new Date(entry.start) > now) ||
    null;

  return {
    allEntries,
    dayEntries,
    activeDateKey,
    currentEntry,
    nextEntry,
    activeDateLabel: formatDateLabel(dayEntries[0].start, channel.timezone),
  };
}

function renderPlayer(channel) {
  const sourceMode = getResolvedLiveSourceMode(channel);

  if (sourceMode === "embed" && String(channel.embedUrl || "").trim()) {
    return `
      <div class="player-stage live-player-stage">
        <iframe
          class="live-player-frame"
          src="${escapeHtml(channel.embedUrl)}"
          title="${escapeHtml(channel.title)} live player"
          allow="autoplay; fullscreen"
          allowfullscreen
        ></iframe>
      </div>
    `;
  }

  return `
    <div class="player-stage live-player-stage" id="live-player-mount"></div>
  `;
}

function renderNowCard(channel, currentEntry) {
  return `
    <p class="section-heading__eyebrow">Now Playing</p>
    <h2>${escapeHtml(currentEntry ? currentEntry.title : "Off air / awaiting next block")}</h2>
    <p>${escapeHtml(
      currentEntry
        ? `${formatTime(currentEntry.start, channel.timezone)} - ${formatTime(
            currentEntry.end,
            channel.timezone
          )}`
        : "No schedule item is live at this moment."
    )}</p>
  `;
}

function renderNextCard(channel, nextEntry) {
  return `
    <p class="section-heading__eyebrow">Next Up</p>
    <h2>${escapeHtml(nextEntry ? nextEntry.title : "No more entries scheduled")}</h2>
    <p>${escapeHtml(
      nextEntry
        ? `${formatDateLabel(nextEntry.start, channel.timezone)} at ${formatTime(
            nextEntry.start,
            channel.timezone
          )}`
        : hasUploadedSchedule()
          ? "Add more rows to your file or reset to the built-in schedule."
        : "Add more schedule entries in data.js."
    )}</p>
  `;
}

function resolveActiveGuideDateKey(availableDateKeys, timeZone) {
  if (availableDateKeys.length === 0) {
    return "";
  }

  const todayKey = getDateKey(new Date(), timeZone);

  if (availableDateKeys.includes(todayKey)) {
    return todayKey;
  }

  const pastKeys = availableDateKeys.filter((dateKey) => dateKey < todayKey);

  if (pastKeys.length > 0) {
    return pastKeys[pastKeys.length - 1];
  }

  return availableDateKeys[0];
}

function getGuideDateContext(channel) {
  const availableDateKeys = [
    ...new Set(
      getScheduleEntriesForChannel(channel.id).map((entry) =>
        getDateKey(new Date(entry.start), channel.timezone)
      )
    ),
  ];

  if (availableDateKeys.length === 0) {
    return {
      availableDateKeys,
      activeDateKey: "",
    };
  }

  if (
    guideSelectionMode === "manual" &&
    selectedGuideDateKey &&
    availableDateKeys.includes(selectedGuideDateKey)
  ) {
    return {
      availableDateKeys,
      activeDateKey: selectedGuideDateKey,
    };
  }

  guideSelectionMode = "auto";
  selectedGuideDateKey = "";

  return {
    availableDateKeys,
    activeDateKey: resolveActiveGuideDateKey(availableDateKeys, channel.timezone),
  };
}

function getGuideEntriesForDay(channelId, dateKey, timeZone) {
  if (!dateKey) {
    return [];
  }

  return getScheduleEntriesForChannel(channelId).filter(
    (entry) => getDateKey(new Date(entry.start), timeZone) === dateKey
  );
}

function getMinutesFromMidnight(dateString, timeZone) {
  const { hour, minute } = getDateTimeParts(dateString, timeZone);
  return hour * 60 + minute;
}

function getEntryEndMinutes(entry, activeDateKey, timeZone) {
  return getDateKey(new Date(entry.end), timeZone) === activeDateKey
    ? getMinutesFromMidnight(entry.end, timeZone)
    : 1440;
}

function roundGuideMinutesDown(minutes) {
  return Math.floor(minutes / GUIDE_SLOT_MINUTES) * GUIDE_SLOT_MINUTES;
}

function roundGuideMinutesUp(minutes) {
  return Math.ceil(minutes / GUIDE_SLOT_MINUTES) * GUIDE_SLOT_MINUTES;
}

function getGuideWindow(dayEntries, activeDateKey, timeZone) {
  const todayKey = getDateKey(new Date(), timeZone);

  if (activeDateKey === todayKey) {
    const currentMinutes = getMinutesFromMidnight(new Date().toISOString(), timeZone);
    let startMinutes = Math.max(0, roundGuideMinutesDown(currentMinutes - GUIDE_LOOKBACK_MINUTES));
    let endMinutes = Math.min(1440, roundGuideMinutesUp(currentMinutes + GUIDE_LOOKAHEAD_MINUTES));

    if (endMinutes - startMinutes < GUIDE_MIN_WINDOW_MINUTES) {
      endMinutes = Math.min(1440, startMinutes + GUIDE_MIN_WINDOW_MINUTES);

      if (endMinutes - startMinutes < GUIDE_MIN_WINDOW_MINUTES) {
        startMinutes = Math.max(0, endMinutes - GUIDE_MIN_WINDOW_MINUTES);
      }
    }

    return {
      startMinutes,
      endMinutes,
      slotMinutes: GUIDE_SLOT_MINUTES,
      slotCount: Math.max(1, (endMinutes - startMinutes) / GUIDE_SLOT_MINUTES),
    };
  }

  if (dayEntries.length > 0) {
    const earliestStart = roundGuideMinutesDown(
      Math.min(...dayEntries.map((entry) => getMinutesFromMidnight(entry.start, timeZone)))
    );
    const latestEnd = roundGuideMinutesUp(
      Math.max(...dayEntries.map((entry) => getEntryEndMinutes(entry, activeDateKey, timeZone)))
    );
    let startMinutes = Math.max(0, earliestStart);
    let endMinutes = Math.min(1440, latestEnd);

    if (endMinutes - startMinutes < GUIDE_MIN_WINDOW_MINUTES) {
      endMinutes = Math.min(1440, startMinutes + GUIDE_MIN_WINDOW_MINUTES);

      if (endMinutes - startMinutes < GUIDE_MIN_WINDOW_MINUTES) {
        startMinutes = Math.max(0, endMinutes - GUIDE_MIN_WINDOW_MINUTES);
      }
    }

    return {
      startMinutes,
      endMinutes,
      slotMinutes: GUIDE_SLOT_MINUTES,
      slotCount: Math.max(1, (endMinutes - startMinutes) / GUIDE_SLOT_MINUTES),
    };
  }

  return {
    startMinutes: 0,
    endMinutes: GUIDE_MIN_WINDOW_MINUTES,
    slotMinutes: GUIDE_SLOT_MINUTES,
    slotCount: GUIDE_MIN_WINDOW_MINUTES / GUIDE_SLOT_MINUTES,
  };
}

function getGuideMarker(activeDateKey, timeZone, guideWindow) {
  if (!activeDateKey || getDateKey(new Date(), timeZone) !== activeDateKey) {
    return null;
  }

  const currentMinutes = getMinutesFromMidnight(new Date().toISOString(), timeZone);
  const boundedMinutes = Math.min(
    guideWindow.endMinutes,
    Math.max(guideWindow.startMinutes, currentMinutes)
  );
  const progress =
    guideWindow.endMinutes === guideWindow.startMinutes
      ? 0
      : (boundedMinutes - guideWindow.startMinutes) /
        (guideWindow.endMinutes - guideWindow.startMinutes);

  return {
    progress: Math.min(1, Math.max(0, progress)),
    label: formatTime(buildGuideDateTimeValue(activeDateKey, currentMinutes), timeZone),
  };
}

function getGuideMarkerInlineStyle(marker) {
  if (!marker) {
    return "";
  }

  return `left: calc(var(--guide-track-padding, 10px) + ((100% - (var(--guide-track-padding, 10px) * 2)) * ${marker.progress}));`;
}

function getGuideProgress(minutes, guideWindow) {
  if (guideWindow.endMinutes === guideWindow.startMinutes) {
    return 0;
  }

  return (
    Math.min(guideWindow.endMinutes, Math.max(guideWindow.startMinutes, minutes)) -
    guideWindow.startMinutes
  ) / (guideWindow.endMinutes - guideWindow.startMinutes);
}

function getGuideBlockInlineStyle(startMinutes, endMinutes, guideWindow) {
  const startProgress = getGuideProgress(startMinutes, guideWindow);
  const endProgress = getGuideProgress(endMinutes, guideWindow);
  const widthProgress = Math.max(0, endProgress - startProgress);

  return `left: calc(var(--guide-track-padding, 10px) + ((100% - (var(--guide-track-padding, 10px) * 2)) * ${startProgress})); width: calc((100% - (var(--guide-track-padding, 10px) * 2)) * ${widthProgress});`;
}

function renderGuideMarker(marker, showLabel = false) {
  if (!marker) {
    return "";
  }

  return `
    <span class="live-guide-track__marker" style="${getGuideMarkerInlineStyle(marker)}">
      ${
        showLabel
          ? `<span class="live-guide-track__marker-label">${escapeHtml(marker.label)}</span>`
          : ""
      }
    </span>
  `;
}

function renderGuideTimeline(dateKey, timeZone, guideWindow, marker) {
  return `
    ${Array.from({ length: guideWindow.slotCount }, (_, slotIndex) => {
      const timeValue = buildGuideDateTimeValue(
        dateKey,
        guideWindow.startMinutes + slotIndex * guideWindow.slotMinutes
      );
      const leftProgress = slotIndex / guideWindow.slotCount;
      const widthProgress = 1 / guideWindow.slotCount;
      return `
        <div class="live-guide-hour" style="left: calc(var(--guide-track-padding, 10px) + ((100% - (var(--guide-track-padding, 10px) * 2)) * ${leftProgress})); width: calc((100% - (var(--guide-track-padding, 10px) * 2)) * ${widthProgress});">
          ${escapeHtml(formatTime(timeValue, timeZone))}
        </div>
      `;
    }).join("")}
    ${renderGuideMarker(marker, true)}
  `;
}

function renderGuideBlocks(channel, entries, activeDateKey, timeZone, guideWindow, marker) {
  const todayKey = getDateKey(new Date(), timeZone);
  const currentNow = todayKey === activeDateKey ? new Date() : null;

  if (entries.length === 0) {
    return `
      ${renderGuideMarker(marker)}
      <div class="live-guide-block live-guide-block--empty" style="left: var(--guide-track-padding, 10px); width: calc(100% - (var(--guide-track-padding, 10px) * 2));">
        No schedule loaded for this channel on this day.
      </div>
    `;
  }

  return `
    ${renderGuideMarker(marker)}
    ${entries
      .map((entry) => {
        const startMinutes = getMinutesFromMidnight(entry.start, timeZone);
        const endMinutes = getEntryEndMinutes(entry, activeDateKey, timeZone);
        const clippedStart = Math.max(guideWindow.startMinutes, startMinutes);
        const clippedEnd = Math.min(guideWindow.endMinutes, endMinutes);

        if (clippedEnd <= guideWindow.startMinutes || clippedStart >= guideWindow.endMinutes) {
          return "";
        }

        const isCurrent =
          currentNow &&
          currentNow >= new Date(entry.start) &&
          currentNow < new Date(entry.end);
        const currentClass = isCurrent ? " is-current" : "";

        return `
          <article class="live-guide-block${currentClass}" style="${getGuideBlockInlineStyle(
            clippedStart,
            clippedEnd,
            guideWindow
          )}">
            <strong>${escapeHtml(entry.title)}</strong>
            <span>${escapeHtml(
              `${formatTime(entry.start, timeZone)} - ${formatTime(entry.end, timeZone)}`
            )}</span>
            ${entry.category ? `<span class="live-guide-block__category">${escapeHtml(entry.category)}</span>` : ""}
          </article>
        `;
      })
      .join("")}
  `;
}

function renderGuideDays(channel, availableDateKeys, activeDateKey) {
  const todayKey = getDateKey(new Date(), channel.timezone);

  return availableDateKeys
    .map((dateKey) => {
      const activeClass = dateKey === activeDateKey ? " is-active" : "";
      const secondaryLabel =
        dateKey === todayKey
          ? "Today"
          : new Intl.DateTimeFormat("en-FJ", {
              timeZone: channel.timezone,
              day: "numeric",
              month: "short",
            }).format(new Date(`${dateKey}T12:00:00+12:00`));

      return `
        <button class="live-guide-day${activeClass}" type="button" data-guide-date-key="${escapeHtml(
          dateKey
        )}">
          <strong>${escapeHtml(
            new Intl.DateTimeFormat("en-FJ", {
              timeZone: channel.timezone,
              weekday: "short",
            }).format(new Date(`${dateKey}T12:00:00+12:00`))
          )}</strong>
          <span>${escapeHtml(secondaryLabel)}</span>
        </button>
      `;
    })
    .join("");
}

function renderGuideRow(channel, activeChannel, activeDateKey, timeZone, guideWindow, marker) {
  const rowEntries = getGuideEntriesForDay(channel.id, activeDateKey, timeZone);
  const activeClass = channel.id === activeChannel.id ? " is-active" : "";
  const watchLabel = channel.id === activeChannel.id ? "Viewing" : "Watch now";
  const watchClass = channel.id === activeChannel.id ? " is-current" : "";

  return `
    <div class="live-guide-row">
      <div class="live-guide-channel${activeClass}">
        <strong>${escapeHtml(channel.title)}</strong>
        <span>${escapeHtml(channel.kicker)}</span>
          <a class="live-guide-channel__action${watchClass}" href="${withPreviewParam(`./live.html?channel=${encodeURIComponent(
            channel.id
          )}`)}">
          ${escapeHtml(watchLabel)}
        </a>
      </div>
      <div class="live-guide-track" style="--guide-columns: ${guideWindow.slotCount};">
        ${renderGuideBlocks(channel, rowEntries, activeDateKey, timeZone, guideWindow, marker)}
      </div>
    </div>
  `;
}

function renderGuideGrid(activeChannel, activeDateKey) {
  if (!activeDateKey) {
    return `<p class="live-note">No schedule entries have been added for this channel yet.</p>`;
  }

  const timeZone = activeChannel.timezone;
  const dayEntries = getGuideEntriesForDay(activeChannel.id, activeDateKey, timeZone);
  const guideWindow = getGuideWindow(dayEntries, activeDateKey, timeZone);
  const marker = getGuideMarker(activeDateKey, timeZone, guideWindow);
  const guideChannels = [activeChannel];

  return `
    <div class="live-guide-table">
      <div class="live-guide-row live-guide-row--header">
        <div class="live-guide-channel live-guide-channel--header">Channel</div>
        <div class="live-guide-track live-guide-track--header" style="--guide-columns: ${guideWindow.slotCount};">
          ${renderGuideTimeline(activeDateKey, timeZone, guideWindow, marker)}
        </div>
      </div>
      ${guideChannels
        .map((guideChannel) =>
          renderGuideRow(guideChannel, activeChannel, activeDateKey, timeZone, guideWindow, marker)
        )
        .join("")}
    </div>
  `;
}

function renderScheduleImportPanel() {
  const importedLabel = getImportMetaLabel();
  const importTone = importMessage?.tone || "muted";
  const importText = importMessage?.text || DEFAULT_IMPORT_MESSAGE.text;

  return `
    <section class="live-import-panel">
      <div class="live-import-panel__copy">
        <p class="section-heading__eyebrow">EPG Upload</p>
        <h3>Import schedule from Excel or CSV</h3>
        <p class="live-schedule-card__copy">
          Upload an Excel <code>.xlsx</code> file or CSV with a programme column plus
          <code>start</code> and <code>end</code>. <code>channelId</code> is optional if you're
          importing on the current channel page, and <code>category</code> is optional too. Walesi
          export grids with start date, start time, end date, end time, and programme title are
          supported too. Best results use Fiji time like <code>2026-04-10 06:00</code> or
          <code>2026-04-10T06:00:00+12:00</code>.
        </p>
      </div>
      <div class="live-import-columns">
        <span>channelId or current page</span>
        <span>programme column</span>
        <span>category</span>
        <span>start</span>
        <span>end</span>
      </div>
      <div class="live-import-actions">
        <label class="button button--secondary button--small live-upload-button" for="live-schedule-file">
          Choose CSV / XLSX
        </label>
        <input
          id="live-schedule-file"
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          hidden
        />
        <button class="button button--secondary button--small" id="live-reset-schedule" type="button">
          Reset Upload
        </button>
      </div>
      <p class="live-import-meta" id="live-import-meta">${escapeHtml(importedLabel)}</p>
      <p class="live-import-status is-${escapeHtml(importTone)}" id="live-import-status">${escapeHtml(
        importText
      )}</p>
    </section>
  `;
}

function getImportMetaLabel() {
  return hasUploadedSchedule() && uploadedScheduleState.importedAt
    ? `Last import: ${formatImportTimestamp(uploadedScheduleState.importedAt)}`
    : "No imported file saved yet.";
}

function updateImportPanelUi() {
  const importMeta = document.getElementById("live-import-meta");
  const importStatus = document.getElementById("live-import-status");

  if (importMeta) {
    importMeta.textContent = getImportMetaLabel();
  }

  if (importStatus) {
    const tone = importMessage?.tone || "muted";
    importStatus.className = `live-import-status is-${tone}`;
    importStatus.textContent = importMessage?.text || DEFAULT_IMPORT_MESSAGE.text;
  }
}

function updateSchedulePanelUi() {
  const toggleButton = document.getElementById("live-schedule-toggle");
  const importShell = document.getElementById("live-import-shell");

  if (toggleButton) {
    toggleButton.textContent = schedulePanelOpen
      ? "Hide Schedule Tools"
      : hasUploadedSchedule()
        ? "Edit Schedule"
        : "Add Schedule";
    toggleButton.setAttribute("aria-expanded", String(schedulePanelOpen));
  }

  if (importShell) {
    importShell.hidden = !schedulePanelOpen;
    importShell.classList.toggle("is-open", schedulePanelOpen);
  }

  updateImportPanelUi();
}

function renderLivePage(channel) {
  const channelHeading = channel.logoUrl
    ? `<img class="live-summary__logo" src="${escapeHtml(channel.logoUrl)}" alt="${escapeHtml(
        channel.logoAlt || channel.title
      )}" />`
    : escapeHtml(channel.title);

  liveRoot.innerHTML = `
    <section class="live-shell">
      <div class="live-main">
        <div class="live-summary">
        <a class="watch-backlink" href="${withPreviewParam("./index.html")}">Back to homepage</a>
          <p class="section-heading__eyebrow">Live channel</p>
          <h1>${channelHeading}</h1>
          <p class="live-summary__copy">${escapeHtml(channel.description)}</p>
        </div>

        ${renderPlayer(channel)}

        <div class="live-status-grid">
          <article class="live-status-card" id="live-now-card"></article>
          <article class="live-status-card" id="live-next-card"></article>
        </div>
      </div>
    </section>

    <section class="live-guide-card">
        <div class="live-guide-top">
        <div class="live-guide-top__copy">
          <p class="section-heading__eyebrow">TV Guide</p>
          <h2 id="live-schedule-date"></h2>
        </div>
        <div class="live-guide-top__bar">
          <div class="live-guide-days" id="live-guide-days"></div>
        </div>
      </div>

      <div class="live-guide-scroll">
        <div id="live-guide-grid"></div>
      </div>
    </section>
  `;

  updateScheduleUi(channel);
}

function updateScheduleUi(channel) {
  const scheduleContext = getScheduleContext(channel);
  const { currentEntry, nextEntry, activeDateLabel } = scheduleContext;
  const guideContext = getGuideDateContext(channel);
  const nowCard = document.getElementById("live-now-card");
  const nextCard = document.getElementById("live-next-card");
  const scheduleDate = document.getElementById("live-schedule-date");
  const guideDays = document.getElementById("live-guide-days");
  const guideGrid = document.getElementById("live-guide-grid");
  const renderedDateLabel = guideContext.activeDateKey
    ? formatDateLabel(`${guideContext.activeDateKey}T12:00:00+12:00`, channel.timezone)
    : activeDateLabel;

  nowCard.innerHTML = renderNowCard(channel, currentEntry);
  nextCard.innerHTML = renderNextCard(channel, nextEntry);
  scheduleDate.textContent = renderedDateLabel;
  guideDays.innerHTML = renderGuideDays(channel, guideContext.availableDateKeys, guideContext.activeDateKey);
  guideGrid.innerHTML = renderGuideGrid(channel, guideContext.activeDateKey);
  attachGuideDayHandlers(channel);
  window.requestAnimationFrame(() => keepGuideMarkerVisible(channel, guideContext.activeDateKey));
}

function attachScheduleToggleHandler() {
  const toggleButton = document.getElementById("live-schedule-toggle");

  if (!toggleButton || toggleButton.dataset.bound === "true") {
    return;
  }

  toggleButton.dataset.bound = "true";
  toggleButton.addEventListener("click", () => {
    schedulePanelOpen = !schedulePanelOpen;
    updateSchedulePanelUi();

    if (schedulePanelOpen) {
      document.querySelector(".live-upload-button")?.focus();
    }
  });
}

function attachGuideDayHandlers(channel) {
  const guideDays = document.getElementById("live-guide-days");

  if (!guideDays || guideDays.dataset.bound === "true") {
    return;
  }

  guideDays.dataset.bound = "true";
  guideDays.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-guide-date-key]");

    if (!trigger) {
      return;
    }

    guideSelectionMode = "manual";
    selectedGuideDateKey = trigger.getAttribute("data-guide-date-key") || "";
    updateScheduleUi(channel);
  });
}

function keepGuideMarkerVisible(channel, activeDateKey) {
  if (activeDateKey !== getDateKey(new Date(), channel.timezone)) {
    return;
  }

  const scrollNode = document.querySelector(".live-guide-scroll");
  const markerNode = scrollNode?.querySelector(".live-guide-track--header .live-guide-track__marker");

  if (!scrollNode || !markerNode) {
    return;
  }

  const scrollRect = scrollNode.getBoundingClientRect();
  const markerRect = markerNode.getBoundingClientRect();
  const markerOffset = markerRect.left - scrollRect.left;
  const safePadding = Math.max(120, scrollNode.clientWidth * 0.22);

  if (
    markerOffset >= safePadding &&
    markerOffset <= scrollNode.clientWidth - safePadding
  ) {
    return;
  }

  const targetLeft =
    scrollNode.scrollLeft + markerOffset - Math.max(180, scrollNode.clientWidth * 0.32);

  scrollNode.scrollTo({
    left: Math.max(0, targetLeft),
    behavior: "smooth",
  });
}

function attachScheduleImportHandlers(channel) {
  const fileInput = document.getElementById("live-schedule-file");
  const resetButton = document.getElementById("live-reset-schedule");

  if (
    !fileInput ||
    !resetButton ||
    fileInput.dataset.bound === "true" ||
    resetButton.dataset.bound === "true"
  ) {
    return;
  }

  fileInput.dataset.bound = "true";
  resetButton.dataset.bound = "true";

  fileInput.addEventListener("change", async () => {
    const selectedFile = fileInput.files?.[0];

    if (!selectedFile) {
      return;
    }

    try {
      const parsedSchedule = await parseScheduleFile(selectedFile, {
        defaultChannelId: channel.id,
      });

      persistUploadedScheduleState({
        entries: parsedSchedule.entries,
        sourceName: selectedFile.name,
        importedAt: new Date().toISOString(),
      });
      schedulePanelOpen = true;
      guideSelectionMode = "auto";
      selectedGuideDateKey = "";

      const importSuffix = parsedSchedule.sheetName ? ` from sheet "${parsedSchedule.sheetName}"` : "";
      const skippedSummary =
        parsedSchedule.skippedRows.length === 0
          ? ""
          : parsedSchedule.skippedRows.length <= 8
            ? ` Skipped rows: ${parsedSchedule.skippedRows.join(", ")}.`
            : ` Skipped ${parsedSchedule.skippedRows.length} rows that did not match the schedule format.`;
      importMessage = {
        tone: "success",
        text: `Imported ${parsedSchedule.entries.length} rows from ${selectedFile.name}${importSuffix}.${skippedSummary}`,
      };
      updateScheduleUi(channel);
    } catch (error) {
      schedulePanelOpen = true;
      importMessage = {
        tone: "error",
        text: error instanceof Error ? error.message : "That file could not be imported.",
      };
      updateScheduleUi(channel);
    } finally {
      fileInput.value = "";
    }
  });

  resetButton.addEventListener("click", () => {
    clearUploadedScheduleState();
    schedulePanelOpen = true;
    guideSelectionMode = "auto";
    selectedGuideDateKey = "";
    importMessage = {
      tone: "muted",
      text: "Imported schedule cleared. The built-in EPG is active again.",
    };
    updateScheduleUi(channel);
  });
}

function stopLiveScheduleRefresh() {
  if (liveScheduleRefreshTimer) {
    window.clearTimeout(liveScheduleRefreshTimer);
    liveScheduleRefreshTimer = 0;
  }
}

function scheduleLiveContentRefresh() {
  if (liveContentRefreshTimer) {
    return;
  }

  liveContentRefreshTimer = window.setTimeout(() => {
    liveContentRefreshTimer = 0;
    window.location.reload();
  }, 180);
}

function handleContentStorageChange(event) {
  const relevantKeys = new Set([catalogue.editor?.storageKey || "mai-plus-content"]);

  if (catalogue.isPreviewMode) {
    relevantKeys.add(catalogue.editor?.draftStorageKey || "mai-plus-content-draft");
  }

  if (event?.key && !relevantKeys.has(event.key)) {
    return;
  }

  scheduleLiveContentRefresh();
}

function startLiveScheduleRefresh(channel) {
  stopLiveScheduleRefresh();

  const refresh = () => {
    if (!document.hidden) {
      updateScheduleUi(channel);
    }

    liveScheduleRefreshTimer = window.setTimeout(refresh, LIVE_SCHEDULE_REFRESH_MS);
  };

  liveScheduleRefreshTimer = window.setTimeout(refresh, LIVE_SCHEDULE_REFRESH_MS);
}

function initLivePlayer(channel, options = {}) {
  const sourceMode = getResolvedLiveSourceMode(channel);

  if (sourceMode === "embed" && String(channel.embedUrl || "").trim()) {
    return;
  }

  const mountNode = document.getElementById("live-player-mount");

  if (!mountNode) {
    return;
  }

  const isPlayoutMode = sourceMode === "playout";
  const playoutContext = isPlayoutMode ? getCurrentPlayoutContext(channel, options) : null;
  const currentPlayoutSource = playoutContext?.currentSource || null;
  const currentPlayoutIndex = playoutContext?.currentIndex || 0;
  const playoutSources = playoutContext?.sources || [];
  const subtitle = isPlayoutMode
    ? [channel.kicker, currentPlayoutSource?.label].filter(Boolean).join(" | ")
    : channel.kicker;
  const emptyTitle = isPlayoutMode
    ? "No playout videos have been added for this channel yet."
    : sourceMode === "embed"
      ? "No embed URL has been added for this channel yet."
      : "No live stream URL has been added for this channel yet.";
  const emptyCopy = isPlayoutMode
    ? "Add playout video files in the editor under Homepage Settings > Live Channel Streams to make this channel playable."
    : sourceMode === "embed"
      ? "Add an embedUrl in the editor under Homepage Settings > Live Channel Streams to make this live channel playable."
      : "Add a streamUrl or embedUrl in the editor under Homepage Settings > Live Channel Streams to make this live channel playable.";
  const emptyStatus = isPlayoutMode
    ? "Playout not configured"
    : sourceMode === "embed"
      ? "Embed not configured"
      : "Stream not configured";

  playerUi.mountPlayer({
    container: mountNode,
    title: channel.title,
    subtitle,
    annotationText: channel.description,
    annotationsVisible: false,
    sources: isPlayoutMode ? (currentPlayoutSource ? [currentPlayoutSource] : []) : buildSources(channel),
    src: isPlayoutMode ? currentPlayoutSource?.src || "" : channel.streamUrl,
    type: isPlayoutMode ? currentPlayoutSource?.type || "" : channel.streamType,
    autoplay: Boolean(options.autoplay),
    muted: false,
    isLive: !isPlayoutMode,
    autoHideControls: true,
    controlsHideDelay: 1400,
    showPrevNext: false,
    showNotice: false,
    showCaptionsButton: true,
    showPictureInPicture: false,
    allowPictureInPicture: false,
    allowRemotePlayback: false,
    emptyTitle,
    emptyCopy,
    emptyStatus,
    onEnded: isPlayoutMode
      ? () => {
          if (playoutSources.length <= 1) {
            livePlayoutState.sourceIndex = currentPlayoutIndex;
          }

          advanceLivePlayout(channel);
        }
      : undefined,
  });
}

const params = new URLSearchParams(window.location.search);
const requestedChannelId = params.get("channel");
const channel =
  catalogue.getLiveChannelById(requestedChannelId) || catalogue.getPrimaryLiveChannel();

if (!channel) {
  renderNotFound();
} else {
  document.title = `MAI+ | ${channel.title} Live`;
  renderLivePage(channel);
  initLivePlayer(channel);
  startLiveScheduleRefresh(channel);
  window.addEventListener("storage", handleContentStorageChange);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateScheduleUi(channel);
    }
  });
  window.addEventListener(
    "beforeunload",
    () => {
      stopLiveScheduleRefresh();

      if (liveContentRefreshTimer) {
        window.clearTimeout(liveContentRefreshTimer);
        liveContentRefreshTimer = 0;
      }

      window.removeEventListener("storage", handleContentStorageChange);
    },
    { once: true }
  );
}
