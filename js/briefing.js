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
(function () {
  emailjs.init("pydNQWda7pLebHu5k");
})();

const form = document.getElementById("briefingForm");
const submitBtn = form.querySelector(".btn-submit");

form.addEventListener("submit", function (e) {
  e.preventDefault();

  // Evita duplo envio
  if (submitBtn.disabled) return;

  // Bloqueia botão
  submitBtn.disabled = true;
  submitBtn.innerText = "Enviando...";
  submitBtn.style.opacity = "0.7";
  submitBtn.style.cursor = "not-allowed";

  emailjs.sendForm(
    "service_usdk0lc",
    "template_3ozcieb",
    this
  ).then(
    function () {
      submitBtn.innerText = "Enviado com sucesso ✔️";

      // Opcional: limpar formulário
      form.reset();

    },
    function (error) {
      console.log(error);

      // Reativa botão em caso de erro
      submitBtn.disabled = false;
      submitBtn.innerText = "Enviar briefing";
      submitBtn.style.opacity = "1";
      submitBtn.style.cursor = "pointer";

      alert("Erro ao enviar. Tente novamente.");
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
