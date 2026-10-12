// esse script e o teste rapido
// ele monta as perguntas, valida respostas e depois chama a API pra analise
// o fluxo e linear demais, pergunta por pergunta, ate formar a pontuacao final e mostrar o resultado

let perguntasArray = [];
let indicePergunta = 0;
let acertos = 0;
let pontosMMSE = 0;

// essa funcao inicializa o teste quando a pagina abre
// ela pega a data atual da API e monta as perguntas usando isso, pra o teste ficar mais alinhado com o dia real
async function inicializarTeste() {
    try {
        // Buscar informacoes de data/hora
        const response = await fetch('/api/data_info');
        const dataInfo = await response.json();
        
        // Montar lista de perguntas
        perguntasArray = [
            {
                perguntas: "Em que ano estamos",
                resposta: dataInfo.ano.toString(),
                categoria: "Orientação temporal"
            },
            {
                perguntas: "Em que mês estamos",
                resposta: dataInfo.mes,
                categoria: "Orientação temporal"
            },
            {
                perguntas: "Que dia da semana é hoje?",
                resposta: dataInfo.dia_semana,
                categoria: "Orientação temporal",
                tipo: "dia-semana"
            },
            {
                perguntas: "Memorize estas palavras: bola, carro, árvore. Digite 'ok' para continuar.",
                resposta: "ok",
                categoria: "Memória",
                pontuar: false
            },
            {
                perguntas: "Quanto é 1 mais 1?",
                resposta: "2",
                categoria: "Cálculo"
            },
            {
                perguntas: "Quanto é 2 mais 2?",
                resposta: "4",
                categoria: "Cálculo"
            },
            {
                perguntas: "Quanto é 3 mais 2?",
                resposta: "5",
                categoria: "Cálculo"
            },
            {
                perguntas: "Quanto é 4 mais 3?",
                resposta: "7",
                categoria: "Cálculo"
            },
            {
                perguntas: "Quanto é 5 mais 2?",
                resposta: "7",
                categoria: "Cálculo"
            },
            {
                perguntas: "Qual era a primeira palavra memorizada?",
                resposta: "bola",
                categoria: "Memória"
            },
            {
                perguntas: "Qual era a segunda palavra memorizada?",
                resposta: "carro",
                categoria: "Memória"
            },
            {
                perguntas: "Qual era a terceira palavra memorizada?",
                resposta: "árvore",
                categoria: "Memória"
            }
        ];
        
        mostrarPergunta();
    } catch (error) {
        console.error('Erro ao inicializar teste:', error);
        document.getElementById('teste-container').innerHTML = 
            '<div class="warning-box">Erro ao carregar o teste. Tente novamente.</div>';
    }
}

// essa funcao mostra a pergunta atual no container
// ela atualiza o HTML na tela e deixa o campo pronto pra o usuario digitar a resposta
function mostrarPergunta() {
    const container = document.getElementById('perguntas-container');
    
    if (indicePergunta < perguntasArray.length) {
        const pergunta = perguntasArray[indicePergunta];
        const numero = indicePergunta + 1;
        const total = perguntasArray.length;
        const progresso = Math.round((numero / total) * 100);
        
        container.innerHTML = `
            <div class="pergunta-item">
                <div class="pergunta-cabecalho">
                    <span class="pergunta-categoria">${pergunta.categoria}</span>
                    <span class="pergunta-numero">Pergunta ${numero} de ${total}</span>
                </div>
                <div
                    class="pergunta-progresso"
                    role="progressbar"
                    aria-label="Progresso do teste"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow="${progresso}"
                >
                    <span style="width: ${progresso}%"></span>
                </div>
                <div class="pergunta-texto">${pergunta.perguntas}</div>
                <input 
                    type="text" 
                    id="resposta-input" 
                    class="pergunta-input" 
                    placeholder="Digite sua resposta"
                    aria-label="Resposta"
                    autofocus
                >
                <button class="pergunta-btn" onclick="verificarResposta()">
                    ${numero === total ? "Finalizar teste" : "Próxima pergunta"}
                </button>
            </div>
        `;
        
        // Adicionar listener Enter
        setTimeout(function() {
            const input = document.getElementById('resposta-input');
            if (input) {
                input.focus();
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        verificarResposta();
                    }
                });
            }
        }, 100);
    } else {
        finalizarTeste();
    }
}

// essa funcao valida a resposta do usuario
// ela compara com a resposta certa, soma ponto se acertou e passa pra proxima pergunta
// se o campo estiver vazio, ela nao deixa seguir
function verificarResposta() {
    const input = document.getElementById('resposta-input');
    const respostaUsuario = input.value.trim();
    
    if (!respostaUsuario) {
        alert('⚠️ Você precisa preencher o campo antes de continuar.');
        return;
    }
    
    const pergunta = perguntasArray[indicePergunta];
    const normalizarResposta = texto => texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    let usuarioLimpo = normalizarResposta(respostaUsuario);
    let corretaLimpa = normalizarResposta(pergunta.resposta);

    if (pergunta.tipo === 'dia-semana') {
        usuarioLimpo = usuarioLimpo.replace(/feira$/, '');
        corretaLimpa = corretaLimpa.replace(/feira$/, '');
    }
    
    if (pergunta.pontuar !== false && usuarioLimpo === corretaLimpa) {
        acertos++;
    }
    
    indicePergunta++;
    mostrarPergunta();
}

// essa funcao encerra o teste rapido e mostra o resultado final
// ela calcula a pontuacao e escolhe se vai mostrar aviso ou informacao, dependendo do desempenho
function finalizarTeste() {
    const idade = Number.parseFloat(document.getElementById('idade').value || 0);
    const idadeValida = Number.isFinite(idade) ? idade : 0;
    const totalPerguntasPontuadas = perguntasArray.filter(
        pergunta => pergunta.pontuar !== false
    ).length;
    pontosMMSE = Math.round((acertos / totalPerguntasPontuadas) * 30);
    
    // Esconder teste, mostrar resultado
    document.getElementById('teste-container').style.display = 'none';
    document.getElementById('resultado-container').style.display = 'block';
    
    // Atualizar pontuacao
    document.getElementById('pontuacao').textContent = `${pontosMMSE}/30`;
    
    // Mostrar aviso/info conforme resultado
    const alertaDiv = document.getElementById('alerta-resultado');
    const infoDiv = document.getElementById('info-resultado');

    const riscoPorIdade = (
        (idadeValida > 60 && acertos <= 5) ||
        (idadeValida >= 50 && idadeValida <= 60 && acertos <= 6) ||
        (idadeValida < 50 && acertos <= 8)
    );

    if (riscoPorIdade) {
        let mensagemIdade = '';

        if (idadeValida > 60 && acertos <= 5) {
            mensagemIdade = '- Mais de 60 anos e até 5 acertos: perfil sugestivo de maior risco para comprometimento cognitivo.';
        } else if (idadeValida >= 50 && idadeValida <= 60 && acertos <= 6) {
            mensagemIdade = '- Entre 50 e 60 anos e até 6 acertos: desempenho que também pode ser compatível com critérios de atenção clínica.';
        } else if (idadeValida < 50 && acertos <= 8) {
            mensagemIdade = '- Abaixo de 50 anos e menos de 9 acertos: resultado compatível com suspeita e merece atenção clínica adicional.';
        }

        alertaDiv.innerHTML = `
            <strong>⚠️ ATENÇÃO:</strong> O resultado do teste rápido indica um padrão de pontuação que, considerando a idade informada, merece atenção adicional.
            <br><br>
            ${mensagemIdade}
            <br><br>
            <strong>IMPORTANTE:</strong> ESTE RESULTADO NÃO É UM DIAGNÓSTICO. Procure avaliação médica qualificada para uma análise completa.
        `;
        alertaDiv.style.display = 'block';
        infoDiv.style.display = 'none';
    } else if (pontosMMSE <= 20) {
        alertaDiv.innerHTML = `
            <strong>⚠️ ATENÇÃO:</strong> O teste rápido identificou um desempenho abaixo do esperado para os critérios desta triagem simplificada.
            <br><br>
            Este resultado pode ser influenciado por diversos fatores, como cansaço, nervosismo, falta de atenção durante o teste, dificuldades de leitura ou interpretação, problemas de visão/audição, escolaridade e experiência prévia com testes.
            <br><br>
            Caso existam preocupações reais relacionadas à memória, recomenda-se procurar avaliação com um neurologista, geriatra, psiquiatra ou neuropsicólogo qualificado.
        `;
        alertaDiv.style.display = 'block';
        infoDiv.style.display = 'none';
    } else {
        infoDiv.innerHTML = `
            <strong>ℹ️ Resultado:</strong> O desempenho observado neste teste rápido ficou dentro da faixa esperada para os critérios utilizados nesta triagem experimental.
            <br><br>
            Este resultado não substitui avaliação médica ou neuropsicológica profissional.
        `;
        infoDiv.style.display = 'block';
        alertaDiv.style.display = 'none';
    }
}

// essa funcao envia a pontuacao do teste rapido pra API de predicao
// se o backend responder, ela troca a tela e mostra o resultado da IA com a confianca
async function mostrarAnalisePredictiva() {
    const idade = Number.parseFloat(document.getElementById('idade').value || 0);

    const dados = {
        genero: 'Masculino',
        idade: Number.isFinite(idade) ? idade : 60,
        educacao: 12,
        ses: 3,
        mmse: Number.isFinite(pontosMMSE) ? pontosMMSE : 0,
        etiv: 1500,
        nwbv: 0.74,
        asf: 1.0
    };
    
    try {
        const response = await fetch('/api/prever', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(dados)
        });
        
        const resultado = await response.json();
        
        if (resultado.sucesso) {
            document.getElementById('resultado-container').style.display = 'none';
            document.getElementById('analise-container').style.display = 'block';
            
            document.getElementById('resultado-ia').textContent = resultado.resultado;
            document.getElementById('confianca-box').innerHTML = 
                `<strong>ℹ️ Certeza Estatística:</strong> ${resultado.confianca}%`;
            
            const resultadoNormalizado = String(resultado.resultado || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toUpperCase();
            
            if (resultadoNormalizado === 'COM DEMENCIA') {
                document.getElementById('recomendacao-box').innerHTML = `
                    <strong>⚠️ ATENÇÃO:</strong> Sinais preliminares de alerta detectados.
                    <br><br>
                    Recomenda-se procurar avaliação profissional para uma análise mais detalhada.
                `;
            } else {
                document.getElementById('recomendacao-box').innerHTML = `
                    <strong>✓ Resultado:</strong> Resultados dentro dos padrões esperados.
                `;
            }
        } else {
            alert('Erro ao fazer predição: ' + resultado.mensagem);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

// essa funcao reinicia tudo do zero
// limpa os valores, esconde os resultados e volta pro comeco do teste rapido
function resetarTeste() {
    indicePergunta = 0;
    acertos = 0;
    pontosMMSE = 0;
    
    document.getElementById('resultado-container').style.display = 'none';
    document.getElementById('analise-container').style.display = 'none';
    document.getElementById('teste-container').style.display = 'block';
    
    inicializarTeste();
}

// Iniciar ao carregar pagina
document.addEventListener('DOMContentLoaded', inicializarTeste);
