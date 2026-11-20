const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

function send(res, status, data, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(typeof data === "string" ? data : JSON.stringify(data));
}
async function readBody(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 2_000_000) throw new Error("请求内容过大");
  }
  return raw ? JSON.parse(raw) : {};
}
const server = http.createServer(async (req, res) => {
  // The frontend is hosted separately from this API service.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS,HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/status" && req.method === "GET") {
    return send(res, 200, {
      configured: Boolean(process.env.DEEPSEEK_API_KEY),
      provider: "DeepSeek",
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat"
    });
  }
  if (url.pathname === "/api/chat" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const message = String(body.message || "").trim();
      if (!message) return send(res, 400, { error: "请输入问题" });
      const ownKey = String(body.apiKey || "").trim();
      const apiKey = ownKey || process.env.DEEPSEEK_API_KEY;
      if (!apiKey) return send(res, 503, {
        error: "请在模型设置中填写自己的 DeepSeek API 密钥，或由部署管理员配置平台密钥。"
      });
      const model = ownKey && body.model
        ? String(body.model).slice(0, 100)
        : (process.env.DEEPSEEK_MODEL || "deepseek-chat");
      const scope = body.scope === "single" ? "当前单篇论文" : "用户文献库中的全部论文";
      const context = String(body.context || "").slice(0, 24000);
      const mode = String(body.mode || "qa");
      const system = mode === "translate"
        ? "你是严谨的学术翻译助手。逐段翻译用户提供的论文内容，严格保留方括号编号，不总结、不解释、不遗漏数字、公式或引用。原文为英文时译为中文，原文为中文时译为英文。"
        : "你是研脉ResearchFlow的论文研究助手。回答必须只基于提供的论文上下文，不得编造页码、论文、数据或来源；证据不足时明确说明。当前问答范围：" + scope + "。优先引用上下文中的【论文名 · 段落范围】，用简洁中文回答，并在末尾列出证据来源。";
      const upstream = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", "authorization": "Bearer " + apiKey },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: "论文上下文：\n" + context + "\n\n用户问题：" + message }
          ],
          temperature: 0.2,
          max_tokens: 1800
        })
      });
      const data = await upstream.json();
      if (!upstream.ok) return send(res, upstream.status, {
        error: data?.error?.message || "模型服务调用失败"
      });
      return send(res, 200, {
        answer: data?.choices?.[0]?.message?.content || "模型未返回有效内容",
        model
      });
    } catch (err) {
      return send(res, 502, { error: err.message || "暂时无法连接模型服务，请稍后重试" });
    }
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, 405, { error: "Method not allowed" });
  }
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const file = path.resolve(root, "." + pathname);
  if (!file.startsWith(root + path.sep) && file !== path.join(root, "index.html")) {
    return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
  }
  fs.readFile(file, (err, content) => {
    if (err) return send(res, 404, "Not found", "text/plain; charset=utf-8");
    res.writeHead(200, {
      "content-type": mime[path.extname(file)] || "application/octet-stream",
      "cache-control": pathname === "/index.html" ? "no-cache" : "public, max-age=300"
    });
    res.end(req.method === "HEAD" ? undefined : content);
  });
});

const port = Number(process.env.PORT || 3000);
server.listen(port, "0.0.0.0", () => {
  console.log(`ResearchFlow listening on ${port}`);
});
