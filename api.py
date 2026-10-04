"""Esse aqui é o backend principal do ABABA

Ele monta a API Flask que faz basicamente isso
- entrega as paginas HTML do site
- autentica o usuario no MySQL
- faz a predicao clinica usando o modelo treinado no `modelo_alzheimer.pkl`
- responde coisas pro frontend tipo nome do usuario data e hora e outras infos

Ta tudo separado por partes pra ficar mais facil de entender e de mostrar no projeto
"""

# ===== IMPORTACOES =====
# Aqui a gente importa as coisas que o Flask e a API precisam pra funcionar
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS

# Bibliotecas de IA e dados
import numpy as np
import pandas as pd
import joblib

# Banco MySQL
import mysql.connector
from mysql.connector import Error

# Coisas basicas do Python
import hashlib
from datetime import datetime
from functools import wraps
import os

# ===== INICIALIZACAO DA APLICACAO =====
# Cria a aplicacao Flask mesmo sem isso nn tem como registrar as rotas
app = Flask(__name__)

# Essa chave e usada pra manter a sessao do usuario segura no navegador
app.secret_key = 'sua_chave_secreta_super_segura_aqui'

# Isso deixa a API acessivel pelo frontend tambem sem dar problema de CORS
CORS(app)

# ============= CONFIGURACAO DO BANCO DE DADOS =============
def conectar_banco():
    """Abre a conexão com o banco MySQL local

    Se der certo ele retorna a conexao se nn retorna None
    """
    try:
        return mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
            database="usuarios"
        )
    except Error as e:
        print(f"Erro na conexão: {e}")
        return None

# ============= CARREGAMENTO DO MODELO DE IA =============
# Aqui ele pega o modelo treinado e o scaler que foram salvos antes
# Isso e feito quando a API sobe pra ja ficar tudo pronto pra predicao
try:
    modelo = joblib.load('modelo_alzheimer.pkl')
    scaler = joblib.load('padronizador.pkl')

    # Tenta ler os metadados do modelo pra conhecer o nome das colunas que ele espera
    try:
        import json
        with open('modelo_metadata.json', 'r') as f:
            metadata = json.load(f)
            COLUNAS_ESPERADAS = metadata.get('colunas', ['M/F', 'Age', 'Educ', 'SES', 'MMSE', 'eTIV', 'nWBV', 'ASF'])
    except:
        # Se nn encontrar metadados usa um fallback seguro com as colunas conhecidas
        COLUNAS_ESPERADAS = ['M/F', 'Age', 'Educ', 'SES', 'MMSE', 'eTIV', 'nWBV', 'ASF']

    print("✓ Modelos carregados com sucesso!")
    print(f"✓ Colunas esperadas: {COLUNAS_ESPERADAS}")
except Exception as e:
    # Se o modelo nn existir a API continua viva mas as rotas de predicao retornam erro
    print(f"✗ Erro ao carregar modelos: {e}")
    modelo = None
    scaler = None
    COLUNAS_ESPERADAS = ['M/F', 'Age', 'Educ', 'SES', 'MMSE', 'eTIV', 'nWBV', 'ASF']

# ============= FUNCOES AUXILIARES =============
def criptografar_senha(senha):
    """Cria um hash da senha pra nn salvar a senha pura no banco

    Tipo e mais seguro assim
    """
    return hashlib.sha256(senha.encode()).hexdigest()


def normalizar_genero(valor):
    """Converte valores de gênero em um formato único usado pelo modelo."""
    aliases = {
        'm': 'masculino',
        'masculino': 'masculino',
        'male': 'masculino',
        'homem': 'masculino',
        'man': 'masculino',
        'f': 'feminino',
        'feminino': 'feminino',
        'female': 'feminino',
        'mulher': 'feminino',
        'woman': 'feminino',
    }
    return aliases.get(str(valor).strip().lower(), None)


def validar_intervalo_modelo(dados):
    """Valida os dados do formulário sem bloquear valores compatíveis com a interface do teste rápido."""
    limites = {
        'idade': (18, 120),
        'educacao': (0, 20),
        'ses': (1, 5),
        'mmse': (0, 30),
        'etiv': (900, 2000),
        'nwbv': (0.55, 1.0),
        'asf': (0.80, 1.80)
    }

    for nome, (minimo, maximo) in limites.items():
        try:
            valor = float(dados.get(nome, 0))
        except (TypeError, ValueError):
            return f"{nome.upper()} inválido."

        if np.isnan(valor):
            return f"{nome.upper()} inválido."

    genero = normalizar_genero(dados.get('genero', ''))
    if genero not in {'masculino', 'feminino'}:
        return 'Gênero inválido. Use Masculino ou Feminino.'

    return None


def login_required(f):
    """Esse decorador impede que a pessoa entre em páginas privadas sem login

    Se ela nn estiver logada e mandada pra pagina de login
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function


def limpar_sessao_publica():
    """Limpa a sessão apenas para visitantes não autenticados."""
    if 'user_id' in session:
        return

    session.clear()

# ============= ROTAS - PAGINAS HTML =============
# Essas rotas servem as paginas HTML usando o Flask e os templates

@app.route('/')
def index():
    """Mostra a página inicial do site"""
    limpar_sessao_publica()
    return render_template('index.html')

@app.route('/teste_rapido')
def teste_rapido():
    """Mostra a pagina de teste rapido sem precisar estar logado

    É mais leve tipo um teste rápido pra apresentar a IA
    """
    limpar_sessao_publica()
    return render_template('teste_rapido.html')

@app.route('/teste')
@login_required
def teste():
    """Mostra a pagina de teste completo so pode entrar quem estiver logado

    Tá protegendo o formulário clínico mesmo
    """
    return render_template('teste.html')

@app.route('/login')
def login_page():
    """Mostra a pagina de login da aplicacao"""
    limpar_sessao_publica()
    return render_template('login.html')

@app.route('/sobre')
def sobre():
    """Mostra a página sobre o projeto e a ideia acadêmica dele"""
    limpar_sessao_publica()
    return render_template('sobre.html')

@app.route('/creditos')
def creditos():
    """Mostra a pagina de creditos"""
    limpar_sessao_publica()
    return render_template('creditos.html')

# ============= APIs DE AUTENTICACAO =============
# Aqui sao as rotas que o frontend usa pra logar e deslogar o usuario

@app.route('/api/login', methods=['POST'])
def api_login():
    """Faz o login do usuário no banco

    Ele recebe username e senha em JSON criptografa a senha compara com o banco
    e se estiver certo salva o ID e o nome do usuario na sessao
    """
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'sucesso': False, 'mensagem': 'Usuário e senha são obrigatórios'}), 400
    
    conexao = conectar_banco()
    if not conexao:
        return jsonify({'sucesso': False, 'mensagem': 'Erro ao conectar ao banco'}), 500
    
    try:
        cursor = conexao.cursor()
        senha_cripto = criptografar_senha(password)
        sql = "SELECT id FROM usuarios WHERE username = %s AND password = %s"
        cursor.execute(sql, (username, senha_cripto))
        resultado = cursor.fetchone()
        
        if resultado:
            session['user_id'] = resultado[0]
            session['username'] = username
            return jsonify({'sucesso': True, 'mensagem': 'Login realizado com sucesso!'})
        else:
            return jsonify({'sucesso': False, 'mensagem': 'Usuário ou senha incorretos'}), 401
    except Error as e:
        return jsonify({'sucesso': False, 'mensagem': f'Erro: {e}'}), 500
    finally:
        cursor.close()
        conexao.close()

@app.route('/api/cadastro', methods=['POST'])
def api_cadastro():
    """Cadastra um novo usuário

    Criptografa a senha com SHA-256 e tenta salvar no banco na tabela `usuarios`
    """
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'sucesso': False, 'mensagem': 'Preencha todos os campos'}), 400
    
    conexao = conectar_banco()
    if not conexao:
        return jsonify({'sucesso': False, 'mensagem': 'Erro ao conectar ao banco'}), 500
    
    try:
        cursor = conexao.cursor()
        senha_cripto = criptografar_senha(password)
        sql = "INSERT INTO usuarios (username, password) VALUES (%s, %s)"
        cursor.execute(sql, (username, senha_cripto))
        conexao.commit()
        return jsonify({'sucesso': True, 'mensagem': 'Usuário cadastrado com sucesso!'})
    except Error as e:
        if 'Duplicate' in str(e):
            return jsonify({'sucesso': False, 'mensagem': 'Usuário já existe'}), 400
        return jsonify({'sucesso': False, 'mensagem': f'Erro: {e}'}), 500
    finally:
        cursor.close()
        conexao.close()

@app.route('/api/logout', methods=['POST'])
def api_logout():
    """Sai da sessão e limpa tudo que tava salvo no Flask"""
    session.clear()
    return jsonify({'sucesso': True, 'mensagem': 'Saindo...'})

# ============= APIs DE PREDICAO =============
# Esse bloco recebe os dados do formulario clinico e usa o modelo treinado pra responder

@app.route('/api/prever', methods=['POST'])
def api_prever():
    """Faz a predicao do paciente com base nos dados clinicos

    Recebe idade escolaridade gênero SES MMSE eTIV NWBV e ASF
    monta o DataFrame na ordem certa e manda pro scaler e pro modelo
    """
    if modelo is None or scaler is None:
        return jsonify({'sucesso': False, 'mensagem': 'Modelo nao carregado'}), 500
    
    data = request.json
    
    try:
        genero_normalizado = normalizar_genero(data.get('genero', ''))
        if genero_normalizado is None:
            return jsonify({'sucesso': False, 'mensagem': 'Gênero inválido. Use Masculino ou Feminino.'}), 400

        genero = 0 if genero_normalizado == 'masculino' else 1
        idade = float(data.get('idade', 0) or 0)
        educacao = float(data.get('educacao', 0) or 0)
        ses = float(data.get('ses', 0) or 0)
        mmse = float(data.get('mmse', 0) or 0)
        etiv = float(data.get('etiv', 0) or 0)
        nwbv = float(data.get('nwbv', 0) or 0)
        asf = float(data.get('asf', 0) or 0)

        if any(pd.isna([genero, idade, educacao, ses, mmse, etiv, nwbv, asf])):
            return jsonify({'sucesso': False, 'mensagem': 'Valores invalidos ou faltando dados'}), 400

        idade = min(max(idade, 18), 120)
        educacao = min(max(educacao, 0), 20)
        ses = min(max(ses, 1), 5)
        mmse = min(max(mmse, 0), 30)
        etiv = min(max(etiv, 900), 2000)
        nwbv = min(max(nwbv, 0.55), 1.0)
        asf = min(max(asf, 0.80), 1.80)

        erros = validar_intervalo_modelo({
            'genero': data.get('genero', ''),
            'idade': idade,
            'educacao': educacao,
            'ses': ses,
            'mmse': mmse,
            'etiv': etiv,
            'nwbv': nwbv,
            'asf': asf
        })
        if erros:
            return jsonify({'sucesso': False, 'mensagem': erros}), 400

        # Cria vetor na ORDEM CORRETA: M/F, Age, Educ, SES, MMSE, eTIV, nWBV, ASF
        vetor_paciente = pd.DataFrame({
            'M/F': [genero],
            'Age': [idade],
            'Educ': [educacao],
            'SES': [ses],
            'MMSE': [mmse],
            'eTIV': [etiv],
            'nWBV': [nwbv],
            'ASF': [asf]
        })
        
        # Padroniza e faz predicao
        dados_escala = scaler.transform(vetor_paciente)
        previsao = modelo.predict(dados_escala)
        probabilidade = modelo.predict_proba(dados_escala)
        confianca = np.max(probabilidade) * 100
        
        resultado = "COM DEMENCIA" if previsao[0] == 1 else "SAUDAVEL"
        
        return jsonify({
            'sucesso': True,
            'resultado': resultado,
            'confianca': round(confianca, 2),
            'mmse': mmse
        })
    except ValueError as e:
        return jsonify({'sucesso': False, 'mensagem': f'Erro ao converter valores numericos: {str(e)}'}), 400
    except Exception as e:
        print(f"Erro na predicao: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'sucesso': False, 'mensagem': f'Erro na predicao: {str(e)}'}), 500

@app.route('/api/data_info', methods=['GET'])
def api_data_info():
    """Retorna a data e a hora pra mostrar no teste rapido

    Isso é só pra deixar a interface mais completa
    """
    agora = datetime.now()
    
    meses = {
        1: "Janeiro", 2: "Fevereiro", 3: "Marco", 4: "Abril",
        5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
        9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro"
    }
    
    dias_semana = {
        0: "Segunda-Feira", 1: "Terca-Feira", 2: "Quarta-Feira",
        3: "Quinta-Feira", 4: "Sexta-Feira", 5: "Sabado", 6: "Domingo"
    }
    
    return jsonify({
        'ano': agora.year,
        'mes': meses[agora.month],
        'dia_semana': dias_semana[agora.weekday()]
    })


@app.route('/api/usuario_info', methods=['GET'])
def api_usuario_info():
    """Diz se o usuario ta logado e devolve o nome dele da sessao

    Isso ajuda a atualizar o nome na navbar do site
    """
    if 'user_id' in session:
        return jsonify({
            'logado': True,
            'username': session.get('username')
        })
    return jsonify({'logado': False})

# ============= SERVIR IMAGENS =============
# Essa rota serve as imagens estaticas que ficam na pasta `imgs`

@app.route('/imgs/<filename>')
def serve_imgs(filename):
    """Serve a imagem da pasta `imgs` pra usar nos templates

    Tipo exemplo `/imgs/ababalogo.png`
    """
    from flask import send_from_directory
    return send_from_directory('imgs', filename)

# ============= TRATAMENTO DE ERROS =============
# Aqui ele deixa as respostas de erro mais organizadas pra nn explodir no frontend

@app.errorhandler(404)
def nao_encontrado(error):
    """Se a rota nn existir devolve um JSON bonitinho dizendo que nn achou"""
    return jsonify({'erro': 'Página não encontrada'}), 404

@app.errorhandler(500)
def erro_servidor(error):
    """Se der erro interno na API ele devolve um JSON simples pra gente saber"""
    return jsonify({'erro': 'Erro interno do servidor'}), 500

# ============= INICIAR SERVIDOR =============
# Aqui ele sobe o servidor so quando esse arquivo for rodado direto

if __name__ == '__main__':
    # `debug=True` deixa o servidor recarregar sozinho e mostrar mais infos na hora de testar
    app.run(debug=True, host='localhost', port=5000)
