// esse script e o teste completo
// ele mexe nos sliders, pega os valores do formulario e envia tudo pro backend pra IA fazer a previsao

document.addEventListener('DOMContentLoaded', function() {
    const idadeSlider = document.getElementById('idade-slider');
    const sesSlider = document.getElementById('ses-slider');
    const mmseSlider = document.getElementById('mmse-slider');
    const nwbvSlider = document.getElementById('nwbv-slider');
    
    if (idadeSlider) {
        idadeSlider.addEventListener('input', function() {
            document.getElementById('idade-valor').textContent = this.value;
        });
    }
    
    if (sesSlider) {
        sesSlider.addEventListener('input', function() {
            document.getElementById('ses-valor').textContent = this.value;
        });
    }
    
    if (mmseSlider) {
        mmseSlider.addEventListener('input', function() {
            document.getElementById('mmse-valor').textContent = this.value;
        });
    }
    
    if (nwbvSlider) {
        nwbvSlider.addEventListener('input', function() {
            document.getElementById('nwbv-valor').textContent = this.value;
        });
    }
});

function enviarAnalise(event) {
    event.preventDefault();
    
    // Pegar valores do formulario
    const genero = document.querySelector('input[name="genero"]:checked').value;
    const idade = Number(document.getElementById('idade-slider').value);
    const educacao = Number(document.getElementById('educacao').value);
    const ses = Number(document.getElementById('ses-slider').value);
    const mmse = Number(document.getElementById('mmse-slider').value);
    const etiv = Number(document.getElementById('etiv').value);
    const nwbv = Number(document.getElementById('nwbv-slider').value);
    const asf = Number(document.getElementById('asf').value);
    
    const limites = {
        idade: [33, 96],
        educacao: [1, 5],
        ses: [1, 5],
        mmse: [14, 30],
        etiv: [1123, 1992],
        nwbv: [0.644, 0.847],
        asf: [0.881, 1.563]
    };
    
    // 1. Validar seleção obrigatória ANTES do loop de limites
    if (!educacao) {
        alert('⚠️ Por favor, selecione o grau de instrução');
        return;
    }

    // 2. Validar se os números estão nos intervalos aceitos pelo modelo
    for (const [campo, [minimo, maximo]] of Object.entries(limites)) {
        const valor = { idade, educacao, ses, mmse, etiv, nwbv, asf }[campo];
        if (valor < minimo || valor > maximo) {
            alert(`⚠️ O valor de ${campo} está fora do intervalo recomendado (${minimo} a ${maximo}).`);
            return;
        }
    }
    
    const dados = {
        genero: genero,
        idade: idade,
        educacao: educacao,
        ses: ses,
        mmse: mmse,
        etiv: etiv,
        nwbv: nwbv,
        asf: asf
    };
    
    // Mostrar carregando
    const resultadoDiv = document.getElementById('resultado-analise');
    resultadoDiv.style.display = 'block';
    
    // Criar overlay de carregamento
    let loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255,255,255,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            z-index: 100;
        `;
        loadingOverlay.innerHTML = '<div class="loading">Analisando dados...</div>';
        resultadoDiv.style.position = 'relative';
        resultadoDiv.appendChild(loadingOverlay);
    } else {
        loadingOverlay.style.display = 'flex';
    }
    
    // Enviar para API
    fetch('/api/prever', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(dados)
    })
    .then(response => response.json())
    .then(data => {
        // Remover overlay de carregamento
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
        
        if (data.sucesso) {
            exibirResultado(data, mmse);
        } else {
            alert(`Erro na predição: ${data.mensagem}`);
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
        alert('Erro ao conectar com o servidor');
    });
}

function exibirResultado(data, mmse) {
    const resultadoDiv = document.getElementById('resultado-analise');
    
    document.getElementById('mmse-resultado').textContent = `${data.mmse}/30`;
    
    const resultadoIaBox = document.getElementById('resultado-ia-box');
    const confiancaBox = document.getElementById('confianca-ia-box');
    const resultadoNormalizado = String(data.resultado || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
    
    if (resultadoNormalizado === 'COM DEMENCIA') {
        resultadoIaBox.innerHTML = `
            <div class="warning-box">
                <strong>⚠️ Sinais Clínicos Detectados</strong>
                <p>O modelo identificou sinais preliminares de alerta compatíveis com demência.</p>
            </div>
        `;
    } else {
        resultadoIaBox.innerHTML = `
            <div class="info-box">
                <strong>✓ Resultado Normal</strong>
                <p>Paciente classificado dentro dos padrões de normalidade (Saudável).</p>
            </div>
        `;
    }
    
    confiancaBox.innerHTML = `
        <strong>ℹ️ Índice de Certeza Algorítmica:</strong> ${data.confianca}%
    `;
    
    resultadoDiv.style.display = 'block';
    
    // Scroll ate resultado
    resultadoDiv.scrollIntoView({behavior: 'smooth'});
}