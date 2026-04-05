function convert(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(convert);
  return value;
}

window.addEventListener("message", async function (event) {
  const data = event && event.data;
  if (!data) return;

  const key = data.key;
  const params = data.params;

  if (!key || !Array.isArray(params)) return;

  let result;
  let error;

  try {
    result = await window.function(...params);
  } catch (e) {
    result = undefined;
    try {
      error = e && e.toString ? e.toString() : "Unknown error";
    } catch {
      error = "Exception can't be stringified.";
    }
  }

  const response = { key };

  if (result !== undefined) {
    response.result = {
      type: "string",
      value: convert(result)
    };
  }

  if (error !== undefined) {
    response.error = error;
  }

  if (event.source && event.source.postMessage) {
    event.source.postMessage(response, "*");
  }
});
