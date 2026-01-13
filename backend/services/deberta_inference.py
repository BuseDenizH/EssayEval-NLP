import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from pathlib import Path
import os

# HuggingFace offline modu
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

BASE_DIR = Path(__file__).resolve().parent.parent
# Klasör adının görseldekiyle BİREBİR aynı olması lazım: "deberta"
MODEL_PATH = BASE_DIR / "models" / "deberta"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# Eğer hata alırsan: device = torch.device("cpu")

print(f"🔄 Loading DeBERTa from: {MODEL_PATH}")

try:
    tokenizer = AutoTokenizer.from_pretrained(str(MODEL_PATH), local_files_only=True)
    model = AutoModelForSequenceClassification.from_pretrained(str(MODEL_PATH), local_files_only=True)
    model.to(device)
    model.eval()
    print("✅ DeBERTa loaded successfully.")
except Exception as e:
    print(f"❌ DeBERTa Yükleme Hatası: {e}")
    model = None
    tokenizer = None

def run_deberta_inference(essay: str):
    if model is None or tokenizer is None:
        return {"error": "Model yüklenemedi"}

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
    
    # Ham çıktıları görelim (Debug için)
    print(f"\n📊 DEBERTA RAW OUTPUTS: {logits}")

    # Değişkenleri ayıkla
    tr = cc = lr = gra = 0.0
    if isinstance(logits, list) and len(logits) == 4:
        tr, cc, lr, gra = logits[0], logits[1], logits[2], logits[3]
    else:
        val = logits if isinstance(logits, float) else logits[0]
        tr = cc = lr = gra = val

    # --- PUAN KALİBRASYONU ---
    # Eğer model MPNet gibi küçük sayılar veriyorsa burayı kullanırız.
    # Şimdilik 0-9 arası normal sayı verdiğini varsayalım.
    # Eğer sonuçlar 0 çıkarsa sensitivity değerini MPNet'teki gibi artırırız.
    
    def calibrate(val):
        # Eğer model 0-1 arası (normalize) çıktı veriyorsa 10'la çarp
        if -1.0 < val < 1.0: 
             # MPNet gibi davranıyorsa özel formül:
             return max(1.0, min(9.0, 5.5 + (val * 20.0)))
        
        # Zaten 1-9 arası veriyorsa dokunma
        return max(0.0, min(9.0, val))

    final_tr = calibrate(tr)
    final_cc = calibrate(cc)
    final_lr = calibrate(lr)
    final_gra = calibrate(gra)

    # Genel skor ortalama ve yuvarlama
    final_overall = (final_tr + final_cc + final_lr + final_gra) / 4.0
    final_overall = round(final_overall * 2) / 2 

    return {
        "overall": final_overall,
        "criteria": {
            "task_response": round(final_tr * 2) / 2,
            "coherence": round(final_cc * 2) / 2,
            "lexical": round(final_lr * 2) / 2,
            "grammar": round(final_gra * 2) / 2
        }
    }