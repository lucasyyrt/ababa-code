// esse script e o cara do login e do cadastro
// ele pega o que o usuario digitou, manda pra API e mostra resposta na tela
// cada funcao aqui e uma acaozinha do formulario, tipo entrar, criar conta e mostrar erro

// essa funcao pega o login do usuario
// ela impede o form de mandar normalmente, le usuario e senha, e manda tudo pro backend
// se o login der certo, o app redireciona pra tela do teste completo
function fazerLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('login-user').value;
    const password = document.getElementById('login-pass').value;
    const msgDiv = document.getElementById('msg-login');
    
    if (!username || !password) {
        mostrarMensagem('msg-login', 'error', '⚠️ Preencha todos os campos');
        return;
    }
    
    fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password})
    })
    .then(response => response.json())
    .then(data => {
        if (data.sucesso) {
            mostrarMensagem('msg-login', 'success', '✓ Login realizado com sucesso! Redirecionando...');
            setTimeout(() => window.location.href = '/teste', 1500);
        } else {
            mostrarMensagem('msg-login', 'error', '✗ ' + data.mensagem);
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        mostrarMensagem('msg-login', 'error', '✗ Erro ao conectar com o servidor');
    });
}

// essa funcao cria o perfil novo
// ela le usuario e senha, valida a senha e manda o pedido pro backend
// se der tudo certo, ele nao entra direto, so troca pra aba de login pra continuar
function fazerCadastro(event) {
    event.preventDefault();
    
    const username = document.getElementById('cadastro-user').value;
    const password = document.getElementById('cadastro-pass').value;
    
    if (!username || !password) {
        mostrarMensagem('msg-cadastro', 'error', '⚠️ Preencha todos os campos');
        return;
    }
    
    if (password.length < 6) {
        mostrarMensagem('msg-cadastro', 'error', '⚠️ Senha deve ter no mínimo 6 caracteres');
        return;
    }
    
    fetch('/api/cadastro', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password})
    })
    .then(response => response.json())
    .then(data => {
        if (data.sucesso) {
            mostrarToast('🎉 Direcionando ao login...');
            setTimeout(() => {
                document.getElementById('cadastro-user').value = '';
                document.getElementById('cadastro-pass').value = '';
                mudarAba('login');
            }, 1500);
        } else {
            mostrarMensagem('msg-cadastro', 'error', '✗ ' + data.mensagem);
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        mostrarMensagem('msg-cadastro', 'error', '✗ Erro ao conectar com o servidor');
    });
}
