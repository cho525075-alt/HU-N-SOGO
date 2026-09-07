const GOOGLE_MODELS=new Set(["gemini-3.8-flash","gemini-3.7-flash"]);
const OPENAI_MODELS=new Set(["gpt-5.6-luna","gpt-5.6-terra","gpt-5.6-sol"]);
function pickModel(provider,model,mode){
  if(provider==="google"){
    if(GOOGLE_MODELS.has(model)) return model;
    if(process.env.GEMINI_TEXT_MODEL) return process.env.GEMINI_TEXT_MODEL;
    return "gemini-3.8-flash";
  }
  if(OPENAI_MODELS.has(model)) return model;
  if(process.env.OPENAI_TEXT_MODEL) return process.env.OPENAI_TEXT_MODEL;
  return mode==="quality"?"gpt-5.6-sol":mode==="balanced"?"gpt-5.6-terra":"gpt-5.6-luna";
}
function extractJSON(text){
  text=String(text||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"");
  try{return JSON.parse(text)}catch(_){
    const a=text.indexOf("{"); const b=text.lastIndexOf("}");
    if(a>=0&&b>a) return JSON.parse(text.slice(a,b+1));
    throw new Error("AI không trả JSON hợp lệ");
  }
}
function promptFor(x){
  const assets=JSON.stringify(x.assets||{},null,2);
  return `Bạn là biên kịch và Continuity Director cho phim AI. Hãy chuyển cốt truyện thành đúng ${x.sceneCount} cảnh, mỗi cảnh khoảng ${x.secondsPerScene} giây, ngôn ngữ ${x.language}, tỷ lệ ${x.aspectRatio}.

DỰ ÁN: ${x.projectName}\nTHỂ LOẠI: ${x.genre}\nCỐT TRUYỆN:\n${x.story}\n\nTÀI SẢN ĐÃ KHÓA:\n${assets}

QUY TẮC BẮT BUỘC:
1. Mỗi cảnh chỉ có MỘT hành động chính có thể quay được trong ${x.secondsPerScene} giây.
2. Cảnh sau phải có nguyên nhân từ cảnh trước; không nhảy logic.
3. Lời thoại ngắn, tự nhiên, phù hợp thời lượng; ghi theo dạng "Tên: câu thoại". Không nhồi quá nhiều thoại.
4. Giữ tên/ID nhân vật và bối cảnh đã cung cấp. Không tự đổi tên nhân vật.
5. Start state cảnh N+1 phải tương thích End state cảnh N. Hãy mô tả state bằng các khóa boiCanh, thoiGian, anhSang, nhanVat, daoCu.
6. Nhịp truyện có mở đầu, phát triển, biến cố, cao trào, hậu quả/kết; không lặp cùng một mục đích cho nhiều cảnh liên tiếp.
7. Camera và âm thanh phải cụ thể nhưng ngắn gọn, hỗ trợ continuity.
8. Không viết giải thích ngoài JSON.

TRẢ VỀ DUY NHẤT JSON theo cấu trúc:
{"scenes":[{"tieuDe":"","yTuong":"","mucDich":"","nguyenNhan":"","hanhDong":"","loiThoai":"","dienXuat":"","camera":"","amThanh":"","nhom":"SEQ01","start":{"boiCanh":"","thoiGian":"","anhSang":"","nhanVat":[],"daoCu":[]},"end":{"boiCanh":"","thoiGian":"","anhSang":"","nhanVat":[],"daoCu":[]}}]}`;
}
async function google(x){
  const key=process.env.GEMINI_API_KEY;if(!key)throw Object.assign(new Error("Chưa cấu hình GEMINI_API_KEY"),{status:503});
  const model=pickModel("google",x.model,x.mode);
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",headers:{"x-goog-api-key":key,"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:promptFor(x)}]}],generationConfig:{responseMimeType:"application/json",maxOutputTokens:24000}})});
  const d=await r.json();if(!r.ok)throw Object.assign(new Error(d?.error?.message||"Gemini Text API lỗi"),{status:r.status});
  const text=(d?.candidates?.[0]?.content?.parts||[]).map(p=>p.text||"").join("");
  return {data:extractJSON(text),model};
}
async function openai(x){
  const key=process.env.OPENAI_API_KEY;if(!key)throw Object.assign(new Error("Chưa cấu hình OPENAI_API_KEY"),{status:503});
  const model=pickModel("openai",x.model,x.mode);
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,input:promptFor(x),max_output_tokens:24000,text:{format:{type:"json_object"}}})});
  const d=await r.json();if(!r.ok)throw Object.assign(new Error(d?.error?.message||"OpenAI Responses API lỗi"),{status:r.status});
  let text=d.output_text||"";
  if(!text) for(const item of d.output||[]) for(const c of item.content||[]) if(c.type==="output_text"||typeof c.text==="string") text+=c.text||"";
  return {data:extractJSON(text),model};
}
async function run(provider,x){return provider==="google"?google(x):openai(x)}
export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Chỉ hỗ trợ POST"});
  const b=req.body||{};const story=String(b.story||"").trim();if(!story)return res.status(400).json({error:"Cốt truyện trống"});
  const sceneCount=Math.max(1,Math.min(60,Number(b.sceneCount)||24));
  const x={...b,story,sceneCount,secondsPerScene:Math.max(1,Number(b.secondsPerScene)||8),language:b.language||"Tiếng Việt",provider:b.provider||"auto",mode:b.mode||"balanced"};
  const available=[];if(process.env.GEMINI_API_KEY)available.push("google");if(process.env.OPENAI_API_KEY)available.push("openai");
  if(!available.length)return res.status(503).json({error:"Chưa cấu hình GEMINI_API_KEY hoặc OPENAI_API_KEY"});
  let order=x.provider==="auto"?[...available]:[x.provider,...(b.fallback===false?[]:available.filter(p=>p!==x.provider))];if(b.fallback===false)order=order.slice(0,1);
  let last,attempts=[];
  for(let i=0;i<order.length;i++)try{let out=await run(order[i],x);let scenes=out.data?.scenes;if(!Array.isArray(scenes)||!scenes.length)throw new Error("AI không trả danh sách scenes");return res.status(200).json({scenes:scenes.slice(0,sceneCount),provider:order[i],model:out.model,fallbackUsed:i>0,attempts});}catch(err){last=err;attempts.push({provider:order[i],status:err.status||500,error:err.message})}
  return res.status(last?.status||500).json({error:last?.message||"Không tạo được kịch bản",attempts});
}
