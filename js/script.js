document.addEventListener('DOMContentLoaded', () => {
  function criarSlider(containerId, afterId, sliderId) {
    const container = document.getElementById(containerId);
    const after = document.getElementById(afterId);
    const slider = document.getElementById(sliderId);

    if (container && after && slider) {
      container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        let mouseX = e.clientX - rect.left;

        // Limitar mouseX para não sair do container
        if (mouseX < 0) mouseX = 0;
        if (mouseX > rect.width) mouseX = rect.width;

        const percent = (mouseX / rect.width) * 100;

        after.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
        slider.style.left = `${percent}%`;
      });
    }
  }

  criarSlider('slider-container', 'after-img', 'slider');
  criarSlider('slider-container-3', 'after-img-3', 'slider-3');
});

