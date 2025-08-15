// Инициализация iro.js
const colorPicker = new iro.ColorPicker("#colorPicker", {
  width: 220,
  color: "#8ed1dc",           // стартовый цвет
  layoutDirection: "vertical",
  layout: [
    { component: iro.ui.Wheel },     // цветовой круг
    { component: iro.ui.Slider, options: { sliderType: 'value' } } // яркость
  ]
});

const zoneEl = document.getElementById('zoneSelect');

function applyColorToZone(hex) {
  const zoneId = zoneEl.value;
  const el = document.getElementById(zoneId);
  if (!el) return;

  if (zoneId === 'fill_drawcords') {
    el.setAttribute('stroke', hex);
  } else {
    el.setAttribute('fill', hex);
  }
}

// Реакция на изменение цвета (и на тач, и на десктопе)
colorPicker.on('color:change', (color) => {
  applyColorToZone(color.hexString);
});

document.getElementById('savePngBtn').addEventListener('click', savePNG);

function savePNG() {
  const svgEl = document.getElementById('hoodie-svg'); // твой <svg id="hoodie-svg">
  if (!svgEl) return alert('SVG не найден');

  // Жёстко задаём размеры под твой PNG-слой
  const outW = 2674;
  const outH = 3000;

  // Клонируем SVG, чтобы не трогать оригинал
  const cloned = svgEl.cloneNode(true);

  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(cloned);

  if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');

  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, outW, outH);
    URL.revokeObjectURL(svgUrl);

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = GORSNOW_hoodie_${outW}x${outH}.png;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  img.onerror = () => {
    URL.revokeObjectURL(svgUrl);
    alert('Ошибка при экспорте. Проверь путь к файлу с тенью.');
  };

  img.src = svgUrl;
}