from fastapi import FastAPI
from pydantic import BaseModel
# İMPORTLAR:
from services.mpnet_inference import run_mpnet_inference
from services.deberta_inference import run_deberta_inference 
from services.inference import run_inference # Longformer burada

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="IELTS Essay Scoring API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    essay: str
    models: list[str]

@app.post("/predict")
def predict(request: PredictRequest):
    text = request.essay
    results = {}

    # 1. MPNet
    if "mpnet" in request.models:
        try:
            print("⏳ Running MPNet...")
            results["mpnet"] = run_mpnet_inference(text)
        except Exception as e:
            results["mpnet"] = {"error": str(e)}

    # 2. DeBERTa
    if "deberta" in request.models:
        try:
            print("⏳ Running DeBERTa...")
            results["deberta"] = run_deberta_inference(text)
        except Exception as e:
             results["deberta"] = {"error": str(e)}

    # 3. Longformer (DÜZELTİLEN KISIM)
    if "longformer" in request.models:
        try:
            print("⏳ Running Longformer...")
            # Artık 'pass' değil, fonksiyonu çağırıyoruz:
            results["longformer"] = run_inference(text)
        except Exception as e:
            print(f"❌ Longformer Hatası: {e}")
            results["longformer"] = {"error": str(e)}

    return {"results": results}