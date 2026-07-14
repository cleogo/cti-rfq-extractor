// page.tsx — the main UI for the CTI RFQ Extractor
// The coordinator pastes an order, clicks Extract, reviews flags, then exports.

'use client';

import { useState } from 'react';
import { ExtractionResult, OrderLine } from '@/lib/types';

// Flag badge colors
const FLAG_COLORS: Record<string, string> = {
  UNMATCHED_SKU: 'bg-red-100 text-red-700 border-red-300',
  AMBIGUOUS_MATCH: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  MISSING_QUANTITY: 'bg-orange-100 text-orange-700 border-orange-300',
  PRICE_MISMATCH: 'bg-purple-100 text-purple-700 border-purple-300',
  WRONG_WAREHOUSE: 'bg-blue-100 text-blue-700 border-blue-300',
};

export default function Home() {
  const [rawText, setRawText] = useState('');
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<OrderLine[]>([]);

  // Send order text to the server route and get structured result
  async function handleExtract() {
    if (!rawText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        return;
      }

      setResult(data);
      // Reset acknowledged state for new result
      setLines(data.extractedLines.map((l: OrderLine) => ({
        ...l,
        acknowledged: false,
      })));
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  // Mark a flagged line as acknowledged by the coordinator
  function acknowledgeLine(index: number) {
    setLines(prev =>
      prev.map((l, i) => i === index ? { ...l, acknowledged: true } : l)
    );
  }

  // Check if all flagged lines have been acknowledged
  const allAcknowledged = lines.every(
    l => l.flags.length === 0 || l.acknowledged
  );

  // Export clean order summary as CSV
  function handleExport() {
    if (!result || !allAcknowledged) return;

    const headers = ['Item', 'SKU', 'Qty', 'Unit Price (PHP)', 'Line Total (PHP)', 'Warehouse'];
    const rows = lines.map(l => [
      l.matchedName ?? l.rawText,
      l.matchedSku ?? 'UNMATCHED',
      l.quantity ?? '',
      l.unitPrice ? `₱${l.unitPrice.toFixed(2)}` : '',
      l.lineTotal ? `₱${l.lineTotal.toFixed(2)}` : '',
      l.warehouse ?? 'Unknown',
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CTI_Order_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              CTI RFQ Extractor
            </h1>
            <p className="text-sm text-gray-500">
              CAN Trading Incorporated — Order Validation Tool
            </p>
          </div>
          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
            Decision Support Only — Human Review Required
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Input Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Paste Order Message
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Paste any order from email, Viber, SMS, or chat. Any format works.
          </p>
          <textarea
            className="w-full h-40 border border-gray-300 rounded-lg p-3 text-sm text-gray-800 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
            placeholder={`Example:\n"Hi! Order po namin: 10 pcs fire extinguisher 10lbs, 5 pcs N95 mask. Terms: Net 30. Need by Friday."`}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-400">
              {rawText.length} characters
            </span>
            <button
              onClick={handleExtract}
              disabled={loading || !rawText.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 
                         text-white text-sm font-semibold px-6 py-2 rounded-lg
                         transition-colors duration-150"
            >
              {loading ? 'Extracting...' : 'Extract Order'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="text-gray-500 text-sm animate-pulse">
              Reading order and matching to CTI catalog...
            </div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <>
            {/* Order Summary Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {result.orderSummary.totalLines}
                    </div>
                    <div className="text-xs text-gray-500">Line Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-500">
                      {result.orderSummary.flaggedLines}
                    </div>
                    <div className="text-xs text-gray-500">Flags</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {result.orderSummary.grandTotal
                        ? `₱${result.orderSummary.grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </div>
                    <div className="text-xs text-gray-500">Grand Total</div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-xs text-gray-500">
                  {result.orderSummary.requestedTerms && (
                    <span>📋 Terms: {result.orderSummary.requestedTerms}</span>
                  )}
                  {result.orderSummary.requestedDelivery && (
                    <span>🚚 Delivery: {result.orderSummary.requestedDelivery}</span>
                  )}
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                  result.status === 'READY'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}>
                  {result.status === 'READY' ? '✅ Ready to Export' : '⚠️ Needs Review'}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">
                  Extracted Line Items
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Review each line. Acknowledge all flags before exporting.
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {lines.map((line, i) => (
                  <div
                    key={i}
                    className={`px-6 py-4 ${
                      line.flags.length > 0 && !line.acknowledged
                        ? 'bg-yellow-50'
                        : line.acknowledged
                        ? 'bg-green-50'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Original text */}
                        <p className="text-xs text-gray-400 font-mono mb-1">
                          &ldquo;{line.rawText}&rdquo;
                        </p>
                        {/* Matched product */}
                        <p className="text-sm font-semibold text-gray-900">
                          {line.matchedName ?? (
                            <span className="text-red-500 italic">No match found</span>
                          )}
                        </p>
                        {/* SKU + Warehouse */}
                        <div className="flex gap-3 mt-1 text-xs text-gray-500">
                          {line.matchedSku && (
                            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                              {line.matchedSku}
                            </span>
                          )}
                          {line.warehouse && (
                            <span>{line.warehouse}</span>
                          )}
                        </div>
                        {/* Flags */}
                        {line.flags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {line.flags.map((flag, fi) => (
                              <span
                                key={fi}
                                className={`text-xs px-2 py-0.5 rounded border font-mono ${FLAG_COLORS[flag] ?? 'bg-gray-100 text-gray-600'}`}
                              >
                                {flag}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Flag reasons */}
                        {line.flagReasons?.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {line.flagReasons.map((reason, ri) => (
                              <li key={ri} className="text-xs text-gray-500">
                                → {reason}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Price + Acknowledge */}
                      <div className="text-right flex flex-col items-end gap-2 shrink-0">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {line.lineTotal
                              ? `₱${line.lineTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                              : '—'}
                          </div>
                          <div className="text-xs text-gray-400">
                            {line.quantity ? `${line.quantity} ×` : '? ×'}{' '}
                            {line.unitPrice ? `₱${line.unitPrice.toFixed(2)}` : '—'}
                          </div>
                        </div>

                        {line.flags.length > 0 && !line.acknowledged && (
                          <button
                            onClick={() => acknowledgeLine(i)}
                            className="text-xs bg-white border border-gray-300 hover:border-blue-400
                                       hover:text-blue-600 text-gray-600 px-3 py-1 rounded-lg
                                       transition-colors duration-150"
                          >
                            Acknowledge
                          </button>
                        )}
                        {line.acknowledged && (
                          <span className="text-xs text-green-600 font-medium">
                            ✓ Reviewed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Button */}
            <div className="flex justify-end">
              <button
                onClick={handleExport}
                disabled={!allAcknowledged}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300
                           disabled:cursor-not-allowed text-white text-sm font-semibold
                           px-8 py-3 rounded-lg transition-colors duration-150"
              >
                {allAcknowledged
                  ? '⬇️ Export Order Summary (CSV)'
                  : `Acknowledge ${lines.filter(l => l.flags.length > 0 && !l.acknowledged).length} flag(s) to export`}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}