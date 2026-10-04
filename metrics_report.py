import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, classification_report, f1_score, roc_auc_score, roc_curve
try:
    import matplotlib.pyplot as plt
    HAS_MATPLOTLIB = True
except Exception:
    HAS_MATPLOTLIB = False

print('A gerar relatório de métricas...')

# Carregar metadados e modelos
with open('modelo_metadata.json', 'r') as f:
    metadata = json.load(f)

model = joblib.load('modelo_alzheimer.pkl')
scaler = joblib.load('padronizador.pkl')

# Carregar dados e preparar X conforme colunas salvas
df = pd.read_csv('oasis_cross-sectional (1).csv')
for col in ['ID', 'Hand', 'Delay']:
    if col in df.columns:
        df = df.drop(columns=[col])
df = df.dropna(subset=['CDR'])

# Imputações simples (mesma lógica usada originalmente)
df['SES'] = df['SES'].fillna(df['SES'].median())
df['MMSE'] = df['MMSE'].fillna(df['MMSE'].median())

# Garantir codificação do gênero usando metadados quando disponível
label_map = metadata.get('label_mapping', {})
if 'M/F' in df.columns and label_map:
    # label_map: e.g. {'F':0,'M':1} or {'M':0,'F':1}
    df['M/F'] = df['M/F'].map(lambda x: label_map.get(str(x), np.nan)).astype(float)
else:
    # fallback: simple label encode
    df['M/F'] = df['M/F'].map({'M':1, 'F':0})

y = (df['CDR'] > 0).astype(int)
X = df.drop(columns=['CDR'])

# Reordenar colunas na ordem salva
cols = metadata.get('colunas')
if cols:
    X = X[cols]

# Separar holdout com a mesma semente usada originalmente
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Aplicar scaler (assumindo que o scaler foi treinado na mesma ordem de colunas)
X_test_scaled = scaler.transform(X_test)

# Predições e probabilidades
preds = model.predict(X_test_scaled)
probs = None
if hasattr(model, 'predict_proba'):
    probs = model.predict_proba(X_test_scaled)[:, 1]

# Métricas
cm = confusion_matrix(y_test, preds)
report = classification_report(y_test, preds, digits=4)
f1 = f1_score(y_test, preds)
roc_auc = roc_auc_score(y_test, probs) if probs is not None else None

print('\nMatriz de Confusão:')
print(cm)
print('\nClassification Report:')
print(report)
print(f'F1-score: {f1:.4f}')
if roc_auc is not None:
    print(f'ROC-AUC: {roc_auc:.4f}')

if probs is not None and HAS_MATPLOTLIB:
    fpr, tpr, _ = roc_curve(y_test, probs)
    plt.figure()
    plt.plot(fpr, tpr, label=f'ROC curve (AUC = {roc_auc:.4f})')
    plt.plot([0, 1], [0, 1], 'k--')
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('ROC Curve')
    plt.legend(loc='lower right')
    plt.savefig('roc_curve.png')
    print('Curva ROC salva em roc_curve.png')
elif probs is not None:
    print('matplotlib não disponível — curva ROC não será plotada, apenas ROC-AUC numérico será salvo')

with open('metrics_report.txt', 'w') as f:
    f.write('Matriz de Confusão:\n')
    f.write(np.array2string(cm))
    f.write('\n\nClassification Report:\n')
    f.write(report)
    f.write(f'\nF1-score: {f1:.4f}\n')
    if roc_auc is not None:
        f.write(f'ROC-AUC: {roc_auc:.4f}\n')

print('Relatório salvo em metrics_report.txt')
