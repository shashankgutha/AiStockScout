export enum ValuationMethod {
  DCF = 'Discounted Cash Flow',
  RELATIVE = 'Relative Valuation',
  GRAHAM = 'Graham Number'
}

export enum SentimentType {
  POSITIVE = 'Positive',
  NEUTRAL = 'Neutral',
  NEGATIVE = 'Negative'
}

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  changePercent: number;
  marketCap: string; // e.g., "12.5T"
  reason?: string; // Why this stock was picked by the scanner
  score?: number; // Conviction score for sorting
}

export interface ValuationMetric {
  method: ValuationMethod;
  value: number;
  details: string;
}

export interface Source {
  title: string;
  uri: string;
}

export interface StockAnalysis {
  companyName: string; // Validated full name
  currentPrice: number; // Validated current price
  intrinsicValue: number;
  marginOfSafety: number; // Percentage
  recommendation: 'BUY' | 'HOLD' | 'SELL';
  valuationMetrics: ValuationMetric[];
  sentimentScore: number; // -100 to 100
  sentimentLabel: SentimentType;
  sentimentSummary: string;
  sectorMomentum: string; // Description of sector trend
  strengths: string[];
  risks: string[];
  sources: Source[];
}

export interface DashboardState {
  stocks: Stock[];
  selectedStock: Stock | null;
  analysis: StockAnalysis | null;
  loading: boolean;
  view: 'dashboard' | 'detail';
  scanMode: boolean; // Tracking if we are in scan mode
  progress: number; // 0 to 100
  scanStatus: string; // "Analyzing IT Sector..."
}