const COLORS = [
  "#00000000",
  "#07070711",
  "#1F070733",
  "#2F0F0755",
  "#470F0777",
  "#57170788",
  "#671F0799",
  "#771F07AA",
  "#8F2707BB",
  "#9F2F07CC",
  "#AF3F0FDD",
  "#BF470FEE",
  "#C7470FFF",
  "#DF4F0FFF",
  "#DF570FFF",
  "#DF570FFF",
  "#D75F0FFF",
  "#D75F0FFF",
  "#D7670FFF",
  "#CF6F0FFF",
  "#CF770FFF",
  "#CF800FFF",
  "#CF8717FF",
  "#C78717FF",
  "#C78F17FF",
  "#C7971FFF",
  "#BF9F1FFF",
  "#BF9F1FFF",
  "#BFA727FF",
  "#BFA727FF",
  "#BFAF2FFF",
  "#B7AF2FFF",
  "#B7B72FFF",
  "#B7B737FF",
  "#CFCF6FFF",
  "#DFDF9FFF",
  "#EFEFC7FF",
  "#FFFFFFFF"
];

const convert = (hexColor) => {
  const red = parseInt(hexColor.substr(1, 2), 16);
  const green = parseInt(hexColor.substr(3, 2), 16);
  const blue = parseInt(hexColor.substr(5, 2), 16);
  const alpha = parseInt(hexColor.substr(7, 2), 16) || 0;
  return (alpha << 24) | (blue << 16) | (green << 8) | red;
};
const PAL = COLORS.map(convert);
PAL[0] = 0;

const canvases = document.querySelectorAll("canvas");

canvases.forEach((c) => {
  let contrast = 1.0;
  setInterval(() => {
    contrast += 0.02;
    c.style.filter = `contrast(${contrast})`;
  }, 1500);

  const textContent = c.dataset.text || "fire";
  const userWidth = parseInt(c.dataset.width || 400);
  const heightRem = parseFloat(c.dataset.height || 15);
  const scaleRes = parseFloat(c.dataset.res || 100) / 100;
  const fireResScale = parseFloat(c.dataset.fireRes || 100) / 100;
  const textColor = c.dataset.textColor || "#000000";
  const fontSizeRem = parseFloat(c.dataset.textSize || 3);
  const fireHeightMult = parseFloat(c.dataset.fireHeight || 1);
  const fireAngle = parseFloat(c.dataset.fireAngle || 0) * (Math.PI / 180);
  const angleVariance = parseFloat(c.dataset.fireAngleVariance || 20) * (Math.PI / 180);
  const fireRiseSpeedRem = parseFloat(c.dataset.fireRiseSpeed || 1);

  const rootFontSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
  const fontSize = fontSizeRem * rootFontSize;
  const userHeight = Math.round(heightRem * rootFontSize);
  const riseSpeedPx = fireRiseSpeedRem * rootFontSize;

  const CW = Math.round(userWidth * fireResScale);
  const CH = Math.round(userHeight * fireResScale);

  c.width = CW;
  c.height = CH;

  const ctx = c.getContext("2d", { alpha: true });

  const textCanvas = document.createElement("canvas");
  textCanvas.width = CW;
  textCanvas.height = CH;
  const textCtx = textCanvas.getContext("2d", { alpha: true });
  textCtx.scale(fireResScale, fireResScale);
  textCtx.fillStyle = textColor;
  textCtx.font = `bold ${fontSize}px sans-serif`;
  textCtx.textAlign = "center";
  textCtx.textBaseline = "middle";
  textCtx.fillText(textContent, userWidth / 2, userHeight / 2);

  const textImgData = textCtx.getImageData(0, 0, CW, CH);
  const textPixels = textImgData.data;

  const MAX_HEAT = PAL.length - 1;
  const imageData = ctx.createImageData(CW, CH);
  const uint32Data = new Uint32Array(imageData.data.buffer);
  const data = new Uint8ClampedArray(CW * CH);

  const setFire = () => {
    for (let y = 0; y < CH; y++) {
      for (let x = 0; x < CW; x++) {
        const idx = (y * CW + x) * 4;
        const alpha = textPixels[idx + 3];
        const p = y * CW + x;
        if (alpha > 128) {
          if (data[p] < MAX_HEAT) {
            data[p] = Math.min(MAX_HEAT, data[p] + (Math.random() < 0.7 ? 3 : 1));
          }
        }
      }
    }
  };

  const update = () => {
    setFire();
    const nextData = new Uint8ClampedArray(data);
    for (let x = 0; x < CW; x++) {
      for (let y = 0; y < CH; y++) {
        const p = y * CW + x;
        const heat = data[p];
        if (heat > 0) {
          const rnd = Math.random();
          const driftDist = (1 + (Math.floor(rnd * 4) & 1)) * fireHeightMult * (riseSpeedPx / rootFontSize);

          const rawSpread = (Math.random() - 0.5) + (Math.random() - 0.5);
          const spread = rawSpread * 0.5 * angleVariance;

          const curAngle = fireAngle + spread;
          const ox = Math.sin(curAngle) * driftDist;
          const oy = -Math.cos(curAngle) * driftDist;
          const nx = Math.round(x + ox);
          const ny = Math.round(y + oy);
          const tp = ny * CW + nx;
          if (nx >= 0 && nx < CW && ny >= 0 && ny < CH) {
            const decay = Math.max(1, Math.round(((1 + rnd * 2) / fireHeightMult) / (riseSpeedPx / rootFontSize)));
            nextData[tp] = Math.max(0, heat - decay);
          }
        }
      }
    }
    data.set(nextData);
  };

  const render = () => {
    ctx.clearRect(0, 0, CW, CH);
    for (let i = 0; i < uint32Data.length; i++) {
      uint32Data[i] = PAL[data[i]];
    }
    ctx.putImageData(imageData, 0, 0);
    ctx.drawImage(textCanvas, 0, 0);
  };

  let _pf = Date.now(), _cf = 0;
  const ft = 1000 / 35;
  let isRunning = true;

  const loop = () => {
    if (!isRunning) return;
    requestAnimationFrame(loop);
    _cf = Date.now();
    if (_cf - _pf >= ft) {
      try {
        update();
        render();
        _pf = _cf;
      } catch (e) {
        isRunning = false;
      }
    }
  };

  loop();
});