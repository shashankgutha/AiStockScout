import React from 'react';
import { Stock, StockAnalysis, SentimentType } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ReferenceLine, Cell 
} from 'recharts';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Newspaper, Activity, ExternalLink } from 'lucide-react';

interface AnalysisViewProps {
  stock: Stock;
  analysis: StockAnalysis;
  onBack: () => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ stock, analysis, onBack }) => {
  const chartData = [
    { name: 'Market Price', value: stock.price, type: 'Market' },
    ...analysis.valuationMetrics.map(m => ({
      name: m.method.split(' ')[0], // Short name
      value: m.value,
      type: 'Model',
      details: m.details
    })),
    { name: 'Intrinsic Avg', value: analysis.intrinsicValue, type: 'Target' }
  ];

  const getSentimentColor = (label: SentimentType) => {
    switch(label) {
      case SentimentType.POSITIVE: return 'text-green-600 bg-green-50 border-green-200';
      case SentimentType.NEGATIVE: return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-200 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {stock.name} <span className="text-lg font-normal text-slate-500">({stock.symbol})</span>
          </h1>
          <p className="text-slate-500">
            {stock.sector} • <span className="font-semibold text-slate-800">{stock.price > 0 ? `₹${stock.price.toLocaleString()}` : 'Price updating...'}</span>
          </p>
        </div>
        <div className="ml-auto flex gap-3">
             <div className={`px-4 py-2 rounded-lg font-bold border ${analysis.marginOfSafety > 0 ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}>
                {analysis.marginOfSafety > 0 ? 'Undervalued' : 'Overvalued'} by {Math.abs(analysis.marginOfSafety).toFixed(1)}%
             </div>
             <div className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold">
                Rec: {analysis.recommendation}
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Valuation Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" /> Valuation Models vs Market Price
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip 
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Value']}
                />
                <ReferenceLine y={stock.price} stroke="#94a3b8" strokeDasharray="3 3" label="Current Price" />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.type === 'Market' ? '#94a3b8' : entry.type === 'Target' ? '#2563eb' : '#60a5fa'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {analysis.valuationMetrics.map((m, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase">{m.method}</p>
                    <p className="text-lg font-bold text-slate-800">₹{m.value.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1">{m.details}</p>
                </div>
            ))}
          </div>
        </div>

        {/* Sentiment & Sector Analysis */}
        <div className="space-y-6">
            
            {/* Sentiment Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Newspaper className="w-5 h-5 text-purple-600" /> News Sentiment
                </h3>
                <div className={`p-4 rounded-lg border mb-4 flex items-center justify-between ${getSentimentColor(analysis.sentimentLabel)}`}>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase opacity-70">Verdict</span>
                        <span className="font-bold text-lg">{analysis.sentimentLabel}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-bold uppercase opacity-70">Score</span>
                        <span className="text-2xl font-black tracking-tight">{analysis.sentimentScore > 0 ? '+' : ''}{analysis.sentimentScore}</span>
                    </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                    {analysis.sentimentSummary}
                </p>
            </div>

            {/* Sector Momentum */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    {analysis.sectorMomentum.includes("Outperforming") || analysis.sectorMomentum.includes("Positive") ? <TrendingUp className="w-5 h-5 text-green-600"/> : <TrendingDown className="w-5 h-5 text-red-600"/>}
                    Sector Trend
                </h3>
                <p className="text-sm text-slate-600">
                    {analysis.sectorMomentum}
                </p>
            </div>
        </div>
      </div>

      {/* SWOT-like Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="text-md font-bold text-slate-800 mb-3 flex items-center gap-2">
                 <CheckCircle className="w-5 h-5 text-green-500" /> Key Strengths
             </h3>
             <ul className="space-y-2">
                 {analysis.strengths.map((s, i) => (
                     <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0"></span> {s}
                     </li>
                 ))}
             </ul>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="text-md font-bold text-slate-800 mb-3 flex items-center gap-2">
                 <AlertTriangle className="w-5 h-5 text-amber-500" /> Potential Risks
             </h3>
             <ul className="space-y-2">
                 {analysis.risks.map((s, i) => (
                     <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0"></span> {s}
                     </li>
                 ))}
             </ul>
         </div>
      </div>

      {/* Sources / Citations */}
      {analysis.sources && analysis.sources.length > 0 && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Data Sources & Citations</h4>
              <div className="flex flex-wrap gap-2">
                  {analysis.sources.map((source, i) => (
                      <a 
                        key={i} 
                        href={source.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs text-blue-600 hover:text-blue-800 hover:border-blue-200 transition-colors"
                      >
                          {source.title.length > 30 ? source.title.substring(0, 30) + '...' : source.title}
                          <ExternalLink className="w-3 h-3" />
                      </a>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};