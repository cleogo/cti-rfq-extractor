// catalog.test.ts — unit tests for warehouse routing and catalog loading
// Tests the deterministic logic only — no AI calls, no network requests.

import { assignWarehouse, warehouseLabel } from './warehouse';
import { searchCatalog } from './catalog';

// ── TEST SUITE 1: Warehouse Routing ──────────────────────────────

describe('assignWarehouse', () => {

  // Test 1 — Fire Safety SKU routes to Warehouse A
  test('FIR- prefix routes to Warehouse A', () => {
    expect(assignWarehouse('FIR-001-10LBS')).toBe('Warehouse A');
  });

  // Test 2 — Medical SKU routes to Warehouse B
  test('MED- prefix routes to Warehouse B', () => {
    expect(assignWarehouse('MED-001-18')).toBe('Warehouse B');
  });

  // Test 3 — Unknown prefix returns null (triggers WRONG_WAREHOUSE flag)
  test('Unknown prefix returns null', () => {
    expect(assignWarehouse('XYZ-999-00')).toBeNull();
  });

  // Test 4 — PPE routes to Warehouse A
  test('PPE- prefix routes to Warehouse A', () => {
    expect(assignWarehouse('PPE-018-01')).toBe('Warehouse A');
  });

  // Test 5 — Sports routes to Warehouse B
  test('SPO- prefix routes to Warehouse B', () => {
    expect(assignWarehouse('SPO-001-04')).toBe('Warehouse B');
  });

});

// ── TEST SUITE 2: Warehouse Label ────────────────────────────────

describe('warehouseLabel', () => {

  // Test 6 — Warehouse A returns correct label
  test('Warehouse A returns PPE & Fire Safety label', () => {
    const label = warehouseLabel('Warehouse A');
    expect(label).toContain('Warehouse A');
    expect(label).toContain('PPE');
  });

  // Test 7 — Warehouse B returns correct label
  test('Warehouse B returns Medical & Sports label', () => {
    const label = warehouseLabel('Warehouse B');
    expect(label).toContain('Warehouse B');
    expect(label).toContain('Medical');
  });

  // Test 8 — null returns unknown warning
  test('null warehouse returns unknown warning', () => {
    const label = warehouseLabel(null);
    expect(label).toContain('Unknown');
  });

});

// ── TEST SUITE 3: Catalog Search ─────────────────────────────────

describe('searchCatalog', () => {

  // Test 9 — Searching "fire extinguisher" returns results
  test('searching fire extinguisher returns at least one result', () => {
    const results = searchCatalog('fire extinguisher');
    expect(results.length).toBeGreaterThan(0);
  });

  // Test 10 — Searching a known SKU returns that item
  test('searching by SKU code returns the matching item', () => {
    const results = searchCatalog('FIR-001-10LBS');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].sku).toBe('FIR-001-10LBS');
  });

  // Test 11 — Searching gibberish returns empty array (no crash)
  test('searching unknown term returns empty array not an error', () => {
    const results = searchCatalog('xxxxxxxxxunknownproduct');
    expect(results).toEqual([]);
  });

});