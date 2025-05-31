var swiper = new Swiper(".mySwiper", {
  grabCursor: true,
  effect: "creative",
  creativeEffect: {
    prev: {
      shadow: true,
      translate: ["-120%", 0, -500],
    },
    next: {
      shadow: true,
      translate: ["120%", 0, -500],
    },
  },
});

const hamburger = document.querySelector(".hamburger");
const navContent = document.querySelector(".nav-content");
const body = document.body;

hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("active");
  navContent.classList.toggle("active");
  body.classList.toggle("no-scroll");
});

function closeMenu() {
  hamburger.classList.remove("active");
  navContent.classList.remove("active");
  body.classList.remove("no-scroll");

  const isDesktop = window.innerWidth > 768;
  const targetId = isDesktop ? "competenciasDesktop" : "competencias";
  const target = document.getElementById(targetId);

  if (target) {
    target.scrollIntoView({ behavior: "smooth" });
  }
}

ScrollReveal().reveal('.social-links a', {
  delay: 300,
  duration: 1000,
  origin: 'top',
  distance: '50px',
  easing: 'ease-in-out',
  reset: false
});

