// Rendu d'ambiance : aucune entité ni règle de locomotion dans ce module.
const SpaceBackdrop = {
  layout(viewWidth, viewHeight, imageWidth, imageHeight, cameraX, cameraY, time) {
    const margin = 48;
    const scale = Math.max((viewWidth + margin * 2) / imageWidth, (viewHeight + margin * 2) / imageHeight);
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;
    // Décalages continus et bornés : aucun modulo sur la texture de nébuleuse.
    const driftX = Math.sin(time * 0.73) * 9 - Math.tanh(cameraX / 1800) * 14;
    const driftY = Math.cos(time * 0.61) * 7 - Math.tanh(cameraY / 1800) * 14;
    return {
      x: (viewWidth - drawWidth) / 2 + driftX,
      y: (viewHeight - drawHeight) / 2 + driftY,
      width: drawWidth,
      height: drawHeight
    };
  }
};
