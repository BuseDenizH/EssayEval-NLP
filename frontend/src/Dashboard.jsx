import { useState, useRef } from 'react';
import axios from 'axios';
import { Info, Upload, FileText, Trash2, MessageSquare, Download, FileSpreadsheet, FileDown, BarChart3, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Model renkleri
const MODEL_COLORS = {
  mpnet: '#3B82F6',      // blue
  deberta: '#10B981',    // green
  longformer: '#F59E0B'  // amber
};

const MODEL_NAMES = {
  mpnet: 'MPNet',
  deberta: 'DeBERTa',
  longformer: 'Longformer'
};

export default function Dashboard() {
  const [topic, setTopic] = useState("");
  const [essay, setEssay] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [inferenceTime, setInferenceTime] = useState(null);
  const resultsRef = useRef(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setEssay(e.target.result);
    reader.readAsText(file);
  };

  const handleBenchmark = async () => {
    if (!essay) return alert("Please enter an essay first!");
    setLoading(true);
    setResults(null);

    const startTime = performance.now();

    try {
      const response = await axios.post('http://127.0.0.1:8001/predict', {
        essay: essay,
        models: ['mpnet', 'deberta', 'longformer']
      });

      const endTime = performance.now();
      setInferenceTime(((endTime - startTime) / 1000).toFixed(2));
      setResults(response.data.results);

    } catch (error) {
      console.error("Error:", error);
      alert("Connection Error! Is Backend (port 8001) running?");
    } finally {
      setLoading(false);
    }
  };

  // Bar Chart verisi
  const getBarChartData = () => {
    if (!results) return [];
    return Object.keys(results).filter(m => !results[m].error).map(model => ({
      name: MODEL_NAMES[model],
      overall: results[model].overall,
      fill: MODEL_COLORS[model]
    }));
  };

  // Radar Chart verisi
  const getRadarChartData = () => {
    if (!results) return [];
    const criteria = ['task_response', 'coherence', 'lexical', 'grammar'];
    const labels = ['Task Response', 'Coherence', 'Lexical', 'Grammar'];

    return criteria.map((c, i) => {
      const data = { criteria: labels[i] };
      Object.keys(results).forEach(model => {
        if (!results[model].error) {
          data[model] = results[model].criteria[c];
        }
      });
      return data;
    });
  };

  // Karşılaştırma tablosu verisi
  const getComparisonData = () => {
    if (!results) return [];
    return Object.keys(results).filter(m => !results[m].error).map(model => ({
      model: MODEL_NAMES[model],
      modelKey: model,
      overall: results[model].overall,
      task_response: results[model].criteria.task_response,
      coherence: results[model].criteria.coherence,
      lexical: results[model].criteria.lexical,
      grammar: results[model].criteria.grammar
    }));
  };

  // PDF Export
  const exportToPDF = async () => {
    if (!resultsRef.current) return;

    const canvas = await html2canvas(resultsRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Header
    pdf.setFontSize(20);
    pdf.setTextColor(30, 64, 175);
    pdf.text('EssayEval - Benchmark Report', 15, 20);

    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 15, 28);
    if (topic) pdf.text(`Topic: ${topic}`, 15, 34);

    // Results image
    pdf.addImage(imgData, 'PNG', 10, 45, pdfWidth - 20, pdfHeight * 0.8);

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text('EssayEval NLP - Gebze Technical University', 15, pdf.internal.pageSize.getHeight() - 10);

    pdf.save(`benchmark-report-${Date.now()}.pdf`);
  };

  // Excel Export
  const exportToExcel = () => {
    if (!results) return;

    const data = getComparisonData();

    // Ana veri
    const wsData = [
      ['EssayEval - Benchmark Results'],
      [`Date: ${new Date().toLocaleString()}`],
      [`Topic: ${topic || 'N/A'}`],
      [`Inference Time: ${inferenceTime}s`],
      [],
      ['Model', 'Overall', 'Task Response', 'Coherence', 'Lexical', 'Grammar'],
      ...data.map(d => [d.model, d.overall, d.task_response, d.coherence, d.lexical, d.grammar])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Sütun genişlikleri
    ws['!cols'] = [
      { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 10 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Benchmark Results');

    // İstatistikler sayfası
    const statsData = [
      ['Model Statistics'],
      [],
      ['Model', 'MAE', 'Best For'],
      ['DeBERTa', '0.84', 'Overall Accuracy'],
      ['Longformer', '0.92', 'Long Essays (1024 tokens)'],
      ['MPNet', '0.94', 'Fast Inference']
    ];
    const wsStats = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, wsStats, 'Model Stats');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `benchmark-results-${Date.now()}.xlsx`);
  };

  // CSV Export
  const exportToCSV = () => {
    if (!results) return;

    const data = getComparisonData();
    const headers = ['Model', 'Overall', 'Task Response', 'Coherence', 'Lexical', 'Grammar'];
    const csvContent = [
      headers.join(','),
      ...data.map(d => [d.model, d.overall, d.task_response, d.coherence, d.lexical, d.grammar].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `benchmark-results-${Date.now()}.csv`);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">E</div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">EssayEval <span className="text-blue-600">Benchmark</span></h1>
            <p className="text-xs text-gray-400">Model Performance Comparison Tool</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">3 Models Ready</span>
          <button className="text-gray-400 hover:text-blue-500"><Info size={20}/></button>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5 mb-6">
        {/* Topic */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Essay Topic / Question</label>
          <div className="relative">
            <div className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400">
              <MessageSquare size={18} />
            </div>
            <input
              type="text"
              className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-700"
              placeholder="e.g., Discuss the advantages and disadvantages of technology..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
        </div>

        {/* Essay Input */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <label className="block text-sm font-medium text-gray-700">Student Essay</label>
            <div className="flex gap-2">
              {essay && (
                <button onClick={() => setEssay("")} className="text-xs text-red-500 flex items-center gap-1 hover:text-red-700">
                  <Trash2 size={14}/> Clear
                </button>
              )}
              <label className="cursor-pointer bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-md flex items-center gap-2">
                <Upload size={14} />
                Upload .txt
                <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>
          <div className="relative">
            <textarea
              className="w-full h-48 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none text-gray-700"
              placeholder="Paste the student's essay here..."
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
            />
            {!essay && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                <FileText size={48} opacity={0.5} />
              </div>
            )}
          </div>
        </div>

        {/* Benchmark Button */}
        <button
          onClick={handleBenchmark}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition shadow-lg shadow-blue-200 disabled:opacity-70 flex justify-center items-center gap-3"
        >
          {loading ? (
            <>
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
              Running Benchmark...
            </>
          ) : (
            <>
              <BarChart3 size={22} />
              Run Benchmark (All 3 Models)
            </>
          )}
        </button>
      </div>

      {/* Results Section */}
      {results && (
        <div ref={resultsRef} className="space-y-6">
          {/* Export Buttons */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock size={16} />
              <span>Total inference time: <b className="text-gray-700">{inferenceTime}s</b></span>
            </div>
            <div className="flex gap-2">
              <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium">
                <Download size={16} /> PDF
              </button>
              <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm font-medium">
                <FileSpreadsheet size={16} /> Excel
              </button>
              <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium">
                <FileDown size={16} /> CSV
              </button>
            </div>
          </div>

          {/* Model Comparison Cards */}
          <div className="grid grid-cols-3 gap-4">
            {Object.keys(results).filter(m => !results[m].error).map(model => (
              <div key={model} className="bg-white p-5 rounded-2xl shadow-sm border-2 hover:shadow-md transition" style={{ borderColor: MODEL_COLORS[model] + '40' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: MODEL_COLORS[model] }}></div>
                  <span className="font-bold text-gray-700">{MODEL_NAMES[model]}</span>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-black mb-2" style={{ color: MODEL_COLORS[model] }}>
                    {results[model].overall}
                  </div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Overall Band</div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 p-2 rounded-lg text-center">
                    <div className="text-gray-400">Task</div>
                    <div className="font-bold text-gray-700">{results[model].criteria.task_response}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg text-center">
                    <div className="text-gray-400">Coherence</div>
                    <div className="font-bold text-gray-700">{results[model].criteria.coherence}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg text-center">
                    <div className="text-gray-400">Lexical</div>
                    <div className="font-bold text-gray-700">{results[model].criteria.lexical}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg text-center">
                    <div className="text-gray-400">Grammar</div>
                    <div className="font-bold text-gray-700">{results[model].criteria.grammar}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-500" />
                Overall Score Comparison
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={getBarChartData()} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 9]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    formatter={(value) => [value, 'Band Score']}
                  />
                  <Bar dataKey="overall" radius={[8, 8, 0, 0]}>
                    {getBarChartData().map((entry, index) => (
                      <rect key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Radar Chart */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                Criteria Comparison (Radar)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={getRadarChartData()}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="criteria" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 9]} tick={{ fontSize: 10 }} />
                  {Object.keys(results).filter(m => !results[m].error).map(model => (
                    <Radar
                      key={model}
                      name={MODEL_NAMES[model]}
                      dataKey={model}
                      stroke={MODEL_COLORS[model]}
                      fill={MODEL_COLORS[model]}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Comparison Table */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4">Detailed Comparison Table</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Model</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">Overall</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">Task Response</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">Coherence</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">Lexical</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600">Grammar</th>
                  </tr>
                </thead>
                <tbody>
                  {getComparisonData().map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: MODEL_COLORS[row.modelKey] }}></div>
                          <span className="font-medium text-gray-700">{row.model}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4 font-bold" style={{ color: MODEL_COLORS[row.modelKey] }}>{row.overall}</td>
                      <td className="text-center py-3 px-4 text-gray-600">{row.task_response}</td>
                      <td className="text-center py-3 px-4 text-gray-600">{row.coherence}</td>
                      <td className="text-center py-3 px-4 text-gray-600">{row.lexical}</td>
                      <td className="text-center py-3 px-4 text-gray-600">{row.grammar}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Model Info Cards */}
          <div className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-2xl border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4">Model Specifications</h3>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="bg-white p-4 rounded-xl border border-blue-100">
                <div className="font-bold text-blue-600 mb-2">MPNet</div>
                <div className="text-gray-500 space-y-1">
                  <div>Max Tokens: <b>512</b></div>
                  <div>MAE: <b>0.94</b></div>
                  <div>Best for: <b>Fast inference</b></div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-green-100">
                <div className="font-bold text-green-600 mb-2">DeBERTa</div>
                <div className="text-gray-500 space-y-1">
                  <div>Max Tokens: <b>512</b></div>
                  <div>MAE: <b>0.84</b></div>
                  <div>Best for: <b>Accuracy</b></div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-amber-100">
                <div className="font-bold text-amber-600 mb-2">Longformer</div>
                <div className="text-gray-500 space-y-1">
                  <div>Max Tokens: <b>1024</b></div>
                  <div>MAE: <b>0.92</b></div>
                  <div>Best for: <b>Long essays</b></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
