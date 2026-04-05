window.function = function (webhook_url, mode, success_url, cancel_url, customer_email, client_reference_id, line_items, discounts, metadata, invoice_creation, payment_intent_data, subscription_data, locale, billing_address_collection, phone_number_collection, shipping_address_collection, allow_promotion_codes, automatic_tax, tax_id_collection, payment_method_types, expires_at) {
    const getVal = (p, def) => {
        if (p === null || p === undefined) return def;
        if (typeof p === "object" && "value" in p) return p.value ?? def;
        return p ?? def;
    };
    const webhook = String(getVal(webhook_url, "")).trim();
    if (!webhook) throw new Error("webhook_url is required");
    const payload = {};
    if (mode) payload.mode = String(getVal(mode, "payment")).trim();
    if (success_url) payload.success_url = String(getVal(success_url, "")).trim();
    if (cancel_url) payload.cancel_url = String(getVal(cancel_url, "")).trim();
    if (customer_email) payload.customer_email = String(getVal(customer_email, "")).trim();
    if (client_reference_id) payload.client_reference_id = String(getVal(client_reference_id, "")).trim();
    const parseJson = (field, name) => { if (!field) return null; const val = String(getVal(field, "")).trim(); if (!val) return null; try { return JSON.parse(val); } catch (e) { return null; } };
    if (line_items) { const parsed = parseJson(line_items, "line_items"); if (parsed) payload.line_items = parsed; }
    if (discounts) { const parsed = parseJson(discounts, "discounts"); if (parsed) payload.discounts = parsed; }
    if (metadata) { const parsed = parseJson(metadata, "metadata"); if (parsed) payload.metadata = parsed; }
    if (invoice_creation) { const parsed = parseJson(invoice_creation, "invoice_creation"); if (parsed) payload.invoice_creation = parsed; }
    if (payment_intent_data) { const parsed = parseJson(payment_intent_data, "payment_intent_data"); if (parsed) payload.payment_intent_data = parsed; }
    if (subscription_data) { const parsed = parseJson(subscription_data, "subscription_data"); if (parsed) payload.subscription_data = parsed; }
    if (locale) payload.locale = String(getVal(locale, "")).trim();
    if (billing_address_collection) payload.billing_address_collection = String(getVal(billing_address_collection, "")).trim();
    if (phone_number_collection) { const parsed = parseJson(phone_number_collection, "phone_number_collection"); if (parsed) payload.phone_number_collection = parsed; }
    if (shipping_address_collection) { const parsed = parseJson(shipping_address_collection, "shipping_address_collection"); if (parsed) payload.shipping_address_collection = parsed; }
    if (allow_promotion_codes) payload.allow_promotion_codes = String(getVal(allow_promotion_codes, "")).trim() === "true";
    if (automatic_tax) { const parsed = parseJson(automatic_tax, "automatic_tax"); if (parsed) payload.automatic_tax = parsed; }
    if (tax_id_collection) { const parsed = parseJson(tax_id_collection, "tax_id_collection"); if (parsed) payload.tax_id_collection = parsed; }
    if (payment_method_types) { const parsed = parseJson(payment_method_types, "payment_method_types"); if (parsed) payload.payment_method_types = parsed; }
    if (expires_at) payload.expires_at = parseInt(String(getVal(expires_at, "")).trim());
    return fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(res => res.text()).then(text => { let checkoutUrl; try { const data = JSON.parse(text); checkoutUrl = data.checkout_url || data.url || data.session?.url; } catch (e) { checkoutUrl = String(text).replace(/^["']|["']$/g, "").trim(); } if (!checkoutUrl || !checkoutUrl.startsWith("http")) throw new Error("Invalid checkout URL returned"); window.location.href = checkoutUrl; return checkoutUrl; }).catch(err => { console.error("Checkout error:", err); throw err; }); };
