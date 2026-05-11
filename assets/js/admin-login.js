document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMsg = document.getElementById('loginError');

    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMsg.textContent = '';
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    window.location.href = '/admin/'; // Redireciona para o painel
                } else {
                    errorMsg.textContent = data.error || 'Erro ao realizar login.';
                }
            } catch (error) {
                errorMsg.textContent = 'Erro de conexão com o servidor.';
            }
        });
    }
});
