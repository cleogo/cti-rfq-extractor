// catalog.ts — loads and parses CTI's product catalog from the XLSX file
// Runs server-side only. Never called from the browser.

import 'server-only';
import * as XLSX from 'xlsx';
import path from 'path';
import { CatalogItem } from './types';
import { assignWarehouse } from './warehouse';

let cachedCatalog: CatalogItem[] | null = null;

export function loadCatalog(): CatalogItem[] {
  if (cachedCatalog) return cachedCatalog;

  const filePath = path.join(process.cwd(), 'data', 'CTI_catalog.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  type CatalogRow = Record<string, string | number | null>;
  const rows = XLSX.utils.sheet_to_json<CatalogRow>(sheet, { defval: null });

  const items: CatalogItem[] = [];

  for (const row of rows) {
    const name = row['ITEM NAME'] ?? row['Item Name'] ?? row['NAME'];
    const sku = row['New Code No.'] ?? row['SKU'] ?? row['Code'];
    const price = row['Retail Price'] ?? row['Price'] ?? row['PRICE'];

    if (!name || !sku || !price) continue;

    const skuStr = String(sku).trim();
    const warehouse = assignWarehouse(skuStr);

    items.push({
      sku: skuStr,
      name: String(name).trim(),
      retailPrice: Number(price),
      warehouse: warehouse ?? 'Warehouse A',
    });
  }

  cachedCatalog = items;
  return items;
}

export function catalogToPromptContext(catalog: CatalogItem[]): string {
  return catalog
    .map(item => `${item.sku} | ${item.name} | ₱${item.retailPrice.toFixed(2)}`)
    .join('\n');
}

export function searchCatalog(term: string): CatalogItem[] {
  const catalog = loadCatalog();
  const lower = term.toLowerCase();
  return catalog.filter(
    item =>
      item.name.toLowerCase().includes(lower) ||
      item.sku.toLowerCase().includes(lower)
  );
}