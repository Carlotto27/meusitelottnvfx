const swiperEl = document.querySelector(".mySwiper");
if (swiperEl && typeof Swiper !== 'undefined') {
  var swiper = new Swiper(".mySwiper", {
    grabCursor: true,
    effect: "creative",
    creativeEffect: {
      prev: {
        shadow: true,
        translate: ["-120%", 0, -600],
      },
      next: {
        shadow: true,
        translate: ["120%", 0, -600],
      },
    },
  });
}

const hamburger = document.querySelector(".hamburger");
const navContent = document.querySelector(".nav-content");
const body = document.body;

if (hamburger && navContent) {
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navContent.classList.toggle("active");
    body.classList.toggle("no-scroll");
  });
}

function closeMenu() {
  if (hamburger && navContent) {
    hamburger.classList.remove("active");
    navContent.classList.remove("active");
    body.classList.remove("no-scroll");
  }
}

if (typeof ScrollReveal !== 'undefined') {
  ScrollReveal().reveal('.social-links a', {
    delay: 300,
    duration: 1000,
    origin: 'top',
    distance: '50px',
    easing: 'ease-in-out',
    reset: false
  });
}

// Fetch Contact Info
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch('/api/contact');
    const data = await res.json();
    
    if (data && data.name) {
      if(document.getElementById('pubName')) document.getElementById('pubName').textContent = data.name;
      if(document.getElementById('pubProfession')) document.getElementById('pubProfession').textContent = data.profession;
      if(document.getElementById('pubProfileImage') && data.profile_image_url) {
        document.getElementById('pubProfileImage').src = data.profile_image_url;
      }
      
      const descList = document.getElementById('pubDescriptionList');
      if (descList) {
        descList.innerHTML = `<li data-aos="fade-up-left">${data.city}</li>`;
        
        if (data.description) {
          const lines = data.description.split(/\n|\\n/);
          lines.forEach(line => {
            if(line.trim()) {
              descList.innerHTML += `<li data-aos="fade-up-left">${line.trim()}</li>`;
            }
          });
        }
        
        descList.innerHTML += `<li data-aos="fade-up-left">💻 ${data.email}</li>`;
      }

      if(document.getElementById('pubWhatsappBtn')) {
        document.getElementById('pubWhatsappBtn').href = `https://wa.me/${data.whatsapp.replace(/\D/g, '')}`;
      }
      if(document.getElementById('pubInstagramBtn')) {
        let instaLink = data.instagram;
        if (!instaLink.startsWith('http')) {
          instaLink = `https://instagram.com/${instaLink.replace('@', '')}`;
        }
        document.getElementById('pubInstagramBtn').href = instaLink;
      }
    }
  } catch (error) {
    console.error("Erro ao buscar dados de contato:", error);
  }
});

// Renderização Dinâmica das Categorias na Home
document.addEventListener("DOMContentLoaded", async () => {
  const publicCategoriesGrid = document.getElementById('publicCategoriesGrid');
  if (!publicCategoriesGrid) return;

  try {
    const res = await fetch('/api/categories');
    const categories = await res.json();

    if (categories.length > 0) {
      publicCategoriesGrid.innerHTML = '';
      categories.forEach(cat => {
        // As páginas ficam em ./pages/[slug].html
        // As thumbnails vêm do BD como ./assets/images/...
        // Precisamos ajustar o caminho da thumb caso index.html esteja na raiz e assets também.
        const thumbUrl = cat.thumbnail_url.startsWith('./') ? cat.thumbnail_url : `./${cat.thumbnail_url}`;
        
        const catHtml = `
          <a href="./pages/${cat.slug}.html" class="categoria-card-wrapper" data-aos="fade-up">
            <div class="categoria-card floating">
              <div class="bg-thumb" style="background-image: url('${thumbUrl}');"></div>
              <div class="categoria-info">
              </div>
            </div>
          </a>
        `;
        publicCategoriesGrid.innerHTML += catHtml;
      });

      // Disparar AOS refresh se necessário
      if (typeof AOS !== 'undefined') {
        setTimeout(() => AOS.refreshHard(), 100);
      }
    }
  } catch (error) {
    console.error("Erro ao carregar categorias na home:", error);
  }
});

// Renderização Dinâmica das Galerias (Páginas de Categoria)
document.addEventListener("DOMContentLoaded", async () => {
  const cardsContainer = document.querySelector('.projects-section .cards2');
  if (!cardsContainer) return;

  // Extrair categoria da URL
  let path = window.location.pathname;
  let categoryName = path.substring(path.lastIndexOf('/') + 1).replace('.html', '');

  if (categoryName && categoryName !== 'index') {
    try {
      const res = await fetch(`/api/projects?category=${categoryName}`);
      const projects = await res.json();

      if (projects.length > 0) {
        cardsContainer.innerHTML = ''; // Limpa os hardcoded

        projects.forEach((proj, index) => {
            const delay = index % 2 === 0 ? 'fade-up-left' : 'fade-up-right';
            
            // Corrige caminhos baseando-se que a página está em /pages/
            const videoUrl = proj.video_url.startsWith('./') ? proj.video_url.replace('./', '../') : proj.video_url;
            const thumbUrl = proj.thumbnail_url.startsWith('./') ? proj.thumbnail_url.replace('./', '../') : proj.thumbnail_url;

            let detailsHtml = '';
            if(proj.location) detailsHtml += `<strong>Local:</strong> ${proj.location}<br>`;
            if(proj.objective) detailsHtml += `<strong>Objetivo:</strong> ${proj.objective}<br>`;
            if(proj.client) detailsHtml += `<strong>Cliente:</strong> ${proj.client}<br>`;
            if(proj.equipment) detailsHtml += `<strong>Equipamentos:</strong> ${proj.equipment}<br>`;
            if(proj.date) detailsHtml += `<strong>Data:</strong> ${proj.date}<br>`;
            if(proj.description) detailsHtml += `<strong>Destaques:</strong> ${proj.description}<br>`;

            let mediaHtml = '';
            if (proj.video_type === 'youtube' && proj.youtube_video_id) {
              const ytId = proj.youtube_video_id;
              const isShort = proj.youtube_url && proj.youtube_url.includes('/shorts/');
              const shortsClass = isShort ? ' shorts-video' : '';
              mediaHtml = `
                  <iframe class="floating lazy-video${shortsClass}"
                    src="https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0" 
                    frameborder="0" allow="autoplay; encrypted-media" allowfullscreen>
                  </iframe>
              `;
            } else {
              mediaHtml = `
                  <video autoplay muted class="floating lazy-video" preload="none" loop poster="${thumbUrl}">
                   <source data-src="${videoUrl}" type="video/mp4" src="${videoUrl}" />
                    Seu navegador não suporta vídeos HTML5.
                  </video>
              `;
            }

            const cardHtml = `
              <div data-aos="${delay}" class="card2 aos-init aos-animate">
                <div class="image">
                  ${mediaHtml}
                </div>
                <div class="text">
                  <h3>${proj.title}</h3>
                  <p>${detailsHtml}</p>
                  <div class="neon-divider"></div>
                </div>
              </div>
            `;
            cardsContainer.innerHTML += cardHtml;
        });

        // Re-iniciar controles de video (hover para mostrar controles)
        const videos = document.querySelectorAll("video");
        videos.forEach((video) => {
            video.controls = false;
            video.addEventListener("mouseenter", () => video.controls = true);
            video.addEventListener("mouseleave", () => video.controls = false);
        });
        
        // Disparar AOS refresh se necessário
        if (typeof AOS !== 'undefined') {
          setTimeout(() => AOS.refreshHard(), 100);
        }

      } else {
        cardsContainer.innerHTML = '<p style="text-align:center; color:white; width:100%;">Nenhum projeto encontrado nesta categoria.</p>';
      }
    } catch (error) {
      console.error("Erro ao carregar projetos da galeria", error);
    }
  }
});
