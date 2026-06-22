const fs = require("fs");
const path = require("path");

// DEFINA SUA SENHA AQUI
const SENHA_CORRETA = "MoneyMachine"; 

exports.handler = async (event) => {
  const modo = event.queryStringParameters?.modo;
  const pagina = event.queryStringParameters?.pagina;
  const botao = event.queryStringParameters?.botao;

  // MODO PAINEL (VER TUDO)
  if (modo === "ver") {
    const cookies = event.headers.cookie || "";
    const logado = cookies.includes(`sessao_contador=${SENHA_CORRETA}`);

    // Se o usuário enviou o formulário de login (POST)
    if (event.httpMethod === "POST" && event.body) {
      try {
        const params = new URLSearchParams(event.body);
        const senhaDigitada = params.get("password");

        if (senhaDigitada === SENHA_CORRETA) {
          // Senha correta: define o cookie e recarrega a página
          return {
            statusCode: 302,
            headers: {
              "Set-Cookie": `sessao_contador=${SENHA_CORRETA}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax`,
              "Location": "/.netlify/functions/contador?modo=ver"
            },
            body: ""
          };
        } else {
          // Senha incorreta: exibe tela de login com erro
          return {
            statusCode: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
            body: obterTelaLogin(true)
          };
        }
      } catch (e) {}
    }

    // Se quer fazer Logout
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

    // Se não estiver logado, mostra tela de login
    if (!logado) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: obterTelaLogin(false)
      };
    }

    // SE ESTIVER LOGADO -> MOSTRA O PAINEL
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
      ? `<tr><td colspan="2" style="text-align:center;padding:40px;color:#666;">Nenhum registro ainda</td></tr>`
      : items.map(i => `<tr>
            <td style="padding:10px 16px;border-bottom:1px solid #333;">${i.nome}</td>
            <td style="padding:10px 16px;border-bottom:1px solid #333;text-align:right;font-family:monospace;font-size:1.2em;color:#4ade80;">${i.count.padStart(7, "0")}</td>
          </tr>`).join("");

    const sum = (items) => items.reduce((s, i) => s + (parseInt(i.count, 10) || 0), 0);

    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Contador de Visitas</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0f0f0f;color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:32px;width:100%;max-width:560px;box-shadow:0 8px 32px rgba(0,0,0,.4)}
.header-box{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
h2{font-size:1.3em;font-weight:600;color:#fff}
.sub{color:#888;font-size:.85em;margin-top:2px}
.btn-logout{background:transparent;border:1px solid #444;color:#aaa;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:.8em;text-decoration:none}
.btn-logout:hover{background:#2a2a2a;color:#fff}
table{width:100%;border-collapse:collapse;margin-bottom:28px}
th{text-align:left;padding:8px 16px;font-size:.75em;text-transform:uppercase;letter-spacing:.05em;color:#888;border-bottom:2px solid #333}
.total{display:flex;justify-content:space-between;padding:16px;margin-top:12px;background:#111;border-radius:8px;border:1px solid #2a2a2a}
.total span:first-child{color:#888;font-size:.9em}
.total span:last-child{font-family:monospace;font-size:1.4em;font-weight:700;color:#4ade80}
.footer{margin-top:20px;text-align:center;font-size:.75em;color:#555}
</style>
</head>
<body>
<div class="card">
<div class="header-box">
  <div>
    <h2>📊 Painel de Controle</h2>
    <div class="sub">Métricas de tráfego e interações</div>
  </div>
  <a href="/.netlify/functions/contador?modo=ver&action=logout" class="btn-logout">Sair</a>
</div>
<h2>📄 Visitas por Página</h2>
<div class="sub" style="margin-bottom:12px">Contagem de acessos individuais</div>
<table>
<thead><tr><th>Página</th><th>Visitas</th></tr></thead>
<tbody>${makeRows(rowsPag)}</tbody>
</table>
<h2>👆 Cliques em Botões</h2>
<div class="sub" style="margin-bottom:12px">Ações geradas pelos usuários</div>
<table>
<thead><tr><th>Botão</th><th>Cliques</th></tr></thead>
<tbody>${makeRows(rowsBtn)}</tbody>
</table>
<div class="total">
<span>Total geral de ações</span>
<span>${String(sum(rowsPag) + sum(rowsBtn)).padStart(7, "0")}</span>
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
body{background:#0f0f0f;color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.login-card{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:40px 32px;width:100%;max-width:400px;box-shadow:0 8px 32px rgba(0,0,0,.5);text-align:center}
h2{font-size:1.4em;font-weight:600;margin-bottom:8px;color:#fff}
p{color:#888;font-size:.85em;margin-bottom:24px}
input[type="password"]{width:100%;background:#111;border:1px solid #333;padding:12px 16px;border-radius:8px;color:#fff;font-size:1em;margin-bottom:16px;outline:none;text-align:center}
input[type="password"]:focus{border-color:#4ade80}
button{width:100%;background:#4ade80;color:#000;border:none;padding:12px;border-radius:8px;font-size:1em;font-weight:600;cursor:pointer;transition:background .2s}
button:hover{background:#3ec972}
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
