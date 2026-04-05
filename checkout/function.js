(function () {
  function unwrap(param) {
    if (param && typeof param === "object" && "value" in param) return param.value;
    return param;
  }

  function isBlank(value) {
    return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
  }

  function asTrimmedString(param, fallback = "") {
    const value = unwrap(param);
    if (value === undefined || value === null) return fallback;
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

  function parseJsonParam(name, param) {
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

  function base64UrlEncodeUtf8(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }

    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
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
    debug
  ) {
    const webhook = asTrimmedString(webhook_url);
    const checkoutMode = asTrimmedString(mode, "payment") || "payment";
    const successUrl = asTrimmedString(success_url);
    const cancelUrl = asTrimmedString(cancel_url);

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

    addIfPresent(payload, "line_items", parseJsonParam("line_items", line_items));
    addIfPresent(payload, "discounts", parseJsonParam("discounts", discounts));
    addIfPresent(payload, "metadata", parseJsonParam("metadata", metadata));
    addIfPresent(payload, "invoice_creation", parseJsonParam("invoice_creation", invoice_creation));
    addIfPresent(payload, "payment_intent_data", parseJsonParam("payment_intent_data", payment_intent_data));
    addIfPresent(payload, "subscription_data", parseJsonParam("subscription_data", subscription_data));
    addIfPresent(payload, "phone_number_collection", parseJsonParam("phone_number_collection", phone_number_collection));
    addIfPresent(payload, "shipping_address_collection", parseJsonParam("shipping_address_collection", shipping_address_collection));
    addIfPresent(payload, "automatic_tax", parseJsonParam("automatic_tax", automatic_tax));
    addIfPresent(payload, "tax_id_collection", parseJsonParam("tax_id_collection", tax_id_collection));
    addIfPresent(payload, "payment_method_types", parseJsonParam("payment_method_types", payment_method_types));

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

    const launcherConfig = {
      webhook_url: webhook,
      payload: payload,
      debug: asBoolean(debug) === true
    };

    const checkoutPageUrl = new URL("checkout.html", window.location.href);
    checkoutPageUrl.hash = base64UrlEncodeUtf8(JSON.stringify(launcherConfig));

    return checkoutPageUrl.toString();
  };
})();
