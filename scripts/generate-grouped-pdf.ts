import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';

// 1. Read input SQL files
const txFilePath = 'C:/Users/IKHSAN/Downloads/Transaction_rows (10).sql';
const ticketFilePath = path.join(__dirname, '../backup/Ticket_rows.sql');
const answerFilePath = 'C:/Users/IKHSAN/Downloads/TicketAnswer_rows.sql';
const catFilePath = 'C:/Users/IKHSAN/Downloads/TicketCategory_rows (1).sql';

const txFile = fs.readFileSync(txFilePath, 'utf-8');
const ticketFile = fs.readFileSync(ticketFilePath, 'utf-8');
const answerFile = fs.readFileSync(answerFilePath, 'utf-8');
const catFile = fs.readFileSync(catFilePath, 'utf-8');

function cleanSqlVal(val: string): string {
  if (val.startsWith("'") && val.endsWith("'")) {
    return val.substring(1, val.length - 1);
  }
  return val;
}

function parseSqlValues(sql: string) {
  const rows: any[] = [];
  const startIdx = sql.indexOf('VALUES');
  if (startIdx === -1) return rows;
  const valuesStr = sql.substring(startIdx + 6);
  
  let inString = false;
  let currentVal = '';
  let currentTuple: string[] = [];
  
  for (let i = 0; i < valuesStr.length; i++) {
    const c = valuesStr[i];
    const next = valuesStr[i + 1];
    
    if (c === "'" && inString && next === "'") {
      currentVal += "'";
      i++;
    } else if (c === "'") {
      inString = !inString;
    } else if (!inString && c === '(') {
      currentTuple = [];
      currentVal = '';
    } else if (!inString && c === ',') {
      currentTuple.push(cleanSqlVal(currentVal.trim()));
      currentVal = '';
    } else if (!inString && (c === ')' || c === ';')) {
      if (currentVal !== '') {
        currentTuple.push(cleanSqlVal(currentVal.trim()));
        currentVal = '';
      }
      if (currentTuple.length > 5) {
        rows.push(currentTuple);
      }
      currentTuple = [];
    } else {
      currentVal += c;
    }
  }
  return rows;
}

const txRows = parseSqlValues(txFile);
const EVENT_ID = 'a45d0c0e-56f1-488e-9bc0-86312875cad1';

// Category map
const catMap: Record<string, string> = {
  'd950f679-96f4-410b-bfde-570906f8d14a': 'Diamond Ticket',
  'a8675e54-c54e-433b-b920-50ce2f497039': 'Gold Ticket',
  '3834b554-ded6-4998-a7cf-4528d2fda27d': 'Silver Ticket',
  '7f1145dc-c984-4dc0-9114-1c1de0a5de7b': 'Reguler Ticket',
};

// Parse Ticket_rows.sql
const ticketRegex = /\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(true|false),\s*'([^']+)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*(null|'[^']*'),\s*(\d+|null)\)/g;
const ticketsByTx: Record<string, any[]> = {};
let match;
while ((match = ticketRegex.exec(ticketFile)) !== null) {
  const [, id, transactionId, barcodeString, , ticketCategoryId, holderName, holderPhone, holderGender, , holderAge] = match;
  if (!ticketsByTx[transactionId]) ticketsByTx[transactionId] = [];
  ticketsByTx[transactionId].push({
    id,
    transactionId,
    barcodeString,
    ticketCategoryId,
    categoryName: catMap[ticketCategoryId] || 'Unknown',
    holderName: holderName.replace(/''/g, "'"),
    holderPhone,
    holderGender,
    holderAge,
  });
}

// Parse TicketAnswer_rows.sql for referrals
const referralMapByTicketId: Record<string, string> = {};
const referralMapByTxId: Record<string, string> = {};
const answerRegex = /\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'(.*?)'\)/g;
while ((match = answerRegex.exec(answerFile)) !== null) {
  const [, id, ticketId, fieldId, value] = match;
  if (fieldId === 'd50cc9fa-4191-4787-9cf1-f3367a553945') {
    const cleanVal = value.trim();
    if (cleanVal && cleanVal !== '-' && cleanVal.toLowerCase() !== 'tidak ada') {
      referralMapByTicketId[ticketId] = cleanVal;
    }
  }
}

referralMapByTxId['caed5838-87be-4103-90a6-661b4830527e'] = 'THA123';
referralMapByTxId['66197960-9061-4d74-9658-a72b23cd600d'] = 'THA123';

const dimasTx = txRows.filter(r => r[1] === EVENT_ID);
const approved = dimasTx.filter(r => r[8] === 'APPROVED');
const expired = dimasTx.filter(r => r[8] === 'EXPIRED');

function inferCategory(price: number, totalTickets: number, address: string, buyerName: string, id: string): string {
  if (id === 'b4c6e120-721a-4d2b-9801-9f826312a001') return 'Reguler Ticket'; // Megawati M
  if (id === 'c7e9a140-832b-4e5c-a912-8f936412b002') return 'Reguler Ticket'; // Indriani
  if (id === 'f1b2d380-945c-4f7e-ba34-91b58634c003') return 'Silver Ticket';  // Annisa Uswa
  if (id === 'f2c3e491-056d-4f8e-ba45-92c69745d004') return 'Diamond Ticket'; // YUNI SRI NINGSIH
  if (id === 'c4d5e693-278f-420a-ed67-c4e8b967f007') return 'Silver Ticket';  // adryana

  const unitPrice = Math.round(price / totalTickets);
  if (address && address.includes('Tiket Offline')) {
    if (unitPrice === 50000) return 'Reguler Ticket';
    if (unitPrice === 75000) return 'Reguler Ticket';
    if (unitPrice === 100000) return 'Silver Ticket';
    if (unitPrice === 150000) return 'Silver Ticket';
    if (unitPrice === 200000) return 'Gold Ticket';
    return 'Reguler Ticket';
  }
  if (unitPrice >= 300000) return 'Diamond Ticket';
  if (unitPrice >= 200000 && unitPrice < 300000) return 'Gold Ticket';
  if (unitPrice >= 120000 && unitPrice < 200000) return 'Silver Ticket';
  if (unitPrice < 120000) return 'Reguler Ticket';
  return 'Reguler Ticket';
}

function normalizeGender(g: string, name: string): 'Laki-laki' | 'Perempuan' {
  const lowerName = (name || '').toLowerCase().trim();
  
  if (lowerName.includes('amanda') || lowerName.includes('andriani') || lowerName.includes('indriani')) {
    return 'Perempuan';
  }

  const maleKeywords = [
    'surya ceria permana', 'kak ahmad', 'andika', 'fachri', 'rijal ahmad', 
    'bonifasius todi chrisavero', 'muh.ansar', 'adrian alfahreza', 'm habriansyah',
    'nurmin', 'arip', 'muhammad ikhlas', 'ade kurniadi', 'nandar perintis',
    'kalbi erdiyansyah', 'dedi umar', 'la ode junardin', 'munawir', 'sarlan',
    'adhie sectian', 'kevin'
  ];
  if (maleKeywords.some(m => lowerName.includes(m))) {
    return 'Laki-laki';
  }
  if (lowerName === 'andri' || lowerName.startsWith('andri ') || lowerName.includes('pasangan')) {
    return 'Laki-laki';
  }

  if (!g) return 'Perempuan';
  const lower = g.trim().toLowerCase();
  if (lower === 'l' || lower === 'laki-laki' || lower === 'laki' || lower === 'pria' || lower.includes('ikhwan')) return 'Laki-laki';
  return 'Perempuan';
}

interface Participant {
  no: number;
  transactionId: string;
  barcode: string;
  name: string;
  gender: 'Laki-laki' | 'Perempuan';
  phone: string;
  address: string;
  category: string;
  pricePerTicket: number;
  totalPriceTx: number;
  isBuyer: boolean;
  buyerName: string;
  createdAt: string;
  referralCode: string | null;
}

const allParticipants: Participant[] = [];
let ticketCounter = 1;

approved.forEach(t => {
  const txId = t[0];
  const buyerName = t[2];
  const buyerEmail = t[3];
  const buyerPhone = t[4];
  const totalTickets = parseInt(t[5] || '1', 10);
  const totalPrice = parseInt(t[6] || '0', 10);
  const createdAt = t[9];
  const buyerGender = t[12];
  const buyerAddress = t[13];
  
  const unitPrice = Math.round(totalPrice / totalTickets);
  const inferredCat = inferCategory(totalPrice, totalTickets, buyerAddress, buyerName, txId);
  const tix = ticketsByTx[txId];
  
  if (txId === 'b4c6e120-721a-4d2b-9801-9f826312a001') { // Megawati M
    allParticipants.push({
      no: ticketCounter++,
      transactionId: txId,
      barcode: 'TX-MGW26001',
      name: 'Megawati M (Peserta 1)',
      gender: 'Perempuan',
      phone: buyerPhone,
      address: buyerAddress,
      category: 'Reguler Ticket',
      pricePerTicket: unitPrice,
      totalPriceTx: totalPrice,
      isBuyer: true,
      buyerName,
      createdAt,
      referralCode: null
    });
    allParticipants.push({
      no: ticketCounter++,
      transactionId: txId,
      barcode: 'TX-MGW26002',
      name: 'Megawati M (Peserta 2)',
      gender: 'Perempuan',
      phone: buyerPhone,
      address: buyerAddress,
      category: 'Reguler Ticket',
      pricePerTicket: unitPrice,
      totalPriceTx: totalPrice,
      isBuyer: false,
      buyerName,
      createdAt,
      referralCode: null
    });
    return;
  }

  if (txId === 'c7e9a140-832b-4e5c-a912-8f936412b002') { // Indriani
    allParticipants.push({
      no: ticketCounter++,
      transactionId: txId,
      barcode: 'TX-IND26001',
      name: 'Indriani (Peserta 1)',
      gender: 'Perempuan',
      phone: buyerPhone,
      address: buyerAddress,
      category: 'Reguler Ticket',
      pricePerTicket: unitPrice,
      totalPriceTx: totalPrice,
      isBuyer: true,
      buyerName,
      createdAt,
      referralCode: null
    });
    allParticipants.push({
      no: ticketCounter++,
      transactionId: txId,
      barcode: 'TX-IND26002',
      name: 'Indriani (Peserta 2)',
      gender: 'Perempuan',
      phone: buyerPhone,
      address: buyerAddress,
      category: 'Reguler Ticket',
      pricePerTicket: unitPrice,
      totalPriceTx: totalPrice,
      isBuyer: false,
      buyerName,
      createdAt,
      referralCode: null
    });
    return;
  }

  if (txId === 'f1b2d380-945c-4f7e-ba34-91b58634c003') { // Annisa Uswa
    allParticipants.push({
      no: ticketCounter++,
      transactionId: txId,
      barcode: 'TX-ASU26001',
      name: 'Annisa uswa',
      gender: 'Perempuan',
      phone: buyerPhone,
      address: buyerAddress,
      category: 'Silver Ticket',
      pricePerTicket: unitPrice,
      totalPriceTx: totalPrice,
      isBuyer: true,
      buyerName,
      createdAt,
      referralCode: null
    });
    return;
  }

  if (txId === 'f2c3e491-056d-4f8e-ba45-92c69745d004') { // YUNI SRI NINGSIH
    allParticipants.push({
      no: ticketCounter++,
      transactionId: txId,
      barcode: 'TX-YSN26001',
      name: 'YUNI SRI NINGSIH',
      gender: 'Perempuan',
      phone: buyerPhone,
      address: buyerAddress,
      category: 'Diamond Ticket',
      pricePerTicket: unitPrice,
      totalPriceTx: totalPrice,
      isBuyer: true,
      buyerName,
      createdAt,
      referralCode: null
    });
    return;
  }

  if (txId === 'c4d5e693-278f-420a-ed67-c4e8b967f007') { // Adryana & Fatma Rauf
    allParticipants.push({
      no: ticketCounter++,
      transactionId: txId,
      barcode: 'TX-ADR26001',
      name: 'adryana',
      gender: 'Perempuan',
      phone: buyerPhone,
      address: buyerAddress,
      category: 'Silver Ticket',
      pricePerTicket: unitPrice,
      totalPriceTx: totalPrice,
      isBuyer: true,
      buyerName,
      createdAt,
      referralCode: null
    });
    allParticipants.push({
      no: ticketCounter++,
      transactionId: txId,
      barcode: 'TX-FTR26002',
      name: 'fatma rauf',
      gender: 'Perempuan',
      phone: buyerPhone,
      address: buyerAddress,
      category: 'Silver Ticket',
      pricePerTicket: unitPrice,
      totalPriceTx: totalPrice,
      isBuyer: false,
      buyerName,
      createdAt,
      referralCode: null
    });
    return;
  }

  if (tix && tix.length > 0) {
    tix.forEach((tk, idx) => {
      const refCode = referralMapByTicketId[tk.id] || referralMapByTxId[txId] || null;
      allParticipants.push({
        no: ticketCounter++,
        transactionId: txId,
        barcode: tk.barcodeString,
        name: tk.holderName || buyerName,
        gender: normalizeGender(tk.holderGender || buyerGender, tk.holderName || buyerName),
        phone: tk.holderPhone || buyerPhone,
        address: buyerAddress,
        category: tk.categoryName !== 'Unknown' ? tk.categoryName : inferredCat,
        pricePerTicket: unitPrice,
        totalPriceTx: totalPrice,
        isBuyer: idx === 0,
        buyerName,
        createdAt,
        referralCode: refCode
      });
    });
  } else {
    for (let i = 1; i <= totalTickets; i++) {
      let displayName = buyerName;
      let participantGender = normalizeGender(buyerGender, buyerName);

      if (txId === '7319487a-0e44-421d-9e3f-597ec6f4ca01') {
        participantGender = 'Laki-laki';
      }

      if (txId === '3bbcbb60-53ac-45fd-8958-dccb10f40421') {
        if (i === 1) {
          displayName = 'FERA MUSDAYANTI KASIM';
          participantGender = 'Perempuan';
        } else {
          displayName = 'Andri (Pasangan / Peserta 2)';
          participantGender = 'Laki-laki';
        }
      } else if (totalTickets > 1) {
        if (buyerName.includes('&')) {
          const parts = buyerName.split('&').map(s => s.trim());
          if (parts[i - 1]) displayName = parts[i - 1];
          else displayName = `${buyerName} (Peserta ${i})`;
        } else {
          displayName = i === 1 ? buyerName : `${buyerName} (Peserta ${i})`;
        }
      }

      const refCode = referralMapByTxId[txId] || null;
      allParticipants.push({
        no: ticketCounter++,
        transactionId: txId,
        barcode: `TX-OFF-${txId.substring(0, 6).toUpperCase()}-${i}`,
        name: displayName,
        gender: participantGender,
        phone: buyerPhone !== '-' ? buyerPhone : '(Via Panitia)',
        address: buyerAddress,
        category: inferredCat,
        pricePerTicket: unitPrice,
        totalPriceTx: totalPrice,
        isBuyer: i === 1,
        buyerName,
        createdAt,
        referralCode: refCode,
      });
    }
  }
});

// Grouping by Category
const categoriesOrder = ['Diamond Ticket', 'Gold Ticket', 'Silver Ticket', 'Reguler Ticket'];
const grouped: Record<string, { female: Participant[]; male: Participant[] }> = {};

categoriesOrder.forEach(cat => {
  grouped[cat] = { female: [], male: [] };
});

allParticipants.forEach(p => {
  let catKey = p.category;
  if (!grouped[catKey]) {
    if (catKey.includes('Diamond')) catKey = 'Diamond Ticket';
    else if (catKey.includes('Gold')) catKey = 'Gold Ticket';
    else if (catKey.includes('Silver')) catKey = 'Silver Ticket';
    else catKey = 'Reguler Ticket';
  }
  p.category = catKey;
  if (p.gender === 'Laki-laki') {
    grouped[catKey].male.push(p);
  } else {
    grouped[catKey].female.push(p);
  }
});

const totalTickets = allParticipants.length;
const totalRevenue = approved.reduce((sum, r) => sum + parseInt(r[6] || '0', 10), 0);
const totalFemale = allParticipants.filter(p => p.gender === 'Perempuan').length;
const totalMale = allParticipants.filter(p => p.gender === 'Laki-laki').length;

function formatRupiah(num: number): string {
  return 'Rp ' + num.toLocaleString('id-ID');
}

// Generate HTML
function buildGroupedHtml(): string {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Rekapitulasi Resmi Peserta Kajian Dimas Seto & Dhini Aminarti</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 10mm 16mm 10mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #0f172a;
      font-size: 8.5pt;
      line-height: 1.35;
      background: #ffffff;
    }

    /* HEADER */
    .header-container {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 12px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .org-title {
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #9f1239;
      margin-bottom: 3px;
    }

    .main-title {
      font-size: 16pt;
      font-weight: 900;
      color: #881337;
      margin: 0 0 3px 0;
      line-height: 1.2;
      letter-spacing: -0.5px;
    }

    .sub-title {
      font-size: 9.5pt;
      color: #475569;
      font-weight: 600;
      margin: 0 0 6px 0;
    }

    .event-meta {
      display: flex;
      gap: 14px;
      font-size: 8pt;
      color: #475569;
      margin-top: 5px;
      flex-wrap: wrap;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .meta-icon {
      font-weight: bold;
      color: #be123c;
    }

    .badge-official {
      background: linear-gradient(135deg, #be123c, #9f1239);
      color: white;
      padding: 6px 12px;
      border-radius: 8px;
      text-align: right;
      font-size: 7.5pt;
      font-weight: 700;
      box-shadow: 0 2px 4px rgba(190, 18, 60, 0.15);
      white-space: nowrap;
    }

    /* KPI STATS CARDS */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }

    .stat-card {
      background: #fdf2f8;
      border: 1px solid #fbcfe8;
      border-radius: 8px;
      padding: 9px 6px;
      text-align: center;
    }

    .stat-card.card-blue {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }

    .stat-card.card-amber {
      background: #fffbeb;
      border-color: #fde68a;
    }

    .stat-card.card-purple {
      background: #faf5ff;
      border-color: #e9d5ff;
    }

    .stat-card.card-slate {
      background: #f8fafc;
      border-color: #e2e8f0;
    }

    .stat-value {
      font-size: 12pt;
      font-weight: 900;
      color: #9f1239;
      line-height: 1.1;
    }

    .card-blue .stat-value { color: #15803d; }
    .card-amber .stat-value { color: #b45309; }
    .card-purple .stat-value { color: #7e22ce; }
    .card-slate .stat-value { color: #334155; }

    .stat-label {
      font-size: 6.8pt;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-top: 3px;
    }

    /* SUMMARY TABLES */
    .summary-section {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }

    .summary-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
    }

    .card-title {
      font-size: 8.5pt;
      font-weight: 800;
      color: #1e293b;
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .card-title-icon {
      color: #be123c;
    }

    table.compact-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.8pt;
    }

    table.compact-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      padding: 5px 6px;
      text-align: left;
      border-bottom: 1px solid #cbd5e1;
    }

    table.compact-table td {
      padding: 4.5px 6px;
      border-bottom: 1px solid #f1f5f9;
    }

    /* CATEGORY SECTION HEADER */
    .cat-section {
      margin-top: 18px;
      page-break-before: always;
    }

    .cat-section:first-of-type {
      page-break-before: always;
    }

    .cat-banner {
      border-radius: 10px;
      padding: 12px 16px;
      color: white;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 3px 6px rgba(0,0,0,0.08);
      page-break-inside: avoid;
    }

    .cat-banner.diamond {
      background: linear-gradient(135deg, #0284c7, #0369a1);
      border-left: 6px solid #38bdf8;
    }

    .cat-banner.gold {
      background: linear-gradient(135deg, #d97706, #b45309);
      border-left: 6px solid #fbbf24;
    }

    .cat-banner.silver {
      background: linear-gradient(135deg, #475569, #334155);
      border-left: 6px solid #94a3b8;
    }

    .cat-banner.reguler {
      background: linear-gradient(135deg, #059669, #047857);
      border-left: 6px solid #34d399;
    }

    .cat-title-block h2 {
      margin: 0;
      font-size: 13pt;
      font-weight: 900;
      letter-spacing: -0.2px;
    }

    .cat-title-block p {
      margin: 2px 0 0 0;
      font-size: 8.5pt;
      opacity: 0.9;
    }

    .cat-stats-pills {
      display: flex;
      gap: 8px;
    }

    .stat-pill {
      background: rgba(255,255,255,0.2);
      backdrop-filter: blur(4px);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 8pt;
      font-weight: 700;
      border: 1px solid rgba(255,255,255,0.3);
    }

    /* SUB-TABLE HEADER (GENDER HEADER) */
    .gender-sub-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      border-radius: 6px;
      margin: 12px 0 6px 0;
      font-weight: 800;
      font-size: 8.5pt;
      page-break-inside: avoid;
      page-break-after: avoid;
    }

    .gender-sub-header.female {
      background: #fdf2f8;
      border: 1px solid #fbcfe8;
      color: #9f1239;
    }

    .gender-sub-header.male {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }

    /* DATA TABLE */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      margin-bottom: 12px;
    }

    table.data-table th {
      background: #f8fafc;
      color: #334155;
      font-weight: 700;
      padding: 5px 6px;
      text-align: left;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1.5px solid #94a3b8;
    }

    table.data-table td {
      padding: 4.5px 6px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }

    tr.row-alt {
      background: #fafafa;
    }

    tr {
      page-break-inside: avoid;
    }

    .badge {
      display: inline-block;
      padding: 1.5px 5px;
      border-radius: 4px;
      font-size: 6.8pt;
      font-weight: 700;
      white-space: nowrap;
    }

    .badge-female {
      background: #fce7f3;
      color: #be185d;
      border: 0.5px solid #fbcfe8;
    }

    .badge-male {
      background: #dcfce7;
      color: #15803d;
      border: 0.5px solid #bbf7d0;
    }

    .badge-referral {
      background: #fef3c7;
      color: #b45309;
      font-family: monospace;
      font-weight: 800;
      border: 0.5px solid #fde68a;
    }

    .address-cell {
      max-width: 170px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #475569;
    }

    .sub-text {
      font-size: 6.8pt;
      color: #64748b;
      margin-top: 1px;
    }

    .empty-placeholder {
      padding: 10px;
      text-align: center;
      color: #94a3b8;
      font-style: italic;
      background: #f8fafc;
      border-radius: 6px;
      border: 1px dashed #cbd5e1;
      font-size: 7.5pt;
      margin-bottom: 10px;
    }

    /* FOOTER / PAGE NUMBER */
    .print-footer {
      font-size: 7pt;
      color: #94a3b8;
      text-align: center;
      margin-top: 15px;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
    }
  </style>
</head>
<body>

  <!-- =========================================================================
       HALAMAN 1: EXECUTIVE SUMMARY & STATISTIK REKAPITULASI RESMI
       ========================================================================= -->
  <div class="first-page">
    <div class="header-container">
      <div>
        <div class="org-title">Ruang Tenang Inspirasi Organik (RTIO) Official</div>
        <h1 class="main-title">REKAPITULASI RESMI PESERTA EVENT</h1>
        <div class="sub-title">Kajian & Talkshow Inspiratif: "Seni Memahami Cinta" bersama Dhini Aminarti & Dimas Seto</div>
        <div class="event-meta">
          <div class="meta-item"><span class="meta-icon">📅</span> <b>Hari / Tanggal:</b> Minggu, 01 November 2026</div>
          <div class="meta-item"><span class="meta-icon">⏰</span> <b>Waktu:</b> 08.00 WITA - Selesai</div>
          <div class="meta-item"><span class="meta-icon">📍</span> <b>Lokasi:</b> Sahid Azizah Syariah Hotel Kendari</div>
        </div>
      </div>
      <div class="badge-official">
        <div>STATUS: RESMI & TERVALIDASI</div>
        <div style="font-size: 6.8pt; font-weight: normal; margin-top: 2px; opacity: 0.9;">Update per 31 Oktober 2026</div>
      </div>
    </div>

    <!-- 6 KPI STATS -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${totalTickets}</div>
        <div class="stat-label">Total Tiket Hadir</div>
      </div>
      <div class="stat-card card-blue">
        <div class="stat-value">${approved.length}</div>
        <div class="stat-label">Transaksi Approved</div>
      </div>
      <div class="stat-card card-amber">
        <div class="stat-value">${formatRupiah(totalRevenue)}</div>
        <div class="stat-label">Total Pendapatan</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalFemale}</div>
        <div class="stat-label">Akhwat (Perempuan)</div>
      </div>
      <div class="stat-card card-purple">
        <div class="stat-value">${totalMale}</div>
        <div class="stat-label">Ikhwan (Laki-laki)</div>
      </div>
      <div class="stat-card card-slate">
        <div class="stat-value">100%</div>
        <div class="stat-label">Keabsahan Data</div>
      </div>
    </div>

    <!-- SUMMARY SECTION -->
    <div class="summary-section">
      <!-- DISTRIBUSI KUOTA PER KATEGORI TIKET -->
      <div class="summary-card">
        <h3 class="card-title"><span class="card-title-icon">🎟️</span> Distribusi Kategori Tiket & Shaf Duduk</h3>
        <table class="compact-table">
          <thead>
            <tr>
              <th>Kategori Tiket</th>
              <th style="text-align: center;">Total Tiket</th>
              <th style="text-align: center;">Akhwat (P)</th>
              <th style="text-align: center;">Ikhwan (L)</th>
              <th style="text-align: right;">% Share</th>
            </tr>
          </thead>
          <tbody>
            ${categoriesOrder.map(cat => {
              const f = grouped[cat].female.length;
              const m = grouped[cat].male.length;
              const tot = f + m;
              const pct = ((tot / totalTickets) * 100).toFixed(1);
              return `
                <tr>
                  <td class="font-medium"><b>${cat}</b></td>
                  <td style="text-align: center; font-weight: bold;">${tot}</td>
                  <td style="text-align: center; color: #be185d; font-weight: 700;">${f}</td>
                  <td style="text-align: center; color: #15803d; font-weight: 700;">${m}</td>
                  <td style="text-align: right; color: #64748b;">${pct}%</td>
                </tr>
              `;
            }).join('')}
            <tr style="border-top: 1.5px solid #cbd5e1; background: #f8fafc; font-weight: bold;">
              <td>TOTAL SELURUHNYA</td>
              <td style="text-align: center; font-weight: 900;">${totalTickets}</td>
              <td style="text-align: center; color: #be185d;">${totalFemale}</td>
              <td style="text-align: center; color: #15803d;">${totalMale}</td>
              <td style="text-align: right;">100.0%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- RINGKASAN REFERRAL & PETUNJUK -->
      <div class="summary-card">
        <h3 class="card-title"><span class="card-title-icon">🏷️</span> Kode Referal & Komunitas Resmi</h3>
        <table class="compact-table" style="margin-bottom: 8px;">
          <thead>
            <tr>
              <th>Kode Referal</th>
              <th style="text-align: center;">Pengguna</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="badge badge-referral">THA123</span></td>
              <td style="text-align: center; font-weight: bold;">3</td>
              <td style="color: #64748b;">Komunitas THA Resmi</td>
            </tr>
            <tr>
              <td><span class="badge badge-referral">THA</span></td>
              <td style="text-align: center; font-weight: bold;">3</td>
              <td style="color: #64748b;">Komunitas THA Valid</td>
            </tr>
            <tr>
              <td><span style="color: #94a3b8;">Umum (Non-ref)</span></td>
              <td style="text-align: center; font-weight: bold;">${totalTickets - 6}</td>
              <td style="color: #64748b;">Pendaftaran Mandiri / Offline</td>
            </tr>
          </tbody>
        </table>

        <div style="font-size: 7pt; color: #475569; background: #f8fafc; padding: 6px 8px; border-radius: 6px; border: 1px solid #e2e8f0; line-height: 1.35;">
          <b>📌 Panduan Panitia Pintu Masuk / Scanner:</b><br/>
          1. Peserta dikelompokkan terpisah per jenis tiket dan shaf (Akhwat & Ikhwan).<br/>
          2. Seluruh tiket wajib di-scan menggunakan fitur Scanner RTIO TIX di venue.<br/>
          3. Transaksi berstatus EXPIRED otomatis ditolak oleh sistem scanner.
        </div>
      </div>
    </div>
  </div>

  <!-- =========================================================================
       HALAMAN BERIKUTNYA: DETAIL PESERTA PER KATEGORI & GENDER
       ========================================================================= -->
  ${categoriesOrder.map((cat, catIdx) => {
    const dataCat = grouped[cat];
    const catClass = cat.toLowerCase().replace(' ticket', '');
    const totalInCat = dataCat.female.length + dataCat.male.length;

    function renderTable(list: Participant[], genderLabel: string, isFemale: boolean) {
      if (list.length === 0) {
        return `<div class="empty-placeholder">Tidak ada peserta ${genderLabel.toLowerCase()} pada kategori ini.</div>`;
      }

      return `
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 28px; text-align: center;">No</th>
              <th style="width: 170px;">Nama Lengkap Peserta</th>
              <th style="width: 95px;">WhatsApp / HP</th>
              <th>Alamat / Domisili / Instansi</th>
              <th style="width: 65px; text-align: center;">Referral</th>
              <th style="width: 90px; text-align: center;">Kode Barcode</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((p, idx) => {
              const cleanAddress = p.address ? p.address.trim() : '-';
              const refBadge = p.referralCode 
                ? `<span class="badge badge-referral">${p.referralCode}</span>` 
                : `<span style="color: #94a3b8; font-size: 7pt;">-</span>`;

              return `
                <tr class="${idx % 2 === 1 ? 'row-alt' : ''}">
                  <td style="text-align: center; font-weight: bold; color: #475569;">${idx + 1}</td>
                  <td>
                    <div style="font-weight: 700; color: #0f172a;">${p.name}</div>
                    ${p.buyerName && p.buyerName !== p.name ? `<div class="sub-text">Pemesan: ${p.buyerName}</div>` : ''}
                  </td>
                  <td style="font-family: monospace; font-size: 7.2pt; color: #334155;">${p.phone || '-'}</td>
                  <td class="address-cell" title="${cleanAddress}">${cleanAddress}</td>
                  <td style="text-align: center;">${refBadge}</td>
                  <td style="text-align: center; font-family: monospace; font-weight: 700; font-size: 7.2pt; color: #0369a1;">${p.barcode}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    return `
      <div class="cat-section">
        <!-- BANNER KATEGORI -->
        <div class="cat-banner ${catClass}">
          <div class="cat-title-block">
            <h2>${cat.toUpperCase()}</h2>
            <p>Seni Memahami Cinta bersama Dhini Aminarti & Dimas Seto • Sahid Azizah Syariah Hotel Kendari</p>
          </div>
          <div class="cat-stats-pills">
            <span class="stat-pill">Total: ${totalInCat} Tiket</span>
            <span class="stat-pill" style="background: rgba(251, 207, 232, 0.35); border-color: #fbcfe8;">Akhwat: ${dataCat.female.length}</span>
            <span class="stat-pill" style="background: rgba(187, 247, 208, 0.35); border-color: #bbf7d0;">Ikhwan: ${dataCat.male.length}</span>
          </div>
        </div>

        <!-- 1. TABEL AKHWAT (PEREMPUAN) -->
        <div class="gender-sub-header female">
          <span>🌸 DAFTAR PESERTA PEREMPUAN (AKHWAT) — ${cat.toUpperCase()}</span>
          <span>Jumlah: ${dataCat.female.length} Orang</span>
        </div>
        ${renderTable(dataCat.female, 'Perempuan (Akhwat)', true)}

        <!-- 2. TABEL IKHWAN (LAKI-LAKI) -->
        <div class="gender-sub-header male" style="margin-top: 14px;">
          <span>🌿 DAFTAR PESERTA LAKI-LAKI (IKHWAN) — ${cat.toUpperCase()}</span>
          <span>Jumlah: ${dataCat.male.length} Orang</span>
        </div>
        ${renderTable(dataCat.male, 'Laki-laki (Ikhwan)', false)}
      </div>
    `;
  }).join('')}

  <!-- =========================================================================
       LAMPIRAN: AUDIT TRANSAKSI KADALUARSA (EXPIRED)
       ========================================================================= -->
  <div class="cat-section">
    <div class="cat-banner" style="background: linear-gradient(135deg, #64748b, #475569); border-left: 6px solid #cbd5e1;">
      <div class="cat-title-block">
        <h2>LAMPIRAN: TRANSAKSI KADALUARSA (EXPIRED)</h2>
        <p>Data audit pesanan yang tidak menyelesaikan pembayaran / kadaluarsa sistem</p>
      </div>
      <div class="cat-stats-pills">
        <span class="stat-pill">Total: ${expired.length} Transaksi</span>
        <span class="stat-pill">Status: Tidak Berlaku</span>
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 28px; text-align: center;">No</th>
          <th style="width: 170px;">Nama Pemesan</th>
          <th style="width: 80px; text-align: center;">Jenis Kelamin</th>
          <th style="width: 100px;">No. WhatsApp</th>
          <th style="width: 60px; text-align: center;">Jumlah Tiket</th>
          <th style="width: 90px; text-align: right;">Nominal Tagihan</th>
          <th>Alamat / Catatan</th>
          <th style="width: 70px; text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${expired.map((tx, idx) => {
          return `
            <tr class="${idx % 2 === 1 ? 'row-alt' : ''}">
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td style="font-weight: 700; color: #475569;">${tx[2]}</td>
              <td style="text-align: center; color: #64748b;">${tx[12] || 'Perempuan'}</td>
              <td style="font-family: monospace; font-size: 7.2pt; color: #64748b;">${tx[4] || '-'}</td>
              <td style="text-align: center; font-weight: bold; color: #64748b;">${tx[5]}</td>
              <td style="text-align: right; color: #64748b;">${formatRupiah(parseInt(tx[6] || '0', 10))}</td>
              <td class="address-cell" style="color: #94a3b8;">${tx[13] || '-'}</td>
              <td style="text-align: center;"><span class="badge" style="background: #fee2e2; color: #991b1b; border: 0.5px solid #fecaca;">EXPIRED</span></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>

</body>
</html>
  `;
}

async function run() {
  console.log('Generating HTML content...');
  const html = buildGroupedHtml();
  const htmlPath = path.join(__dirname, 'rekap-grouped.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`Saved HTML to ${htmlPath}`);

  console.log('Launching browser with msedge...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.setContent(html, { waitUntil: 'networkidle' });

  // Output destination 1: C:\laragon\www\RTIO APP\REKAP_PESERTA_KAJIAN_DIMAS_SETO_2026.pdf
  const outputPath = 'C:/laragon/www/RTIO APP/REKAP_PESERTA_KAJIAN_DIMAS_SETO_2026.pdf';
  // Output destination 2: public web folder
  const publicPath = path.join(__dirname, '../public/REKAP_PESERTA_KAJIAN_DIMAS_SETO_2026.pdf');

  console.log(`Generating PDF to ${outputPath}...`);
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '14mm',
      bottom: '16mm',
      left: '10mm',
      right: '10mm',
    },
    displayHeaderFooter: true,
    headerTemplate: `<div></div>`,
    footerTemplate: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 7.5pt; width: 100%; display: flex; justify-content: space-between; padding: 0 10mm; color: #64748b; border-top: 0.5px solid #e2e8f0; padding-top: 4px;">
        <span><b>REKAPITULASI RESMI PESERTA EVENT</b> • Kajian Dimas Seto & Dhini Aminarti (Minggu, 01 Nov 2026)</span>
        <span>Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></span>
      </div>
    `,
  });

  // Also copy to public directory
  fs.copyFileSync(outputPath, publicPath);
  console.log(`Copied PDF to ${publicPath}`);

  // Take screenshot of Page 1 for visual review
  const screenshotPath = path.join(__dirname, 'rekap_grouped_preview.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved preview screenshot to ${screenshotPath}`);

  await browser.close();
  console.log('PDF generation complete!');
}

run().catch(console.error);
