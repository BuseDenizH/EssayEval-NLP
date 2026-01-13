import { useState } from 'react';
import axios from 'axios';
import { Info, Upload, FileText, Trash2, MessageSquare } from 'lucide-react'; // Yeni ikon ekledik

export default function Dashboard() {
  const [topic, setTopic] = useState(""); // Konu başlığı için yeni state
  const [essay, setEssay] = useState("");
  const [selectedModel, setSelectedModel] = useState("mpnet");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Dosya Yükleme Fonksiyonu
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setEssay(e.target.result);
    };
    reader.readAsText(file);
  };

  const handleGrade = async () => {
    if (!essay) return alert("Please enter an essay first!");
    setLoading(true);
    setResult(null);

    try {
      // Backend'e sadece essay ve model gidiyor (Topic şimdilik görsel)
      const response = await axios.post('http://127.0.0.1:8001/predict', {
        essay: essay,
        models: [selectedModel]
      });

      const data = response.data.results[selectedModel];
      
      if (data.error) {
        alert("Model Error: " + data.error);
      } else {
        setResult(data);
      }
      
    } catch (error) {
      console.error("Error:", error);
      alert("Connection Error! Is Backend (port 8001) running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">E</div>
            <h1 className="text-xl font-bold text-gray-700">EssayEval <span className="text-gray-400 font-normal">| Teacher Panel</span></h1>
        </div>
        <button className="text-gray-400 hover:text-blue-500"><Info /></button>
      </div>

      {/* Main Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        
        {/* YENİ ALAN: Essay Topic Input */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Essay Topic / Question</label>
            <div className="relative">
                <div className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400">
                    <MessageSquare size={18} />
                </div>
                <input 
                    type="text" 
                    className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-700 placeholder-gray-400 transition"
                    placeholder="e.g., Discuss the advantages and disadvantages of technology..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                />
            </div>
        </div>

        {/* Essay Input Area */}
        <div>
            <div className="flex justify-between items-end mb-2">
                <label className="block text-sm font-medium text-gray-700">Student Answer</label>
                
                {/* Dosya Yükleme ve Temizleme */}
                <div className="flex gap-2">
                    {essay && (
                        <button 
                            onClick={() => setEssay("")}
                            className="text-xs text-red-500 flex items-center gap-1 hover:text-red-700 transition"
                        >
                            <Trash2 size={14}/> Clear Text
                        </button>
                    )}
                    <label className="cursor-pointer bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-md flex items-center gap-2 transition select-none">
                        <Upload size={14} />
                        Upload File (.txt)
                        <input 
                            type="file" 
                            accept=".txt" 
                            onChange={handleFileUpload} 
                            className="hidden" 
                        />
                    </label>
                </div>
            </div>

            <div className="relative">
                <textarea 
                    className="w-full h-64 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none font-normal text-gray-700 leading-relaxed"
                    placeholder="Paste the student's essay here..."
                    value={essay}
                    onChange={(e) => setEssay(e.target.value)}
                ></textarea>
                {!essay && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-300 pointer-events-none flex flex-col items-center">
                        <FileText size={48} opacity={0.5} />
                    </div>
                )}
            </div>
        </div>

        {/* Model Selection */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select AI Model</label>
            <div className="flex gap-3">
                {['mpnet', 'longformer', 'deberta'].map((m) => (
                    <button 
                        key={m}
                        onClick={() => setSelectedModel(m)}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition uppercase tracking-wide border ${
                            selectedModel === m 
                                ? 'bg-gray-800 text-white border-gray-800 shadow-lg shadow-gray-200' 
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {m}
                    </button>
                ))}
            </div>
        </div>

        {/* Grade Button */}
        <button 
            onClick={handleGrade}
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-70 flex justify-center items-center gap-2 active:scale-[0.99]"
        >
            {loading ? (
                <>
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    Evaluating...
                </>
            ) : "Evaluate Essay"}
        </button>

        {/* Results Area */}
        {result && (
            <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 animate-pulse-once shadow-sm">
                <div className="text-center mb-6">
                    <span className="text-blue-400 text-xs uppercase tracking-widest font-bold">Overall Band Score</span>
                    <div className="text-7xl font-black text-blue-900 mt-2 tracking-tighter">{result.overall}</div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden mb-2 mx-4">
                    <div 
                        className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-1000 ease-out rounded-full"
                        style={{ width: `${(result.overall / 9) * 100}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 font-mono mb-8 px-4">
                    <span>0.0</span><span>9.0</span>
                </div>

                {/* Detailed Criteria Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <ScoreCard title="Task Response" score={result.criteria.task_response} />
                    <ScoreCard title="Coherence & Cohesion" score={result.criteria.coherence} />
                    <ScoreCard title="Lexical Resource" score={result.criteria.lexical} />
                    <ScoreCard title="Grammar Range" score={result.criteria.grammar} />
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

// Küçük bir yardımcı bileşen (Kod tekrarını önlemek için)
function ScoreCard({ title, score }) {
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:border-blue-200 transition">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1 text-center">{title}</span>
            <b className="text-2xl text-gray-800">{score}</b>
        </div>
    );
}