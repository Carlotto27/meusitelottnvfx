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
          <a href="./pages/categoria.html?slug=${cat.slug}" class="categoria-card-wrapper" data-aos="fade-up">
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

// Lógica de galeria movida para pages/categoria.html dinamicamente.
