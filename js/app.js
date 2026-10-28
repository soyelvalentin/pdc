/* PDC Estudio — lógica del editor (requiere Fabric.js 6, cargado en index.html) */

(() => {
'use strict';

/* =========================================================
   Configuración — ajusta precios y endpoint aquí
   ========================================================= */
const CONFIG = {
  currency: 'MXN',
  perSide: 60,        // costo por lado impreso
  fullColor: 40,      // extra si el diseño lleva imagen a todo color
  discounts: [[50, 0.15], [20, 0.10], [10, 0.05]], // [piezas mínimas, descuento]
  printPPI: 200,      // resolución del arte para impresión
  endpoint: ''        // URL de tu backend para recibir pedidos (POST JSON). Vacío = se descarga como archivo.
};

const W = 500, H = 560;
const TEXTILE = [['#F7F7F5','Blanco'],['#1C1C1E','Negro'],['#A9ADB2','Gris jaspe'],['#1E2B4A','Marino'],['#B8322E','Rojo'],['#2F5D3A','Verde bosque'],['#D9A72B','Mostaza'],['#E7A9BB','Rosa']];
const PRODUCTS = {
  playera: { name:'Playera', price:180, custom:true, colors:TEXTILE, sides:{front:'Frente', back:'Espalda'},
    area:{ front:{left:165,top:120,width:170,height:230,cm:[30,40]}, back:{left:165,top:95,width:170,height:260,cm:[30,45]} } },
  sudadera: { name:'Sudadera', price:420, custom:true, colors:TEXTILE, sides:{front:'Frente', back:'Espalda'},
    area:{ front:{left:170,top:150,width:160,height:200,cm:[28,35]}, back:{left:165,top:110,width:170,height:260,cm:[30,45]} } },
  bolsa: { name:'Bolsa', price:150, custom:false, colors:[['#E9E1CF','Natural'],['#1C1C1E','Negro'],['#1E2B4A','Marino'],['#2F5D3A','Verde bosque']], sides:{front:'Frente', back:'Reverso'},
    area:{ front:{left:140,top:205,width:220,height:270,cm:[35,43]}, back:{left:140,top:205,width:220,height:270,cm:[35,43]} } },
  taza: { name:'Taza', price:120, custom:false, colors:[['#F7F7F5','Blanco'],['#1C1C1E','Negro'],['#B8322E','Rojo'],['#1E2B4A','Marino'],['#7FB7C9','Celeste']], sides:{front:'Lado A', back:'Lado B'},
    area:{ front:{left:145,top:195,width:190,height:230,cm:[8,10]}, back:{left:145,top:195,width:190,height:230,cm:[8,10]} } }
};
const FONTS = ['Anton','Bebas Neue','Oswald','Montserrat','Roboto','Playfair Display','Permanent Marker','Bangers','Lobster','Pacifico'];
const PRESETS = [
  { label:'Título grande', text:'TU MARCA', font:'Anton', size:64 },
  { label:'Subtítulo', text:'Edición 2026', font:'Montserrat', size:26, weight:'bold' },
  { label:'Texto en arco', text:'CLUB DEPORTIVO', font:'Bebas Neue', size:46, arc:45 },
  { label:'Firma', text:'Hecho a mano', font:'Pacifico', size:38 }
];
const SHAPES = {
  rect:     { label:'Cuadro',    svg:'<rect x="4" y="6" width="16" height="12"/>' },
  round:    { label:'Redondo',   svg:'<rect x="4" y="6" width="16" height="12" rx="4"/>' },
  circle:   { label:'Círculo',   svg:'<circle cx="12" cy="12" r="8"/>' },
  triangle: { label:'Triángulo', svg:'<path d="M12 4l9 16H3z"/>' },
  star:     { label:'Estrella',  svg:'<path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6L12 16.3 6.6 19.2l1.3-6-4.5-4 6-.6z"/>' },
  heart:    { label:'Corazón',   svg:'<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>' },
  line:     { label:'Línea',     svg:'<rect x="3" y="11" width="18" height="2.5" rx="1"/>' },
  badge:    { label:'Insignia',  svg:'<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/>' }
};
const ICONS = {
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:'<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0112 5c6 0 10 7 10 7a17 17 0 01-3.2 4M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a9.7 9.7 0 005.4-1.6"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  unlock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 017.5-2"/>'
};
const PROPS = ['id','kind','name','locked','arc','fx','lockMovementX','lockMovementY','lockScalingX','lockScalingY','lockRotation','hasControls'];
const STORE_KEY = 'pdc-estudio-v2';

/* ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = new Intl.NumberFormat('es-MX', { style:'currency', currency:CONFIG.currency });
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const uid = () => 'o' + Math.random().toString(36).slice(2, 10);

let F, canvas, zoom = 1, restoring = false, pushTimer = null, clipboard = [];
const state = { product:'playera', color:'#F7F7F5', side:'front', qty:1, sides:{ front:null, back:null }, quote:{} };
const hist = { front:{ stack:[], i:-1 }, back:{ stack:[], i:-1 } };

const area = () => PRODUCTS[state.product].area[state.side];

/* ---------- Utilidades ---------- */
let toastTimer;
function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3400);
}
function isLight(hex){
  let h = String(hex).replace('#','');
  if (h.length === 3) h = h.split('').map(x => x + x).join('');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  return (0.299*r + 0.587*g + 0.114*b) > 150;
}
const inkFor = () => isLight(state.color) ? '#1F2A44' : '#FFFFFF';
function toHex(c){
  if (!c || typeof c !== 'string') return '#000000';
  try { return '#' + new F.Color(c).toHex().slice(0,6); } catch (e) { return '#000000'; }
}
async function loadFont(f){ try { await document.fonts.load(`40px "${f}"`); } catch (e) {} }
function readAsDataURL(file){
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
}
function loadImg(src){
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('img')); im.src = src; });
}
function download(url, name){
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}
function downloadJSON(obj, name){
  const url = URL.createObjectURL(new Blob([JSON.stringify(obj)], { type:'application/json' }));
  download(url, name); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function stamp(){
  const d = new Date(), p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/* ---------- Maquetas de producto (SVG) ---------- */
const SH = 'rgba(0,0,0,.28)';
const shadeDefs = () => '<defs><linearGradient id="pdcShade" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset=".22" stop-color="#fff" stop-opacity=".07"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient></defs>';
const piece = (d, c) => `<path d="${d}" fill="${c}" stroke="${SH}" stroke-width="1.5" stroke-linejoin="round"/><path d="${d}" fill="url(#pdcShade)"/>`;
const seam = (d, w = 2, op = .22) => `<path d="${d}" fill="none" stroke="#000" stroke-opacity="${op}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const MOCKUPS = {
  playera(side, c){
    const neck = side === 'front' ? 72 : 46;
    return piece(`M170 40 L205 30 Q250 ${neck} 295 30 L330 40 L440 100 L405 180 L368 163 L368 520 Q250 532 132 520 L132 163 L95 180 L60 100 Z`, c)
      + seam(`M205 30 Q250 ${neck} 295 30`, 7, .14)
      + seam('M328 42 Q352 95 368 163', 1.5, .18) + seam('M172 42 Q148 95 132 163', 1.5, .18)
      + seam('M137 507 Q250 519 363 507', 1.5, .14);
  },
  sudadera(side, c){
    let s = piece('M198 62 Q188 12 250 8 Q312 12 302 62 Z', c)
      + piece('M160 75 L198 60 Q250 80 302 60 L340 75 L425 135 L468 420 L422 432 L380 210 L376 522 Q250 535 124 522 L120 210 L78 432 L32 420 L75 135 Z', c)
      + seam('M340 75 Q368 140 380 210', 1.5, .18) + seam('M160 75 Q132 140 120 210', 1.5, .18)
      + seam('M127 500 Q250 513 373 500', 5, .12) + seam('M462 398 L420 409', 5, .14) + seam('M38 398 L80 409', 5, .14);
    if (side === 'front') {
      s += '<path d="M214 64 Q250 116 286 64 Q250 76 214 64 Z" fill="#000" fill-opacity=".28"/>'
        + seam('M238 96 L235 150', 3, .3) + seam('M262 96 L265 150', 3, .3)
        + seam('M178 385 L322 385 L342 470 L158 470 Z', 1.5, .25);
    } else {
      s += piece('M198 62 Q190 22 250 18 Q310 22 302 62 Q250 82 198 62 Z', c);
    }
    return s;
  },
  bolsa(side, c){
    const handle = 'M180 168 Q180 52 250 52 Q320 52 320 168';
    return seam(handle, 17, .25) + `<path d="${handle}" fill="none" stroke="${c}" stroke-width="13"/>`
      + piece('M108 160 L392 160 L402 522 L98 522 Z', c) + seam('M110 176 L390 176', 1.5, .18);
  },
  taza(side, c){
    const handle = 'M352 215 Q442 215 440 312 Q438 410 352 405';
    const g = seam(handle, 30, .25) + `<path d="${handle}" fill="none" stroke="${c}" stroke-width="24"/>`
      + piece('M118 150 L362 150 L362 470 Q240 500 118 470 Z', c)
      + `<ellipse cx="240" cy="150" rx="122" ry="16" fill="${c}" stroke="${SH}" stroke-width="1.5"/><ellipse cx="240" cy="151" rx="110" ry="11" fill="#000" fill-opacity=".3"/>`;
    return side === 'front' ? g : `<g transform="translate(480 0) scale(-1 1)">${g}</g>`;
  }
};
const mockupInner = () => shadeDefs() + MOCKUPS[state.product](state.side, state.color);
const mockupSVGString = () => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${mockupInner()}</svg>`;
function renderMockup(){ $('#mockup').innerHTML = mockupInner(); }

function renderOverlay(){
  const a = area();
  const corners = [[a.left, a.top], [a.left + a.width, a.top], [a.left, a.top + a.height], [a.left + a.width, a.top + a.height]];
  const marks = corners.map(([x, y]) => {
    const cx = x + (x === a.left ? -14 : 14), cy = y + (y === a.top ? -14 : 14);
    return `<g class="reg"><circle cx="${cx}" cy="${cy}" r="5"/><path d="M${cx-9} ${cy}H${cx+9}M${cx} ${cy-9}V${cy+9}"/></g>`;
  }).join('');
  const cx = a.left + a.width / 2, cy = a.top + a.height / 2;
  $('#overlay').innerHTML = `<g class="area-guides"><rect class="area" x="${a.left}" y="${a.top}" width="${a.width}" height="${a.height}"/>${marks}`
    + `<text class="area-label" x="${a.left}" y="${a.top + a.height + 36}">Área de impresión ${a.cm[0]} × ${a.cm[1]} cm</text></g>`
    + `<line id="gV" class="guide" x1="${cx}" x2="${cx}" y1="${a.top}" y2="${a.top + a.height}"/>`
    + `<line id="gH" class="guide" x1="${a.left}" x2="${a.left + a.width}" y1="${cy}" y2="${cy}"/>`;
  const hint = $('#emptyHint');
  Object.assign(hint.style, { left: a.left / W * 100 + '%', top: a.top / H * 100 + '%', width: a.width / W * 100 + '%', height: a.height / H * 100 + '%' });
}
function showGuides(v, h){ $('#gV')?.classList.toggle('on', !!v); $('#gH')?.classList.toggle('on', !!h); }

/* ---------- Creación de objetos ---------- */
function makeClip(){
  const a = area();
  return new F.Rect({ left:a.left, top:a.top, width:a.width, height:a.height, strokeWidth:0, absolutePositioned:true });
}
function prep(o, kind, name){
  o.set({ id:uid(), kind, name:name || '', clipPath:makeClip() });
  if (o.arc === undefined) o.arc = 0;
  return o;
}
function place(o){
  const a = area();
  o.setPositionByOrigin(new F.Point(a.left + a.width / 2, a.top + a.height / 2), 'center', 'center');
  o.setCoords();
}
function addObj(o){ canvas.add(o); canvas.setActiveObject(o); canvas.requestRenderAll(); }

async function addText(opts = {}){
  setDrawing(false);
  const font = opts.font || 'Anton';
  await loadFont(font);
  const t = new F.IText(opts.text || 'Tu texto', {
    fontFamily:font, fontSize:opts.size || 44, fontWeight:opts.weight || 'normal',
    fill:inkFor(), textAlign:'center', paintFirst:'stroke', strokeWidth:0
  });
  prep(t, 'text');
  if (opts.arc) applyArc(t, opts.arc);
  place(t);
  addObj(t);
}

// Texto en arco: usa "text on path" de Fabric
function applyArc(t, val){
  val = +val || 0;
  const c = t.getCenterPoint();
  t.arc = val;
  t.set('path', null);
  t.initDimensions();
  if (val) {
    const w = Math.max(t.width, 20), s = val / 100 * w * 0.5;
    const p = new F.Path(`M 0 0 Q ${w / 2} ${-2 * s} ${w} 0`, { visible:false, fill:null, stroke:null });
    t.set({ path:p, textAlign:'center' });
    t.initDimensions();
  }
  t.setPositionByOrigin(c, 'center', 'center');
  t.setCoords();
}

function starPoints(n, R, r){
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const ang = Math.PI / n * i - Math.PI / 2, rad = i % 2 ? r : R;
    pts.push({ x: R + rad * Math.cos(ang), y: R + rad * Math.sin(ang) });
  }
  return pts;
}
function addShape(type){
  setDrawing(false);
  const fill = $('#shapeColor').value;
  let o;
  switch (type) {
    case 'rect': o = new F.Rect({ width:120, height:84, fill }); break;
    case 'round': o = new F.Rect({ width:120, height:84, rx:18, ry:18, fill }); break;
    case 'circle': o = new F.Circle({ radius:50, fill }); break;
    case 'triangle': o = new F.Triangle({ width:110, height:96, fill }); break;
    case 'star': o = new F.Polygon(starPoints(5, 56, 24), { fill }); break;
    case 'heart': o = new F.Path('M 50 90 C 20 65 0 45 0 25 C 0 10 12 0 27 0 C 38 0 46 6 50 15 C 54 6 62 0 73 0 C 88 0 100 10 100 25 C 100 45 80 65 50 90 Z', { fill }); break;
    case 'line': o = new F.Rect({ width:150, height:6, fill }); break;
    case 'badge': o = new F.Path('M 50 0 L 100 22 L 100 55 C 100 85 78 106 50 118 C 22 106 0 85 0 55 L 0 22 Z', { fill }); break;
    default: return;
  }
  o.set({ strokeWidth:0 });
  prep(o, 'shape', SHAPES[type].label);
  place(o);
  addObj(o);
}

async function downscale(file, max = 1400){
  const src = await readAsDataURL(file);
  const im = await loadImg(src);
  const w = im.naturalWidth || 800, h = im.naturalHeight || 800;
  const k = Math.min(1, max / Math.max(w, h));
  if (k === 1 && file.type !== 'image/svg+xml' && file.size < 900000) return src;
  const c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.9);
}
async function addImageFile(file){
  if (!file || !file.type.startsWith('image/')) { toast('Ese archivo no es una imagen. Usa PNG, JPG, WEBP o SVG.'); return; }
  setDrawing(false);
  try {
    const url = await downscale(file);
    const Img = F.FabricImage || F.Image;
    const img = await Img.fromURL(url);
    prep(img, 'image', file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Imagen');
    img.fx = { removeWhite:false, gray:false, sepia:false, invert:false, bright:0 };
    const a = area();
    img.scale(Math.min(a.width * 0.8 / img.width, a.height * 0.8 / img.height));
    place(img);
    addObj(img);
  } catch (e) {
    toast('No se pudo abrir la imagen. Prueba con otro archivo PNG o JPG.');
  }
}
function applyFx(img){
  const Fl = F.filters, fx = img.fx || {}, list = [];
  if (fx.removeWhite) list.push(new Fl.RemoveColor({ color:'#FFFFFF', distance:0.18 }));
  if (fx.gray) list.push(new Fl.Grayscale());
  if (fx.sepia) list.push(new Fl.Sepia());
  if (fx.invert) list.push(new Fl.Invert());
  if (fx.bright) list.push(new Fl.Brightness({ brightness:fx.bright }));
  img.filters = list;
  img.applyFilters();
}

/* ---------- Dibujo libre ---------- */
function setDrawing(on){
  if (!canvas) return;
  on = !!on;
  canvas.isDrawingMode = on;
  if (on) {
    canvas.discardActiveObject();
    const b = new F.PencilBrush(canvas);
    b.color = $('#brushColor').value;
    b.width = +$('#brushWidth').value;
    b.strokeLineCap = 'round'; b.strokeLineJoin = 'round';
    canvas.freeDrawingBrush = b;
  }
  const t = $('#drawToggle');
  t.setAttribute('aria-pressed', on);
  t.textContent = on ? 'Terminar de dibujar' : 'Empezar a dibujar';
  canvas.requestRenderAll();
  updateEmpty();
}

/* ---------- Acciones sobre la selección ---------- */
function setLock(o, L){
  o.set({ locked:L, lockMovementX:L, lockMovementY:L, lockScalingX:L, lockScalingY:L, lockRotation:L, hasControls:!L });
}
function alignActive(mode){
  const o = canvas.getActiveObject(); if (!o) return;
  const a = area(), c = o.getCenterPoint();
  const x = mode === 'v' ? c.x : a.left + a.width / 2;
  const y = mode === 'h' ? c.y : a.top + a.height / 2;
  o.setPositionByOrigin(new F.Point(x, y), 'center', 'center');
  o.setCoords();
}
function fitToArea(o){
  if (!o) return;
  const a = area();
  const k = Math.min(a.width * 0.92 / o.getScaledWidth(), a.height * 0.92 / o.getScaledHeight());
  o.set({ scaleX:o.scaleX * k, scaleY:o.scaleY * k });
  alignActive('both');
}
function reorder(act){
  const objs = canvas.getActiveObjects();
  const list = (act === 'back' || act === 'forward') ? objs.slice().reverse() : objs;
  list.forEach(o => {
    if (act === 'front') canvas.bringObjectToFront(o);
    else if (act === 'back') canvas.sendObjectToBack(o);
    else if (act === 'forward') canvas.bringObjectForward(o);
    else canvas.sendObjectBackwards(o);
  });
}
function selectObjs(objs){
  if (!objs.length) return;
  canvas.setActiveObject(objs.length === 1 ? objs[0] : new F.ActiveSelection(objs, { canvas }));
  canvas.requestRenderAll();
}
const cloneObjs = objs => Promise.all(objs.map(o => o.clone(PROPS)));
function placeClones(clones){
  clones.forEach(c => {
    c.set({ id:uid(), left:c.left + 16, top:c.top + 16, clipPath:makeClip() });
    setLock(c, false);
    if (c.kind === 'text' && c.arc) applyArc(c, c.arc);
    canvas.add(c);
  });
  selectObjs(clones);
}
async function duplicate(){
  const objs = canvas.getActiveObjects(); if (!objs.length) return;
  canvas.discardActiveObject();
  placeClones(await cloneObjs(objs));
}
async function copySel(){
  const objs = canvas.getActiveObjects(); if (!objs.length) return;
  canvas.discardActiveObject();
  clipboard = await cloneObjs(objs);
  selectObjs(objs);
  toast(objs.length === 1 ? 'Elemento copiado.' : `${objs.length} elementos copiados.`);
}
async function paste(){
  if (!clipboard.length) return;
  canvas.discardActiveObject();
  const clones = await cloneObjs(clipboard);
  placeClones(clones);
  clipboard = await cloneObjs(clones);
}
function removeActive(){
  const objs = canvas.getActiveObjects(); if (!objs.length) return;
  const free = objs.filter(o => !o.locked);
  if (free.length < objs.length) toast('Los elementos bloqueados no se eliminan. Desbloquéalos primero.');
  canvas.discardActiveObject();
  if (free.length) canvas.remove(...free);
  canvas.requestRenderAll();
  renderProps();
}

/* ---------- Historial, guardado y lados ---------- */
const snapshot = () => canvas.toObject(PROPS);
function schedulePush(){ clearTimeout(pushTimer); pushTimer = setTimeout(pushNow, 200); }
function flushPush(){ if (pushTimer) { clearTimeout(pushTimer); pushNow(); } }
function pushNow(){
  pushTimer = null;
  const snap = snapshot(), s = JSON.stringify(snap), h = hist[state.side];
  if (h.stack[h.i] !== s) {
    h.stack = h.stack.slice(0, h.i + 1);
    h.stack.push(s);
    if (h.stack.length > 40) h.stack.shift();
    h.i = h.stack.length - 1;
  }
  state.sides[state.side] = snap;
  autosave();
  refreshUI();
}
function postLoad(){
  canvas.getObjects().forEach(o => {
    if (!o.id) o.id = uid();
    o.set('clipPath', makeClip());
    if (o.kind === 'text' && o.arc) applyArc(o, o.arc);
  });
  canvas.requestRenderAll();
}
async function restore(s){
  restoring = true;
  canvas.discardActiveObject();
  const data = JSON.parse(s);
  try { await canvas.loadFromJSON(data); postLoad(); }
  finally { restoring = false; }
  state.sides[state.side] = data;
  autosave(); refreshUI(); renderProps();
}
async function undo(){ flushPush(); const h = hist[state.side]; if (h.i <= 0) return; h.i--; await restore(h.stack[h.i]); }
async function redo(){ flushPush(); const h = hist[state.side]; if (h.i >= h.stack.length - 1) return; h.i++; await restore(h.stack[h.i]); }

async function loadSide(){
  restoring = true;
  try {
    canvas.discardActiveObject();
    canvas.clear();
    const data = state.sides[state.side];
    if (data && data.objects && data.objects.length) await canvas.loadFromJSON(data);
    postLoad();
  } catch (e) {
    toast('Una parte del diseño guardado no se pudo cargar.');
  } finally { restoring = false; }
  const h = hist[state.side];
  if (h.i < 0) { h.stack = [JSON.stringify(snapshot())]; h.i = 0; }
  renderMockup(); renderOverlay(); refreshUI(); renderProps();
}
async function gotoSide(id){
  flushPush(); setDrawing(false);
  canvas.discardActiveObject();
  state.sides[state.side] = snapshot();
  state.side = id;
  await loadSide();
  autosave();
}
function resetHistory(){ hist.front = { stack:[], i:-1 }; hist.back = { stack:[], i:-1 }; }

function autosave(){
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ product:state.product, color:state.color, side:state.side, qty:state.qty, sides:state.sides }));
  } catch (e) {
    if (!autosave.warned) { autosave.warned = true; toast('El diseño es muy pesado para el guardado automático. Usa Archivo › Guardar diseño para no perderlo.'); }
  }
}
function restoreSaved(){
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (d && PRODUCTS[d.product]) {
      state.product = d.product;
      state.color = d.color || PRODUCTS[d.product].colors[0][0];
      state.side = d.side === 'back' ? 'back' : 'front';
      state.qty = d.qty || 1;
      state.sides = d.sides || { front:null, back:null };
    }
  } catch (e) {}
}

function setProduct(id){
  if (!PRODUCTS[id] || id === state.product) return;
  flushPush();
  const P = PRODUCTS[id];
  state.product = id;
  if (!P.custom && !P.colors.some(c => c[0].toLowerCase() === state.color.toLowerCase())) state.color = P.colors[0][0];
  canvas.getObjects().forEach(o => o.set('clipPath', makeClip()));
  canvas.requestRenderAll();
  renderMockup(); renderOverlay(); renderProductPanel();
  schedulePush();
}
function setColor(hex){ state.color = hex; renderMockup(); renderProductPanel(); autosave(); }

/* ---------- Exportar ---------- */
async function mockupPNG(scale = 2){
  const c = document.createElement('canvas');
  c.width = W * scale; c.height = H * scale;
  const ctx = c.getContext('2d');
  const prod = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(mockupSVGString()));
  ctx.drawImage(prod, 0, 0, c.width, c.height);
  canvas.discardActiveObject(); canvas.renderAll();
  const design = await loadImg(canvas.toDataURL({ format:'png', multiplier:scale / zoom }));
  ctx.drawImage(design, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}
function printPNG(){
  const a = area();
  const target = a.cm[0] / 2.54 * CONFIG.printPPI;          // ancho en px a la resolución pedida
  const mult = clamp(target / a.width, 1, 16) / zoom;
  canvas.discardActiveObject(); canvas.renderAll();
  return canvas.toDataURL({ format:'png', left:a.left * zoom, top:a.top * zoom, width:a.width * zoom, height:a.height * zoom, multiplier:mult });
}
const sideObjects = id => id === state.side ? canvas.getObjects() : ((state.sides[id] && state.sides[id].objects) || []);
const sideHasContent = id => sideObjects(id).some(o => o.visible !== false);
const sideHasImage = id => sideObjects(id).some(o => o.kind === 'image' && o.visible !== false);

async function exportMockup(){
  if (!sideHasContent(state.side)) toast('Este lado aún no tiene diseño; se descargará el producto vacío.');
  download(await mockupPNG(2), `maqueta-${state.product}-${state.side}-${stamp()}.png`);
}
function exportPrint(){
  if (!sideHasContent(state.side)) { toast('Agrega al menos un elemento a este lado para generar el arte.'); return; }
  download(printPNG(), `arte-${state.product}-${state.side}-${stamp()}.png`);
  toast(`Arte descargado a ${CONFIG.printPPI} ppp.`);
}
function saveDesign(){
  flushPush();
  downloadJSON({ app:'pdc-estudio', version:2, product:state.product, color:state.color, qty:state.qty, sides:state.sides }, `diseno-${stamp()}.json`);
  toast('Diseño guardado.');
}
async function openDesign(file){
  try {
    const d = JSON.parse(await file.text());
    if (!d || !d.sides || !PRODUCTS[d.product]) throw new Error('formato');
    const pick = s => s ? (s.design || s) : null;
    state.product = d.product;
    state.color = d.color || PRODUCTS[d.product].colors[0][0];
    state.qty = d.qty || 1;
    state.sides = { front:pick(d.sides.front), back:pick(d.sides.back) };
    state.side = 'front';
    $('#qty').value = state.qty;
    resetHistory();
    await loadSide();
    renderProductPanel(); autosave();
    toast('Diseño abierto.');
  } catch (e) {
    toast('Ese archivo no es un diseño de PDC Estudio. Abre un .json guardado desde aquí.');
  }
}
async function newDesign(){
  if (!confirm('¿Borrar los dos lados y empezar de cero? Esto no se puede deshacer.')) return;
  state.sides = { front:null, back:null };
  resetHistory();
  await loadSide();
  autosave();
}
async function exportOrder(){
  flushPush();
  if (!['front','back'].some(sideHasContent)) { toast('Agrega al menos un elemento antes de exportar el pedido.'); return; }
  const original = state.side, sides = {};
  for (const id of ['front','back']) {
    if (!sideHasContent(id)) continue;
    if (state.side !== id) await gotoSide(id);
    sides[id] = { label:PRODUCTS[state.product].sides[id], design:state.sides[id], mockupPNG:await mockupPNG(1.5), printPNG:printPNG() };
  }
  if (state.side !== original) await gotoSide(original);
  const order = {
    app:'pdc-estudio', version:2, createdAt:new Date().toISOString(),
    product:state.product, productName:PRODUCTS[state.product].name, color:state.color,
    qty:state.qty, quote:state.quote, sides
  };
  if (CONFIG.endpoint) {
    try {
      const r = await fetch(CONFIG.endpoint, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(order) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      toast('Pedido enviado.');
      return;
    } catch (e) {
      toast(`No se pudo enviar el pedido (${e.message}). Se descargó como archivo.`);
    }
  } else {
    toast('Pedido exportado con maquetas, arte y cotización.');
  }
  downloadJSON(order, `pedido-${stamp()}.json`);
}

/* ---------- Zoom ---------- */
function applyZoom(z){
  zoom = clamp(z, 0.35, 2.5);
  canvas.setDimensions({ width:W * zoom, height:H * zoom });
  canvas.setZoom(zoom);
  ['#mockup','#overlay'].forEach(s => { $(s).setAttribute('width', W * zoom); $(s).setAttribute('height', H * zoom); });
  Object.assign($('#stage').style, { width:W * zoom + 'px', height:H * zoom + 'px' });
  $('#zoomLabel').textContent = Math.round(zoom * 100) + '%';
  canvas.requestRenderAll();
}
function fitZoom(){
  const box = $('#stageBox');
  const mobile = matchMedia('(max-width: 900px)').matches;
  const zw = (box.clientWidth - 24) / W;
  const zh = mobile ? Infinity : (box.clientHeight - 24) / H;
  applyZoom(Math.min(zw, zh, 1.6));
}

/* ---------- Render de paneles ---------- */
function layerName(o){
  if (o.kind === 'text') return '“' + String(o.text || '').replace(/\s+/g, ' ').slice(0, 22) + '”';
  return o.name || ({ image:'Imagen', shape:'Forma', draw:'Trazo' }[o.kind] || 'Elemento');
}
function renderLayers(){
  const ul = $('#layers');
  const objs = canvas.getObjects().slice().reverse();
  const act = new Set(canvas.getActiveObjects());
  if (!objs.length) { ul.innerHTML = '<li class="empty">Este lado todavía no tiene elementos.</li>'; return; }
  ul.innerHTML = objs.map(o => {
    const n = esc(layerName(o)), hidden = o.visible === false;
    return `<li class="${act.has(o) ? 'is-active' : ''} ${hidden ? 'is-hidden' : ''}" data-id="${o.id}">
      <button class="layer-name" data-lact="select"><span class="kind kind-${o.kind}"></span>${n}</button>
      <button class="icon-btn" data-lact="vis" aria-label="${hidden ? 'Mostrar' : 'Ocultar'} ${n}" title="${hidden ? 'Mostrar' : 'Ocultar'}">${icon(hidden ? 'eyeOff' : 'eye')}</button>
      <button class="icon-btn" data-lact="lock" aria-label="${o.locked ? 'Desbloquear' : 'Bloquear'} ${n}" title="${o.locked ? 'Desbloquear' : 'Bloquear'}">${icon(o.locked ? 'lock' : 'unlock')}</button>
    </li>`;
  }).join('');
}
function renderSides(){
  const P = PRODUCTS[state.product];
  $('#sideTabs').innerHTML = Object.entries(P.sides).map(([id, label]) =>
    `<button role="tab" data-side="${id}" aria-selected="${id === state.side}">${label}${sideHasContent(id) ? '<span class="dot" title="Con diseño"></span>' : ''}</button>`).join('');
}
function updateHistoryButtons(){
  const h = hist[state.side];
  $('#undoBtn').disabled = h.i <= 0;
  $('#redoBtn').disabled = h.i >= h.stack.length - 1;
}
function updateEmpty(){
  $('#emptyHint').hidden = canvas.getObjects().length > 0 || canvas.isDrawingMode || !$('#guidesToggle').checked;
}
function updateQuote(){
  const P = PRODUCTS[state.product];
  const qty = clamp(parseInt($('#qty').value, 10) || 1, 1, 9999);
  state.qty = qty;
  const sides = ['front','back'].filter(sideHasContent).length;
  const img = ['front','back'].some(sideHasImage);
  const unit = P.price + CONFIG.perSide * sides + (img ? CONFIG.fullColor : 0);
  const disc = (CONFIG.discounts.find(([min]) => qty >= min) || [0, 0])[1];
  const total = unit * qty * (1 - disc);
  state.quote = { unit, qty, discount:disc, total, currency:CONFIG.currency };
  $('#quoteLines').innerHTML =
    `<div><span>${P.name}</span><span>${money.format(P.price)}</span></div>
     <div><span>Impresión, ${sides} ${sides === 1 ? 'lado' : 'lados'}</span><span>${money.format(CONFIG.perSide * sides)}</span></div>
     ${img ? `<div><span>Imagen a todo color</span><span>${money.format(CONFIG.fullColor)}</span></div>` : ''}
     <div><span>Precio por pieza</span><span>${money.format(unit)}</span></div>
     ${disc ? `<div class="disc"><span>Descuento por volumen, ${Math.round(disc * 100)}%</span><span>−${money.format(unit * qty * disc)}</span></div>` : ''}`;
  $('#quoteTotal').textContent = money.format(total);
  const next = CONFIG.discounts.slice().reverse().find(([min]) => qty < min);
  $('#quoteHint').textContent = next ? `Desde ${next[0]} piezas obtienes ${Math.round(next[1] * 100)}% de descuento.` : 'Ya tienes el mayor descuento por volumen.';
}
function refreshUI(){ renderLayers(); renderSides(); updateHistoryButtons(); updateEmpty(); updateQuote(); }

function renderProductPanel(){
  $('#productList').innerHTML = Object.entries(PRODUCTS).map(([id, p]) =>
    `<button type="button" class="product-card" data-product="${id}" aria-pressed="${id === state.product}">
      <svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${shadeDefs()}${MOCKUPS[id]('front', id === state.product ? state.color : p.colors[0][0])}</svg>
      <span>${p.name}</span><small>desde ${money.format(p.price)}</small></button>`).join('');
  const P = PRODUCTS[state.product];
  const cur = state.color.toLowerCase();
  $('#colorList').innerHTML = P.colors.map(([hex, name]) =>
    `<button type="button" class="swatch" style="--sw:${hex}" data-color="${hex}" aria-pressed="${hex.toLowerCase() === cur}" aria-label="${name}" title="${name}"></button>`).join('')
    + (P.custom ? `<label class="swatch swatch-custom" title="Otro color"><input type="color" id="customColor" value="${toHex(state.color)}" aria-label="Elegir otro color"></label>` : '');
  $('#colorName').textContent = (P.colors.find(c => c[0].toLowerCase() === cur) || [0, 'personalizado'])[1];
}

/* ---------- Panel de propiedades ---------- */
const btn = (act, label, cls = '') => `<button type="button" class="btn ${cls}" data-act="${act}">${label}</button>`;
const seg = (act, label, pressed, title) => `<button type="button" class="seg-btn" data-act="${act}" aria-pressed="${!!pressed}" title="${title}" aria-label="${title}">${label}</button>`;
const range = (label, p, min, max, step, val, suffix = '') =>
  `<label class="field"><span>${label} <output>${val}${suffix}</output></span><input type="range" min="${min}" max="${max}" step="${step}" data-p="${p}" value="${val}" data-suffix="${suffix}"></label>`;

function textControls(o){
  const fonts = FONTS.map(f => `<option value="${f}" ${f === o.fontFamily ? 'selected' : ''}>${f}</option>`).join('');
  const bold = o.fontWeight === 'bold' || +o.fontWeight >= 700;
  return `
    <label class="field"><span>Texto</span><textarea data-p="text" rows="2">${esc(o.text)}</textarea></label>
    <div class="grid2">
      <label class="field"><span>Tipografía</span><select data-p="fontFamily">${fonts}</select></label>
      <label class="field"><span>Tamaño</span><input type="number" min="8" max="300" data-p="fontSize" value="${Math.round(o.fontSize)}"></label>
    </div>
    <div class="seg">${seg('bold', '<b>B</b>', bold, 'Negrita')}${seg('italic', '<i>I</i>', o.fontStyle === 'italic', 'Cursiva')}${seg('underline', '<u>S</u>', o.underline, 'Subrayado')}</div>
    <div class="seg">${seg('align-left', 'Izq.', o.textAlign === 'left', 'Alinear a la izquierda')}${seg('align-center', 'Centro', o.textAlign === 'center', 'Centrar texto')}${seg('align-right', 'Der.', o.textAlign === 'right', 'Alinear a la derecha')}</div>
    <div class="grid2">
      <label class="field"><span>Color</span><input type="color" data-p="fill" value="${toHex(o.fill)}"></label>
      <label class="field"><span>Contorno</span><input type="color" data-p="stroke" value="${toHex(o.stroke || '#000000')}"></label>
    </div>
    ${range('Grosor del contorno', 'strokeWidth', 0, 12, 0.5, o.strokeWidth || 0)}
    ${range('Curvatura', 'arc', -100, 100, 1, o.arc || 0)}
    ${range('Espacio entre letras', 'charSpacing', -100, 800, 10, o.charSpacing || 0)}
    ${range('Interlineado', 'lineHeight', 0.7, 2.5, 0.05, +(o.lineHeight || 1.16).toFixed(2))}
    <label class="check"><input type="checkbox" data-p="shadow" ${o.shadow ? 'checked' : ''}> Sombra</label>`;
}
function shapeControls(o){
  const isRect = o instanceof F.Rect && o.name !== 'Línea';
  return `
    <div class="grid2">
      <label class="field"><span>Relleno</span><input type="color" data-p="fill" value="${toHex(o.fill)}"></label>
      <label class="field"><span>Borde</span><input type="color" data-p="stroke" value="${toHex(o.stroke || '#000000')}"></label>
    </div>
    ${range('Grosor del borde', 'strokeWidth', 0, 20, 0.5, o.strokeWidth || 0)}
    ${isRect ? range('Esquinas redondeadas', 'rx', 0, 60, 1, Math.round(o.rx || 0)) : ''}
    <label class="check"><input type="checkbox" data-p="shadow" ${o.shadow ? 'checked' : ''}> Sombra</label>`;
}
function imageControls(o){
  const fx = o.fx || {};
  const ck = (k, label) => `<label class="check"><input type="checkbox" data-p="fx.${k}" ${fx[k] ? 'checked' : ''}> ${label}</label>`;
  return ck('removeWhite', 'Quitar fondo blanco') + ck('gray', 'Blanco y negro') + ck('sepia', 'Sepia') + ck('invert', 'Invertir colores')
    + range('Brillo', 'fx.bright', -100, 100, 1, Math.round((fx.bright || 0) * 100))
    + `<label class="check"><input type="checkbox" data-p="shadow" ${o.shadow ? 'checked' : ''}> Sombra</label>`;
}
function drawControls(o){
  return `<label class="field"><span>Color del trazo</span><input type="color" data-p="stroke" value="${toHex(o.stroke)}"></label>`
    + range('Grosor', 'strokeWidth', 1, 40, 1, o.strokeWidth || 1);
}
function commonControls(objs){
  const o = objs[0], single = objs.length === 1;
  const op = Math.round((o.opacity ?? 1) * 100);
  const locked = objs.every(x => x.locked);
  return `<h3>Posición y orden</h3>
    ${range('Opacidad', 'opacity', 10, 100, 1, op, '%')}
    <div class="btn-grid">
      ${btn('flipX', 'Voltear horizontal')}${btn('flipY', 'Voltear vertical')}
      ${btn('centerH', 'Centrar horizontal')}${btn('centerV', 'Centrar vertical')}
      ${single ? btn('fit', 'Ajustar al área') + btn('center', 'Centrar en el área') : ''}
      ${btn('front', 'Traer al frente')}${btn('back', 'Enviar al fondo')}
      ${btn('forward', 'Subir una capa')}${btn('backward', 'Bajar una capa')}
    </div>
    <div class="btn-row">${btn('dup', 'Duplicar')}${btn('lock', locked ? 'Desbloquear' : 'Bloquear')}${btn('del', 'Eliminar', 'danger')}</div>`;
}
const SHORTCUTS = `<details class="shortcuts"><summary>Atajos de teclado</summary><dl>
  <dt>Ctrl Z</dt><dd>Deshacer</dd><dt>Ctrl Y</dt><dd>Rehacer</dd><dt>Ctrl C / V</dt><dd>Copiar y pegar</dd>
  <dt>Ctrl D</dt><dd>Duplicar</dd><dt>Supr</dt><dd>Eliminar</dd><dt>Flechas</dt><dd>Mover 1 px (con Shift, 10 px)</dd>
  <dt>Esc</dt><dd>Quitar selección</dd><dt>Doble clic</dt><dd>Editar un texto</dd></dl></details>`;

function renderProps(){
  const box = $('#props');
  const objs = canvas.getActiveObjects();
  if (!objs.length) {
    box.innerHTML = '<p class="empty">Selecciona un elemento del diseño para editarlo, o agrega uno desde las herramientas de la izquierda.</p>' + SHORTCUTS;
    return;
  }
  const o = objs[0], single = objs.length === 1;
  let h = `<div class="prop-head"><strong>${single ? esc(layerName(o)) : objs.length + ' elementos seleccionados'}</strong></div>`;
  if (single) {
    if (o.kind === 'text') h += textControls(o);
    else if (o.kind === 'shape') h += shapeControls(o);
    else if (o.kind === 'image') h += imageControls(o);
    else if (o.kind === 'draw') h += drawControls(o);
  }
  h += commonControls(objs);
  box.innerHTML = h;
}

function applyProp(p, v, commit){
  const objs = canvas.getActiveObjects();
  if (!objs.length) return;
  objs.forEach(o => {
    switch (p) {
      case 'text': o.set('text', v); break;
      case 'fontFamily':
        loadFont(v).then(() => { o.set('fontFamily', v); if (o.arc) applyArc(o, o.arc); o.setCoords(); canvas.requestRenderAll(); schedulePush(); });
        return;
      case 'fontSize': o.set('fontSize', clamp(+v || 8, 8, 300)); break;
      case 'fill': o.set('fill', v); break;
      case 'stroke':
        o.set('stroke', v);
        if (!o.strokeWidth && o.kind !== 'draw') o.set('strokeWidth', 2);
        break;
      case 'strokeWidth':
        o.set('strokeWidth', +v);
        if (+v > 0 && !o.stroke) o.set('stroke', '#000000');
        break;
      case 'opacity': o.set('opacity', +v / 100); break;
      case 'charSpacing': o.set('charSpacing', +v); break;
      case 'lineHeight': o.set('lineHeight', +v); break;
      case 'arc': if (o.kind === 'text') applyArc(o, +v); return;
      case 'rx': o.set({ rx:+v, ry:+v }); break;
      case 'shadow': o.set('shadow', v ? new F.Shadow({ color:'rgba(0,0,0,.45)', blur:8, offsetX:3, offsetY:3 }) : null); break;
      default:
        if (p.startsWith('fx.') && o.kind === 'image') {
          const k = p.slice(3);
          o.fx = Object.assign({}, o.fx, { [k]: k === 'bright' ? +v / 100 : !!v });
          applyFx(o);
        }
    }
    if (o.kind === 'text' && o.arc && ['text','fontSize','charSpacing','lineHeight','strokeWidth'].includes(p)) applyArc(o, o.arc);
    o.setCoords();
  });
  canvas.requestRenderAll();
  if (commit) { schedulePush(); if (['stroke','strokeWidth'].includes(p)) renderProps(); }
}

async function doAct(act){
  const objs = canvas.getActiveObjects(), sel = canvas.getActiveObject();
  if (!objs.length) return;
  const texts = objs.filter(o => o.kind === 'text');
  switch (act) {
    case 'bold': texts.forEach(o => o.set('fontWeight', (o.fontWeight === 'bold' || +o.fontWeight >= 700) ? 'normal' : 'bold')); break;
    case 'italic': texts.forEach(o => o.set('fontStyle', o.fontStyle === 'italic' ? 'normal' : 'italic')); break;
    case 'underline': texts.forEach(o => o.set('underline', !o.underline)); break;
    case 'align-left': case 'align-center': case 'align-right':
      texts.forEach(o => { if (!o.arc) o.set('textAlign', act.slice(6)); });
      if (texts.some(o => o.arc)) toast('El texto en arco siempre va centrado.');
      break;
    case 'flipX': objs.forEach(o => o.set('flipX', !o.flipX)); break;
    case 'flipY': objs.forEach(o => o.set('flipY', !o.flipY)); break;
    case 'centerH': alignActive('h'); break;
    case 'centerV': alignActive('v'); break;
    case 'center': alignActive('both'); break;
    case 'fit': fitToArea(sel); break;
    case 'front': case 'back': case 'forward': case 'backward': reorder(act); break;
    case 'dup': await duplicate(); return;
    case 'del': removeActive(); return;
    case 'lock': { const L = !objs.every(o => o.locked); objs.forEach(o => setLock(o, L)); break; }
  }
  texts.forEach(o => { if (o.arc) applyArc(o, o.arc); });
  objs.forEach(o => o.setCoords());
  sel.setCoords();
  canvas.requestRenderAll();
  renderProps(); renderLayers(); schedulePush();
}

/* ---------- Eventos ---------- */
function snapToCenter(e){
  const o = e.target, a = area();
  const cx = a.left + a.width / 2, cy = a.top + a.height / 2, c = o.getCenterPoint(), T = 6 / zoom;
  const sx = Math.abs(c.x - cx) < T, sy = Math.abs(c.y - cy) < T;
  if (sx || sy) o.setPositionByOrigin(new F.Point(sx ? cx : c.x, sy ? cy : c.y), 'center', 'center');
  showGuides(sx, sy);
}
function bindCanvas(){
  const changed = () => { if (!restoring) schedulePush(); };
  canvas.on('object:added', changed);
  canvas.on('object:removed', changed);
  canvas.on('object:modified', () => { if (!restoring) { schedulePush(); renderProps(); } });
  canvas.on('text:changed', e => {
    const t = e.target;
    if (t.arc) applyArc(t, t.arc);
    const ta = $('#props [data-p="text"]');
    if (ta && document.activeElement !== ta) ta.value = t.text;
    schedulePush();
  });
  ['selection:created','selection:updated','selection:cleared'].forEach(ev => canvas.on(ev, () => { renderProps(); renderLayers(); }));
  canvas.on('path:created', e => prep(e.path, 'draw', 'Trazo'));
  canvas.on('object:moving', snapToCenter);
  canvas.on('mouse:up', () => showGuides(false, false));
}

function showTool(id){
  $$('.rail button').forEach(b => b.setAttribute('aria-selected', b.dataset.tool === id));
  $$('.tool').forEach(s => { s.hidden = s.dataset.tool !== id; });
  if (id !== 'draw') setDrawing(false);
}

function bindUI(){
  $$('.rail button').forEach(b => b.addEventListener('click', () => showTool(b.dataset.tool)));

  // Texto
  $('#addTextBtn').addEventListener('click', () => addText({ text:$('#newText').value.trim() || 'Tu texto' }));
  $('#newText').addEventListener('keydown', e => { if (e.key === 'Enter') $('#addTextBtn').click(); });
  $('#presetList').innerHTML = PRESETS.map((p, i) => `<button type="button" data-preset="${i}"><span style="font-family:'${p.font}';font-size:18px">${esc(p.text)}</span><small>${p.label}</small></button>`).join('');
  $('#presetList').addEventListener('click', e => { const b = e.target.closest('[data-preset]'); if (b) addText(PRESETS[+b.dataset.preset]); });
  $('#fontGrid').innerHTML = FONTS.map(f => `<button type="button" data-font="${f}" style="font-family:'${f}'" title="${f}">${f}</button>`).join('');
  $('#fontGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-font]'); if (!b) return;
    const objs = canvas.getActiveObjects();
    if (objs.length && objs.every(o => o.kind === 'text')) { applyProp('fontFamily', b.dataset.font, true); }
    else addText({ font:b.dataset.font, text:$('#newText').value.trim() || 'Tu texto' });
  });

  // Imágenes
  const imgInput = $('#imgInput');
  imgInput.addEventListener('change', async () => { for (const f of imgInput.files) await addImageFile(f); imgInput.value = ''; });
  const dropTargets = [$('#dropZone'), $('#stageBox')];
  dropTargets.forEach(el => {
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('is-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('is-over'));
    el.addEventListener('drop', async e => {
      e.preventDefault(); el.classList.remove('is-over');
      for (const f of e.dataTransfer.files) await addImageFile(f);
    });
  });

  // Formas
  $('#shapeGrid').innerHTML = Object.entries(SHAPES).map(([k, s]) => `<button type="button" data-shape="${k}"><svg viewBox="0 0 24 24" aria-hidden="true">${s.svg}</svg>${s.label}</button>`).join('');
  $('#shapeGrid').addEventListener('click', e => { const b = e.target.closest('[data-shape]'); if (b) addShape(b.dataset.shape); });

  // Dibujo
  $('#drawToggle').addEventListener('click', () => setDrawing(!canvas.isDrawingMode));
  $('#brushColor').addEventListener('input', e => { if (canvas.freeDrawingBrush) canvas.freeDrawingBrush.color = e.target.value; });
  $('#brushWidth').addEventListener('input', e => { $('#brushOut').textContent = e.target.value; if (canvas.freeDrawingBrush) canvas.freeDrawingBrush.width = +e.target.value; });

  // Producto
  $('#productList').addEventListener('click', e => { const b = e.target.closest('[data-product]'); if (b) setProduct(b.dataset.product); });
  $('#colorList').addEventListener('click', e => { const b = e.target.closest('[data-color]'); if (b) setColor(b.dataset.color); });
  $('#colorList').addEventListener('input', e => { if (e.target.id === 'customColor') { state.color = e.target.value; renderMockup(); $('#colorName').textContent = 'personalizado'; } });
  $('#colorList').addEventListener('change', e => { if (e.target.id === 'customColor') setColor(e.target.value); });

  // Lados, guías, zoom
  $('#sideTabs').addEventListener('click', e => { const b = e.target.closest('[data-side]'); if (b && b.dataset.side !== state.side) gotoSide(b.dataset.side); });
  $('#guidesToggle').addEventListener('change', e => { $('#stage').classList.toggle('no-guides', !e.target.checked); updateEmpty(); });
  $('#zoomIn').addEventListener('click', () => applyZoom(zoom * 1.15));
  $('#zoomOut').addEventListener('click', () => applyZoom(zoom / 1.15));
  $('#zoomFit').addEventListener('click', fitZoom);
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fitZoom, 150); });

  // Historial y menús
  $('#undoBtn').addEventListener('click', undo);
  $('#redoBtn').addEventListener('click', redo);
  $$('[data-menu]').forEach(b => b.addEventListener('click', async () => {
    b.closest('details').open = false;
    const m = b.dataset.menu;
    if (m === 'save') saveDesign();
    else if (m === 'open') $('#openInput').click();
    else if (m === 'new') await newDesign();
    else if (m === 'mockup') await exportMockup();
    else if (m === 'print') exportPrint();
    else if (m === 'order') await exportOrder();
  }));
  document.addEventListener('click', e => { $$('details.menu[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; }); });
  $('#openInput').addEventListener('change', e => { const f = e.target.files[0]; if (f) openDesign(f); e.target.value = ''; });

  // Cotización
  $('#qty').addEventListener('input', () => { updateQuote(); autosave(); });

  // Propiedades (delegación)
  const props = $('#props');
  const valOf = el => el.type === 'checkbox' ? el.checked : el.value;
  props.addEventListener('input', e => {
    const el = e.target, p = el.dataset.p; if (!p) return;
    const out = el.closest('.field')?.querySelector('output');
    if (out) out.textContent = el.value + (el.dataset.suffix || '');
    if (el.type !== 'checkbox' && el.tagName !== 'SELECT') applyProp(p, valOf(el), false);
  });
  props.addEventListener('change', e => { const el = e.target; if (el.dataset.p) applyProp(el.dataset.p, valOf(el), true); });
  props.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) doAct(b.dataset.act); });

  // Capas (delegación)
  $('#layers').addEventListener('click', e => {
    const b = e.target.closest('[data-lact]'); if (!b) return;
    const id = b.closest('li').dataset.id;
    const o = canvas.getObjects().find(x => x.id === id); if (!o) return;
    const a = b.dataset.lact;
    if (a === 'select') {
      if (o.visible === false) { toast('Esta capa está oculta. Muéstrala para editarla.'); return; }
      setDrawing(false);
      canvas.setActiveObject(o);
    } else if (a === 'vis') {
      o.visible = o.visible === false;
      if (!o.visible && canvas.getActiveObjects().includes(o)) canvas.discardActiveObject();
      schedulePush();
    } else if (a === 'lock') {
      setLock(o, !o.locked);
      schedulePush();
    }
    canvas.requestRenderAll(); renderLayers(); renderProps();
  });

  // Teclado
  document.addEventListener('keydown', e => {
    const tag = e.target.tagName;
    if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
    const act = canvas.getActiveObject();
    if (act && act.isEditing) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    else if (mod && k === 'd') { e.preventDefault(); duplicate(); }
    else if (mod && k === 'c') { if (act) { e.preventDefault(); copySel(); } }
    else if (mod && k === 'v') { if (clipboard.length) { e.preventDefault(); paste(); } }
    else if (k === 'delete' || k === 'backspace') { if (act) { e.preventDefault(); removeActive(); } }
    else if (k === 'escape') { canvas.discardActiveObject(); setDrawing(false); canvas.requestRenderAll(); }
    else if (k.startsWith('arrow') && act && !act.locked) {
      e.preventDefault();
      const s = e.shiftKey ? 10 : 1;
      act.set({ left:act.left + (k === 'arrowleft' ? -s : k === 'arrowright' ? s : 0), top:act.top + (k === 'arrowup' ? -s : k === 'arrowdown' ? s : 0) });
      act.setCoords(); canvas.requestRenderAll(); schedulePush();
    }
  });
}

function setupDefaults(){
  const look = { borderColor:'#D3367A', cornerColor:'#FFFFFF', cornerStrokeColor:'#D3367A', cornerStyle:'circle', transparentCorners:false, cornerSize:11, padding:4, borderScaleFactor:1.5 };
  const target = (F.InteractiveFabricObject && F.InteractiveFabricObject.ownDefaults) || F.FabricObject.prototype;
  Object.assign(target, look);
}

/* ---------- Inicio ---------- */
async function init(){
  F = window.fabric;
  if (!F) {
    $('#stageBox').innerHTML = '<p class="load-error">No se pudo cargar el editor (Fabric.js). Revisa tu conexión a internet y vuelve a abrir el archivo.</p>';
    return;
  }
  setupDefaults();
  canvas = new F.Canvas('c', {
    width:W, height:H, preserveObjectStacking:true,
    selectionColor:'rgba(211,54,122,.08)', selectionBorderColor:'#D3367A', selectionLineWidth:1
  });
  bindCanvas();
  bindUI();
  restoreSaved();
  $('#qty').value = state.qty;
  await Promise.race([Promise.all(FONTS.map(loadFont)), new Promise(r => setTimeout(r, 2500))]);
  await loadSide();
  renderProductPanel();
  fitZoom();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
