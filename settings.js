/* Settings UI — adds icon‑size dropdown */

const POSITIONS = [
  ["center","Center"], ["top-left","Top‑left"], ["top","Top"],
  ["top-right","Top‑right"], ["right","Right"], ["bottom-right","Bottom‑right"],
  ["bottom","Bottom"], ["bottom-left","Bottom‑left"], ["left","Left"]
];

const DISPLAY = [
  ["fade","Fade until icon hover"],   // default
  ["hover","Show only on icon hover"],
  ["always","Always visible"]
];

const MARGINS = [0,4,8,12,16,24,32,48,64,100,200,400].map(v=>[v,String(v)]);
const SIZES   = [["small","Small"],["medium","Medium"],["large","Large"]];

const DEFAULTS = {
  buttonEnabled:true, displayMode:"fade", clickFeedback:true, margin:12,
  iconSize:"medium",
  hotkeyEnabled:true, hotkeyKey:"p", hotkeyAlt:true, hotkeyCtrl:false,
  hotkeyShift:false, hotkeyMeta:false, position:"center"
};

/* merge stored values with defaults */
chrome.storage.sync.get(null, raw =>
  buildUI({ ...DEFAULTS, ...raw })
);

/* shorthand helpers */
const $=(t,p={},...k)=>{const e=document.createElement(t);Object.assign(e,p);k.forEach(c=>e.append(c));return e;};
const save=(k,v)=>chrome.storage.sync.set({[k]:v});

function buildUI(cfg){
  const root = document.getElementById("ui");

  /* toggles */
  root.append(
    ck("Show PiP overlay button", "buttonEnabled", cfg),
    ck("Enable keyboard shortcut", "hotkeyEnabled", cfg),
    ck("Click animation feedback", "clickFeedback", cfg)
  );

  /* margin & size */
  root.append(
    $("label",{},"Edge margin (px) ", sel("margin", MARGINS, cfg.margin, true)),
    $("label",{},"Icon size ",        sel("iconSize", SIZES,  cfg.iconSize))
  );

  /* hotkey block */
  const fs=$("fieldset");
  fs.append($("legend",{textContent:"Shortcut"}));
  fs.append(
    ck("Alt","hotkeyAlt",cfg,true),
    ck("Ctrl","hotkeyCtrl",cfg,true),
    ck("Shift","hotkeyShift",cfg,true),
    ck("Meta ⌘","hotkeyMeta",cfg,true),
    $("label",{},"Key ",
      $("input",{type:"text",id:"hotkeyKey",value:cfg.hotkeyKey,size:2,maxLength:1})
    )
  );
  root.append(fs);

  /* position & display */
  root.append(
    $("label",{},"Button position ", sel("position", POSITIONS, cfg.position)),
    $("label",{},"Hover behaviour ", sel("displayMode", DISPLAY, cfg.displayMode)),
    $("p",{},$("small",{textContent:"All settings save instantly."}))
  );

  /* listeners */
  root.querySelectorAll("input[type=checkbox]").forEach(cb=>{
    cb.addEventListener("change",()=>save(cb.id, cb.checked));
  });
  $("hotkeyKey").addEventListener("input",e=>{
    const v=e.target.value.slice(-1).toLowerCase();
    e.target.value=v;
    save("hotkeyKey", v || DEFAULTS.hotkeyKey);
  });
  root.querySelectorAll("select").forEach(sel=>{
    sel.addEventListener("change",()=>{
      const val = sel.id === "margin" ? Number(sel.value) : sel.value;
      save(sel.id, val);
    });
  });
}

/* builders */
function ck(txt,id,cfg,inl=false){
  return $("label",{style:inl?"display:inline-block;margin-right:.7rem":""},
    $("input",{type:"checkbox",id,checked:cfg[id]})," ",txt);
}

function sel(id, list, cur){
  const s=$("select",{id});
  list.forEach(([val,label])=>{
    s.append($("option",{
      value: val,
      selected: String(val) === String(cur),
      textContent: label
    }));
  });
  return s;
}
