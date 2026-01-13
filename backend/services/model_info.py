MODEL_INFO = {
    "deberta": {
        "description": "DeBERTa captures long-range dependencies and contextual relationships.",
        "metrics": {
            "MAE": 0.84,
            "MSE": 1.23
        }
    },
    "mpnet": {
        "description": "MPNet combines masked and permuted language modeling.",
        "metrics": {
            "MAE": 0.94,
            "RMSE": 1.17,
            "Pearson": 0.59
        }
    },
    "longformer": {
        "description": "Longformer efficiently processes long texts beyond 512 tokens.",
        "metrics": {
            "MAE": 0.92,
            "EvalLoss": 1.32
        }
    }
}

def get_model_info(name: str):
    return MODEL_INFO.get(name.lower())
