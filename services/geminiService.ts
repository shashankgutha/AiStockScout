import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Stock, StockAnalysis, SentimentType, ValuationMethod, Source } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const NIFTY_200_TICKERS = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HINDUNILVR", "ITC", "SBIN", "BHARTIARTL", "LICI",
  "LT", "BAJFINANCE", "HCLTECH", "KOTAKBANK", "AXISBANK", "ASIANPAINT", "TITAN", "MARUTI", "SUNPHARMA", "ULTRACEMCO",
  "NTPC", "TATAMOTORS", "ADANIENT", "ONGC", "POWERGRID", "TATASTEEL", "M&M", "ADANIPORTS", "COALINDIA", "BAJAJFINSV",
  "SIEMENS", "DMART", "NESTLEIND", "JSWSTEEL", "ADANIGREEN", "GRASIM", "PIDILITIND", "ZOMATO", "LTIM", "DLF",
  "TRENT", "VBL", "HAL", "IOC", "BEL", "HINDALCO", "EICHERMOT", "INDUSINDBK", "GODREJCP", "CIPLA",
  "BPCL", "BRITANNIA", "TECHM", "WIPRO", "ADANIPOWER", "TATACONSUM", "DRREDDY", "ABB", "BANKBARODA", "AMBUJACEM",
  "VEDL", "INDIGO", "TVSMOTOR", "GAIL", "DIVISLAB", "HAVELLS", "PNB", "APOLLOHOSP", "CHOLAFIN", "SHREECEM",
  "CANBK", "DABUR", "JIOFIN", "BAJAJ-AUTO", "BOSCHLTD", "TATACHEM", "SRF", "MUTHOOTFIN", "BERGEPAINT", "MARICO",
  "NAUKRI", "PIIND", "UPL", "SBICARD", "ICICIGI", "ICICIPRULI", "TIINDIA", "HEROMOTOCO", "ASHOKLEY", "ASTRAL",
  "ALKEM", "PERSISTENT", "POLYCAB", "MRF", "IRCTC", "LTTS", "PAGEIND", "ACC", "COLPAL", "PETRONET"
];

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    companyName: { type: Type.STRING, description: "The official full name of the company" },
    currentPrice: { type: Type.NUMBER, description: "The real-time market price found in the context or known data" },
    intrinsicValue: { type: Type.NUMBER, description: "The calculated average intrinsic value in INR" },
    marginOfSafety: { type: Type.NUMBER, description: "The percentage difference between intrinsic value and market price (positive means undervalued)" },
    recommendation: { type: Type.STRING, enum: ["BUY", "HOLD", "SELL"] },
    valuationMetrics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          method: { type: Type.STRING, enum: [ValuationMethod.DCF, ValuationMethod.RELATIVE, ValuationMethod.GRAHAM] },
          value: { type: Type.NUMBER, description: "The estimated value per share using this method" },
          details: { type: Type.STRING, description: "Short explanation of the calculation (e.g. 'Based on 12% growth')" }
        }
      }
    },
    sentimentScore: { type: Type.NUMBER, description: "A score from -100 (Negative) to 100 (Positive)" },
    sentimentLabel: { type: Type.STRING, enum: [SentimentType.POSITIVE, SentimentType.NEUTRAL, SentimentType.NEGATIVE] },
    sentimentSummary: { type: Type.STRING, description: "A summary of recent news and sentiment drivers" },
    sectorMomentum: { type: Type.STRING, description: "Analysis of the sector's recent performance vs Nifty 50" },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key fundamental strengths" },
    risks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key risks to the valuation" }
  },
  required: ["companyName", "currentPrice", "intrinsicValue", "marginOfSafety", "recommendation", "valuationMetrics", "sentimentScore", "sentimentSummary", "sectorMomentum", "strengths", "risks"]
};

// --- Scanners and Search ---

export const scanMarketSector = async (sectorName: string): Promise<Stock[]> => {
  if (!apiKey) return [];

  const prompt = `
    Act as a senior portfolio manager specializing in Value Investing.
    Target Universe: Nifty 200 Stocks in the **${sectorName}** sector.
    Current Date: ${new Date().toDateString()}.
    
    OBJECTIVE: Identify up to 4 "High Conviction" undervalued stocks specifically within ${sectorName}.

    INSTRUCTIONS:
    1. **Search & Verify**: Use Google Search to find *recent* valuations and sector trends for ${sectorName} in India.
    2. **Selection Criteria**:
       - Must be in ${sectorName}.
       - Must be trading below intrinsic value.
       - Prefer stocks with positive sector momentum or "best in class" resilience.
    3. **Scoring**: Assign a "Conviction Score" (0-100) based on margin of safety + quality.
    4. **Data**: Get real-time Price and Change %.

    Output STRICTLY in CSV format (NO markdown, NO headers).
    Format: SYMBOL,NAME,SECTOR,PRICE,CHANGE_PERCENT,MARKET_CAP,CONVICTION_SCORE,REASON
    
    Example:
    HDFCBANK,HDFC Bank,Financials,1450.00,-0.5,11.5T,92,Sector leader available at historical low valuations.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2
      }
    });

    return parseStockCSV(response.text || '');
  } catch (error) {
    console.error(`Scanner failed for ${sectorName}:`, error);
    return [];
  }
};

export const fetchMarketSnapshot = async (): Promise<Stock[]> => {
  if (!apiKey) return [];

  // Standard snapshot of key market movers
  const prompt = `
    Fetch the latest real-time stock market data for these key Nifty 50 stocks:
    Reliance, TCS, HDFC Bank, Infosys, ITC, Tata Motors, L&T, SBI.

    For each, find: Price, Change %, Market Cap, Sector.
    
    Output STRICTLY in CSV format (NO markdown, NO headers).
    Format: SYMBOL,NAME,SECTOR,PRICE,CHANGE_PERCENT,MARKET_CAP
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    return parseStockCSV(response.text || '');
  } catch (error) {
    console.error("Snapshot failed:", error);
    return [];
  }
};

// Helper to parse the CSV output from Gemini
const parseStockCSV = (text: string): Stock[] => {
  const lines = text.split('\n').filter(line => line.includes(','));
  const stocks: Stock[] = [];

  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length >= 6) {
      const clean = (s: string) => s ? s.replace(/['"]/g, '').trim() : '';
      const price = parseFloat(clean(parts[3]));
      const change = parseFloat(clean(parts[4]));
      
      if (!isNaN(price)) {
          stocks.push({
              symbol: clean(parts[0]),
              name: clean(parts[1]),
              sector: clean(parts[2]),
              price: price,
              changePercent: isNaN(change) ? 0 : change,
              marketCap: clean(parts[5]),
              score: parts[6] ? parseInt(clean(parts[6])) : 0,
              reason: parts[7] ? clean(parts[7]) : (parts[6] && isNaN(parseInt(parts[6])) ? clean(parts[6]) : undefined)
          });
      }
    }
  }
  return stocks;
};

// --- Analysis Logic ---

export const analyzeStockWithGemini = async (symbol: string, currentPrice: number, sector: string): Promise<StockAnalysis> => {
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  // Step 1: Gather Intelligence using Google Search
  // Explicitly ask for price if it's missing (0)
  const priceRequest = currentPrice === 0 
    ? "Find the latest real-time market price in INR." 
    : `Current Price reference is ₹${currentPrice}.`;

  const searchPrompt = `
    Act as a senior equity analyst. Gather the latest live data for ${symbol} (${sector}) needed for a valuation report.
    Current Date: ${new Date().toDateString()}.
    
    Find the following:
    1. ${priceRequest}
    2. Latest News & Headlines (for Sentiment Analysis).
    3. Current 10-year Indian Government Bond Yield.
    4. Sector P/E and P/B ratios for ${sector} in India.
    5. Analyst consensus or price targets if available.
  `;

  let searchContext = "";
  let sources: Source[] = [];

  try {
    const searchResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    searchContext = searchResponse.text || "No specific search data found.";
    
    // Extract sources
    const chunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    sources = chunks
      .map(chunk => chunk.web)
      .filter((web): web is { title: string; uri: string } => !!web)
      .map(web => ({ title: web.title || 'Source', uri: web.uri || '#' }));
      
  } catch (err) {
    console.warn("Search step failed, proceeding with internal knowledge:", err);
    searchContext = "Search unavailable. Use internal knowledge base.";
  }

  // Step 2: Valuation Analysis
  const analysisPrompt = `
    Perform a comprehensive financial valuation and sentiment analysis for: ${symbol}.
    ${currentPrice > 0 ? `Market Price: ₹${currentPrice}` : "Market Price: Unknown (EXTRACT FROM CONTEXT)"}
    
    Use the following gathered context for real-time data integration:
    """
    ${searchContext}
    """

    Tasks:
    1. **Identify Data**:
       - Extract the full official Company Name.
       - Extract the Current Market Price from the context. If multiple prices exist, use the most recent/live one.
    
    2. **Valuation**:
       - Calculate DCF (use reasonable growth assumptions based on context).
       - Relative Valuation (compare vs sector peers found in context).
       - Graham Number.
       - Determine Intrinsic Value.
    
    3. **Sentiment**:
       - Analyze the news in the context.
       - Assign sentiment score (-100 to 100).
    
    4. **Output**:
       - Strictly adhere to the JSON schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: analysisPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.3,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const analysis = JSON.parse(text) as StockAnalysis;
    analysis.sources = sources;
    
    return analysis;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};