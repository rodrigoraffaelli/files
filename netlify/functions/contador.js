const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const store = getStore("contador");
  const pagina = event.queryStringParameters?.pagina || "/";
  const chave = "hits_" + pagina.toLowerCase();

  let count = 0;
  try {
    const atual = await store.get(chave);
    count = atual ? parseInt(atual, 10) : 0;
  } catch (e) {}

  count++;
  await store.set(chave, String(count));

  return {
    statusCode: 200,
    body: String(count).padStart(7, "0"),
  };
};
