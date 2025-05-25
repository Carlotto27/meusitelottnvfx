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
      // PC - Mousemove livre
      container.addEventListener('mousemove', (e) => {
        atualizarSlider(e.clientX);
      });

      // Touch - bloqueia rolagem vertical ao arrastar
      container.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
          atualizarSlider(e.touches[0].clientX);
        }
      });

      container.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
          atualizarSlider(e.touches[0].clientX);
          e.preventDefault(); // BLOQUEIA rolagem vertical ao arrastar horizontal
        }
      }, { passive: false }); // Isso é necessário para o preventDefault funcionar
    }
  }

  criarSlider('slider-container', 'after-img', 'slider');
  criarSlider('slider-container-3', 'after-img-3', 'slider-3');
});

 // Troca a logo hero no scroll com fade
  const heroLogo = document.querySelector('.hero-logo');
  const logoNormal = 'imagens/Sticker01.png';
  const logoReflexo = 'imagens/Sticker02.png';
  const scrollTrigger = 50;

  window.addEventListener('scroll', () => {
    if (window.scrollY > scrollTrigger) {
      if (!heroLogo.src.includes('Sticker02.png')) {
        heroLogo.style.opacity = 0;
        setTimeout(() => {
          heroLogo.src = logoReflexo;
          heroLogo.style.opacity = 1;
        }, 400);
      }
    } else {
      if (!heroLogo.src.includes('Sticker01.png')) {
        heroLogo.style.opacity = 0;
        setTimeout(() => {
          heroLogo.src = logoNormal;
          heroLogo.style.opacity = 1;
        }, 400);
      }
    }
  });
});
