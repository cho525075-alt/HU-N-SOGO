(()=>{
  if(window.__CD_FLOW_BRIDGE__)return; window.__CD_FLOW_BRIDGE__=true;
  const panel=document.createElement('div');
  panel.id='cd-flow-bridge';
  panel.style='position:fixed;right:18px;bottom:18px;z-index:2147483647;background:#111827;color:white;border:1px solid #374151;border-radius:12px;padding:10px;width:220px;font:13px Arial;box-shadow:0 10px 30px #0008';
  panel.innerHTML='<b>CD Flow Bridge</b><div style="opacity:.72;margin:4px 0 8px">Không đọc cookie/session</div><button id="cdPaste">Dán prompt</button><button id="cdGen">Tạo</button><button id="cdHide">Ẩn</button><div id="cdMsg" style="margin-top:7px;opacity:.8"></div>';
  for(const b of panel.querySelectorAll('button')) b.style='margin:3px;padding:7px 9px;border-radius:7px;border:1px solid #4b5563;background:#1f2937;color:white;cursor:pointer';
  document.documentElement.appendChild(panel);
  const msg=t=>panel.querySelector('#cdMsg').textContent=t;
  const isVisible=el=>!!(el&&el.offsetParent!==null);
  function findInput(){
    const sels=['textarea','[contenteditable="true"]','input[type="text"]'];
    let c=[]; sels.forEach(s=>c.push(...document.querySelectorAll(s)));
    c=c.filter(isVisible).filter(el=>{const r=el.getBoundingClientRect();return r.width>180&&r.height>28});
    return c.sort((a,b)=>b.getBoundingClientRect().width-a.getBoundingClientRect().width)[0]||null;
  }
  function setText(el,text){
    el.focus();
    if(el.matches('textarea,input')){const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const set=Object.getOwnPropertyDescriptor(proto,'value')?.set;set?set.call(el,text):(el.value=text);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
    else{el.textContent=text;el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));}
  }
  async function paste(){try{const t=await navigator.clipboard.readText();if(!t)return msg('Clipboard đang trống.');const el=findInput();if(!el)return msg('Không tìm thấy ô prompt. Hãy mở màn hình tạo video trong Flow.');setText(el,t);msg('Đã dán prompt.');}catch(e){msg('Chrome chưa cho phép đọc clipboard. Bấm lại và cấp quyền nếu được hỏi.')}}
  function generate(){
    const words=['generate','create','tạo','générer'];
    const els=[...document.querySelectorAll('button,[role="button"]')].filter(isVisible);
    const btn=els.find(el=>{const s=(el.innerText||el.getAttribute('aria-label')||'').trim().toLowerCase();return words.some(w=>s===w||s.includes(w));});
    if(!btn)return msg('Không tìm thấy nút Generate/Tạo. Hãy bấm thủ công; Flow có thể đã đổi giao diện.');
    btn.click(); msg('Đã bấm Tạo.');
  }
  panel.querySelector('#cdPaste').onclick=paste;
  panel.querySelector('#cdGen').onclick=generate;
  panel.querySelector('#cdHide').onclick=()=>panel.remove();
})();
