const fs = require("fs");
const path = require("path");

// DEFINA SUA SENHA MESTRA AQUI
const SENHA_CORRETA = "admin123"; 

exports.handler = async (event) => {
  const modo = event.queryStringParameters?.modo;
  const pagina = event.queryStringParameters?.pagina;
  const botao = event.queryStringParameters?.botao;

  // MODO PAINEL (VER TUDO COM FRAMEWORK ANIMADO DE CHUVA DE COMANDOS)
  if (modo === "ver") {
    const cookies = event.headers.cookie || "";
    const logado = cookies.includes(`sessao_contador=${SENHA_CORRETA}`);

    // Processamento de Login (POST)
    if (event.httpMethod === "POST" && event.body) {
      try {
        const params = new URLSearchParams(event.body);
        const senhaDigitada = params.get("password");

        if (senhaDigitada === SENHA_CORRETA) {
          return {
            statusCode: 302,
            headers: {
              "Set-Cookie": `sessao_contador=${SENHA_CORRETA}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax`,
              "Location": "/.netlify/functions/contador?modo=ver"
            },
            body: ""
          };
        } else {
          return {
            statusCode: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
            body: obterTelaLogin(true)
          };
        }
      } catch (e) {}
    }

    // Processamento de Logout (Sair)
    if (event.queryStringParameters?.action === "logout") {
      return {
        statusCode: 302,
        headers: {
          "Set-Cookie": "sessao_contador=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
          "Location": "/.netlify/functions/contador?modo=ver"
        },
        body: ""
      };
    }

    // Se não estiver logado, joga para a tela de login
    if (!logado) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: obterTelaLogin(false)
      };
    }

    // CONSTRUÇÃO DAS METRICAS DE TRÁFEGO SEGURO (LOGADO)
    const arquivos = fs.readdirSync("/tmp").filter(f => f.startsWith("hits_") || f.startsWith("clique_"));

    const rowsPag = [];
    const rowsBtn = [];

    for (const f of arquivos) {
      const count = fs.readFileSync("/tmp/" + f, "utf8").trim();
      if (f.startsWith("hits_")) {
        const nome = f.replace("hits_", "").replace(/_/g, "/");
        rowsPag.push({ nome, count });
      } else if (f.startsWith("clique_")) {
        const nome = f.replace("clique_", "");
        rowsBtn.push({ nome, count });
      }
    }

    const makeRows = (items) => items.length === 0
      ? `<tr><td colspan="2" style="text-align:center;padding:40px;color:#435462;">Nenhum registro ainda</td></tr>`
      : items.map(i => `<tr>
            <td style="padding:12px;border-bottom:1px solid #0d141e;">${i.nome}</td>
            <td style="padding:12px;border-bottom:1px solid #0d141e;text-align:right;color:#00f0ff;font-family:'SFMono-Regular',Consolas,monospace;font-weight:bold;">${i.count.padStart(7, "0")}</td>
          </tr>`).join("");

    const sum = (items) => items.reduce((s, i) => s + (parseInt(i.count, 10) || 0), 0);

    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SYS_MONITOR // SEATUP</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}

body {
  background: #020406;
  color: #abb2bf;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
  pointer-events: none;
}

.card {
  background: rgba(9, 13, 20, 0.94);
  border: 1px solid #14212d;
  border-radius: 8px;
  padding: 32px;
  width: 100%;
  max-width: 560px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 240, 255, 0.05);
  position: relative;
  z-index: 2;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.header-box {
  border-bottom: 1.5px solid #14212d;
  padding-bottom: 20px;
  margin-bottom: 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h2 {
  font-size: 1.1em;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: #ffffff;
  margin-bottom: 8px;
}

.sub {
  color: #435462;
  font-size: 0.8em;
}

.btn-logout {
  background: #14212d;
  border: 1px solid #1e3140;
  color: #abb2bf;
  padding: 8px 14px;
  border-radius: 4px;
  font-size: 0.75em;
  text-decoration: none;
  transition: all 0.2s ease;
}

.btn-logout:hover {
  background: #1e3140;
  color: #ffffff;
  border-color: #274352;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 32px;
}

th {
  text-align: left;
  padding: 8px 12px;
  font-size: 0.7em;
  font-weight: 600;
  text-transform: uppercase;
  color: #435462;
  border-bottom: 1.5px solid #14212d;
  letter-spacing: 0.5px;
}

.total {
  background: #05080c;
  border: 1px solid #14212d;
  border-radius: 6px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
}

.total span:first-child {
  color: #435462;
  font-size: 0.85em;
}

.total span:last-child {
  color: #00f0ff;
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 1.25em;
  font-weight: 700;
}

.footer {
  color: #2b3941;
  font-size: 0.7em;
  letter-spacing: 0.3px;
  margin-top: 24px;
  text-align: center;
}
</style>
</head>
<body>

<canvas id="hacker-canvas"></canvas>

<div class="card">
  <div class="header-box">
    <div>
      <h2>📊 Sistema de Monitoramento</h2>
      <div class="sub">Métricas de tráfego e interações</div>
    </div>
    <a href="/.netlify/functions/contador?modo=ver&action=logout" class="btn-logout">Desconectar</a>
  </div>

  <h2>📄 Visitas por Página</h2>
  <div class="sub" style="margin-bottom:12px">Contagem de acessos individuais</div>
  <table>
    <thead><tr><th>Endpoint</th><th>Visitas</th></tr></thead>
    <tbody>${makeRows(rowsPag)}</tbody>
  </table>

  <h2>👆 Cliques em Botões</h2>
  <div class="sub" style="margin-bottom:12px">Ações geradas pelos usuários</div>
  <table>
    <thead><tr><th>Evento</th><th>Cliques</th></tr></thead>
    <tbody>${makeRows(rowsBtn)}</tbody>
  </table>

  <div class="total">
    <span>Volume Total de Tráfego</span>
    <span>${String(sum(rowsPag) + sum(rowsBtn)).padStart(7, "0")}</span>
  </div>
  <div class="footer">Secure Metrics Gateway • SeatUp</div>
</div>

<script>
const canvas = document.getElementById('hacker-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const hackerCommands = [
  "root@kali:~# nmap -sS -Pn meek-phoenix-9f539d",
  "PORT 443/TCP OPEN Netlify_CDN_Route",
  "[SYSTEM] listening on interface: edge_routing0",
  "root@kali:~# tail -f /var/log/seatup-click-webhook.log",
  "[EVENT] dispatching action: sim_ja_paguei",
  "[TELEGRAM] sent payload with exit_code: 200",
  "GET /.netlify/functions/contador?modo=ver",
  "[RPC] eth_subscribe: pending_transactions",
  "0x93798BFE79C22Bdc08B5300fCcF0Bda297746497",
  "[SYSTEM_OK] db_tmpfs_pointer: active",
  "HTTP_STREAM: chunked_transfer_allowed=true",
  "IP_SOURCE: bypass_proxy_activated"
];

const fontSize = 11;
const columns = Math.floor(canvas.width / 185); 
const drops = Array(columns).fill(0).map(() => Math.random() * -30); 

function drawMatrix() {
  ctx.fillStyle = "rgba(2, 4, 6, 0.12)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = "11px 'SFMono-Regular', Consolas, monospace";

  for (let i = 0; i < drops.length; i++) {
    const text = hackerCommands[Math.floor(Math.random() * hackerCommands.length)];
    const x = i * 190 + 10;
    const y = drops[i] * fontSize;

    ctx.fillStyle = "rgba(7, 24, 34, 0.25)"; 
    if (Math.random() > 0.97) {
      ctx.fillStyle = "rgba(0, 240, 255, 0.4)"; 
    }

    ctx.fillText(text, x, y);

    if (y > canvas.height && Math.random() > 0.98) {
      drops[i] = 0;
    }
    drops[i] += 0.8; 
  }
}

setInterval(drawMatrix, 35);
</script>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: html,
    };
  }

  // MODO CLIQUE (INCREMENTA CLIQUE)
  if (modo === "clique") {
    const nome = (botao || "desconhecido").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    const ARQUIVO = path.join("/tmp", "clique_" + nome);

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
      body: "OK",
    };
  }

  // MODO NORMAL (INCREMENTA PÁGINA)
  const nomePagina = (pagina || "/").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const ARQUIVO_PAG = path.join("/tmp", "hits_" + nomePagina);

  let countPag = 0;
  try {
    if (fs.existsSync(ARQUIVO_PAG)) {
      countPag = parseInt(fs.readFileSync(ARQUIVO_PAG, "utf8").trim() || "0", 10);
    }
  } catch (e) {}

  countPag++;
  fs.writeFileSync(ARQUIVO_PAG, String(countPag));

  return {
    statusCode: 200,
    body: String(countPag).padStart(7, "0"),
  };
};

// HTML DO FORMULÁRIO DE LOGIN
function obterTelaLogin(comErro) {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Restrito - Login</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#020406;color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.login-card{background:#090d14;border:1px solid #14212d;border-radius:12px;padding:40px 32px;width:100%;max-width:400px;box-shadow:0 8px 32px rgba(0,0,0,.5);text-align:center}
h2{font-size:1.4em;font-weight:600;margin-bottom:8px;color:#fff}
p{color:#435462;font-size:.85em;margin-bottom:24px}
input[type="password"]{width:100%;background:#05080c;border:1px solid #14212d;padding:12px 16px;border-radius:8px;color:#fff;font-size:1em;margin-bottom:16px;outline:none;text-align:center}
input[type="password"]:focus{border-color:#00f0ff}
button{width:100%;background:#00f0ff;color:#000;border:none;padding:12px;border-radius:8px;font-size:1em;font-weight:600;cursor:pointer;transition:background .2s}
button:hover{background:#3df6ff}
.err-msg{color:#f87171;font-size:.8em;margin-bottom:16px}
</style>
</head>
<body>
<div class="login-card">
  <h2>Acesso Restrito</h2>
  <p>Insira a senha mestra para visualizar o painel</p>
  <form method="POST" action="/.netlify/functions/contador?modo=ver">
    <input type="password" name="password" placeholder="Digite a senha..." autofocus required>
    ${comErro ? `<div class="err-msg">Senha incorreta, tente novamente.</div>` : ""}
    <button type="submit">Entrar</button>
  </form>
</div>
</body>
</html>`;
}
