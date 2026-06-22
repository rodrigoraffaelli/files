const fs = require("fs");
const path = require("path");

exports.handler = async (event) => {
  const modo = event.queryStringParameters?.modo;

  if (modo === "ver") {
    const arquivos = fs.readdirSync("/tmp").filter(f => f.startsWith("hits_"));

    const rows = arquivos.length === 0
      ? `<tr><td colspan="2" style="text-align:center;padding:40px;color:#666;">Nenhuma visita ainda</td></tr>`
      : arquivos.map(f => {
          const nome = f.replace("hits_", "").replace(/_/g, "/");
          const count = fs.readFileSync("/tmp/" + f, "utf8").trim();
          return `<tr>
            <td style="padding:10px 16px;border-bottom:1px solid #333;">${nome}</td>
            <td style="padding:10px 16px;border-bottom:1px solid #333;text-align:right;font-family:monospace;font-size:1.2em;color:#4ade80;">${count.padStart(7, "0")}</td>
          </tr>`;
        }).join("");

    const total = arquivos.reduce((sum, f) => {
      const c = fs.readFileSync("/tmp/" + f, "utf8").trim();
      return sum + (parseInt(c, 10) || 0);
    }, 0);

    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Contador de Visitas</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0f0f0f;color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
.card{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:32px;width:100%;max-width:560px;box-shadow:0 8px 32px rgba(0,0,0,.4)}
h2{font-size:1.3em;font-weight:600;margin-bottom:8px;color:#fff}
.sub{color:#888;font-size:.85em;margin-bottom:24px}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:8px 16px;font-size:.75em;text-transform:uppercase;letter-spacing:.05em;color:#888;border-bottom:2px solid #333}
.total{display:flex;justify-content:space-between;padding:16px;margin-top:16px;background:#111;border-radius:8px;border:1px solid #2a2a2a}
.total span:first-child{color:#888;font-size:.9em}
.total span:last-child{font-family:monospace;font-size:1.4em;font-weight:700;color:#4ade80}
.footer{margin-top:20px;text-align:center;font-size:.75em;color:#555}
</style>
</head>
<body>
<div class="card">
<h2>📊 Contador de Visitas</h2>
<div class="sub">Cada página monitorada individualmente</div>
<table>
<thead><tr><th>Página</th><th>Visitas</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<div class="total">
<span>Total geral</span>
<span>${String(total).padStart(7, "0")}</span>
</div>
<div class="footer">SeatUp · Atualize a página para ver novos números</div>
</div>
</body>
</html>`;

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
