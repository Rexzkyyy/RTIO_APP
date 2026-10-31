import fs from 'fs';
import path from 'path';

const txFile = fs.readFileSync('C:/Users/IKHSAN/Downloads/Transaction_rows (10).sql', 'utf-8');
const ticketFile = fs.readFileSync(path.join(__dirname, '../backup/Ticket_rows.sql'), 'utf-8');
const answerFile = fs.readFileSync('C:/Users/IKHSAN/Downloads/TicketAnswer_rows.sql', 'utf-8');

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

function normalizeGender(g: string, name: string): string {
  const lowerName = (name || '').toLowerCase();
  
  const maleNames = [
    'surya ceria permana', 'kak ahmad', 'andika', 'fachri', 'rijal ahmad', 
    'bonifasius todi chrisavero', 'muh.ansar', 'adrian alfahreza', 'm habriansyah',
    'nurmin', 'arip', 'muhammad', 'andri', 'kevin', 'arifin', 'al-ma\'ruf'
  ];
  if (maleNames.some(m => lowerName.includes(m))) {
    return 'Laki-laki';
  }

  if (!g) return 'Perempuan';
  const lower = g.trim().toLowerCase();
  if (lower === 'p' || lower === 'perempuan' || lower.includes('wanita') || lower.includes('akhwat')) return 'Perempuan';
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
  
  // Specific known manual transactions
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
        gender: normalizeGender(tk.holderGender || buyerGender, tk.holderName || buyerName) as any,
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
        gender: participantGender as any,
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

console.log(`Total Compiled Participants: ${allParticipants.length}`);

// Group by Category
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

console.log('=== GROUPED BREAKDOWN ===');
categoriesOrder.forEach(cat => {
  const f = grouped[cat].female.length;
  const m = grouped[cat].male.length;
  console.log(`${cat}: Total = ${f + m} (Perempuan: ${f}, Laki-laki: ${m})`);
});

const totalF = allParticipants.filter(p => p.gender === 'Perempuan').length;
const totalM = allParticipants.filter(p => p.gender === 'Laki-laki').length;
console.log(`GRAND TOTAL: ${allParticipants.length} (Perempuan: ${totalF}, Laki-laki: ${totalM})`);

fs.writeFileSync(path.join(__dirname, 'grouped-participants.json'), JSON.stringify({
  stats: {
    totalTickets: allParticipants.length,
    totalApprovedTx: approved.length,
    totalExpiredTx: expired.length,
    totalRevenue: approved.reduce((sum, r) => sum + parseInt(r[6] || '0', 10), 0),
    totalFemale: totalF,
    totalMale: totalM,
    byCategory: categoriesOrder.map(cat => ({
      category: cat,
      total: grouped[cat].female.length + grouped[cat].male.length,
      female: grouped[cat].female.length,
      male: grouped[cat].male.length
    }))
  },
  grouped,
  expiredTx: expired.map(r => ({
    id: r[0],
    buyerName: r[2],
    buyerEmail: r[3],
    buyerPhone: r[4],
    totalTickets: parseInt(r[5] || '1', 10),
    totalPrice: parseInt(r[6] || '0', 10),
    createdAt: r[9],
    buyerGender: r[12],
    buyerAddress: r[13],
  }))
}, null, 2));
