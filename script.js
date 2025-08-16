(function () {
  // защита от двойного подключения
  if (window.__GORSNOW_INIT__) return;
  window.__GORSNOW_INIT__ = true;

  document.addEventListener('DOMContentLoaded', () => {
    // ----------- ВЫБОР ЗОН -----------
    const zoneSelect = document.getElementById('zoneSelect');
    const zones = Array.from(document.querySelectorAll('.zone'));
    let selectedZoneId = null;

    function highlightSelection(id) {
      zones.forEach(el => {
        const isSel = el.id === id;
        el.classList.toggle('is-selected', isSel);
        // лёгкая обводка для наглядности (не трогаем верёвочки)
        if (el.id !== 'fill_drawcords') {
          if (isSel) {
            el.setAttribute('stroke', el.getAttribute('stroke') || '#333');
            el.setAttribute('stroke-width', el.getAttribute('stroke-width') || '2');
          } else {
            el.removeAttribute('stroke');
            el.removeAttribute('stroke-width');
          }
        }
      });
    }

    zones.forEach(z => {
      z.style.cursor = 'pointer';
      z.addEventListener('click', () => {
        selectedZoneId = z.id;
        if (zoneSelect) zoneSelect.value = z.id;
        highlightSelection(z.id);
      });
    });

    if (zoneSelect) {
      zoneSelect.addEventListener('change', () => {
        selectedZoneId = zoneSelect.value || null;
        highlightSelection(selectedZoneId);
      });
    }

    if (!selectedZoneId && zones[0]) {
      selectedZoneId = zones[0].id;
      if (zoneSelect) zoneSelect.value = zones[0].id;
      highlightSelection(selectedZoneId);
    }

    function applyColorToSelected(hex) {
      const id = selectedZoneId || (zoneSelect && zoneSelect.value);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      if (id === 'fill_drawcords') el.setAttribute('stroke', hex);
      else el.setAttribute('fill', hex);
    }

    // ----------- COLOR PICKER (без дублей) -----------
    const holder = document.getElementById('colorPicker');
    // на всякий: чистим контейнер, если там что-то было
    while (holder && holder.firstChild) holder.removeChild(holder.firstChild);

    if (window.iro && window.iro.ColorPicker) {
      const picker = new iro.ColorPicker(holder, {
        width: 220,
        color: '#8ed1dc',
        layoutDirection: 'vertical',
        layout: [
          { component: iro.ui.Wheel },
          { component: iro.ui.Slider, options: { sliderType: 'value' } },
        ],
      });
      picker.on('color:change', c => applyColorToSelected(c.hexString));
    } else {
      // фолбэк: обычный input[type=color]
      const input = document.createElement('input');
      input.type = 'color';
      input.value = '#8ed1dc';
      holder.appendChild(input);
      input.addEventListener('input', e => applyColorToSelected(e.target.value));
      console.warn('iro.js не найден — используется простой color input');
    }

    // ----------- КНОПКА ЭКСПОРТА -----------
    const btn = document.getElementById('savePngBtn');
    if (btn) btn.addEventListener('click', savePNG);

    console.log('[INIT] btn:', !!btn, 'svg:', !!document.getElementById('hoodie-svg'));
  });

  // ----------- EXPORT: SVG -> PNG (с инлайном <image>) -----------
  async function savePNG() {
  const svgEl = document.getElementById('hoodie-svg');
  if (!svgEl) return alert('SVG не найден');

  const outW = 2674, outH = 3000;

  // 1) Клонируем SVG и ВЫКИДЫВАЕМ из клона тени (image),
  //    чтобы получить чистые заливки
  const cloned = svgEl.cloneNode(true);
  // Если теней несколько — соберите их в массив ids и удалите циклом
  const shadowInClone = cloned.querySelector('#shadowLayer');
  if (shadowInClone) shadowInClone.remove();

  // Обеспечим корректные размеры SVG
  cloned.setAttribute('width', outW);
  cloned.setAttribute('height', outH);
  cloned.setAttribute('viewBox', `0 0 ${outW} ${outH}`);

  // Сериализуем «чистый» SVG
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(cloned);
  if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl  = URL.createObjectURL(svgBlob);

  // 2) Готовим canvas
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');

  // 3) Загружаем «чистый» SVG как картинку
  const svgImg = await loadImage(svgUrl).catch(e => {
    URL.revokeObjectURL(svgUrl);
    console.error(e);
    alert('Не удалось отрисовать SVG при экспорте'); 
  });
  if (!svgImg) return;

  // Рисуем цветные заливки
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.drawImage(svgImg, 0, 0, outW, outH);
  URL.revokeObjectURL(svgUrl);

  // 4) Загружаем PNG‑тени из исходного DOM (а не из клона)
  const shadowEl = svgEl.querySelector('#shadowLayer');
  if (shadowEl) {
    const href = shadowEl.getAttribute('href') ||
                 shadowEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (href) {
      const shadowImg = await loadImage(href).catch(e => console.error(e));
      if (shadowImg) {
        // Накладываем с multiply (то самое «умножение»)
        ctx.globalCompositeOperation = 'multiply';
        // Возьмём ту же непрозрачность, что в стиле слоя
        const style = shadowEl.getAttribute('style') || '';
        const opMatch = style.match(/opacity\s*:\s*([0-9.]+)/i);
        const opacity = opMatch ? parseFloat(opMatch[1]) : 0.65;
        ctx.globalAlpha = isFinite(opacity) ? opacity : 0.65;

        ctx.drawImage(shadowImg, 0, 0, outW, outH);

        // вернём нормальный режим
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    }
  }

  // 5) Скачиваем PNG
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GORSNOW_hoodie_${outW}x${outH}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// утилита загрузки картинки (Promise)
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // если файл лежит на другом домене — понадобится CORS
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
})();
