const { getStore, list } = require("@netlify/blobs");

exports.handler = async () => {
  const store = getStore("contador");
  const { blobs } = await list({ storeName: "contador" });

  let html = "<pre style='font-family:monospace;padding:20px'>";
  html += "<h2>Contadores</h2>\n";
  for (const blob of blobs) {
    const nome = blob.key.replace("hits_", "");
    const count = await store.get(blob.key);
    html += `${nome.padEnd(35)} ${(count || "0").padStart(7, "0")}\n`;
  }
  html += blobs.length === 0 ? "Nenhuma visita ainda.\n" : "";
  html += "</pre>";

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: html,
  };
};
