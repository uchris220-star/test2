(function attachMaiPlayer(global) {
  const SPEED_OPTIONS = [0.5, 1, 1.25, 1.5, 2];
  const SLEEP_OPTIONS = [0, 15, 30, 60];
  const SVG_NS = "http://www.w3.org/2000/svg";
  const MIME_TYPE_BY_EXTENSION = {
    ".mp4": "video/mp4",
    ".mkv": "video/x-matroska",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".m3u8": "application/x-mpegURL",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
  };

  const ICON_PATHS = {
    play: ["M8 6L18 12L8 18Z"],
    pause: ["M8 6H11V18H8Z", "M13 6H16V18H13Z"],
    prev: ["M7 6H9V18H7Z", "M10 12L18 6V18Z"],
    next: ["M15 6H17V18H15Z", "M14 12L6 18V6Z"],
    volume: ["M5 10H8L12 6V18L8 14H5Z", "M15 9C16.3 10.2 16.3 13.8 15 15", "M17.7 6.8C20.4 9.2 20.4 14.8 17.7 17.2"],
    mute: ["M5 10H8L12 6V18L8 14H5Z", "M15 9L19 15", "M19 9L15 15"],
    settings: ["M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z", "M12 2V5", "M12 19V22", "M4.9 4.9L7 7", "M17 17L19.1 19.1", "M2 12H5", "M19 12H22", "M4.9 19.1L7 17", "M17 7L19.1 4.9"],
    pip: ["M4 6H20V18H4Z", "M12 10H18V15H12Z"],
    fullscreen: ["M8 4H4V8", "M16 4H20V8", "M20 16V20H16", "M8 20H4V16"],
    fullscreenExit: ["M8 8H4V4", "M16 8H20V4", "M20 16V20H16", "M8 16H4V20"],
  };

  function createIcon(name) {
    const svg = document.createElementNS(SVG_NS, "svg");
    const paths = ICON_PATHS[name] || ICON_PATHS.play;

    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("mai-player__icon");

    paths.forEach((d) => {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.8");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");

      if (/Z$/.test(d)) {
        path.setAttribute("fill", "currentColor");
        path.setAttribute("stroke", "none");
      }

      svg.appendChild(path);
    });

    return svg;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }

    const wholeSeconds = Math.floor(seconds);
    const hours = Math.floor(wholeSeconds / 3600);
    const minutes = Math.floor((wholeSeconds % 3600) / 60);
    const secs = wholeSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    return `${minutes}:${String(secs).padStart(2, "0")}`;
  }

  function getFileExtension(value) {
    const match = String(value || "").toLowerCase().match(/(\.[a-z0-9]+)(?:[?#].*)?$/);
    return match ? match[1] : "";
  }

  function inferMimeTypeFromSource(source) {
    if (source?.type) {
      return source.type;
    }

    return MIME_TYPE_BY_EXTENSION[getFileExtension(source?.src)] || "";
  }

  function shouldAssignSourceType(mimeType) {
    return Boolean(mimeType) && mimeType !== "video/x-matroska";
  }

  function shouldLoadWithDirectSrc(source) {
    return inferMimeTypeFromSource(source) === "video/x-matroska";
  }

  function normalizeSources(sources, fallbackUrl, fallbackType, isLive) {
    const sourceList = Array.isArray(sources) ? sources.filter((source) => source && source.src) : [];

    if (sourceList.length > 0) {
      return sourceList.map((source, index) => ({
        ...source,
        type: inferMimeTypeFromSource(source),
        label: source.label || inferQualityLabel(source, isLive, index),
      }));
    }

    if (!fallbackUrl) {
      return [];
    }

    return [
      {
        src: fallbackUrl,
        type: fallbackType || inferMimeTypeFromSource({ src: fallbackUrl }) || "",
        label: inferQualityLabel(
          { src: fallbackUrl, type: fallbackType || inferMimeTypeFromSource({ src: fallbackUrl }) || "" },
          isLive,
          0
        ),
      },
    ];
  }

  function inferQualityLabel(source, isLive, index) {
    if ((source.type || "").toLowerCase().includes("mpegurl")) {
      return isLive ? "Auto" : "Auto (Adaptive)";
    }

    if (source.height) {
      return `${source.height}p`;
    }

    if (source.width && source.width >= 1920) {
      return "1080p";
    }

    if (source.width && source.width >= 1280) {
      return "720p";
    }

    if (index === 0) {
      return isLive ? "Auto (Live)" : "Auto (720p)";
    }

    return `Source ${index + 1}`;
  }

  function inferKind(explicitKind, sources) {
    if (explicitKind) {
      return explicitKind;
    }

    const firstSource = sources[0];
    const type = (firstSource?.type || "").toLowerCase();
    const url = (firstSource?.src || "").toLowerCase();

    if (type.startsWith("audio/") || /\.(mp3|m4a|aac|wav|ogg)$/i.test(url)) {
      return "audio";
    }

    return "video";
  }

  function getCompatibilityMessage(media, source, mediaKind) {
    const mimeType = inferMimeTypeFromSource(source);

    if (!mimeType || typeof media?.canPlayType !== "function") {
      return "";
    }

    const supportLevel = media.canPlayType(mimeType);

    if (supportLevel === "probably" || supportLevel === "maybe") {
      return "";
    }

    if (mimeType === "video/x-matroska") {
      if (/(?:x265|hevc|10bit|10-bit)/i.test(String(source?.src || ""))) {
        return "This MKV appears to use HEVC/x265 10-bit video, which many browsers cannot decode. MP4 with H.264 video and AAC audio is the safest browser format.";
      }

      return "MKV playback depends on the codec inside the file. MP4 with H.264 video and AAC audio is the safest browser format.";
    }

    if (mimeType === "application/x-mpegURL") {
      return "This browser may not support HLS directly. MP4 is the safest fallback format.";
    }

    if (mediaKind === "audio") {
      return `This browser may not support ${mimeType} audio playback.`;
    }

    return `This browser may not support ${mimeType} playback.`;
  }

  function setButtonIcon(button, iconName, label) {
    button.replaceChildren(createIcon(iconName));
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  function mountPlayer(config) {
    const container = config.container;

    if (!container) {
      throw new Error("A container is required to mount the MAI player.");
    }

    const sourceList = normalizeSources(
      config.sources,
      config.src,
      config.type,
      Boolean(config.isLive)
    );
    const mediaKind = inferKind(config.kind, sourceList);

    container.innerHTML = "";

    if (sourceList.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "player-stage__empty";
      emptyState.innerHTML = `
        <p class="section-heading__eyebrow">Media source needed</p>
        <h2></h2>
        <p></p>
      `;

      emptyState.querySelector("h2").textContent =
        config.emptyTitle || "No media file has been added yet.";
      emptyState.querySelector("p:last-child").textContent =
        config.emptyCopy || "Add a valid media source and the player will appear here.";

      container.appendChild(emptyState);

      if (typeof config.onStatusChange === "function") {
        config.onStatusChange(config.emptyStatus || "File not added yet");
      }

      return;
    }

    const shell = document.createElement("div");
    shell.className = `mai-player mai-player--${mediaKind}${config.isLive ? " mai-player--live" : ""}`;

    if (config.autoHideControls) {
      shell.classList.add("mai-player--auto-hide");
    }

    const surface = document.createElement("div");
    surface.className = "mai-player__surface";

    const media = document.createElement(mediaKind === "audio" ? "audio" : "video");
    media.className = "mai-player__media";
    media.preload = "metadata";
    media.controls = false;
    media.muted = Boolean(config.muted);
    media.autoplay = Boolean(config.autoplay);
    media.loop = Boolean(config.loop);

    if (mediaKind === "video") {
      const allowPictureInPicture = config.allowPictureInPicture === true;
      const allowRemotePlayback = config.allowRemotePlayback === true;

      media.setAttribute("playsinline", "");
      media.setAttribute("webkit-playsinline", "");
      media.setAttribute(
        "controlsList",
        `nodownload noplaybackrate nofullscreen${allowRemotePlayback ? "" : " noremoteplayback"}`
      );
      media.setAttribute("x-webkit-airplay", allowRemotePlayback ? "allow" : "deny");

      if (!allowPictureInPicture) {
        media.setAttribute("disablepictureinpicture", "");

        if ("disablePictureInPicture" in media) {
          media.disablePictureInPicture = true;
        }
      }

      if (!allowRemotePlayback) {
        media.setAttribute("disableremoteplayback", "");

        if ("disableRemotePlayback" in media) {
          media.disableRemotePlayback = true;
        }
      }
    } else {
      media.classList.add("mai-player__media--audio");
      surface.classList.add("mai-player__surface--audio");
    }

    surface.appendChild(media);

    if (mediaKind === "audio") {
      const audioArt = document.createElement("div");
      audioArt.className = "mai-player__audio-art";

      if (config.posterClass) {
        audioArt.classList.add(config.posterClass);
      }

      const audioCopy = document.createElement("div");
      audioCopy.className = "mai-player__audio-copy";

      const eyebrow = document.createElement("p");
      eyebrow.className = "section-heading__eyebrow";
      eyebrow.textContent = "Audio replay";

      const title = document.createElement("h2");
      title.textContent = config.title || "Audio programme";

      const meta = document.createElement("p");
      meta.textContent = config.subtitle || "Now playing";

      const bars = document.createElement("div");
      bars.className = "player-audio__bars";
      bars.setAttribute("aria-hidden", "true");

      for (let index = 0; index < 5; index += 1) {
        bars.appendChild(document.createElement("span"));
      }

      audioCopy.append(eyebrow, title, meta, bars);
      audioArt.appendChild(audioCopy);
      surface.appendChild(audioArt);
    }

    const annotation = document.createElement("div");
    annotation.className = "mai-player__annotation";

    const annotationEyebrow = document.createElement("span");
    annotationEyebrow.className = "mai-player__annotation-eyebrow";
    annotationEyebrow.textContent = config.isLive ? "Live now" : "Now watching";

    const annotationTitle = document.createElement("strong");
    annotationTitle.className = "mai-player__annotation-title";
    annotationTitle.textContent = config.title || "MAI+";

    const annotationCopy = document.createElement("p");
    annotationCopy.className = "mai-player__annotation-copy";
    annotationCopy.textContent = config.annotationText || config.subtitle || "Playback ready";

    annotation.append(annotationEyebrow, annotationTitle, annotationCopy);

    const notice = document.createElement("div");
    notice.className = "mai-player__notice";
    notice.hidden = true;

    const noticeSpinner = document.createElement("span");
    noticeSpinner.className = "mai-player__notice-spinner";
    noticeSpinner.hidden = true;
    noticeSpinner.setAttribute("aria-hidden", "true");

    const noticeText = document.createElement("span");
    noticeText.className = "mai-player__notice-text";

    notice.append(noticeSpinner, noticeText);

    const settingsPanel = document.createElement("div");
    settingsPanel.className = "mai-player__settings";
    settingsPanel.hidden = true;
    settingsPanel.innerHTML = `
      <p class="mai-player__settings-title">Playback settings</p>
      <label class="mai-player__setting mai-player__setting--toggle">
        <span class="mai-player__setting-copy">
          <strong>Annotations</strong>
          <span>Show programme labels over the player.</span>
        </span>
        <span class="mai-player__switch">
          <input class="mai-player__switch-input" type="checkbox" />
          <span class="mai-player__switch-track">
            <span class="mai-player__switch-thumb"></span>
          </span>
        </span>
      </label>
      <button class="mai-player__setting" data-setting="sleep" type="button">
        <span class="mai-player__setting-copy">
          <strong>Sleep timer</strong>
          <span>Pause playback after a delay.</span>
        </span>
        <span class="mai-player__setting-meta">
          <span data-role="sleep-value">Off</span>
          <span class="mai-player__setting-caret">&gt;</span>
        </span>
      </button>
      <button class="mai-player__setting" data-setting="speed" type="button">
        <span class="mai-player__setting-copy">
          <strong>Playback speed</strong>
          <span>Slow down or speed up this stream.</span>
        </span>
        <span class="mai-player__setting-meta">
          <span data-role="speed-value">Normal</span>
          <span class="mai-player__setting-caret">&gt;</span>
        </span>
      </button>
      <button class="mai-player__setting" data-setting="quality" type="button">
        <span class="mai-player__setting-copy">
          <strong>Quality</strong>
          <span>Pick a video source when available.</span>
        </span>
        <span class="mai-player__setting-meta">
          <span data-role="quality-value">Auto</span>
          <span class="mai-player__setting-caret">&gt;</span>
        </span>
      </button>
    `;

    const controls = document.createElement("div");
    controls.className = "mai-player__controls";
    controls.innerHTML = `
      <div class="mai-player__timeline">
        <input
          class="mai-player__progress"
          data-role="progress"
          type="range"
          min="0"
          max="1000"
          step="1"
          value="0"
          aria-label="Playback progress"
        />
      </div>
      <div class="mai-player__control-row">
        <div class="mai-player__control-group">
          <button class="mai-player__button" data-action="play" type="button"></button>
          <button class="mai-player__button" data-action="prev" type="button"></button>
          <button class="mai-player__button" data-action="next" type="button"></button>
          <button class="mai-player__button" data-action="mute" type="button"></button>
          <input
            class="mai-player__volume"
            data-role="volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value="1"
            aria-label="Volume"
          />
          <span class="mai-player__time" data-role="time">0:00 / 0:00</span>
        </div>
        <div class="mai-player__control-group mai-player__control-group--end">
          <button class="mai-player__button mai-player__button--text" data-action="cc" type="button">CC</button>
          <button class="mai-player__button" data-action="settings" type="button"></button>
          <button class="mai-player__button" data-action="pip" type="button"></button>
          <button class="mai-player__button" data-action="fullscreen" type="button"></button>
        </div>
      </div>
    `;

    surface.append(annotation, notice, settingsPanel, controls);
    shell.appendChild(surface);
    container.appendChild(shell);

    const playButton = controls.querySelector('[data-action="play"]');
    const prevButton = controls.querySelector('[data-action="prev"]');
    const nextButton = controls.querySelector('[data-action="next"]');
    const muteButton = controls.querySelector('[data-action="mute"]');
    const captionsButton = controls.querySelector('[data-action="cc"]');
    const settingsButton = controls.querySelector('[data-action="settings"]');
    const pipButton = controls.querySelector('[data-action="pip"]');
    const fullscreenButton = controls.querySelector('[data-action="fullscreen"]');
    const progress = controls.querySelector('[data-role="progress"]');
    const volumeSlider = controls.querySelector('[data-role="volume"]');
    const timeLabel = controls.querySelector('[data-role="time"]');
    const annotationsToggle = settingsPanel.querySelector(".mai-player__switch-input");
    const sleepValue = settingsPanel.querySelector('[data-role="sleep-value"]');
    const speedValue = settingsPanel.querySelector('[data-role="speed-value"]');
    const qualityValue = settingsPanel.querySelector('[data-role="quality-value"]');
    const sleepButton = settingsPanel.querySelector('[data-setting="sleep"]');
    const speedButton = settingsPanel.querySelector('[data-setting="speed"]');
    const qualityButton = settingsPanel.querySelector('[data-setting="quality"]');

    setButtonIcon(playButton, "pause", "Pause");
    setButtonIcon(prevButton, "prev", config.prevLabel || "Previous");
    setButtonIcon(nextButton, "next", config.nextLabel || "Next");
    setButtonIcon(muteButton, media.muted ? "mute" : "volume", media.muted ? "Unmute" : "Mute");
    setButtonIcon(settingsButton, "settings", "Settings");
    setButtonIcon(pipButton, "pip", "Picture in picture");
    setButtonIcon(fullscreenButton, "fullscreen", "Fullscreen");

    const state = {
      sourceIndex: Math.max(0, config.initialSourceIndex || 0),
      speedIndex: SPEED_OPTIONS.indexOf(config.defaultSpeed || 1),
      sleepIndex: 0,
      annotationsVisible: config.annotationsVisible !== false,
      noticeTimer: 0,
      sleepTimerId: 0,
      controlsTimerId: 0,
      captionsEnabled: false,
      compatibilityMessage: "",
    };

    if (state.speedIndex === -1) {
      state.speedIndex = 1;
    }

    annotationsToggle.checked = state.annotationsVisible;
    annotation.hidden = !state.annotationsVisible;

    if (config.showPrevNext === false) {
      prevButton.hidden = true;
      nextButton.hidden = true;
    }

    captionsButton.hidden = config.showCaptionsButton === false;

    if (config.showPictureInPicture === false) {
      pipButton.hidden = true;
    }

    if (!config.prevAction) {
      prevButton.disabled = true;
    }

    if (!config.nextAction) {
      nextButton.disabled = true;
    }

    if (config.isLive) {
      progress.disabled = true;
      progress.classList.add("mai-player__progress--live");
    }

    const supportsPictureInPicture =
      mediaKind === "video" &&
      typeof document.pictureInPictureEnabled !== "undefined" &&
      document.pictureInPictureEnabled &&
      typeof media.requestPictureInPicture === "function";

    if (!supportsPictureInPicture) {
      pipButton.disabled = true;
    }

    let hasCaptions = false;

    captionsButton.setAttribute("aria-label", "Closed captions");
    captionsButton.title = "Closed captions";

    function getCaptionTrackList() {
      return media.textTracks || null;
    }

    function syncCaptionsStateFromTracks() {
      const textTracks = getCaptionTrackList();

      if (!textTracks || textTracks.length === 0) {
        state.captionsEnabled = false;
        return;
      }

      let anyTrackShowing = false;

      for (let index = 0; index < textTracks.length; index += 1) {
        if (textTracks[index].mode === "showing") {
          anyTrackShowing = true;
          break;
        }
      }

      state.captionsEnabled = anyTrackShowing;
    }

    function applyCaptionsState() {
      const textTracks = getCaptionTrackList();

      if (!textTracks || textTracks.length === 0) {
        state.captionsEnabled = false;
        return;
      }

      let enabledTrackCount = 0;

      for (let index = 0; index < textTracks.length; index += 1) {
        const track = textTracks[index];
        const shouldShowTrack = state.captionsEnabled && enabledTrackCount === 0;
        track.mode = shouldShowTrack ? "showing" : "disabled";

        if (shouldShowTrack) {
          enabledTrackCount += 1;
        }
      }

      if (state.captionsEnabled && enabledTrackCount === 0) {
        state.captionsEnabled = false;
      }
    }

    function bindTextTrackListeners() {
      const textTracks = getCaptionTrackList();

      if (!textTracks) {
        return;
      }

      const refreshCaptions = () => {
        syncCaptionsStateFromTracks();
        updateCaptionsAvailability();

        if (state.captionsEnabled) {
          applyCaptionsState();
          updateCaptionsAvailability();
        }
      };

      if (typeof textTracks.addEventListener === "function") {
        textTracks.addEventListener("addtrack", refreshCaptions);
        textTracks.addEventListener("removetrack", refreshCaptions);
        textTracks.addEventListener("change", refreshCaptions);
        return;
      }

      if ("onaddtrack" in textTracks) {
        textTracks.onaddtrack = refreshCaptions;
      }

      if ("onremovetrack" in textTracks) {
        textTracks.onremovetrack = refreshCaptions;
      }
    }

    function updateSettingsSummary() {
      const speed = SPEED_OPTIONS[state.speedIndex];
      sleepValue.textContent = SLEEP_OPTIONS[state.sleepIndex] === 0 ? "Off" : `${SLEEP_OPTIONS[state.sleepIndex]} min`;
      speedValue.textContent = speed === 1 ? "Normal" : `${speed}x`;
      qualityValue.textContent = sourceList[state.sourceIndex]?.label || "Auto";
    }

    function updatePlayButton() {
      const isPaused = media.paused || media.ended;
      setButtonIcon(playButton, isPaused ? "play" : "pause", isPaused ? "Play" : "Pause");
    }

    function updateMuteButton() {
      setButtonIcon(
        muteButton,
        media.muted || media.volume === 0 ? "mute" : "volume",
        media.muted || media.volume === 0 ? "Unmute" : "Mute"
      );
    }

    function updateVolumeSlider() {
      const currentVolume = media.muted ? 0 : media.volume;
      volumeSlider.value = String(currentVolume);
      volumeSlider.style.setProperty("--fill", `${currentVolume * 100}%`);
    }

    function updateTimeLabel() {
      if (config.isLive) {
        timeLabel.textContent = Number.isFinite(media.duration)
          ? `${formatTime(media.currentTime)} | LIVE`
          : "LIVE";
        return;
      }

      timeLabel.textContent = `${formatTime(media.currentTime)} / ${formatTime(media.duration)}`;
    }

    function updateProgress() {
      if (!Number.isFinite(media.duration) || media.duration <= 0 || config.isLive) {
        progress.value = "0";
        progress.style.setProperty("--fill", "0%");
        return;
      }

      progress.value = String(Math.round((media.currentTime / media.duration) * 1000));
      progress.style.setProperty("--fill", `${(media.currentTime / media.duration) * 100}%`);
    }

    function setNotice(message, options = {}) {
      window.clearTimeout(state.noticeTimer);
      if (config.showNotice === false) {
        return;
      }

      notice.hidden = false;
      notice.classList.toggle("is-persistent", Boolean(options.persistent));
      noticeSpinner.hidden = !options.loading;
      noticeText.textContent = message;

      if (!options.persistent) {
        state.noticeTimer = window.setTimeout(() => {
          notice.hidden = true;
        }, options.timeout || 2200);
      }
    }

    function clearNotice() {
      window.clearTimeout(state.noticeTimer);
      notice.hidden = true;
      notice.classList.remove("is-persistent");
      noticeSpinner.hidden = true;
    }

    function setSettingsOpen(nextState) {
      settingsPanel.hidden = !nextState;
      settingsButton.classList.toggle("is-active", nextState);

      if (nextState) {
        setControlsVisible(true);
        return;
      }

      scheduleControlsHide();
    }

    function setControlsVisible(isVisible) {
      if (!config.autoHideControls) {
        return;
      }

      shell.classList.toggle("is-controls-visible", isVisible);
    }

    function scheduleControlsHide() {
      if (!config.autoHideControls) {
        return;
      }

      window.clearTimeout(state.controlsTimerId);

      if (!settingsPanel.hidden) {
        return;
      }

      state.controlsTimerId = window.setTimeout(() => {
        setControlsVisible(false);
      }, config.controlsHideDelay || 1800);
    }

    function showControlsTemporarily() {
      if (!config.autoHideControls) {
        return;
      }

      setControlsVisible(true);
      scheduleControlsHide();
    }

    function hideControlsImmediately() {
      if (!config.autoHideControls) {
        return;
      }

      window.clearTimeout(state.controlsTimerId);
      settingsPanel.hidden = true;
      settingsButton.classList.remove("is-active");
      setControlsVisible(false);
    }

    function cycleSleepTimer() {
      state.sleepIndex = (state.sleepIndex + 1) % SLEEP_OPTIONS.length;
      const selectedMinutes = SLEEP_OPTIONS[state.sleepIndex];

      window.clearTimeout(state.sleepTimerId);

      if (selectedMinutes > 0) {
        state.sleepTimerId = window.setTimeout(() => {
          media.pause();
          setNotice("Sleep timer ended. Playback paused.", { persistent: true });
        }, selectedMinutes * 60 * 1000);
      }

      updateSettingsSummary();
      setNotice(
        selectedMinutes === 0 ? "Sleep timer cleared." : `Sleep timer set for ${selectedMinutes} minutes.`
      );
    }

    function cycleSpeed() {
      state.speedIndex = (state.speedIndex + 1) % SPEED_OPTIONS.length;
      media.playbackRate = SPEED_OPTIONS[state.speedIndex];
      updateSettingsSummary();
      setNotice(
        SPEED_OPTIONS[state.speedIndex] === 1
          ? "Playback speed set to normal."
          : `Playback speed set to ${SPEED_OPTIONS[state.speedIndex]}x.`
      );
    }

    function loadSource(nextIndex, preserveTime, options = {}) {
      const targetSource = sourceList[nextIndex];

      if (!targetSource) {
        return;
      }

      const wasPlaying = !media.paused && !media.ended;
      const previousTime = preserveTime ? media.currentTime : 0;

      state.sourceIndex = nextIndex;
      state.compatibilityMessage = getCompatibilityMessage(media, targetSource, mediaKind);
      media.pause();
      media.removeAttribute("src");
      media.innerHTML = "";

      if (shouldLoadWithDirectSrc(targetSource)) {
        media.src = targetSource.src;
      } else {
        const sourceNode = document.createElement("source");
        sourceNode.src = targetSource.src;

        if (shouldAssignSourceType(targetSource.type)) {
          sourceNode.type = targetSource.type;
        }

        media.appendChild(sourceNode);
      }

      if (mediaKind === "video" && Array.isArray(config.tracks)) {
        config.tracks.forEach((track) => {
          if (!track?.src) {
            return;
          }

          const trackNode = document.createElement("track");
          trackNode.kind = track.kind || "subtitles";
          trackNode.label = track.label || "English";
          trackNode.srclang = track.srclang || "en";
          trackNode.src = track.src;

          if (track.default) {
            trackNode.default = true;
          }

          media.appendChild(trackNode);
        });
      }

      media.load();
      updateSettingsSummary();

      if (state.compatibilityMessage) {
        setNotice(state.compatibilityMessage, { persistent: true });
      }

      if (options.announceChange) {
        setNotice(`Quality set to ${targetSource.label}.`, { timeout: 1600 });
      }

      const restorePlayback = () => {
        if (preserveTime && Number.isFinite(previousTime) && Number.isFinite(media.duration)) {
          media.currentTime = Math.min(previousTime, media.duration || previousTime);
        }

        media.playbackRate = SPEED_OPTIONS[state.speedIndex];

        if (wasPlaying || config.autoplay) {
          const playPromise = media.play();

          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {
              setNotice("Press play to start playback.", { persistent: true });
            });
          }
        }
      };

      media.addEventListener("loadedmetadata", restorePlayback, { once: true });
    }

    function cycleQuality() {
      if (sourceList.length === 1) {
        setNotice(`Only ${sourceList[0].label} is available right now.`);
        return;
      }

      loadSource((state.sourceIndex + 1) % sourceList.length, !config.isLive, {
        announceChange: true,
      });
    }

    function updateCaptionsAvailability() {
      const textTracks = getCaptionTrackList();
      syncCaptionsStateFromTracks();
      hasCaptions = Boolean(textTracks && textTracks.length > 0);

      if (config.showCaptionsButton === false) {
        captionsButton.hidden = true;
        captionsButton.disabled = true;
        captionsButton.classList.remove("is-active");
        return;
      }

      captionsButton.hidden = !hasCaptions;
      captionsButton.disabled = !hasCaptions;
      captionsButton.classList.toggle("is-active", hasCaptions && state.captionsEnabled);
    }

    function toggleCaptions() {
      const textTracks = getCaptionTrackList();

      if (!textTracks || textTracks.length === 0) {
        setNotice("No captions are available for this video.");
        return;
      }

      state.captionsEnabled = !state.captionsEnabled;
      applyCaptionsState();
      updateCaptionsAvailability();
      setNotice(state.captionsEnabled ? "Captions turned on." : "Captions turned off.");
    }

    function toggleFullscreen() {
      if (document.fullscreenElement === shell) {
        document.exitFullscreen();
        return;
      }

      if (shell.requestFullscreen) {
        shell.requestFullscreen();
      }
    }

    function updateFullscreenButton() {
      const isFullscreen = document.fullscreenElement === shell;
      setButtonIcon(fullscreenButton, isFullscreen ? "fullscreenExit" : "fullscreen", isFullscreen ? "Exit fullscreen" : "Fullscreen");
    }

    function togglePlay() {
      if (media.paused || media.ended) {
        const playPromise = media.play();

        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {
            setNotice("Press play again to start playback.", { persistent: true });
          });
        }

        return;
      }

      media.pause();
    }

    controls.addEventListener("click", (event) => {
      event.stopPropagation();
      showControlsTemporarily();
    });

    controls.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      showControlsTemporarily();
    });

    settingsPanel.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    settingsPanel.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });

    shell.addEventListener("pointerenter", showControlsTemporarily);
    shell.addEventListener("pointermove", showControlsTemporarily);
    shell.addEventListener("pointerleave", hideControlsImmediately);
    shell.addEventListener("focusin", showControlsTemporarily);
    shell.addEventListener("touchstart", showControlsTemporarily, { passive: true });

    playButton.addEventListener("click", (event) => {
      event.stopPropagation();
      togglePlay();
    });
    prevButton.addEventListener("click", (event) => {
      event.stopPropagation();

      if (config.prevAction) {
        config.prevAction();
      }
    });
    nextButton.addEventListener("click", (event) => {
      event.stopPropagation();

      if (config.nextAction) {
        config.nextAction();
      }
    });
    muteButton.addEventListener("click", (event) => {
      event.stopPropagation();

      if (media.muted || media.volume === 0) {
        media.muted = false;

        if (media.volume === 0) {
          media.volume = 0.6;
        }
      } else {
        media.muted = true;
      }

      updateMuteButton();
      updateVolumeSlider();
    });
    captionsButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleCaptions();
    });
    settingsButton.addEventListener("click", (event) => {
      event.stopPropagation();
      setSettingsOpen(settingsPanel.hidden);
    });
    pipButton.addEventListener("click", async (event) => {
      event.stopPropagation();

      if (!supportsPictureInPicture) {
        return;
      }

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }

      await media.requestPictureInPicture();
    });
    fullscreenButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFullscreen();
    });
    sleepButton.addEventListener("click", (event) => {
      event.stopPropagation();
      cycleSleepTimer();
    });
    speedButton.addEventListener("click", (event) => {
      event.stopPropagation();
      cycleSpeed();
    });
    qualityButton.addEventListener("click", (event) => {
      event.stopPropagation();
      cycleQuality();
    });
    annotationsToggle.addEventListener("change", () => {
      state.annotationsVisible = annotationsToggle.checked;
      annotation.hidden = !state.annotationsVisible;
      setNotice(state.annotationsVisible ? "Annotations turned on." : "Annotations turned off.");
    });

    progress.addEventListener("input", () => {
      showControlsTemporarily();

      if (config.isLive || !Number.isFinite(media.duration) || media.duration <= 0) {
        return;
      }

      media.currentTime = (Number(progress.value) / 1000) * media.duration;
    });

    volumeSlider.addEventListener("input", (event) => {
      event.stopPropagation();
      showControlsTemporarily();

      const nextVolume = Number(volumeSlider.value);
      media.volume = nextVolume;
      media.muted = nextVolume === 0;
      updateVolumeSlider();
      updateMuteButton();
    });

    surface.addEventListener("click", (event) => {
      if (
        event.target.closest(".mai-player__controls") ||
        event.target.closest(".mai-player__settings")
      ) {
        return;
      }

      showControlsTemporarily();

      if (mediaKind === "video") {
        togglePlay();
      }
    });

    document.addEventListener("click", (event) => {
      if (!shell.contains(event.target)) {
        setSettingsOpen(false);
        scheduleControlsHide();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    });

    document.addEventListener("fullscreenchange", updateFullscreenButton);

    media.addEventListener("loadstart", () => {
      setNotice(config.isLive ? "Connecting to live stream..." : "Loading video...", { loading: true, persistent: true });

      if (typeof config.onStatusChange === "function") {
        config.onStatusChange(config.isLive ? "Connecting to stream" : "Loading media");
      }
    });

    media.addEventListener("waiting", () => {
      setNotice(config.isLive ? "Buffering live stream..." : "Buffering playback...", {
        loading: true,
        persistent: true,
      });

      if (typeof config.onStatusChange === "function") {
        config.onStatusChange(config.isLive ? "Buffering stream" : "Buffering playback");
      }
    });

    media.addEventListener("stalled", () => {
      setNotice("Connection slowed down. Rebuffering...", {
        loading: true,
        persistent: true,
      });

      if (typeof config.onStatusChange === "function") {
        config.onStatusChange("Connection slowed");
      }
    });

    media.addEventListener("loadedmetadata", () => {
      updateTimeLabel();
      updateProgress();
      applyCaptionsState();
      updateCaptionsAvailability();
    });

    media.addEventListener("loadeddata", () => {
      applyCaptionsState();
      updateCaptionsAvailability();
    });

    media.addEventListener("canplay", () => {
      clearNotice();
      applyCaptionsState();
      updateCaptionsAvailability();

      if (typeof config.onStatusChange === "function") {
        config.onStatusChange(config.isLive ? "Ready to stream" : "Ready to play");
      }
    });

    media.addEventListener("playing", () => {
      clearNotice();
      updatePlayButton();

      if (typeof config.onStatusChange === "function") {
        config.onStatusChange(config.isLive ? "Streaming live" : "Now playing");
      }
    });

    media.addEventListener("pause", () => {
      updatePlayButton();

      if (!media.ended && typeof config.onStatusChange === "function") {
        config.onStatusChange("Paused");
      }
    });

    media.addEventListener("ended", () => {
      updatePlayButton();

      if (typeof config.onStatusChange === "function") {
        config.onStatusChange(config.isLive ? "Stream ended" : "Replay ended");
      }

      if (typeof config.onEnded === "function") {
        config.onEnded({
          source: sourceList[state.sourceIndex] || null,
          isLive: Boolean(config.isLive),
        });
      }
    });

    media.addEventListener("error", () => {
      setNotice(state.compatibilityMessage || "This media file could not be loaded.", {
        persistent: true,
      });

      if (typeof config.onStatusChange === "function") {
        config.onStatusChange("File missing or unsupported");
      }
    });

    media.addEventListener("timeupdate", () => {
      updateTimeLabel();
      updateProgress();
    });

    media.addEventListener("volumechange", () => {
      updateMuteButton();
      updateVolumeSlider();
    });

    updateSettingsSummary();
    updatePlayButton();
    updateMuteButton();
    updateVolumeSlider();
    updateTimeLabel();
    bindTextTrackListeners();
    loadSource(state.sourceIndex, false, { announceChange: false });

    if (config.autoHideControls) {
      setControlsVisible(false);
    }
  }

  global.maiPlayer = {
    mountPlayer,
  };
})(window);
