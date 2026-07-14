// warehouse.ts — deterministic routing rules for CTI's two warehouses
// Pure logic, no AI. SKU prefix determines warehouse. No guessing.

import { CatalogItem } from './types';

// Warehouse A: PPE and Fire Safety products
const WAREHOUSE_A_PREFIXES = [
  'PPE-', 'FIR-', 'FAC-', 'BOD-', 'EAR-', 'SAF-', 'HAR-', 'GOG-'
];

// Warehouse B: Medical, Sports, and other categories
const WAREHOUSE_B_PREFIXES = [
  'MED-', 'SPO-', 'FUR-', 'JAN-', 'LAN-', 'LIGHT-',
  'TRA-', 'WHI-', 'MAC-', 'MEG-', 'BRB-', 'HCS-', 'HEA-',
  'FLA-', 'GPX-', 'TND-', 'RT-'
];

// Returns which warehouse a SKU belongs to
export function assignWarehouse(
  sku: string
): 'Warehouse A' | 'Warehouse B' | null {
  const upper = sku.toUpperCase();

  if (WAREHOUSE_A_PREFIXES.some(prefix => upper.startsWith(prefix))) {
    return 'Warehouse A';
  }

  if (WAREHOUSE_B_PREFIXES.some(prefix => upper.startsWith(prefix))) {
    return 'Warehouse B';
  }

  // SKU prefix not recognized — flag for coordinator review
  return null;
}

// Returns a plain-language warehouse label for display in the UI
export function warehouseLabel(
  warehouse: 'Warehouse A' | 'Warehouse B' | null
): string {
  if (warehouse === 'Warehouse A') return '🏭 Warehouse A — PPE & Fire Safety';
  if (warehouse === 'Warehouse B') return '🏥 Warehouse B — Medical & Sports';
  return '⚠️ Unknown — coordinator must assign';
}

// Validates that a catalog item's assigned warehouse matches routing rules
export function validateWarehouse(item: CatalogItem): boolean {
  return assignWarehouse(item.sku) === item.warehouse;
}
