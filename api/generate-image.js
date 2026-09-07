const GOOGLE_MODELS = new Set([
  "gemini-3.1-flash-lite-image",
  "gemini-3.1-flash-image",
  "gemini-3-pro-image"
]);
const OPENAI_MODELS = new Set(["gpt-image-2","gpt-image-1-mini"]);

function openAISize(ratio) {
  const m = String(ratio || "1:1").match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  const r = m ? Number(m[1]) / Number(m[2]) : 1;
  if (r < 0.92) return "1024x1536";
  if (r > 1.08) return "1536x1024";
  return "1024x1024";
}
function googleRatio(ratio) {
  const supported = new Set(["1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"]);
  return supported.has(ratio) ? ratio : "1:1";
}
async function generateOpenAI({prompt, aspectRatio, quality, background, model}) {
  const key=process.env.OPENAI_API_KEY;
  if(!key) throw new Error("Chưa cấu hình OPENAI_API_KEY");
  const chosen=OPENAI_MODELS.has(model)?model:(process.env.OPENAI_IMAGE_MODEL||"gpt-image-2");
  const size=openAISize(aspectRatio);
  const finalPrompt=`${prompt}\n\nTỷ lệ bố cục mục tiêu: ${aspectRatio}. Giữ chủ thể an toàn trong khung. Không tự ý thêm chữ, watermark, logo hoặc người/vật ngoài yêu cầu.`;
  const r=await fetch("https://api.openai.com/v1/images/generations",{
    method:"POST",
    headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:chosen,prompt:finalPrompt,size,quality:["low","medium","high"].includes(quality)?quality:"medium",background:["auto","transparent","opaque"].includes(background)?background:"auto",output_format:"png"})
  });
  const data=await r.json();
  if(!r.ok) throw new Error(data?.error?.message||"OpenAI Image API lỗi");
  const b64=data?.data?.[0]?.b64_json;
  if(!b64) throw new Error("OpenAI không trả dữ liệu ảnh");
  return {image:`data:image/png;base64,${b64}`,provider:"openai",model:chosen,size};
}
async function generateGoogle({prompt, aspectRatio, model}) {
  const key=process.env.GEMINI_API_KEY;
  if(!key) throw new Error("Chưa cấu hình GEMINI_API_KEY");
  const chosen=GOOGLE_MODELS.has(model)?model:(process.env.GEMINI_IMAGE_MODEL||"gemini-3.1-flash-image");
  const ratio=googleRatio(aspectRatio);
  const finalPrompt=`${prompt}\n\nOutput aspect ratio: ${ratio}. Preserve all important faces, hands, feet, props and continuity anchors. No unwanted text, logo or watermark.`;
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/images/generations`,{
    method:"POST",
    headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:chosen,prompt:finalPrompt,n:1,response_format:"b64_json"})
  });
  const data=await r.json();
  if(!r.ok) throw new Error(data?.error?.message||"Google Gemini Image API lỗi");
  const b64=data?.data?.[0]?.b64_json;
  if(!b64) throw new Error("Google không trả dữ liệu ảnh");
  return {image:`data:image/png;base64,${b64}`,provider:"google",model:chosen,size:ratio};
}
export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Chỉ hỗ trợ POST"});
  try{
    const {prompt,aspectRatio="1:1",quality="medium",background="auto",provider="google",model="auto"}=req.body||{};
    if(!prompt||!String(prompt).trim()) return res.status(400).json({error:"Prompt trống"});
    let result;
    if(provider==="openai") result=await generateOpenAI({prompt:String(prompt).trim(),aspectRatio,quality,background,model});
    else result=await generateGoogle({prompt:String(prompt).trim(),aspectRatio,quality,background,model});
    return res.status(200).json({...result,aspectRatio});
  }catch(err){
    return res.status(500).json({error:err?.message||String(err)});
  }
}
