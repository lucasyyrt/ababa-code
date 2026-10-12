import json
from pathlib import Path


metadata_path = Path("modelo_metadata.json")
with metadata_path.open(encoding="utf-8") as arquivo:
    metadata = json.load(arquivo)

avaliacao = metadata.get("avaliacao")
if not avaliacao or "acuracia_ajustado_oof" not in avaliacao:
    raise SystemExit(
        "Não há métricas de validação cruzada nos metadados. "
        "Execute minha_rede.py para treinar e avaliar o modelo."
    )

print(f"Método: {avaliacao['metodo']}")
print(f"Amostras avaliadas fora do fold de treino: {avaliacao['n_amostras']}")
print(f"Pacientes únicos: {avaliacao['n_pacientes']}")
print(f"Acurácia OOF baseline: {avaliacao['acuracia_baseline_oof'] * 100:.2f}%")
print(f"Acurácia OOF ajustado: {avaliacao['acuracia_ajustado_oof'] * 100:.2f}%")
print(f"ROC-AUC OOF ajustado: {avaliacao['roc_auc_ajustado_oof']:.4f}")
print("\nRelatório de classificação OOF:")
print(avaliacao["relatorio_classificacao_oof"])
print("Matriz de confusão OOF [[VN, FP], [FN, VP]]:")
for linha in avaliacao["matriz_confusao_oof"]:
    print(linha)
print("\nFalsos negativos OOF:")
for caso in avaliacao["falsos_negativos_oof"]:
    print(f"{caso['ID']} (CDR={caso['CDR']})")
