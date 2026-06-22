const fs = require("fs");

exports.handler = async () => {
  const arquivos = fs.readdirSync("/tmp").filter(f => f.startsWith("hits_"));

  let html = "<pre style='font-family:monospace;padding:20px'>";
  html += "<h2>Contadores</h2>\n";

  if (arquivos.length === 0) {
    html += "Nenhuma visita ainda.\n";
  }

  for (const f of arquivos) {
    const nome = f.replace("hits_", "").replace(/_/g, "/");
    const count = fs.readFileSync("/tmp/" + f, "utf8").trim();
    html += `${nome.padEnd(35)} ${count.padStart(7, "0")}\n`;
  }
  html += "</pre>";

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: html,
  };
};
