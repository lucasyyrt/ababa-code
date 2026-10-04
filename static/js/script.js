// esse arquivo e o "tudo em um" do front
// aqui ta a parte que a pagina usa de forma geral, tipo navegacao, logout, mensagens e um pouco de utilidade
// entao quando o outro JS precisa de alguma coisa ja pronta, ele chama daqui
// e meio o arquivo de apoio do app, sem ser a pagina em si

// essa funcao troca a aba ativa na pagina de login
// ela pega todas as abas e todos os botoes, remove o active, e depois deixa so o que o usuario clicou selecionado
// basicamente e o controle da troca de login pra cadastro e vice-versa
function mudarAba(abaName) {
    const abas = document.querySelectorAll('.tab-content');
    const botoes = document.querySelectorAll('.tab-btn');
    
    abas.forEach(aba => aba.classList.remove('active'));
    botoes.forEach(btn => btn.classList.remove('active'));
    
    const abaAtiva = document.getElementById(`aba-${abaName}`);
    const btnAtivo = document.querySelector(`.tab-btn[onclick="mudarAba('${abaName}')"]`);
    
    if (abaAtiva) abaAtiva.classList.add('active');
    if (btnAtivo) btnAtivo.classList.add('active');
}

// essa funcao manda o usuario pra home
// ela e usada quando o usuario clica em voltar, voltar pra inicio ou em algum botao de saida rapida
// e simples mas ajuda bastante porque evita repetir a URL toda hora
function voltarHome() {
    window.location.href = '/';
}

// essa funcao faz o logout de verdade
// ela chama o endpoint do backend, recebe a resposta e se tudo deu certo, manda o usuario pra home
// o alert e so pra deixar um feedback bem direto pra quem ta usando
function fazerLogout() {
    fetch('/api/logout', {method: 'POST'})
        .then(r => r.json())
        .then(data => {
            alert(data.mensagem);
            window.location.href = '/';
        })
        .catch(e => console.error('Erro:', e));
}

// essa funcao atualiza um bloco de mensagem na tela
// ela recebe id do elemento, tipo da mensagem e texto pra mostrar
function mostrarMensagem(elementoId, tipo, mensagem) {
    const elemento = document.getElementById(elementoId);
    if (!elemento) return;
    
    elemento.className = `mensagem ${tipo}`;
    elemento.textContent = mensagem;
    elemento.style.display = 'block';
}

// essa funcao cria uma notificacao flutuante tipo popup central
// ela aparece por 2 segundos e depois some sozinho
function mostrarToast(mensagem) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(78, 205, 196, 0.9);
        color: white;
        padding: 20px 40px;
        border-radius: 8px;
        font-size: 16px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        animation: fadeIn 0.3s ease-in;
    `;
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// essa funcao reseta um formulario pelo id informado
// serve pra limpar campos depois de um cadastro ou de uma acao bem sucedida
function limparFormulario(formId) {
    const form = document.getElementById(formId);
    if (form) form.reset();
}

// aqui fica a parte de validacao de dados do front
// basicamente testa se o texto tem formato aceitavel antes de enviar pra API

function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function validarSenha(senha) {
    return senha.length >= 6;
}

// aqui tem funcoes utilitarias de apoio
// elas padronizam textos e ajudam na comparacao de respostas do teste rapido

function limparTextoAcentos(texto) {
    return texto
        .toLowerCase()
        .replace(/-feira/g, '')
        .replace(/\s+feira/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s/g, '');
}

// essa funcao converte uma data em texto legivel no padrao brasileiro
// e usada pra apresentar data de forma mais humana na interface
function formatarData(data) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(data).toLocaleDateString('pt-BR', options);
}

// aqui ficam as funcoes de loading
// elas mostram um estado de carregamento dentro de um container da pagina

function mostrarLoading(elementoId) {
    const elemento = document.getElementById(elementoId);
    if (elemento) {
        elemento.innerHTML = '<div class="loading">Carregando...</div>';
    }
}

function esconderLoading(elementoId) {
    const elemento = document.getElementById(elementoId);
    if (elemento) {
        elemento.innerHTML = '';
    }
}

// essa funcao faz uma chamada simples pra API pra checar se o usuario esta autenticado
// no momento ela so registra o retorno no console

function verificarAutenticacao() {
    fetch('/api/usuario_info')
        .then(r => r.json())
        .then(data => {
            const loginItem = document.getElementById('nav-login-item');
            const userItem = document.getElementById('nav-user-item');
            const userName = document.getElementById('nav-user-name');

            const testeItem = document.getElementById('nav-teste-item');

            if (data.logado) {
                if (loginItem) loginItem.style.display = 'none';
                if (testeItem) testeItem.style.display = 'block';
                if (userItem) userItem.style.display = 'flex';
                if (userName) userName.textContent = '👤 ' + data.username;
            } else {
                if (loginItem) loginItem.style.display = '';
                if (testeItem) testeItem.style.display = 'none';
                if (userItem) userItem.style.display = 'none';
                if (userName) userName.textContent = '';
            }

            console.log('Status de autenticação:', data);
        })
        .catch(error => console.error('Erro ao verificar autenticação:', error));
}

// Executar ao carregar pagina
document.addEventListener('DOMContentLoaded', verificarAutenticacao);
