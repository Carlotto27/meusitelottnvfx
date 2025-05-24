document.addEventListener('DOMContentLoaded', () => {
  function criarSlider(containerId, afterId, sliderId) {
    const container = document.getElementById(containerId);
    const after = document.getElementById(afterId);
    const slider = document.getElementById(sliderId);

    function atualizarSlider(x) {
      const rect = container.getBoundingClientRect();
      let posX = x - rect.left;

      // Limitar para não sair do container
      if (posX < 0) posX = 0;
      if (posX > rect.width) posX = rect.width;

      const percent = (posX / rect.width) * 100;

      after.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
      slider.style.left = `${percent}%`;
    }

    if (container && after && slider) {
      // Mouse
      container.addEventListener('mousemove', (e) => {
        if (e.buttons !== 1) return; // só quando está clicando
        atualizarSlider(e.clientX);
      });

      // Touch
      container.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
          atualizarSlider(e.touches[0].clientX);
        }
      });

      // Inicial (posição padrão ao tocar/clicar)
      container.addEventListener('mousedown', (e) => {
        atualizarSlider(e.clientX);
      });

      container.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
          atualizarSlider(e.touches[0].clientX);
        }
      });
    }
  }

  criarSlider('slider-container', 'after-img', 'slider');
  criarSlider('slider-container-3', 'after-img-3', 'slider-3');
});
