import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from pathlib import Path
import os
import math

# HuggingFace offline modu
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "mpnet_export"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# GPU hatası olursa alttakini aç:
# device = torch.device("cpu")

print(f"🔄 Loading MPNet from: {MODEL_PATH}")

tokenizer = AutoTokenizer.from_pretrained(str(MODEL_PATH), local_files_only=True)
model = AutoModelForSequenceClassification.from_pretrained(str(MODEL_PATH), local_files_only=True)

model.to(device)
model.eval()

print("✅ MPNet loaded successfully.")

def run_mpnet_inference(essay: str):
    inputs = tokenizer(
        essay,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=512 
    ).to(device)

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits.squeeze().tolist()
    
    print(f"\n📊 RAW OUTPUTS: {logits}")

    # Değişkenleri ayıkla
    tr = cc = lr = gra = 0.0
    if isinstance(logits, list) and len(logits) == 4:
        tr, cc, lr, gra = logits[0], logits[1], logits[2], logits[3]
    else:
        val = logits if isinstance(logits, float) else logits[0]
        tr = cc = lr = gra = val

    # --- 🛠️ PUAN KALİBRASYONU (Sinyal Yükseltici) ---
    # Modelin ham çıktıları 0.0 civarında (-0.1 ile +0.1 arası).
    # Bunları IELTS ortalaması olan 5.5 etrafına dağıtıyoruz.
    # Formül: 5.5 + (ModelÇıktısı * Hassasiyet)
    
    sensitivity = 20.0 # Bu sayı küçük farkları puana çevirir (Sinyali güçlendirir)
    base_score = 5.5   # Başlangıç/Ortalama puanı

    def calibrate(val):
        # 1. Sigmoid benzeri yumuşak bir geçiş veya lineer shift
        # Ham değer -0.05 ise -> 5.5 - 1.0 = 4.5 puan
        # Ham değer +0.05 ise -> 5.5 + 1.0 = 6.5 puan
        score = base_score + (val * sensitivity)
        
        # 2. Puanı 1.0 ile 9.0 arasına sıkıştır
        score = max(1.0, min(9.0, score))
        
        # 3. IELTS formatına yuvarla (buçuklu sisteme: 6.0, 6.5 gibi)
        return round(score * 2) / 2

    # Hesapla
    final_tr = calibrate(tr)
    final_cc = calibrate(cc)
    final_lr = calibrate(lr)
    final_gra = calibrate(gra)

    # Genel skor ortalama
    final_overall = (final_tr + final_cc + final_lr + final_gra) / 4.0
    final_overall = round(final_overall * 2) / 2 # Tekrar yuvarla

    return {
        "overall": final_overall,
        "criteria": {
            "task_response": final_tr,
            "coherence": final_cc,
            "lexical": final_lr,
            "grammar": final_gra
        }
    }