# Projeto: ababa

Breve guia para reproduzir o ambiente e correr os scripts localmente.

Arquivos importantes:
- `minha_rede.py` — script principal (treina e salva `modelo_alzheimer.pkl`).
- `metrics_report.py` — gera matriz de confusão, F1 e ROC-AUC (gera `roc_curve.png`).
- `modelo_alzheimer.pkl`, `padronizador.pkl`, `modelo_metadata.json` — modelos gerados (incluir se quiser usar resultados já treinados).
- `requirements.txt` — lista de dependências pip.
- `environment_details.txt` — versão do Python e `pip freeze` (informações do ambiente atual).

Passos para reproduzir em outro PC

1) Clone ou copie o repositório para a máquina alvo.

2) Crie e ative um ambiente virtual (recomendo usar a mesma versão Python mostrada em `environment_details.txt`).

- Windows (PowerShell):

    python -m venv venv
    .\venv\Scripts\Activate.ps1

- Windows (cmd):

    python -m venv venv
    venv\Scripts\activate

- macOS / Linux:

    python3 -m venv venv
    source venv/bin/activate

3) Atualize o pip e instale dependências:

    python -m pip install --upgrade pip
    pip install -r requirements.txt

4) (Opcional) Se quiser usar os modelos pré-treinados, copie os arquivos `.pkl` para o diretório do projeto.

5) Rodar scripts:

    python minha_rede.py
    python metrics_report.py

Observações e recomendações
- Se o `git push` falhar por `Permission denied (publickey)`, use HTTPS no `origin` ou configure sua chave SSH no GitHub.
- `requirements.txt` e `environment_details.txt` foram gerados a partir do ambiente local; pode haver pequenas diferenças de versão entre sistemas operacionais.
- Para reprodução mais fiel, envie também os arquivos `modelo_alzheimer.pkl` e `padronizador.pkl` (são binários grandes — considere manter fora do repositório e compartilhar via release ou storage).
 
# IA ABABA - Pré-diagnósticos de Demência

Sistema web para triagem cognitiva e predição de Alzheimer usando Inteligência Artificial.

## 📋 Estrutura do Projeto

```
c:\ababa\
├── api.py                          # API Flask (Backend)
├── minha_rede.py                   # Treinamento do modelo (intacto)
├── modelo_alzheimer.pkl            # Modelo treinado
├── padronizador.pkl                # StandardScaler do modelo
├── requirements.txt                # Dependências Python
├── templates/                      # Templates HTML
│   ├── index.html                 # Página inicial
│   ├── teste_rapido.html          # Teste rápido
│   ├── login.html                 # Login/Cadastro
│   ├── teste.html                 # Teste completo (com autenticação)
│   └── sobre.html                 # Créditos
├── static/
│   ├── css/
│   │   └── style.css              # Estilos unificados
│   ├── js/
│   │   ├── script.js              # Funções gerais
│   │   ├── login.js               # Autenticação
│   │   ├── teste_rapido.js        # Lógica do teste rápido
│   │   └── teste.js               # Lógica do teste completo
│   └── imgs/
│       └── Logo_sp.png            # Logo (deve estar na pasta)
└── app.css                         # (Antigo - não usado mais)
```

## 🚀 Como Usar

### 1. Instalar Dependências

```bash
pip install -r requirements.txt
```

### 2. Treinar o Modelo (Opcional)

Se quiser retreinar o modelo:

```bash
python minha_rede.py
```

Isso vai gerar/atualizar `modelo_alzheimer.pkl` e `padronizador.pkl`.

### 3. Iniciar o Servidor Flask

```bash
python api.py
```

A API estará disponível em: `http://localhost:5000`

### 4. Abrir no Navegador

Acesse: `http://localhost:5000`

## 🔧 Configuração Necessária

### Banco de Dados MySQL

O sistema espera um banco de dados chamado `usuarios` com a seguinte tabela:

```sql
CREATE DATABASE IF NOT EXISTS usuarios;

USE usuarios;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(64) NOT NULL
);
```

**Credenciais padrão no `api.py`:**
- Host: `localhost`
- User: `root`
- Password: (vazio)
- Database: `usuarios`

Se suas credenciais forem diferentes, edite a função `conectar_banco()` em `api.py`.

## 📱 Páginas Disponíveis

1. **Home** (`/`) - Página inicial
2. **Teste Rápido** (`/teste_rapido`) - Triagem cognitiva simplificada
3. **Login** (`/login`) - Autenticação de profissionais
4. **Teste Completo** (`/teste`) - Análise completa com dados clínicos (requer login)
5. **Sobre** (`/sobre`) - Créditos do projeto

## 🧠 Modelos e Arquivos

- **modelo_alzheimer.pkl**: Random Forest treinado (200 árvores, max_depth=10)
- **padronizador.pkl**: StandardScaler para normalização dos dados
- **minha_rede.py**: Script de treinamento (não precisa rodar novamente se os .pkl já existirem)

## 🔐 Segurança

- Senhas criptografadas com SHA-256
- Sistema de sessão Flask para autenticação
- CORS habilitado apenas para requisições locais (configure conforme necessário)

## 📊 Funcionalidades

✅ Teste rápido de triagem cognitiva (MMSE simplificado)
✅ Predição com modelo Random Forest
✅ Autenticação de usuários
✅ Interface responsiva (mobile-friendly)
✅ Análise estatística com confiança da predição

## 🎨 Design

- Tema escuro com gradientes Aurora
- Responsivo para dispositivos móveis
- Animações suaves
- Acessibilidade melhorada

## ⚠️ Aviso Legal

Este sistema é um **Trabalho de Conclusão de Curso (TCC)** e possui **caráter totalmente experimental**.

**NÃO é um diagnóstico médico real.** Resultados são apenas informativos.

Para diagnóstico real, procure: neurologista, geriatra, psiquiatra ou neuropsicólogo qualificado.

## 👥 Autores

- Lucas Santos Silva
- Murilo Romeu Teixeira
- Nathan Teixeira de Souza

**Orientador:** José Henrique Lopes da Silva

**Coorientadores:** Joice Eslabão Oliveira, Leonardo Santana Benevides, Leandro Dutra Junior

---

**Escola:** Silva Paes - Técnico em Informática (3º ano)
