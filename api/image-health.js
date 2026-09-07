export default async function handler(req, res) {
  res.status(200).json({
    ok: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"
  });
}
