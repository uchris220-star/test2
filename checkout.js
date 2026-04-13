const catalogue = window.maiCatalogue;
const checkoutRoot = document.getElementById("simple-checkout-root");
const backLink = document.getElementById("checkout-back-link");

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

function saveStoredUnlocks(unlocks) {
  try {
    window.localStorage.setItem(PPV_UNLOCK_STORAGE_KEY, JSON.stringify(unlocks));
  } catch (error) {
    // Ignore storage errors in preview browsers.
  }
}

function unlockItem(item, methodKey) {
  const itemId = String(item?.id || "").trim();

  if (!itemId) {
    return;
  }

  const unlocks = getStoredUnlocks();
  unlocks[itemId] = {
    unlockedAt: new Date().toISOString(),
    method: String(methodKey || "card"),
    title: String(item?.title || itemId),
  };
  saveStoredUnlocks(unlocks);
}

function getSuccessRedirectHref(item) {
  const isLivePpvEvent = Boolean(item?.ppvEnabled && String(item?.ppvEventType || "locked_title") === "live_event");
  const defaultEpisode = !isLivePpvEvent && item?.kind === "series"
    ? item.episodes?.find((episode) => episode?.mediaUrl) || item.episodes?.[0] || null
    : null;
  const defaultPlayUrl = item?.kind === "series"
    ? getPlayHref(item, defaultEpisode)
    : getPlayHref(item);

  const params = new URLSearchParams(window.location.search);
  const requestedReturn = (params.get("return") || "play").trim().toLowerCase();

  if (requestedReturn === "watch") {
    return getWatchHref(item);
  }

  return defaultPlayUrl;
}

function getPlayHref(item, episode) {
  const baseUrl = `./play.html?show=${encodeURIComponent(item?.id || "")}`;

  if (!episode) {
    return withPreviewParam(baseUrl);
  }

  return withPreviewParam(`${baseUrl}&episode=${encodeURIComponent(episode.id)}`);
}


const COUNTRY_OPTIONS = [
  "Fiji", "Australia", "New Zealand", "United States", "Canada", "United Kingdom", "Ireland", "Germany",
  "France", "Italy", "Spain", "Netherlands", "Belgium", "Switzerland", "Austria", "Portugal", "Norway",
  "Sweden", "Denmark", "Finland", "Poland", "Czech Republic", "Romania", "Greece", "Turkey", "United Arab Emirates",
  "Saudi Arabia", "Qatar", "Singapore", "Malaysia", "Indonesia", "Philippines", "Thailand", "Vietnam", "India",
  "Japan", "South Korea", "China", "Hong Kong", "Taiwan", "South Africa", "Kenya", "Nigeria", "Brazil",
  "Mexico", "Argentina", "Chile", "Papua New Guinea", "Samoa", "Tonga", "Vanuatu", "Solomon Islands"
];

const METHOD_META = {
  card: { label: "Card", icon: "💳" },
  mpaisa: { label: "M-PAiSA", icon: "📱" },
  mycash: { label: "MyCash", icon: "📲" },
  paypal: { label: "PayPal", icon: "🅿️" },
  bank: { label: "Bank Transfer", icon: "🏦" },
  applepay: { label: "Apple Pay", icon: "" },
  googlepay: { label: "Google Pay", icon: "G" },
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function withPreviewParam(url) {
  if (!catalogue?.isPreviewMode) {
    return url;
  }

  const [path, hashFragment = ""] = String(url).split("#");
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}editorPreview=1${hashFragment ? `#${hashFragment}` : ""}`;
}

function getShow() {
  const params = new URLSearchParams(window.location.search);
  const showId = params.get("show") || "";
  if (!catalogue || !showId) {
    return null;
  }
  return catalogue.allItems.find((item) => String(item?.id || "") === showId) || null;
}

function formatEventDate(value) {
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

function getPriceLabel(item) {
  if (item?.ppvPrice) {
    return `${item.ppvCurrency || "FJD"} ${item.ppvPrice}`;
  }
  return "Contact sales";
}

function getWatchHref(item) {
  return withPreviewParam(`./watch.html?show=${encodeURIComponent(item?.id || "")}`);
}

function normalizeMethodName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getMethodKeys(item) {
  const source = Array.isArray(item?.ppvMethods) && item.ppvMethods.length
    ? item.ppvMethods
    : ["Card", "M-PAiSA", "MyCash", "PayPal", "Bank Transfer", "Apple Pay", "Google Pay"];

  const mapped = source
    .map((entry) => normalizeMethodName(entry))
    .map((value) => {
      if (value.includes("mpaisa")) return "mpaisa";
      if (value.includes("mycash")) return "mycash";
      if (value.includes("paypal")) return "paypal";
      if (value.includes("bank")) return "bank";
      if (value.includes("apple")) return "applepay";
      if (value.includes("google")) return "googlepay";
      return "card";
    });

  return [...new Set(["card", ...mapped])];
}

function getMethodButtonMarkup(methodKey, isActive) {
  const meta = METHOD_META[methodKey] || METHOD_META.card;
  return `
    <button class="simple-method-button${isActive ? " is-active" : ""}" type="button" data-method="${escapeHtml(methodKey)}">
      <span class="simple-method-button__icon">${escapeHtml(meta.icon)}</span>
      <span>${escapeHtml(meta.label)}</span>
    </button>
  `;
}

function getCountryOptionsMarkup() {
  return COUNTRY_OPTIONS.map((country) => `<option value="${escapeHtml(country)}">${escapeHtml(country)}</option>`).join("");
}

function getMethodFieldsMarkup(methodKey) {
  if (methodKey === "mpaisa" || methodKey === "mycash") {
    const walletLabel = methodKey === "mpaisa" ? "M-PAiSA number" : "MyCash number";
    return `
      <div class="simple-wallet-box">
        <p class="simple-wallet-box__title">Mobile wallet payment</p>
        <div class="simple-payment-form__split">
          <label class="editor-field">
            <span class="editor-field__label">Country</span>
            <select class="editor-input" name="country">${getCountryOptionsMarkup()}</select>
          </label>
          <label class="editor-field">
            <span class="editor-field__label">Full name</span>
            <input class="editor-input" type="text" name="walletName" placeholder="Account holder name" required />
          </label>
        </div>
        <label class="editor-field">
          <span class="editor-field__label">${walletLabel}</span>
          <input class="editor-input" type="tel" name="walletNumber" placeholder="Enter mobile wallet number" required />
        </label>
        <label class="editor-field">
          <span class="editor-field__label">Reference</span>
          <input class="editor-input" type="text" name="walletRef" placeholder="Optional payment reference" />
        </label>
      </div>
    `;
  }

  if (methodKey === "paypal") {
    return `
      <div class="simple-wallet-box">
        <p class="simple-wallet-box__title">PayPal payment</p>
        <label class="editor-field">
          <span class="editor-field__label">PayPal email</span>
          <input class="editor-input" type="email" name="paypalEmail" placeholder="paypal@example.com" required />
        </label>
        <div class="simple-payment-inline-note">You will connect this action to your PayPal flow later.</div>
      </div>
    `;
  }

  if (methodKey === "bank") {
    return `
      <div class="simple-wallet-box">
        <p class="simple-wallet-box__title">Bank transfer</p>
        <div class="simple-payment-form__split">
          <label class="editor-field">
            <span class="editor-field__label">Bank name</span>
            <input class="editor-input" type="text" name="bankName" placeholder="Your bank name" required />
          </label>
          <label class="editor-field">
            <span class="editor-field__label">Account name</span>
            <input class="editor-input" type="text" name="bankAccountName" placeholder="Account holder name" required />
          </label>
        </div>
        <div class="simple-payment-form__split">
          <label class="editor-field">
            <span class="editor-field__label">Account number</span>
            <input class="editor-input" type="text" name="bankAccountNumber" placeholder="Account number" required />
          </label>
          <label class="editor-field">
            <span class="editor-field__label">Swift / routing</span>
            <input class="editor-input" type="text" name="bankRouting" placeholder="Routing or SWIFT code" />
          </label>
        </div>
      </div>
    `;
  }

  if (methodKey === "applepay" || methodKey === "googlepay") {
    const walletName = methodKey === "applepay" ? "Apple Pay" : "Google Pay";
    return `
      <div class="simple-wallet-box simple-wallet-box--centered">
        <div class="simple-wallet-pill">${escapeHtml(walletName)}</div>
        <p class="simple-payment-inline-note">Use this button as your hosted wallet action.</p>
      </div>
    `;
  }

  return `
    <div class="simple-payment-form__split">
      <label class="editor-field">
        <span class="editor-field__label">Country</span>
        <select class="editor-input" name="country">${getCountryOptionsMarkup()}</select>
      </label>
      <label class="editor-field">
        <span class="editor-field__label">Cardholder name</span>
        <input class="editor-input" type="text" name="cardholderName" placeholder="Name on card" required />
      </label>
    </div>

    <label class="editor-field">
      <span class="editor-field__label">Card number</span>
      <div class="simple-card-input-wrap">
        <input class="editor-input" id="card-number-input" type="text" inputmode="numeric" autocomplete="cc-number" placeholder="1234 1234 1234 1234" required />
        <span class="simple-card-brand" id="simple-card-brand" data-brand="card">Card</span>
      </div>
      <div class="simple-card-icons" aria-hidden="true">
        <span class="simple-card-icons__item">VISA</span>
        <span class="simple-card-icons__item">MC</span>
        <span class="simple-card-icons__item">AMEX</span>
        <span class="simple-card-icons__item">DISC</span>
      </div>
    </label>

    <div class="simple-payment-form__split simple-payment-form__split--compact">
      <label class="editor-field">
        <span class="editor-field__label">Expiry</span>
        <input class="editor-input" id="card-expiry-input" type="text" inputmode="numeric" autocomplete="cc-exp" placeholder="MM / YY" required />
      </label>
      <label class="editor-field">
        <span class="editor-field__label">CVC</span>
        <input class="editor-input" id="card-cvc-input" type="text" inputmode="numeric" autocomplete="cc-csc" placeholder="CVC" required />
      </label>
    </div>
  `;
}

function detectCardBrand(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) return { label: "Card", key: "card" };
  if (/^4/.test(digits)) return { label: "Visa", key: "visa" };
  if (/^(5[1-5]|2(2[2-9]|[3-6]|7[01]|720))/.test(digits)) return { label: "Mastercard", key: "mastercard" };
  if (/^3[47]/.test(digits)) return { label: "Amex", key: "amex" };
  if (/^6(?:011|5|4[4-9])/.test(digits)) return { label: "Discover", key: "discover" };
  if (/^(50|56|57|58|6)/.test(digits)) return { label: "Debit", key: "debit" };
  return { label: "Card", key: "card" };
}

function formatCardNumber(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

function bindCardInputs(container) {
  const cardInput = container.querySelector("#card-number-input");
  const expiryInput = container.querySelector("#card-expiry-input");
  const cvcInput = container.querySelector("#card-cvc-input");
  const brandBadge = container.querySelector("#simple-card-brand");

  cardInput?.addEventListener("input", () => {
    cardInput.value = formatCardNumber(cardInput.value);
    const brand = detectCardBrand(cardInput.value);
    if (brandBadge) {
      brandBadge.textContent = brand.label;
      brandBadge.dataset.brand = brand.key;
    }
  });

  expiryInput?.addEventListener("input", () => {
    expiryInput.value = formatExpiry(expiryInput.value);
  });

  cvcInput?.addEventListener("input", () => {
    cvcInput.value = String(cvcInput.value || "").replace(/\D/g, "").slice(0, 4);
  });
}

function renderNotFound() {
  document.title = "MAI+ | PPV Payment";
  checkoutRoot.innerHTML = `
    <section class="payment-card payment-card--full simple-payment-empty">
      <p class="section-heading__eyebrow">PPV payment</p>
      <h1>We couldn\'t find that event.</h1>
      <p>Go back to the event page and try opening the payment page again.</p>
      <div class="simple-payment-actions">
        <a class="button button--primary" href="${withPreviewParam("./index.html")}">Back to catalogue</a>
      </div>
    </section>
  `;
}

function renderCheckout(item) {
  const methods = getMethodKeys(item);
  const initialMethod = methods[0] || "card";
  const paymentPortal = String(item?.ppvPortalUrl || "").trim();
  const eventDate = formatEventDate(item?.ppvEventDate);
  const priceLabel = getPriceLabel(item);
  const backHref = getWatchHref(item);

  document.title = `MAI+ | ${item.title} Payment`;
  backLink.href = backHref;

  checkoutRoot.innerHTML = `
    <section class="simple-payment-hero">
      <div class="simple-payment-copy">
        <p class="section-heading__eyebrow">Pay Per View</p>
        <h1>${escapeHtml(item.title)}</h1>
        <p>${escapeHtml(item.ppvAccessNote || "Complete payment below to unlock this PPV event.")}</p>
        <div class="simple-payment-meta">
          <span class="simple-payment-meta__item"><strong>Price</strong><span>${escapeHtml(priceLabel)}</span></span>
          ${eventDate ? `<span class="simple-payment-meta__item"><strong>Event time</strong><span>${escapeHtml(eventDate)}</span></span>` : ""}
          ${item.ppvProvider ? `<span class="simple-payment-meta__item"><strong>Provider</strong><span>${escapeHtml(item.ppvProvider)}</span></span>` : ""}
        </div>
      </div>
    </section>

    <section class="simple-payment-grid">
      <article class="payment-card simple-payment-card">
        <div class="payment-card__header">
          <div>
            <p class="section-heading__eyebrow">Payment details</p>
            <h2>Complete your purchase</h2>
          </div>
        </div>

        <form class="simple-payment-form" id="simple-payment-form">
          <label class="editor-field">
            <span class="editor-field__label">Email address</span>
            <input class="editor-input" type="email" placeholder="you@example.com" required />
          </label>

          <div class="simple-method-selector" id="simple-method-selector">
            ${methods.map((methodKey) => getMethodButtonMarkup(methodKey, methodKey === initialMethod)).join("")}
          </div>

          <div id="simple-method-fields"></div>

          <div class="simple-payment-actions">
            ${paymentPortal ? `<a class="button button--primary" href="${escapeHtml(paymentPortal)}" target="_blank" rel="noopener noreferrer">Open payment portal</a>` : `<button class="button button--primary" id="simple-pay-button" type="submit">Pay ${escapeHtml(priceLabel)}</button>`}
            <a class="button button--secondary" href="${backHref}">Back to event</a>
          </div>
        </form>
      </article>

      <aside class="payment-card simple-payment-card simple-payment-card--summary">
        <div class="payment-card__header">
          <div>
            <p class="section-heading__eyebrow">Order summary</p>
            <h2>${escapeHtml(item.title)}</h2>
          </div>
        </div>
        <div class="simple-payment-summary">
          <div class="simple-payment-summary__row"><span>Event access</span><strong>${escapeHtml(priceLabel)}</strong></div>
          <div class="simple-payment-summary__row"><span>Service fee</span><strong>Included</strong></div>
          <div class="simple-payment-summary__row simple-payment-summary__row--total"><span>Total</span><strong>${escapeHtml(priceLabel)}</strong></div>
        </div>
        <p class="payment-mini-meta">Select your payment method and continue with your PPV flow.</p>
      </aside>
    </section>
  `;

  const form = document.getElementById("simple-payment-form");
  const methodSelector = document.getElementById("simple-method-selector");
  const methodFields = document.getElementById("simple-method-fields");
  const payButton = document.getElementById("simple-pay-button");
  let activeMethod = initialMethod;

  function renderMethodFields() {
    methodFields.innerHTML = getMethodFieldsMarkup(activeMethod);
    bindCardInputs(methodFields);
    methodSelector?.querySelectorAll("[data-method]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.method === activeMethod);
    });
  }

  methodSelector?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-method]");
    if (!button) return;
    activeMethod = button.dataset.method || "card";
    renderMethodFields();
  });

  renderMethodFields();

  form?.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    if (payButton) {
      const originalLabel = payButton.textContent;
      payButton.textContent = "Processing…";
      payButton.disabled = true;
      window.setTimeout(() => {
        unlockItem(item, activeMethod);
        payButton.textContent = "Access unlocked";
        window.setTimeout(() => {
          window.location.href = getSuccessRedirectHref(item);
        }, 450);
      }, 700);
    }
  });
}

const show = getShow();
if (!show) {
  renderNotFound();
} else {
  renderCheckout(show);
}
