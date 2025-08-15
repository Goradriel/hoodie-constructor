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