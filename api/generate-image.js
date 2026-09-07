function parseRatio(s) {
  const m = String(s || "1:1").match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!m) return 1;
  return Number(m[1]) / Number(m[2]);
}

function sourceSizeForRatio(r) {
  if (r < 0.92) return "1024x1536";
  if (r > 1.08) return "1536x1024";
  return "1024x1024";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Chỉ hỗ trợ POST" });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Thiếu OPENAI_API_KEY trên Vercel" });

  try {
    const { prompt, aspectRatio = "1:1", quality = "medium", background = "auto" } = req.body || {};
    if (!prompt || !String(prompt).trim()) return res.status(400).json({ error: "Prompt trống" });

    const ratio = parseRatio(aspectRatio);
    const size = sourceSizeForRatio(ratio);
    const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

    const finalPrompt = `${String(prompt).trim()}

YÊU CẦU KHUNG HÌNH:
- Tỷ lệ bố cục mục tiêu: ${aspectRatio}.
- Bố trí chủ thể an toàn để có thể crop chính xác về tỷ lệ ${aspectRatio} mà không cắt mặt, tay, chân, đạo cụ quan trọng hoặc chi tiết neo của bối cảnh.
- Không tự ý thêm chữ, watermark, logo hoặc người/vật ngoài yêu cầu.`;

    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        prompt: finalPrompt,
        size,
        quality: ["low","medium","high"].includes(quality) ? quality : "medium",
        background: ["auto","transparent","opaque"].includes(background) ? background : "auto",
        output_format: "png"
      })
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || "OpenAI Image API lỗi" });
    }

    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return res.status(502).json({ error: "API không trả dữ liệu ảnh" });

    return res.status(200).json({
      image: `data:image/png;base64,${b64}`,
      model,
      size,
      aspectRatio,
      note: "Tỷ lệ bố cục được khóa trong prompt; kích thước API gần nhất được dùng làm canvas nguồn."
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
