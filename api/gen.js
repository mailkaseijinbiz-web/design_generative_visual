/* Gemini への中継。キーは Vercel の環境変数 GEMINI_API_KEY にだけ置き、
   ブラウザには渡さない。使えるモデルは下の一覧に限る（キーの転用を防ぐ）。
   GET は設定の有無だけを返し、ページ側の「キー入力が要るか」の判定に使う。 */
const ALLOW = new Set([
  "gemini-2.5-flash-image",
  "gemini-3-pro-image-preview",
  "imagen-4.0-fast-generate-001",
  "gemini-2.5-flash"
]);
const ACTIONS = new Set(["generateContent", "predict"]);

module.exports = async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (req.method === "GET"){
    res.status(200).json({ configured: !!key });
    return;
  }
  if (req.method !== "POST"){
    res.status(405).json({ error: "POST only" });
    return;
  }
  if (!key){
    res.status(500).json({ error: "GEMINI_API_KEY が設定されていません（Vercel の Environment Variables）" });
    return;
  }
  const { model, action, body } = req.body || {};
  if (!ALLOW.has(model)){
    res.status(400).json({ error: "このモデルは中継しません" });
    return;
  }
  const act = ACTIONS.has(action) ? action : "generateContent";
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${act}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body || {})
    });
    const text = await r.text();
    res.status(r.status).setHeader("content-type", "application/json").send(text);
  } catch (e) {
    res.status(502).json({ error: "上流に届きませんでした：" + (e && e.message || e) });
  }
};
