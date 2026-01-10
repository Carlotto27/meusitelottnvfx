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
