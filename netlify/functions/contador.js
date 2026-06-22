const fs = require("fs");
const path = require("path");

exports.handler = async (event) => {
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
