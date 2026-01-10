(function(){
  emailjs.init("pydNQWda7pLebHu5k");
})();

document.getElementById("briefingForm").addEventListener("submit", function(e){
  e.preventDefault();

  emailjs.sendForm(
    "service_usdk0lc",
    "template_3ozcieb",
    this
  ).then(
    function() {
      alert("Briefing enviado com sucesso!");
    },
    function(error) {
      alert("Erro ao enviar. Tente novamente.");
      console.log(error);
    }
  );
});

const inputs = document.querySelectorAll(
  'input[type="text"], textarea'
);

inputs.forEach(el => {
  el.addEventListener('focus', () => {

    const rect = el.getBoundingClientRect();
    const isVisible =
      rect.top > window.innerHeight * 0.25 &&
      rect.bottom < window.innerHeight * 0.75;

    if (!isVisible) {
      setTimeout(() => {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 300);
    }

  });
});
