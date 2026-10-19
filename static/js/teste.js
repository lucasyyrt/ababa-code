// esse script e o teste completo
// ele mexe nos sliders, pega os valores do formulario e envia tudo pro backend pra IA fazer a previsao

document.addEventListener('DOMContentLoaded', function() {
    const idadeSlider = document.getElementById('idade-slider');
    const sesSlider = document.getElementById('ses-slider');
    const mmseSlider = document.getElementById('mmse-slider');
    const nwbvSlider = document.getElementById('nwbv-slider');
    configurarUploadExames();
    
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

function configurarUploadExames() {
    const fileInput = document.getElementById('exames-upload');
    const folderInput = document.getElementById('exames-folder-upload');
    const dropzone = document.getElementById('upload-dropzone');
    const summary = document.getElementById('exam-file-summary');
    const fileList = document.getElementById('exam-file-list');
    const uploadButton = document.getElementById('enviar-exames');
    const clearButton = document.getElementById('limpar-exames');
    const status = document.getElementById('exam-upload-status');
    const maxFiles = 60;
    const maxBytes = 2 * 1024 * 1024 * 1024;
    const allowedExtensions = ['.jpg', '.jpeg'];
    let selectedFiles = [];
    let uploading = false;

    if (!fileInput || !folderInput || !dropzone || !summary || !fileList || !uploadButton || !clearButton || !status) {
        return;
    }

    function getExtension(filename) {
        const normalizedName = filename.toLowerCase();
        return allowedExtensions.find(extension => normalizedName.endsWith(extension)) || '';
    }

    function prepareFile(file) {
        const extension = getExtension(file.name);
        return extension ? {file, uploadName: file.name} : null;
    }

    function updateSelection() {
        const totalBytes = selectedFiles.reduce((total, entry) => total + entry.file.size, 0);
        summary.textContent = selectedFiles.length
            ? `${selectedFiles.length} arquivo(s) selecionado(s) — ${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
            : 'Nenhum arquivo selecionado.';
        fileList.replaceChildren();
        selectedFiles.slice(0, 6).forEach(entry => {
            const item = document.createElement('li');
            item.textContent = entry.file.webkitRelativePath || entry.file.name;
            fileList.appendChild(item);
        });
        if (selectedFiles.length > 6) {
            const more = document.createElement('li');
            more.textContent = `e mais ${selectedFiles.length - 6} arquivo(s)`;
            fileList.appendChild(more);
        }
        uploadButton.disabled = selectedFiles.length === 0 || uploading;
        clearButton.hidden = selectedFiles.length === 0 || uploading;
    }

    async function addFiles(fileCollection) {
        const preparedFiles = Array.from(fileCollection, prepareFile);
        const validFiles = preparedFiles.filter(entry => entry !== null);
        const invalidCount = preparedFiles.length - validFiles.length;
        const candidates = [...selectedFiles];
        const knownFiles = new Set(candidates.map(entry =>
            `${entry.file.webkitRelativePath || entry.file.name}:${entry.file.size}:${entry.file.lastModified}`
        ));

        validFiles.forEach(entry => {
            const key = `${entry.file.webkitRelativePath || entry.file.name}:${entry.file.size}:${entry.file.lastModified}`;
            if (!knownFiles.has(key)) {
                candidates.push(entry);
                knownFiles.add(key);
            }
        });

        const totalBytes = candidates.reduce((total, entry) => total + entry.file.size, 0);
        status.classList.remove('is-error');
        if (candidates.length > maxFiles) {
            status.textContent = `O limite é de ${maxFiles} arquivos por envio. A nova seleção não foi adicionada.`;
            status.classList.add('is-error');
        } else if (totalBytes > maxBytes) {
            status.textContent = 'O limite total é de 2 GB. A nova seleção não foi adicionada.';
            status.classList.add('is-error');
        } else {
            selectedFiles = candidates;
            if (invalidCount > 0) {
                status.textContent = `${invalidCount} arquivo(s) ignorado(s): formato não reconhecido.`;
                status.classList.add('is-error');
            } else {
                status.textContent = '';
            }
        }
        updateSelection();
    }

    fileInput.addEventListener('change', () => {
        addFiles(fileInput.files);
        fileInput.value = '';
    });
    folderInput.addEventListener('change', () => {
        addFiles(folderInput.files);
        folderInput.value = '';
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, event => {
            event.preventDefault();
            dropzone.classList.add('is-dragging');
        });
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, event => {
            event.preventDefault();
            dropzone.classList.remove('is-dragging');
        });
    });
    dropzone.addEventListener('drop', event => {
        addFiles(event.dataTransfer.files);
    });

    clearButton.addEventListener('click', () => {
        selectedFiles = [];
        status.textContent = '';
        status.classList.remove('is-error');
        updateSelection();
    });

    uploadButton.addEventListener('click', async () => {
        if (uploading || selectedFiles.length === 0) {
            return;
        }

        const formData = new FormData();
        selectedFiles.forEach(entry => formData.append('exames', entry.file, entry.uploadName));
        uploading = true;
        status.textContent = 'Enviando arquivos...';
        status.classList.remove('is-error');
        updateSelection();

        try {
            const response = await fetch('/api/enviar_exames', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (!response.ok || !data.sucesso) {
                throw new Error(data.mensagem || 'Não foi possível enviar os exames.');
            }

            selectedFiles = [];
            status.textContent = data.mensagem;
        } catch (error) {
            status.textContent = error.message || 'Erro ao conectar com o servidor.';
            status.classList.add('is-error');
        } finally {
            uploading = false;
            updateSelection();
        }
    });

    updateSelection();
}

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