document.addEventListener('DOMContentLoaded', () => {
  function criarSlider(containerId, afterId, sliderId) {
    const container = document.getElementById(containerId);
    const after = document.getElementById(afterId);
    const slider = document.getElementById(sliderId);

    if (container && after && slider) {
      // Se for mobile, centralizar ao carregar
      if (window.innerWidth <= 768) {
        const percent = 50;
        after.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
        slider.style.left = `${percent}%`;
      }

      container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        let mouseX = e.clientX - rect.left;
        mouseX = Math.max(0, Math.min(mouseX, rect.width));
        const percent = (mouseX / rect.width) * 100;
        after.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
        slider.style.left = `${percent}%`;
      });

      // Touch start: salvar posição inicial
      let startX = 0;
      container.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
      });

      // Touch move: detectar horizontal e bloquear scroll
      container.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - startX);
        const deltaY = Math.abs(touch.clientY - e.touches[0].clientY);

        // Se o movimento for mais na horizontal, bloquear scroll
        if (deltaX > deltaY) {
          e.preventDefault(); // bloqueia rolagem vertical
          const rect = container.getBoundingClientRect();
          let touchX = touch.clientX - rect.left;
          touchX = Math.max(0, Math.min(touchX, rect.width));
          const percent = (touchX / rect.width) * 100;
          after.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
          slider.style.left = `${percent}%`;
        }
      }, { passive: false }); // importante: passive FALSE permite preventDefault
    }
  }

  criarSlider('slider-container', 'after-img', 'slider');
  criarSlider('slider-container-3', 'after-img-3', 'slider-3');
});
