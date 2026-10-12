import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

RANDOM_STATE = 42
BASELINE_PARAMS = {
    "n_estimators": 200,
    "max_depth": 10,
    "min_samples_split": 2,
    "min_samples_leaf": 1,
    "max_features": "sqrt",
}
PARAM_GRID = {
    "rf__n_estimators": [200, 400],
    "rf__max_depth": [None, 10],
    "rf__min_samples_split": [2, 5],
    "rf__min_samples_leaf": [1, 2],
    "rf__max_features": ["sqrt", 0.8],
}
GENDER_MAP = {"M": 0, "F": 1}
DATA_FILE = Path("oasis_cross-sectional (1).csv")


def criar_pipeline(params):
    return Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            (
                "rf",
                RandomForestClassifier(
                    **params,
                    random_state=RANDOM_STATE,
                    n_jobs=-1,
                ),
            ),
        ]
    )


def json_compat(value):
    if isinstance(value, dict):
        return {key: json_compat(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_compat(item) for item in value]
    if isinstance(value, np.generic):
        return value.item()
    return value


def main():
    print("1. A carregar e tratar os dados...")
    df = pd.read_csv(DATA_FILE).dropna(subset=["CDR"]).copy()
    grupos = df["ID"].astype(str).str.replace(r"_MR\d+$", "", regex=True)
    ids = df["ID"].astype(str).reset_index(drop=True)
    cdr_original = df["CDR"].reset_index(drop=True)

    df = df.drop(columns=["ID", "Hand", "Delay"], errors="ignore")
    df["M/F"] = df["M/F"].map(GENDER_MAP)
    if df["M/F"].isna().any():
        raise ValueError("Há valores de gênero sem mapeamento em M/F.")

    y = (df.pop("CDR") > 0).astype(int).reset_index(drop=True)
    X = df.reset_index(drop=True)
    grupos = grupos.reset_index(drop=True)
    if y.nunique() != 2:
        raise ValueError("O conjunto precisa conter as duas classes de CDR.")

    print(
        f"Registros rotulados: {len(X)}; pacientes únicos: {grupos.nunique()}; "
        f"repetições por paciente: {len(grupos) - grupos.nunique()}."
    )
    print(
        "2. Avaliação aninhada com validação estratificada por paciente "
        "(Random Forest mantido)..."
    )

    previsoes_base = np.full(len(y), -1, dtype=int)
    previsoes_tunadas = np.full(len(y), -1, dtype=int)
    probabilidades_tunadas = np.full(len(y), np.nan, dtype=float)
    acuracias_base_folds = []
    acuracias_tunadas_folds = []
    parametros_por_fold = []

    outer_cv = StratifiedGroupKFold(
        n_splits=5, shuffle=True, random_state=RANDOM_STATE
    )
    for numero_fold, (indices_treino, indices_teste) in enumerate(
        outer_cv.split(X, y, grupos), start=1
    ):
        X_treino, X_teste = X.iloc[indices_treino], X.iloc[indices_teste]
        y_treino, y_teste = y.iloc[indices_treino], y.iloc[indices_teste]
        grupos_treino = grupos.iloc[indices_treino]

        baseline = criar_pipeline(BASELINE_PARAMS)
        baseline.fit(X_treino, y_treino)
        previsoes_base[indices_teste] = baseline.predict(X_teste)

        inner_cv = StratifiedGroupKFold(
            n_splits=4, shuffle=True, random_state=RANDOM_STATE + numero_fold
        )
        busca = GridSearchCV(
            estimator=criar_pipeline({}),
            param_grid=PARAM_GRID,
            scoring="accuracy",
            cv=inner_cv,
            n_jobs=-1,
            refit=True,
            error_score="raise",
        )
        busca.fit(X_treino, y_treino, groups=grupos_treino)
        modelo_fold = busca.best_estimator_
        previsoes_tunadas[indices_teste] = modelo_fold.predict(X_teste)
        probabilidades_tunadas[indices_teste] = modelo_fold.predict_proba(X_teste)[
            :, list(modelo_fold.classes_).index(1)
        ]

        acuracias_base_folds.append(
            accuracy_score(y_teste, previsoes_base[indices_teste])
        )
        acuracias_tunadas_folds.append(
            accuracy_score(y_teste, previsoes_tunadas[indices_teste])
        )
        parametros_por_fold.append(json_compat(busca.best_params_))
        print(
            f"Fold {numero_fold}/5 — base: {acuracias_base_folds[-1] * 100:.2f}%; "
            f"ajustado: {acuracias_tunadas_folds[-1] * 100:.2f}%."
        )

    acuracia_base = accuracy_score(y, previsoes_base)
    acuracia_tunada = accuracy_score(y, previsoes_tunadas)
    matriz = confusion_matrix(y, previsoes_tunadas, labels=[0, 1])
    relatorio = classification_report(
        y,
        previsoes_tunadas,
        labels=[0, 1],
        target_names=["Saudável", "Com Demência"],
        digits=4,
        zero_division=0,
    )
    auc = roc_auc_score(y, probabilidades_tunadas)

    # Listar os casos positivos que cada fold deixou passar, sem usar esses casos
    # para escolher parâmetros.
    falsos_negativos = [
        {"ID": ids.iloc[pos], "CDR": float(cdr_original.iloc[pos])}
        for pos in np.flatnonzero((y.to_numpy() == 1) & (previsoes_tunadas == 0))
    ]

    print("\n--- Comparação OOF: baseline vs. Random Forest ajustado ---")
    print(f"Acurácia baseline: {acuracia_base * 100:.2f}%")
    print(f"Acurácia ajustado: {acuracia_tunada * 100:.2f}%")
    print(f"ROC-AUC ajustado: {auc:.4f}")
    print("\n--- Relatório OOF do modelo ajustado ---")
    print(relatorio)
    print("Matriz de confusão OOF [[VN, FP], [FN, VP]]:")
    print(matriz)
    print("\nFalsos negativos OOF (CDR > 0 previsto como saudável):")
    print(falsos_negativos if falsos_negativos else "Nenhum nesta avaliação.")

    print(
        "\n3. A escolher os parâmetros finais por validação cruzada "
        "estratificada por paciente..."
    )
    final_cv = StratifiedGroupKFold(
        n_splits=5, shuffle=True, random_state=RANDOM_STATE
    )
    busca_final = GridSearchCV(
        estimator=criar_pipeline({}),
        param_grid=PARAM_GRID,
        scoring="accuracy",
        cv=final_cv,
        n_jobs=-1,
        refit=True,
        error_score="raise",
    )
    busca_final.fit(X, y, groups=grupos)
    pipeline_final = busca_final.best_estimator_
    parametros_finais = {
        chave.replace("rf__", "", 1): valor
        for chave, valor in busca_final.best_params_.items()
    }

    joblib.dump(pipeline_final.named_steps["rf"], "modelo_alzheimer.pkl")
    joblib.dump(pipeline_final.named_steps["scaler"], "padronizador.pkl")
    joblib.dump(pipeline_final.named_steps["imputer"], "imputador.pkl")

    metricas = {
        "metodo": "Nested 5-fold stratified group cross-validation; inner 4-fold tuning",
        "n_amostras": len(X),
        "n_pacientes": int(grupos.nunique()),
        "acuracia_baseline_oof": float(acuracia_base),
        "acuracia_ajustado_oof": float(acuracia_tunada),
        "media_acuracia_baseline_folds": float(np.mean(acuracias_base_folds)),
        "media_acuracia_ajustado_folds": float(np.mean(acuracias_tunadas_folds)),
        "roc_auc_ajustado_oof": float(auc),
        "matriz_confusao_oof": matriz.tolist(),
        "relatorio_classificacao_oof": relatorio,
        "falsos_negativos_oof": falsos_negativos,
        "acuracias_baseline_folds": acuracias_base_folds,
        "acuracias_ajustado_folds": acuracias_tunadas_folds,
        "parametros_escolhidos_por_fold": parametros_por_fold,
    }
    metadata = {
        "colunas": list(X.columns),
        "n_features": int(X.shape[1]),
        "label_mapping": GENDER_MAP,
        "imputacao_medianas": dict(
            zip(
                X.columns,
                pipeline_final.named_steps["imputer"].statistics_.astype(float),
            )
        ),
        "modelo": "RandomForestClassifier",
        "parametros_finais": json_compat(parametros_finais),
        "avaliacao": metricas,
    }
    with open("modelo_metadata.json", "w", encoding="utf-8") as arquivo:
        json.dump(metadata, arquivo, indent=2, ensure_ascii=False)

    with open("metrics_report.txt", "w", encoding="utf-8") as arquivo:
        arquivo.write("Avaliação aninhada por validação cruzada agrupada\n")
        arquivo.write(f"Acurácia OOF baseline: {acuracia_base:.4f}\n")
        arquivo.write(f"Acurácia OOF ajustado: {acuracia_tunada:.4f}\n")
        arquivo.write(f"ROC-AUC OOF ajustado: {auc:.4f}\n\n")
        arquivo.write("Relatório de classificação OOF:\n")
        arquivo.write(relatorio)
        arquivo.write("\nMatriz de confusão OOF [[VN, FP], [FN, VP]]:\n")
        arquivo.write(np.array2string(matriz))
        arquivo.write(f"\n\nParâmetros finais: {parametros_finais}\n")
        arquivo.write(f"Falsos negativos: {falsos_negativos}\n")

    print(f"\nParâmetros finais: {parametros_finais}")
    print("Modelo, scaler, imputador e metadados salvos para a API.")


if __name__ == "__main__":
    main()
