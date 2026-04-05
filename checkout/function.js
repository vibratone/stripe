(function () {
  function unwrap(param) {
    if (param && typeof param === "object" && "value" in param) return param.value;
    return param;
  }

  function isBlank(value) {
    return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
  }

  function asTrimmedString(param, fallback) {
    const value = unwrap(param);
    if (value === undefined || value === null) return fallback === undefined ? "" : fallback;
    return String(value).trim();
  }

  function asBoolean(param) {
    const value = unwrap(param);

    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "y"].includes(normalized)) return true;
      if (["false", "0", "no", "n", ""].includes(normalized)) return false;
    }

    return undefined;
  }

  function asInteger(param) {
    const value = unwrap(param);
    if (value === undefined || value === null || value === "") return undefined;

    const num = Number(value);
    if (!Number.isFinite(num)) {
      throw new Error("expires_at must be a valid Unix timestamp.");
    }

    return Math.trunc(num);
  }

  function parseMaybeJSON(name, param) {
    const value = unwrap(param);

    if (isBlank(value)) return undefined;
    if (typeof value === "object") return value;

    if (typeof value !== "string") {
      throw new Error(name + " must be JSON text.");
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      throw new Error(name + " contains invalid JSON.");
    }
  }

  function addIfPresent(target, key, value) {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    target[key] = value;
  }

  function safeJson(obj) {
    return JSON.stringify(obj)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  }

  function buildWidgetHtml(config) {
    const configJson = safeJson(config);

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: transparent;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    }

    #wrap {
      width: 100%;
      padding: 10px;
      box-sizing: border-box;
    }

    #pay-btn {
      width: 100%;
      background: #000000;
      color: #ffffff;
      padding: 12px 16px;
      border: 0;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      box-sizing: border-box;
    }

    #pay-btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.35);
      border-top-color: #fff;
      display: none;
      animation: spin 1s linear infinite;
      flex: 0 0 auto;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    #err {
      margin-top: 8px;
      font-size: 12px;
      color: #b91c1c;
      text-align: center;
      display: none;
      line-height: 1.35;
    }
  </style>
</head>
<body>
  <div id="wrap">
    <button id="pay-btn" type="button">
      <span id="txt">Pay with Stripe</span>
      <span class="spinner" id="sp"></span>
    </button>
    <div id="err"></div>
  </div>

  <script>
    const cfg = ${configJson};

    function flattenForStripe(obj, prefix = "", pairs = []) {
      if (obj === null || obj === undefined) return pairs;

      if (Array.isArray(obj)) {
        obj.forEach((value, index) => {
          flattenForStripe(value, \`\${prefix}[\${index}]\`, pairs);
        });
        return pairs;
      }

      if (typeof obj === "object") {
        Object.entries(obj).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") return;
          const nextPrefix = prefix ? \`\${prefix}[\${key}]\` : key;
          flattenForStripe(value, nextPrefix, pairs);
        });
        return pairs;
      }

      pairs.push([prefix, String(obj)]);
      return pairs;
    }

    function toStripeBody(payload) {
      const params = new URLSearchParams();
      const pairs = flattenForStripe(payload);

      for (const [key, value] of pairs) {
        params.append(key, value);
      }

      return params.toString();
    }

    function getCheckoutUrl(data, rawText) {
      if (data && typeof data === "object") {
        const fromObject =
          data.checkout_url ||
          data.url ||
          data.checkoutUrl ||
          data.session_url ||
          (data.data && (data.data.checkout_url || data.data.url)) ||
          (data.session && data.session.url);

        if (fromObject) return String(fromObject).trim();
      }

      if (typeof rawText === "string") {
        const stripped = rawText.replace(/^[\\"']|[\\"']$/g, "").trim();
        if (/^https?:\\/\\//i.test(stripped)) return stripped;
      }

      return "";
    }

    async function go() {
      const btn = document.getElementById("pay-btn");
      const sp = document.getElementById("sp");
      const txt = document.getElementById("txt");
      const err = document.getElementById("err");

      if (btn.disabled) return;

      err.style.display = "none";
      err.textContent = "";
      btn.disabled = true;
      sp.style.display = "inline-block";
      txt.textContent = "Securing checkout...";

      try {
        const stripePayload = {
          ...cfg.payload,
          ui_mode: "hosted_page"
        };

        const stripeBody = toStripeBody(stripePayload);

        const res = await fetch(cfg.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stripe_body: stripeBody
          })
        });

        const rawText = await res.text();

        let data;
        try {
          data = rawText ? JSON.parse(rawText) : {};
        } catch (_) {
          data = null;
        }

        if (!res.ok) {
          const message =
            (data && (data.message || data.error)) ||
            ("Gateway error " + res.status);
          throw new Error(message);
        }

        const checkoutUrl = getCheckoutUrl(data, rawText);

        if (!checkoutUrl || !/^https?:\\/\\//i.test(checkoutUrl)) {
          throw new Error("No valid checkout URL was returned.");
        }

        window.top.location.href = checkoutUrl;
      } catch (e) {
        console.error(e);
        btn.disabled = false;
        sp.style.display = "none";
        txt.textContent = cfg.button_text || "Pay with Stripe";
        err.textContent = "Connection failed. Please try again.";
        err.style.display = "block";
      }
    }

    document.getElementById("txt").textContent = cfg.button_text || "Pay with Stripe";
    document.getElementById("pay-btn").addEventListener("click", go);
  </script>
</body>
</html>`;
  }

  window.function = function (
    webhook_url,
    mode,
    success_url,
    cancel_url,
    customer_email,
    client_reference_id,
    line_items,
    discounts,
    metadata,
    invoice_creation,
    payment_intent_data,
    subscription_data,
    locale,
    billing_address_collection,
    phone_number_collection,
    shipping_address_collection,
    allow_promotion_codes,
    automatic_tax,
    tax_id_collection,
    payment_method_types,
    expires_at,
    button_text
  ) {
    const webhook = asTrimmedString(webhook_url);
    const checkoutMode = asTrimmedString(mode, "payment") || "payment";
    const successUrl = asTrimmedString(success_url);
    const cancelUrl = asTrimmedString(cancel_url);
    const buttonText = asTrimmedString(button_text, "Pay with Stripe") || "Pay with Stripe";

    if (!webhook) throw new Error("webhook_url is required.");
    if (!successUrl) throw new Error("success_url is required.");
    if (!cancelUrl) throw new Error("cancel_url is required.");

    const payload = {
      mode: checkoutMode,
      success_url: successUrl,
      cancel_url: cancelUrl
    };

    addIfPresent(payload, "customer_email", asTrimmedString(customer_email));
    addIfPresent(payload, "client_reference_id", asTrimmedString(client_reference_id));
    addIfPresent(payload, "locale", asTrimmedString(locale));
    addIfPresent(payload, "billing_address_collection", asTrimmedString(billing_address_collection));

    addIfPresent(payload, "line_items", parseMaybeJSON("line_items", line_items));
    addIfPresent(payload, "discounts", parseMaybeJSON("discounts", discounts));
    addIfPresent(payload, "metadata", parseMaybeJSON("metadata", metadata));
    addIfPresent(payload, "invoice_creation", parseMaybeJSON("invoice_creation", invoice_creation));
    addIfPresent(payload, "payment_intent_data", parseMaybeJSON("payment_intent_data", payment_intent_data));
    addIfPresent(payload, "subscription_data", parseMaybeJSON("subscription_data", subscription_data));
    addIfPresent(payload, "phone_number_collection", parseMaybeJSON("phone_number_collection", phone_number_collection));
    addIfPresent(payload, "shipping_address_collection", parseMaybeJSON("shipping_address_collection", shipping_address_collection));
    addIfPresent(payload, "automatic_tax", parseMaybeJSON("automatic_tax", automatic_tax));
    addIfPresent(payload, "tax_id_collection", parseMaybeJSON("tax_id_collection", tax_id_collection));
    addIfPresent(payload, "payment_method_types", parseMaybeJSON("payment_method_types", payment_method_types));

    const allowPromotionCodes = asBoolean(allow_promotion_codes);
    if (allowPromotionCodes !== undefined) {
      payload.allow_promotion_codes = allowPromotionCodes;
    }

    const expiresAt = asInteger(expires_at);
    if (expiresAt !== undefined) {
      payload.expires_at = expiresAt;
    }

    if ((checkoutMode === "payment" || checkoutMode === "subscription") && !Array.isArray(payload.line_items)) {
      throw new Error("line_items must be a JSON array for payment and subscription mode.");
    }

    const widgetConfig = {
      webhook_url: webhook,
      payload: payload,
      button_text: buttonText
    };

    const html = buildWidgetHtml(widgetConfig);
    return "data:text/html;charset=utf-8," + encodeURIComponent(html);
  };
})();
