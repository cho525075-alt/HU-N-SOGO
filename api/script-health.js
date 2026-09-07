export default function handler(req,res){
  res.status(200).json({
    google:{connected:!!process.env.GEMINI_API_KEY},
    openai:{connected:!!process.env.OPENAI_API_KEY},
    googleModel:process.env.GEMINI_TEXT_MODEL||"gemini-3.8-flash",
    openaiModel:process.env.OPENAI_TEXT_MODEL||"gpt-5.6-luna"
  });
}
