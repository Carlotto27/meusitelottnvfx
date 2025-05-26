document.addEventListener('DOMContentLoaded', () => {
  // Troca de categorias (como já feito)
  const botoes = document.querySelectorAll('.categoria-btn');
  const secoes = document.querySelectorAll('.categoria-videos');

  botoes.forEach(botao => {
    botao.addEventListener('click', () => {
      const categoria = botao.getAttribute('data-categoria');

      botoes.forEach(btn => btn.classList.remove('active'));
      secoes.forEach(sec => sec.classList.remove('active'));

      botao.classList.add('active');
      document.getElementById(categoria).classList.add('active');
    });
  });

  // Clique na thumbnail para dar play
  const thumbs = document.querySelectorAll('.video-thumb');

  thumbs.forEach(thumb => {
    const cover = thumb.querySelector('.video-cover');
    const video = thumb.querySelector('video');

    cover.addEventListener('click', () => {
      cover.style.display = 'none';
      video.style.display = 'block';
      video.play();
    });

    // Reinicia a thumbnail quando o vídeo termina (opcional)
    video.addEventListener('ended', () => {
      video.style.display = 'none';
      cover.style.display = 'flex';
    });

    // Pausa e reseta o vídeo se for necessário (opcional)
    video.addEventListener('pause', () => {
      if (video.currentTime < video.duration) return; // só se pausou antes do fim
      video.currentTime = 0;
      video.style.display = 'none';
      cover.style.display = 'flex';
    });
  });
});
