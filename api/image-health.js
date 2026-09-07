export default async function handler(req, res) {
  const providers = {
    openai: Boolean(process.env.OPENAI_API_KEY),
    google: Boolean(process.env.GEMINI_API_KEY)
  };
  res.status(200).json({
    ok: providers.openai || providers.google,
    providers,
    defaults: {
      google: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
      openai: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"
    }
  });
}
