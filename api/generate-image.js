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
function modeModel(provider, mode){
  mode = ["economy","balanced","quality"].includes(mode)?mode:"balanced";
  if(provider==="google") return mode==="economy"?"gemini-3.1-flash-lite-image":mode==="quality"?"gemini-3-pro-image":"gemini-3.1-flash-image";
  return mode==="economy"?"gpt-image-1-mini":"gpt-image-2";
}
function continuityGuard(prompt, aspectRatio){
  return `${prompt}\n\nCONTINUITY GUARD\n- Giữ nguyên nhận diện, khuôn mặt, tóc, vóc dáng, trang phục, đạo cụ và bố cục đã mô tả.\n- Không tự thêm người, vật, chữ, logo hoặc watermark.\n- Không đổi bên trái/phải, màu sắc hay chi tiết neo nếu prompt không yêu cầu.\n- Tỷ lệ mục tiêu: ${aspectRatio}. Giữ mặt, tay, chân và đạo cụ quan trọng an toàn trong khung.`;
}
async function generateOpenAI({prompt, aspectRatio, quality, background, model, mode}) {
  const key=process.env.OPENAI_API_KEY;
  if(!key) throw Object.assign(new Error("Chưa cấu hình OPENAI_API_KEY"),{status:503});
  const chosen=OPENAI_MODELS.has(model)?model:(process.env.OPENAI_IMAGE_MODEL||modeModel("openai",mode));
  const size=openAISize(aspectRatio);
  const q=["low","medium","high"].includes(quality)?quality:(mode==="economy"?"low":mode==="quality"?"high":"medium");
  const r=await fetch("https://api.openai.com/v1/images/generations",{
    method:"POST",headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:chosen,prompt:continuityGuard(prompt,aspectRatio),size,quality:q,background:["auto","transparent","opaque"].includes(background)?background:"auto",output_format:"png"})
  });
  const data=await r.json();
  if(!r.ok) throw Object.assign(new Error(data?.error?.message||"OpenAI Image API lỗi"),{status:r.status});
  const b64=data?.data?.[0]?.b64_json;
  if(!b64) throw new Error("OpenAI không trả dữ liệu ảnh");
  return {image:`data:image/png;base64,${b64}`,provider:"openai",model:chosen,size};
}
async function generateGoogle({prompt, aspectRatio, model, mode}) {
  const key=process.env.GEMINI_API_KEY;
  if(!key) throw Object.assign(new Error("Chưa cấu hình GEMINI_API_KEY"),{status:503});
  const chosen=GOOGLE_MODELS.has(model)?model:(process.env.GEMINI_IMAGE_MODEL||modeModel("google",mode));
  const ratio=googleRatio(aspectRatio);
  const r=await fetch("https://generativelanguage.googleapis.com/v1beta/openai/images/generations",{
    method:"POST",headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:chosen,prompt:continuityGuard(prompt,ratio),n:1,response_format:"b64_json"})
  });
  const data=await r.json();
  if(!r.ok) throw Object.assign(new Error(data?.error?.message||"Google Gemini Image API lỗi"),{status:r.status});
  const b64=data?.data?.[0]?.b64_json;
  if(!b64) throw new Error("Google không trả dữ liệu ảnh");
  return {image:`data:image/png;base64,${b64}`,provider:"google",model:chosen,size:ratio};
}
async function runProvider(provider,args){
  return provider==="openai"?generateOpenAI(args):generateGoogle(args);
}
export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Chỉ hỗ trợ POST"});
  const {prompt,aspectRatio="1:1",quality="medium",background="auto",provider="auto",model="auto",mode="balanced",fallback=true}=req.body||{};
  if(!prompt||!String(prompt).trim()) return res.status(400).json({error:"Prompt trống"});
  const available=[];
  if(process.env.GEMINI_API_KEY) available.push("google");
  if(process.env.OPENAI_API_KEY) available.push("openai");
  if(!available.length) return res.status(503).json({error:"Chưa cấu hình GEMINI_API_KEY hoặc OPENAI_API_KEY"});
  let order;
  if(provider==="auto") order=[...available];
  else order=[provider,...(fallback?available.filter(x=>x!==provider):[])];
  if(!fallback) order=order.slice(0,1);
  const attempts=[];
  let lastErr;
  for(let idx=0;idx<order.length;idx++){
    const p=order[idx];
    try{
      const result=await runProvider(p,{prompt:String(prompt).trim(),aspectRatio,quality,background,model,mode});
      return res.status(200).json({...result,aspectRatio,mode,fallbackUsed:idx>0,attempts});
    }catch(err){
      lastErr=err;
      attempts.push({provider:p,status:err?.status||500,error:err?.message||String(err)});
    }
  }
  return res.status(lastErr?.status||500).json({error:lastErr?.message||"Không tạo được ảnh",attempts});
}
