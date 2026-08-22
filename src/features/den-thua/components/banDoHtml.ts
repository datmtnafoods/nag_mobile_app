/**
 * Trang MapLibre chạy trong WebView — CANVAS "CÂM": chỉ render bản đồ vệ tinh +
 * sửa hình học (thêm/kéo/chèn/xoá đỉnh) rồi bắn `ring` ngược về RN. KHÔNG tính
 * diện tích/kiểm tra gì — RN mới là nguồn sự thật (dùng `geo.ts`).
 *
 * Bám tính năng polygon của ERP (`nag_erp/.../growing-areas/ZoneMap.vue`):
 *   - Nền Liberty (OpenFreeMap, keyless) + raster vệ tinh Esri chèn NGAY DƯỚI
 *     symbol layer đầu tiên để nhãn VN nổi trên ảnh.
 *   - Vẽ tự viết tay: chạm thêm đỉnh, kéo đỉnh, chèn đỉnh ở điểm giữa cạnh,
 *     long-press/chuột-phải xoá đỉnh.
 *
 * Toạ độ: MapLibre dùng `[lng,lat]` == `Ring` của app → KHÔNG lật ở bất kỳ đâu.
 *
 * Giao thức bản tin (JSON):
 *   Page → RN qua `window.ReactNativeWebView.postMessage`:
 *     {type:'ready'} | {type:'ring', ring} | {type:'ringClosed', ring}
 *     {type:'error', reason}
 *     {type:'plotTap', id}   — chạm vào fill/label của một thửa (mode xem+plots)
 *     {type:'mapTap'}        — chạm chỗ trống trên map khi đang xem plots
 *   RN → Page qua `window.__onRNMessage(msg)` (RN gọi bằng injectJavaScript):
 *     {type:'init', mode, ring, otherRings, center}
 *     {type:'setRing', ring} | {type:'setMode', mode}
 *     {type:'setGps', gps} | {type:'setOtherRings', rings}
 *     {type:'addMyLocation', gps}
 *     {type:'setPlots', plots, fit?}  — plots: [{id, ring, center, label, mauFill, mauLine}]
 *     {type:'focusPlot', id}          — id null = bỏ chọn (không đổi camera)
 */

// Ghim version cho tái lập (như ERP ghim goong-js@1.0.9). MapLibre GL không cần token.
const MAPLIBRE_VER = '4.7.1';

export const BAN_DO_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link href="https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VER}/dist/maplibre-gl.css" rel="stylesheet"/>
<style>
  html,body,#map{margin:0;padding:0;height:100%;width:100%;overflow:hidden;background:#e5e7eb}
  .maplibregl-ctrl-attrib{font-size:9px}
  .maplibregl-ctrl-bottom-left{display:none}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VER}/dist/maplibre-gl.js"></script>
<script>
(function(){
  var RN = window.ReactNativeWebView;
  function send(m){ try{ RN && RN.postMessage(JSON.stringify(m)); }catch(e){} }

  if(!window.maplibregl){
    send({type:'error', reason:'Không tải được thư viện bản đồ (mất mạng?).'});
    return;
  }

  // Khớp biên VN của backend (core/geo.js) — chặn kéo bản đồ ra ngoài lãnh thổ.
  var VN_BOUNDS = [[101.6,7.5],[117.9,23.9]];
  var SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  var LIBERTY = 'https://tiles.openfreemap.org/styles/liberty';
  var MAU = '#dd1c2e';

  var mode = 've';
  var ring = [];        // [[lng,lat], ...] — nguồn sự thật của hình đang vẽ
  var other = [];       // ranh thửa khác (chỉ xem)
  var plots = [];       // [{id, ring, center, label, mauFill, mauLine}] — nhiều thửa có identity
  var selectedId = null;// id thửa đang chọn (viền dày + nổi hơn)
  var gps = null;       // {lng,lat,doChinhXac}
  // Đã tự-jump về GPS chưa (lần đầu). Tránh giật view khi GPS update liên tục,
  // và tôn trọng thao tác nếu user đã bắt đầu vẽ (ring ≥ 1 đỉnh).
  var daJumpToGps = false;
  // 'plots' (mặc định): có plots thì để fitPlots căn khung, đừng để GPS giật đè.
  // 'gps' (Thửa quanh bạn): ưu tiên flyTo về GPS zoom 17 ngay cả khi có plots.
  var focusGps = false;
  var centerFallback = null;  // căn về đây khi chưa có đỉnh/GPS/thửa nào ([lng,lat])
  var dragIndex = null;
  var lpTimer = null;
  var loadedOk = false;
  var CLOSE_PX = 22;    // chạm gần đỉnh đầu = coi như đóng vòng (không thêm trùng)
  var SNAP_PX = 20;     // hít vào đỉnh có sẵn cho khít

  var map = new maplibregl.Map({
    container: 'map',
    style: LIBERTY,
    center: [106.0,16.2],
    zoom: 4.5,
    maxBounds: VN_BOUNDS,
    maxZoom: 19,
    attributionControl: true,
    dragRotate: false,
    pitchWithRotate: false
  });
  map.touchZoomRotate.disableRotation();
  // KHÔNG add NavigationControl: pinch-to-zoom là chuẩn mobile; +/- ở top-right
  // đâm vào status bar/notch và va với X + hint pill của RN overlay.
  // KHÔNG dùng GeolocateControl: navigator.geolocation trong WKWebView chập chờn.
  // GPS được RN bơm xuống qua setGps + nút "Vị trí của tôi" (native).

  // Tile lẻ hỏng thì log, KHÔNG che map. Chỉ cả-style-hỏng mới coi là lỗi (qua timeout).
  map.on('error', function(e){ try{ console.warn(e && e.error); }catch(x){} });

  // Phao: 12s không load xong style là mạng chết → báo lỗi để RN fallback.
  setTimeout(function(){ if(!loadedOk) send({type:'error', reason:'Bản đồ tải quá lâu (mạng yếu?).'}); }, 12000);

  // ── GeoJSON builders ──────────────────────────────────────────────
  function closed(r){ return r.length ? r.concat([r[0]]) : r; }
  function mid(a,b){ return [(a[0]+b[0])/2,(a[1]+b[1])/2]; }

  function draftFC(){
    var f = [];
    if(ring.length >= 3){
      f.push({type:'Feature', properties:{role:'poly'}, geometry:{type:'Polygon', coordinates:[closed(ring)]}});
    }
    if(ring.length >= 2){
      f.push({type:'Feature', properties:{}, geometry:{type:'LineString', coordinates: ring.length>=3 ? closed(ring) : ring}});
    }
    if(mode === 've' && ring.length >= 2){
      var edges = ring.length >= 3 ? ring.length : ring.length - 1;
      for(var e=0;e<edges;e++){
        f.push({type:'Feature', properties:{role:'mid', edge:e}, geometry:{type:'Point', coordinates: mid(ring[e], ring[(e+1)%ring.length])}});
      }
    }
    // canClose = đỉnh đầu KHI ring đã đủ 3 điểm — nó là "nút Xong" trên bản đồ.
    // Layer draft-vertex đọc để đổi màu, user tự thấy "chạm chấm này để đóng".
    var canCloseFirst = ring.length >= 3;
    for(var i=0;i<ring.length;i++){
      f.push({type:'Feature', properties:{
        role:'vertex', i:i,
        first:(i===0?1:0),
        canClose: (i===0 && canCloseFirst ? 1 : 0),
      }, geometry:{type:'Point', coordinates: ring[i]}});
    }
    return {type:'FeatureCollection', features:f};
  }
  function otherFC(){
    return {type:'FeatureCollection', features: other.filter(function(r){return r && r.length>=3;}).map(function(r){
      return {type:'Feature', properties:{}, geometry:{type:'Polygon', coordinates:[closed(r)]}};
    })};
  }
  function gpsFC(){
    return {type:'FeatureCollection', features: gps ? [{type:'Feature', properties:{}, geometry:{type:'Point', coordinates:[gps.lng, gps.lat]}}] : []};
  }
  // Nhiều thửa (polygon) — mỗi feature mang id/màu/cờ-chọn để layer đọc trực tiếp.
  function plotsFC(){
    return {type:'FeatureCollection', features: plots
      .filter(function(p){ return p && p.ring && p.ring.length >= 3; })
      .map(function(p){
        return {type:'Feature',
          properties:{id:p.id, mauFill:p.mauFill, mauLine:p.mauLine, sel:(p.id===selectedId?1:0)},
          geometry:{type:'Polygon', coordinates:[closed(p.ring)]}};
      })};
  }
  // Nhãn thửa (tên hộ) đặt tại centroid RN đã tính.
  function plotLabelsFC(){
    return {type:'FeatureCollection', features: plots
      .filter(function(p){ return p && p.center && p.label; })
      .map(function(p){
        return {type:'Feature', properties:{id:p.id, label:p.label},
          geometry:{type:'Point', coordinates:p.center}};
      })};
  }

  function firstSymbolId(){
    var layers = (map.getStyle().layers) || [];
    for(var i=0;i<layers.length;i++){ if(layers[i].type === 'symbol') return layers[i].id; }
    return undefined;
  }
  // Glyph có sẵn của style (Noto Sans — có dấu tiếng Việt). KHÔNG hardcode
  // 'Open Sans Regular' vì Liberty của OpenFreeMap không có font đó → nhãn câm.
  function styleTextFont(){
    var layers = (map.getStyle().layers) || [];
    for(var i=0;i<layers.length;i++){
      var l = layers[i];
      if(l.type === 'symbol' && l.layout && l.layout['text-font']) return l.layout['text-font'];
    }
    return ['Noto Sans Regular'];
  }

  // ctx.roundRect không có ở mọi WKWebView cũ → tự vẽ bằng arcTo.
  function roundRect(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y,   x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x,   y+h, r);
    ctx.arcTo(x,   y+h, x,   y,   r);
    ctx.arcTo(x,   y,   x+w, y,   r);
    ctx.closePath();
  }

  // Ảnh nền "chip" cho nhãn tên hộ: vuông bo tròn, khai stretchX/stretchY (9-slice)
  // để khi icon-text-fit kéo giãn theo chữ thì góc bo giữ nguyên (thành viên thuốc).
  function addLabelBg(){
    try{
      if(map.hasImage('label-bg')) return true;
      var s = 40, r = 14;
      var cv = document.createElement('canvas'); cv.width = s; cv.height = s;
      var ctx = cv.getContext('2d');
      if(!ctx) return false;
      ctx.fillStyle = 'rgba(17,24,39,0.85)';
      roundRect(ctx, 0, 0, s, s, r); ctx.fill();
      var d = ctx.getImageData(0, 0, s, s);
      map.addImage('label-bg', {width:s, height:s, data:d.data}, {
        stretchX: [[r, s-r]],
        stretchY: [[r, s-r]],
        content: [8, 6, s-8, s-6],
      });
      return true;
    }catch(e){ return false; }
  }

  function addLayers(){
    // 1) Vệ tinh Esri, chèn dưới nhãn đầu tiên (maxzoom 18 — z19 overzoom).
    map.addSource('sat', {type:'raster', tiles:[SAT], tileSize:256, maxzoom:18, attribution:'© Esri — World Imagery'});
    map.addLayer({id:'sat', type:'raster', source:'sat'}, firstSymbolId());
    // Tắt POI thương mại (icon to lấn chấm dữ liệu).
    (map.getStyle().layers || []).forEach(function(l){
      if(/^poi[-_]/.test(l.id)){ try{ map.setLayoutProperty(l.id,'visibility','none'); }catch(e){} }
    });
    // 2) Thửa khác (xanh nhạt).
    map.addSource('other', {type:'geojson', data:otherFC()});
    map.addLayer({id:'other-fill', type:'fill', source:'other', paint:{'fill-color':'#38bdf8','fill-opacity':0.15}});
    map.addLayer({id:'other-line', type:'line', source:'other', paint:{'line-color':'#0284c7','line-width':2}});
    // 2b) Nhiều thửa có identity (mode xem). Màu theo status do RN gán; thửa
    //     đang chọn dày viền + đậm hơn (đọc property 'sel'). Nhãn tên hộ ở tâm.
    map.addSource('plots', {type:'geojson', data:plotsFC()});
    map.addLayer({id:'plots-fill', type:'fill', source:'plots', paint:{
      'fill-color':['get','mauFill'],
      'fill-opacity':['case',['==',['get','sel'],1],0.42,0.20],
    }});
    map.addLayer({id:'plots-line', type:'line', source:'plots', paint:{
      'line-color':['get','mauLine'],
      'line-width':['case',['==',['get','sel'],1],4,2],
    }});
    map.addSource('plot-labels', {type:'geojson', data:plotLabelsFC()});
    // Nhãn tên hộ = "chip" nền tối bo tròn (dễ đọc trên ảnh vệ tinh) — MapLibre
    // không có nền chữ sẵn nên dùng icon 9-slice co giãn theo chữ. Lỗi canvas →
    // fallback chữ-trắng-viền (vẫn đọc được).
    var coBg = addLabelBg();
    var labelLayout = {
      'text-field':['get','label'],
      'text-font': styleTextFont(),
      'text-size':12.5,
      'text-anchor':'center',
      'text-allow-overlap':false,
      'text-optional':true,
      'text-max-width':8,
      'text-padding':2,
    };
    var labelPaint = { 'text-color':'#ffffff' };
    if(coBg){
      labelLayout['icon-image'] = 'label-bg';
      labelLayout['icon-text-fit'] = 'both';
      labelLayout['icon-text-fit-padding'] = [3,8,3,8];
      labelLayout['icon-optional'] = false;
      labelLayout['icon-allow-overlap'] = false;
    } else {
      labelPaint['text-halo-color'] = 'rgba(17,24,39,0.9)';
      labelPaint['text-halo-width'] = 1.6;
    }
    map.addLayer({id:'plot-labels', type:'symbol', source:'plot-labels', layout:labelLayout, paint:labelPaint});
    // 3) Chấm GPS.
    map.addSource('gps', {type:'geojson', data:gpsFC()});
    map.addLayer({id:'gps-dot', type:'circle', source:'gps', paint:{'circle-radius':7,'circle-color':'#2563eb','circle-stroke-width':3,'circle-stroke-color':'#fff'}});
    // 4) Nét vẽ đang thao tác.
    map.addSource('draft', {type:'geojson', data:draftFC()});
    map.addLayer({id:'draft-fill', type:'fill', source:'draft', filter:['==',['get','role'],'poly'], paint:{'fill-color':MAU,'fill-opacity':0.22}});
    map.addLayer({id:'draft-line', type:'line', source:'draft', filter:['==',['geometry-type'],'LineString'], paint:{'line-color':MAU,'line-width':2.5}});
    map.addLayer({id:'draft-mid', type:'circle', source:'draft', filter:['==',['get','role'],'mid'], paint:{'circle-radius':6,'circle-color':'rgba(255,255,255,0.65)','circle-stroke-width':1.5,'circle-stroke-color':MAU}});
    // Đỉnh "chốt" (đỉnh đầu khi ring đã đủ 3 điểm): to hơn + viền XANH (khác đỏ)
    // để user tự bắt = chấm đóng vòng. Các đỉnh khác: đỏ + nhỏ hơn.
    map.addLayer({id:'draft-vertex', type:'circle', source:'draft',
      filter:['==',['get','role'],'vertex'],
      paint:{
        'circle-radius':['case',['==',['get','canClose'],1],13,['==',['get','first'],1],11,9],
        'circle-color':'#fff',
        'circle-stroke-width':['case',['==',['get','canClose'],1],4,3],
        'circle-stroke-color':['case',['==',['get','canClose'],1],'#166534',MAU],
      }});
  }

  function refreshDraft(){ var s = map.getSource('draft'); if(s) s.setData(draftFC()); }
  function refreshOther(){ var s = map.getSource('other'); if(s) s.setData(otherFC()); }
  function refreshGps(){ var s = map.getSource('gps'); if(s) s.setData(gpsFC()); }
  function refreshPlots(){
    var s = map.getSource('plots'); if(s) s.setData(plotsFC());
    var l = map.getSource('plot-labels'); if(l) l.setData(plotLabelsFC());
  }
  // Căn khung về toàn bộ thửa đang hiển thị (không trộn ring/gps như fit()).
  function fitPlots(){
    var pts = [];
    plots.forEach(function(p){ if(p && p.ring){ p.ring.forEach(function(c){ pts.push(c); }); } });
    if(!pts.length) return;
    var b = new maplibregl.LngLatBounds(pts[0], pts[0]);
    pts.forEach(function(p){ b.extend(p); });
    if(pts.length === 1){ map.jumpTo({center:pts[0], zoom:16}); }
    else { map.fitBounds(b, {padding:64, maxZoom:17, duration:300}); }
  }

  // Bắn ring lên RN (RN tính diện tích/tự-cắt/validate). Dùng sau mỗi thay đổi.
  function emit(){ refreshDraft(); send({type:'ring', ring:ring}); }

  function fit(){
    var pts = ring.slice();
    other.forEach(function(r){ if(r) pts = pts.concat(r); });
    if(gps) pts.push([gps.lng, gps.lat]);
    if(!pts.length){ if(centerFallback){ map.jumpTo({center:centerFallback, zoom:17}); } return; }
    var b = new maplibregl.LngLatBounds(pts[0], pts[0]);
    pts.forEach(function(p){ b.extend(p); });
    if(pts.length === 1){ map.jumpTo({center:pts[0], zoom:17}); }
    else { map.fitBounds(b, {padding:60, maxZoom:18, duration:0}); }
  }

  // ── Thao tác vẽ (mirror ZoneMap.vue) ──────────────────────────────
  function px(c){ return map.project(c); }
  // Chạm trúng một đỉnh có sẵn → KHÔNG đẻ đỉnh trùng (để long-press/kéo xử lý đỉnh đó).
  function nearAnyVertex(pt){
    for(var i=0;i<ring.length;i++){
      var p = px(ring[i]);
      if(Math.hypot(p.x-pt.x, p.y-pt.y) <= CLOSE_PX) return true;
    }
    return false;
  }
  function snap(lngLat, pt, excl){
    var best = lngLat, bd = SNAP_PX;
    for(var i=0;i<ring.length;i++){
      if(i === excl) continue;
      var p = px(ring[i]);
      var d = Math.hypot(p.x-pt.x, p.y-pt.y);
      if(d < bd){ bd = d; best = ring[i]; }
    }
    return best;
  }
  function clearLp(){ if(lpTimer){ clearTimeout(lpTimer); lpTimer = null; } }

  // Đỉnh đầu đóng vai "chốt" khi ring đủ 3 điểm: chạm gần nó = tự đóng vòng —
  // chuẩn Google Maps polygon draw. UI hiện đã render đỉnh đầu to hơn (radius 11
  // vs 9, xem draft-vertex layer) nên user tự thấy chấm "khác các đỉnh khác".
  function nearFirstVertex(pt){
    if(ring.length < 3) return false;
    var p = px(ring[0]);
    return Math.hypot(p.x-pt.x, p.y-pt.y) <= CLOSE_PX;
  }
  function bindEditing(){
    map.on('click', function(e){
      if(mode !== 've' || dragIndex !== null) return;
      // Chạm gần đỉnh đầu khi ring ≥3 đỉnh: bắn ringClosed để RN auto-finish
      // (không đẻ đỉnh mới). Ưu tiên trước nearAnyVertex vì đỉnh đầu cũng thuộc
      // nhóm "any vertex" — nếu để nearAnyVertex chặn trước thì không đóng được.
      if(nearFirstVertex(e.point)){ send({type:'ringClosed', ring:ring}); return; }
      if(nearAnyVertex(e.point)) return;                // chạm trúng đỉnh cũ: khỏi thêm trùng
      ring = ring.concat([ snap([e.lngLat.lng, e.lngLat.lat], e.point, -1) ]);
      emit();
    });

    function startDrag(e){
      if(mode !== 've') return;
      if(e.preventDefault) e.preventDefault();
      dragIndex = Number(e.features[0].properties.i);
      map.dragPan.disable();
    }
    map.on('mousedown', 'draft-vertex', startDrag);
    map.on('touchstart', 'draft-vertex', startDrag);

    function moveDrag(e){
      if(dragIndex === null) return;
      if(e.preventDefault) e.preventDefault();
      clearLp();
      var next = ring.slice();
      next[dragIndex] = snap([e.lngLat.lng, e.lngLat.lat], e.point, dragIndex);
      ring = next;
      emit();
    }
    map.on('mousemove', moveDrag);
    map.on('touchmove', moveDrag);

    function endDrag(){ if(dragIndex !== null){ dragIndex = null; map.dragPan.enable(); } }
    map.on('mouseup', endDrag);
    map.on('touchend', endDrag);
    map.on('touchcancel', endDrag);

    function insertMid(e){
      if(mode !== 've') return;
      if(e.preventDefault) e.preventDefault();
      var edge = Number(e.features[0].properties.edge);
      var at = edge + 1;
      var next = ring.slice();
      next.splice(at, 0, [e.lngLat.lng, e.lngLat.lat]);
      ring = next;
      dragIndex = at;             // cho kéo tiếp ngay
      map.dragPan.disable();
      emit();
    }
    map.on('mousedown', 'draft-mid', insertMid);
    map.on('touchstart', 'draft-mid', insertMid);

    // Long-press 1 đỉnh (touch) = xoá.
    map.on('touchstart', 'draft-vertex', function(e){
      var i = Number(e.features[0].properties.i);
      clearLp();
      lpTimer = setTimeout(function(){
        ring = ring.filter(function(_, k){ return k !== i; });
        dragIndex = null; map.dragPan.enable();
        emit();
      }, 550);
    });
    map.on('touchend', clearLp);
    // Chuột phải xoá (desktop/emulator).
    map.on('contextmenu', 'draft-vertex', function(e){
      if(mode !== 've') return;
      var i = Number(e.features[0].properties.i);
      ring = ring.filter(function(_, k){ return k !== i; });
      emit();
    });

    // Con trỏ tay khi rê lên đỉnh (desktop).
    map.on('mouseenter', 'draft-vertex', function(){ map.getCanvas().style.cursor = 'move'; });
    map.on('mouseleave', 'draft-vertex', function(){ map.getCanvas().style.cursor = ''; });
  }

  // Tương tác nhiều-thửa (mode 'xem' + có plots): chạm thửa → plotTap; chạm chỗ
  // trống → mapTap (đóng card kiểu Booking). Tách khỏi bindEditing để không đụng vẽ.
  function bindPlots(){
    map.on('click', 'plots-fill', function(e){
      if(mode !== 'xem' || !plots.length) return;
      var f = e.features && e.features[0];
      if(f && f.properties && f.properties.id != null){ send({type:'plotTap', id:f.properties.id}); }
    });
    map.on('click', function(e){
      if(mode !== 'xem' || !plots.length) return;
      var hit = map.queryRenderedFeatures(e.point, {layers:['plots-fill']});
      if(!hit || !hit.length){ send({type:'mapTap'}); }
    });
    map.on('mouseenter', 'plots-fill', function(){ map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'plots-fill', function(){ map.getCanvas().style.cursor = ''; });
  }

  map.on('load', function(){
    loadedOk = true;
    addLayers();
    bindEditing();
    bindPlots();
    fit();
    send({type:'ready'});
  });

  // ── Nhận bản tin từ RN ────────────────────────────────────────────
  window.__onRNMessage = function(m){
    if(!m) return;
    if(m.type === 'init'){
      mode = m.mode || 've';
      ring = m.ring || [];
      other = m.otherRings || [];
      centerFallback = m.center || null;
      focusGps = !!m.focusGps;
      if(map.getSource('draft')){ refreshDraft(); refreshOther(); fit(); }
      return;
    }
    if(m.type === 'setRing'){ ring = m.ring || []; refreshDraft(); return; } // KHÔNG fit: tránh nhảy khi Hoàn tác/Xoá
    if(m.type === 'setMode'){ mode = m.mode || 've'; refreshDraft(); return; }
    if(m.type === 'setGps'){
      gps = m.gps || null;
      refreshGps();
      // Lần đầu có GPS + ring chưa vẽ đỉnh nào ⇒ flyTo vị trí thực tế của KTV.
      // Mặc định (focusGps=false): có plots thì fitPlots là chủ, đừng để GPS
      // giật đè. focusGps=true (Thửa quanh bạn): bỏ chặn plots, đây chính là
      // mục đích màn — về đúng vị trí user để nhìn quanh.
      if(gps && !daJumpToGps && ring.length === 0 && (focusGps || plots.length === 0)){
        map.flyTo({center:[gps.lng, gps.lat], zoom:17, duration:600});
        daJumpToGps = true;
      }
      return;
    }
    // Cho phép RN yêu cầu "quên" lần jump trước (user xoá hết để vẽ lại) ⇒ setGps
    // kế sẽ auto-flyTo về GPS mới, KTV đỡ pan tay tìm vị trí.
    if(m.type === 'resetGpsJump'){ daJumpToGps = false; return; }
    if(m.type === 'setOtherRings'){ other = m.rings || []; refreshOther(); return; }
    if(m.type === 'setPlots'){
      plots = m.plots || [];
      if(selectedId && !plots.some(function(p){ return p.id === selectedId; })) selectedId = null;
      if(map.getSource('plots')){ refreshPlots(); if(m.fit){ fitPlots(); } }
      return;
    }
    if(m.type === 'focusPlot'){
      selectedId = (m.id != null ? m.id : null);
      if(map.getSource('plots')){
        refreshPlots();
        if(selectedId){
          var sel = null;
          for(var k=0;k<plots.length;k++){ if(plots[k].id === selectedId){ sel = plots[k]; break; } }
          if(sel && sel.center){ map.easeTo({center:sel.center, zoom: Math.max(map.getZoom(), 16), duration:300}); }
        }
      }
      return;
    }
    if(m.type === 'addMyLocation'){
      if(!m.gps) return;
      var c = [m.gps.lng, m.gps.lat];
      ring = ring.concat([c]);
      emit();
      map.flyTo({center:c, zoom: Math.max(map.getZoom(), 17)});
      return;
    }
  };
})();
</script>
</body>
</html>`;
