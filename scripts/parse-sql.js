const fs = require('fs');

const sql = fs.readFileSync('C:\\laragon\\www\\E-Tiket\\data event .sql', 'utf8');
const valuesIndex = sql.indexOf('VALUES');
if (valuesIndex === -1) {
    console.error("VALUES not found");
    process.exit(1);
}

let valuesStr = sql.substring(valuesIndex + 6).trim();
if (valuesStr.endsWith(';')) valuesStr = valuesStr.slice(0, -1);

// We'll write a simple state machine to parse the tuples
const records = [];
let currentRecord = [];
let currentToken = '';
let inString = false;
let escapeNext = false;

for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    
    if (inString) {
        if (char === "'" && valuesStr[i+1] === "'") {
            // Escaped quote
            currentToken += "'";
            i++; // skip the next quote
        } else if (char === "'") {
            inString = false;
        } else {
            currentToken += char;
        }
    } else {
        if (char === "'") {
            inString = true;
        } else if (char === ',') {
            currentRecord.push(currentToken.trim());
            currentToken = '';
        } else if (char === '(') {
            if (currentToken.trim() === '') {
                // start of record
                currentRecord = [];
            }
        } else if (char === ')') {
            currentRecord.push(currentToken.trim());
            records.push(currentRecord);
            currentToken = '';
            // Skip the next comma if exists
            while (valuesStr[i+1] === ' ' || valuesStr[i+1] === '\n' || valuesStr[i+1] === '\r') i++;
            if (valuesStr[i+1] === ',') i++;
        } else {
            currentToken += char;
        }
    }
}

// Convert "null" to actual null
const mapped = records.map(rec => {
    return rec.map(v => v === 'null' || v === 'NULL' ? null : v);
});

// Map to object
const columns = [
    "barcode", "nama_lengkap", "email", "jenis_kelamin", "usia", "alamat", "whatsapp", "jenis_tiket", 
    "jumlah_tiket", "metode_pembayaran", "bukti_transfer", "nama_pengirim", "harapan_event", 
    "konfirmasi_data", "validasi_bayar", "status_absen", "waktu_absen", "created_at", "status_wa", 
    "updated_at", "jumlah_checkin"
];

const jsonRecords = mapped.map(rec => {
    let obj = {};
    columns.forEach((col, idx) => {
        obj[col] = rec[idx];
    });
    return obj;
});

fs.writeFileSync('C:\\laragon\\www\\E-Tiket\\parsed_data.json', JSON.stringify(jsonRecords, null, 2));
console.log(`Parsed ${jsonRecords.length} records!`);
