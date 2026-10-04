import json
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# 1. Carregar dados
print("1. A carregar os dados...")
df = pd.read_csv('oasis_cross-sectional (1).csv')

# 2. Limpeza
print("2. A tratar os dados...")
df = df.drop(columns=['ID', 'Hand', 'Delay'], errors='ignore')
df = df.dropna(subset=['CDR'])

# Mapeamento manual explícito para evitar divergências com LabelEncoder
gender_map = {'M': 0, 'F': 1}
df['M/F'] = df['M/F'].map(gender_map)

# Target e Features
y = (df['CDR'] > 0).astype(int)
X = df.drop(columns=['CDR'])

# 3. Divisão Treino / Teste (Antes de imputar e padronizar)
X_treino, X_teste, y_treino, y_teste = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# 4. Tratar NaNs sem Data Leakage
mediana_ses = X_treino['SES'].median()
mediana_mmse = X_treino['MMSE'].median()

X_treino['SES'] = X_treino['SES'].fillna(mediana_ses)
X_treino['MMSE'] = X_treino['MMSE'].fillna(mediana_mmse)

X_teste['SES'] = X_teste['SES'].fillna(mediana_ses)
X_teste['MMSE'] = X_teste['MMSE'].fillna(mediana_mmse)

# 5. Normalização
scaler = StandardScaler()
X_treino_scaled = scaler.fit_transform(X_treino)
X_teste_scaled = scaler.transform(X_teste)

# 6. Treinamento
print("3. A treinar o modelo Random Forest...")
modelo_rf = RandomForestClassifier(
    n_estimators=200, max_depth=10, random_state=42
)
modelo_rf.fit(X_treino_scaled, y_treino)

# 7. Avaliação Completa
previsoes = modelo_rf.predict(X_teste_scaled)
precisao = accuracy_score(y_teste, previsoes)

print(f"\nAcurácia do Modelo: {precisao * 100:.2f}%\n")
print("--- Relatório de Classificação (Relevante para TCC) ---")
print(classification_report(y_teste, previsoes, target_names=['Saudável', 'Com Demência']))

print("--- Matriz de Confusão ---")
print(confusion_matrix(y_teste, previsoes))

# 8. Salvando artefatos
joblib.dump(modelo_rf, 'modelo_alzheimer.pkl')
joblib.dump(scaler, 'padronizador.pkl')

metadata = {
    'colunas': list(X.columns),
    'precision': float(precisao),
    'n_features': X.shape[1],
    'label_mapping': gender_map,
    'imputacao_medianas': {'SES': float(mediana_ses), 'MMSE': float(mediana_mmse)},
}

with open('modelo_metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)

print("\nModelos e metadados atualizados com sucesso!")