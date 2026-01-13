import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from pathlib import Path
import os

# HuggingFace offline modu
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

BASE_DIR = Path(__file__).resolve().parent.parent
# Klasör adı görseldekiyle AYNI olmalı: "trained_longformer"
MODEL_PATH = BASE_DIR / "models" / "trained_longformer"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# Eğer Longformer çok RAM yerse ve bilgisayar donarsa alttakini aç:
# device = torch.device("cpu")

print(f"[*] Loading Longformer from: {MODEL_PATH}")

try:
    tokenizer = AutoTokenizer.from_pretrained(str(MODEL_PATH), local_files_only=True)
    model = AutoModelForSequenceClassification.from_pretrained(str(MODEL_PATH), local_files_only=True)
    model.to(device)
    model.eval()
    print("[OK] Longformer loaded successfully.")
except Exception as e:
    print(f"[ERROR] Longformer Yukleme Hatasi: {e}")
    model = None
    tokenizer = None

def run_inference(essay: str):
    if model is None or tokenizer is None:
        return {"error": "Longformer modeli yüklenemedi (Dosya yolu veya RAM hatası)"}

    try:
        inputs = tokenizer(
            essay,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=1024 # Longformer daha uzun metinleri okuyabilir
        ).to(device)

        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits.squeeze().tolist()
        
        # Debug için yazdır
        print(f"\n[Longformer] RAW OUTPUTS: {logits}")

        # Değişkenleri ayıkla
        tr = cc = lr = gra = 0.0
        if isinstance(logits, list) and len(logits) == 4:
            tr, cc, lr, gra = logits[0], logits[1], logits[2], logits[3]
        else:
            val = logits if isinstance(logits, float) else logits[0]
            tr = cc = lr = gra = val

        # --- KALİBRASYON (Longformer Ayarı) ---
        def calibrate(val):
            # Model normalize edilmiş (0-1 arası) sayı veriyorsa düzelt
            if -1.0 < val < 1.0: 
                return max(1.0, min(9.0, 5.5 + (val * 20.0)))
            return max(0.0, min(9.0, val))

        final_tr = calibrate(tr)
        final_cc = calibrate(cc)
        final_lr = calibrate(lr)
        final_gra = calibrate(gra)

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
    except Exception as e:
        return {"error": str(e)}