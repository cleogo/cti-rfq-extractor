// types.ts — all data shapes for the CTI RFQ Extractor
// Every other file imports from here. Change a type here, it updates everywhere.

export type FlagCode =
  | 'UNMATCHED_SKU'
  | 'AMBIGUOUS_MATCH'
  | 'MISSING_QUANTITY'
  | 'PRICE_MISMATCH'
  | 'WRONG_WAREHOUSE';

// One product from CTI's catalog
export interface CatalogItem {
  sku: string;           // e.g. FIR-001-10LBS
  name: string;          // e.g. FIRE EXTINGUISHER DRY CHEMICAL
  retailPrice: number;   // in PHP
  warehouse: 'Warehouse A' | 'Warehouse B';
}

// One line extracted from a raw order message
export interface OrderLine {
  rawText: string;                          // the original text from the order
  matchedSku: string | null;               // SKU from catalog, null if no match
  matchedName: string | null;              // product name from catalog
  quantity: number | null;                 // extracted quantity, null if missing
  unitPrice: number | null;               // catalog price in PHP
  lineTotal: number | null;               // quantity × unitPrice
  warehouse: 'Warehouse A' | 'Warehouse B' | null;
  flags: FlagCode[];                       // list of problems found
  flagReasons: string[];                   // plain-language explanation per flag
  acknowledged: boolean;                   // coordinator confirmed they saw this
}

// Summary totals for the whole order
export interface OrderSummary {
  totalLines: number;
  flaggedLines: number;
  grandTotal: number | null;  // null if any line has missing quantity/price
  currency: 'PHP';
  requestedTerms: string | null;
  requestedDelivery: string | null;
}

// The full result returned by /api/extract
export interface ExtractionResult {
  extractedLines: OrderLine[];
  orderSummary: OrderSummary;
  status: 'READY' | 'NEEDS_REVIEW';
}

// What the browser sends to /api/extract
export interface ExtractRequest {
  rawText: string;
}
