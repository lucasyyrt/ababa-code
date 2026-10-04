#!/bin/bash
# Script de Setup do IA ABABA

echo "================================"
echo "Setup do IA ABABA"
echo "================================"

# 1. Criar banco de dados MySQL
echo ""
echo "1. Configurando banco de dados MySQL..."
echo "Execute no MySQL:"
echo ""
echo "CREATE DATABASE IF NOT EXISTS usuarios;"
echo "USE usuarios;"
echo "CREATE TABLE usuarios ("
echo "    id INT AUTO_INCREMENT PRIMARY KEY,"
echo "    username VARCHAR(50) NOT NULL UNIQUE,"
echo "    password VARCHAR(64) NOT NULL"
echo ");"
echo ""

# 2. Instalar dependências Python
echo "2. Instalando dependências Python..."
pip install -r requirements.txt

# 3. Verificar arquivos do modelo
echo ""
echo "3. Verificando arquivos do modelo..."
if [ -f "modelo_alzheimer.pkl" ] && [ -f "padronizador.pkl" ]; then
    echo "✓ Modelos encontrados!"
else
    echo "⚠️ Modelos não encontrados. Treinando novo modelo..."
    python minha_rede.py
fi

# 4. Pronto para iniciar
echo ""
echo "================================"
echo "Setup Completo!"
echo "================================"
echo ""
echo "Para iniciar o servidor:"
echo "    python api.py"
echo ""
echo "Acesse: http://localhost:5000"
echo ""
