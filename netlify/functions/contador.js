const fs = require("fs");
const path = require("path");

exports.handler = async (event) => {
  const modo = event.queryStringParameters?.modo;

  if (modo === "ver") {
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
  }

  const pagina = event.queryStringParameters?.pagina || "/";
  const nome = pagina.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const ARQUIVO = path.join("/tmp", "hits_" + nome);

  let count = 0;
  try {
    if (fs.existsSync(ARQUIVO)) {
      count = parseInt(fs.readFileSync(ARQUIVO, "utf8").trim() || "0", 10);
    }
  } catch (e) {}

  count++;
  fs.writeFileSync(ARQUIVO, String(count));

  return {
    statusCode: 200,
    body: String(count).padStart(7, "0"),
  };
};
