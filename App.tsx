import React, { useState, useEffect } from 'react';
import { DashboardState, Stock } from './types';
import { analyzeStockWithGemini, fetchMarketSnapshot, scanMarketSector, NIFTY_200_TICKERS } from './services/geminiService';
import { AnalysisView } from './components/AnalysisView';
import { TrendingUp, Search, Loader2, PieChart, BarChart3, Info, RefreshCw, Sparkles, Filter, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<DashboardState>({
    stocks: [],
    selectedStock: null,
    analysis: null,
    loading: true,
    view: 'dashboard',
    scanMode: false,
    progress: 0,
    scanStatus: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);

  // Fetch initial market data
  useEffect(() => {
    loadMarketData();
  }, []);

  // Filter tickers for autocomplete
  useEffect(() => {
    if (searchQuery.length > 1) {
      const results = NIFTY_200_TICKERS.filter(ticker => 
        ticker.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5); // Limit to 5 suggestions
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadMarketData = async () => {
    setState(prev => ({ ...prev, loading: true, scanMode: false, progress: 0, scanStatus: 'Fetching Snapshot...' }));
    try {
      const stocks = await fetchMarketSnapshot();
      setState(prev => ({ ...prev, stocks, loading: false }));
    } catch (e) {
      console.error(e);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleScanForValue = async () => {
    setState(prev => ({ 
        ...prev, 
        loading: true, 
        scanMode: true, 
        progress: 0, 
        stocks: [], // Clear previous results
        scanStatus: 'Initializing Nifty 200 Scan...' 
    }));

    const sectors = [
        "Financial Services & Banking",
        "IT & Technology",
        "Automobile & Consumer Goods",
        "Energy, Power & Infrastructure",
        "Pharma & Healthcare"
    ];

    let allPicks: Stock[] = [];

    try {
        for (let i = 0; i < sectors.length; i++) {
            const sector = sectors[i];
            setState(prev => ({ 
                ...prev, 
                progress: Math.round((i / sectors.length) * 100),
                scanStatus: `Analyzing ${sector}...`
            }));

            const sectorPicks = await scanMarketSector(sector);
            allPicks = [...allPicks, ...sectorPicks];
        }

        // Sort by Conviction Score (descending)
        allPicks.sort((a, b) => (b.score || 0) - (a.score || 0));

        // Take Top 20
        const topPicks = allPicks.slice(0, 20);

        setState(prev => ({ 
            ...prev, 
            stocks: topPicks, 
            loading: false, 
            progress: 100,
            scanStatus: 'Scan Complete' 
        }));

    } catch (e) {
      console.error(e);
      alert("Scan failed. Please try again.");
      setState(prev => ({ ...prev, loading: false, scanMode: false }));
    }
  };

  const handleStockClick = async (stock: Stock) => {
    setState(prev => ({ ...prev, selectedStock: stock }));
    await analyzeStock(stock.symbol, stock.price, stock.sector);
  };

  const handleSearchSelect = async (ticker: string) => {
    setSearchQuery('');
    setSearchResults([]);
    // Create a temporary stock object. Price is 0 initially.
    const tempStock: Stock = { symbol: ticker, name: ticker, sector: 'Unknown', price: 0, changePercent: 0, marketCap: '' };
    setState(prev => ({ ...prev, selectedStock: tempStock }));
    await analyzeStock(ticker, 0, 'Unknown');
  };

  const analyzeStock = async (symbol: string, price: number, sector: string) => {
    setState(prev => ({ ...prev, loading: true, view: 'detail' }));
    
    try {
      const analysis = await analyzeStockWithGemini(symbol, price, sector);
      
      // Update selectedStock with actual details found by AI (Name, Price)
      setState(prev => ({
        ...prev,
        loading: false,
        analysis,
        selectedStock: { 
            ...prev.selectedStock!, 
            price: analysis.currentPrice || price || prev.selectedStock!.price,
            name: analysis.companyName || prev.selectedStock!.name,
            sector: prev.selectedStock?.sector === 'Unknown' ? 'Analysed' : prev.selectedStock!.sector
        }
      }));
    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, loading: false, view: 'dashboard' }));
      alert("Failed to analyze stock. Please check your API key.");
    }
  };

  const handleBack = () => {
    setState(prev => ({ ...prev, view: 'dashboard', selectedStock: null, analysis: null }));
  };

  const isLoadingList = state.loading && state.view === 'dashboard';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm backdrop-blur-md bg-opacity-90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between h-auto md:h-16 py-3 md:py-0 gap-3">
            <div className="flex items-center gap-2 cursor-pointer" onClick={handleBack}>
              <div className="bg-blue-600 p-2 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
                NiftyValuator AI
              </span>
            </div>
            
            {/* Search Bar */}
            {state.view === 'dashboard' && (
                <div className="relative flex-1 max-w-md mx-auto md:mx-0">
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search Nifty 200 (e.g. RELIANCE)..." 
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden">
                      {searchResults.map(ticker => (
                        <button
                          key={ticker}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors border-b border-slate-50 last:border-none"
                          onClick={() => handleSearchSelect(ticker)}
                        >
                          {ticker}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
            )}

            <div className="flex items-center gap-4 justify-end">
               {state.view === 'dashboard' && (
                 <button 
                    onClick={loadMarketData} 
                    className="p-2 text-slate-500 hover:text-blue-600 transition-colors"
                    title="Reset to Dashboard"
                 >
                    <RefreshCw className={`w-5 h-5`} />
                 </button>
               )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {state.loading && state.view === 'detail' ? (
           <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 animate-in fade-in duration-500">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-800">Deep Valuator Engine</h3>
                  <p className="text-slate-500">Retrieving live data for {state.selectedStock?.name || 'Ticker'}...</p>
                  <p className="text-xs text-slate-400 mt-2">Analyzing Intrinsic Value • Reading News • Checking Sector Peers</p>
              </div>
           </div>
        ) : state.view === 'detail' && state.selectedStock && state.analysis ? (
          <AnalysisView 
            stock={state.selectedStock} 
            analysis={state.analysis} 
            onBack={handleBack} 
          />
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Value Scout Hero */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -mr-20 -mt-20"></div>
                <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2">Find Mispriced Opportunities</h2>
                    <p className="text-indigo-200 mb-6 max-w-2xl">
                        Our AI scans 5 major sectors within the Nifty 200 universe to find high-quality stocks trading below their intrinsic value, prioritizing resilient sectors and strong momentum.
                    </p>
                    <button 
                        onClick={handleScanForValue}
                        disabled={state.loading}
                        className="flex items-center gap-2 bg-white text-indigo-900 px-6 py-3 rounded-full font-bold hover:bg-indigo-50 transition-all shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {state.loading && state.scanMode ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Sparkles className="w-5 h-5 text-indigo-600" />
                        )}
                        {state.loading && state.scanMode ? "Deep Scanning in Progress..." : "AI Scout: Deep Nifty 200 Scan"}
                    </button>
                </div>
            </div>

            {/* List Header */}
            <div className="flex items-center justify-between">
               <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  {state.scanMode ? (
                      <>
                        <Filter className="w-5 h-5 text-indigo-600" /> 
                        Deep Value Picks (Sorted by Conviction Score)
                      </>
                  ) : (
                      <>
                        <TrendingUp className="w-5 h-5 text-slate-600" /> 
                        Market Movers
                      </>
                  )}
               </h3>
               {state.scanMode && !state.loading && (
                   <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full flex items-center gap-1">
                       <CheckCircle2 className="w-3 h-3" /> Scan Complete
                   </span>
               )}
            </div>

            {/* Progress Bar & List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[300px]">
               {isLoadingList ? (
                   <div className="flex flex-col items-center justify-center h-64 p-8 max-w-lg mx-auto w-full">
                       {state.scanMode ? (
                           <div className="w-full space-y-4">
                               <div className="flex justify-between items-end">
                                   <h4 className="font-bold text-indigo-900 animate-pulse">{state.scanStatus}</h4>
                                   <span className="text-sm font-semibold text-indigo-600">{state.progress}%</span>
                               </div>
                               <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                   <div 
                                      className="bg-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
                                      style={{ width: `${state.progress}%` }}
                                   ></div>
                               </div>
                               <p className="text-xs text-slate-500 text-center pt-2">
                                   Analysing Financials, IT, Auto, Energy, and Pharma sectors...
                               </p>
                           </div>
                       ) : (
                           <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                <p className="text-sm text-slate-500">Fetching market snapshot...</p>
                           </div>
                       )}
                   </div>
               ) : state.stocks.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-64 space-y-3">
                       <Info className="w-8 h-8 text-slate-300" />
                       <p className="text-sm text-slate-500">No data found. Try scanning again.</p>
                   </div>
               ) : (
                   <div className="overflow-x-auto">
                       <table className="w-full text-left">
                           <thead className="bg-slate-50 border-b border-slate-200">
                               <tr>
                                   {state.scanMode && <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Rank</th>}
                                   <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                                   <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sector</th>
                                   <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                                   <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Change (1D)</th>
                                   {state.scanMode && <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Conviction & Reason</th>}
                                   <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                               {state.stocks.map((stock, index) => (
                                   <tr key={stock.symbol} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => handleStockClick(stock)}>
                                       {state.scanMode && (
                                            <td className="px-6 py-4 font-bold text-slate-400">
                                                #{index + 1}
                                            </td>
                                       )}
                                       <td className="px-6 py-4">
                                           <div>
                                               <p className="font-bold text-slate-900">{stock.symbol}</p>
                                               <p className="text-xs text-slate-500">{stock.name}</p>
                                           </div>
                                       </td>
                                       <td className="px-6 py-4">
                                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                               {stock.sector}
                                           </span>
                                       </td>
                                       <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                                           ₹{stock.price.toLocaleString()}
                                       </td>
                                       <td className={`px-6 py-4 text-sm font-semibold ${stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                           {stock.changePercent > 0 ? '+' : ''}{stock.changePercent}%
                                       </td>
                                       {state.scanMode && (
                                            <td className="px-6 py-4 text-sm text-slate-600 max-w-md">
                                                <div className="flex flex-col gap-1">
                                                    {stock.score && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                                                                <div className="h-full bg-green-500" style={{ width: `${stock.score}%`}}></div>
                                                            </div>
                                                            <span className="text-xs font-bold text-green-700">{stock.score}/100</span>
                                                        </div>
                                                    )}
                                                    <span className="text-xs opacity-90 line-clamp-2" title={stock.reason}>{stock.reason || 'High conviction value pick'}</span>
                                                </div>
                                            </td>
                                       )}
                                       <td className="px-6 py-4 text-right">
                                           <button className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                               Analyze <PieChart className="w-4 h-4" />
                                           </button>
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               )}
            </div>

             {/* Methodology Footer */}
             <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-start gap-3">
                 <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                 <div>
                     <h4 className="text-sm font-bold text-slate-700 mb-1">Deep Sector Scan Methodology</h4>
                     <p className="text-xs text-slate-500 leading-relaxed">
                         The Deep Scan iterates through 5 major market sectors to ensure full Nifty 200 coverage. 
                         The AI cross-references sector momentum, relative valuations (P/E, P/B), and intrinsic quality. 
                         Stocks are ranked by a "Conviction Score" derived from their Margin of Safety and Analyst Consensus.
                     </p>
                 </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;