import fs from 'fs';
import path from 'path';

const filePath = path.join(__dirname, '../src/components/EventDetailClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix "Tentang Event" Title
content = content.replace(
  '<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-700 to-secondary-600">Tentang Event</span>',
  '<span className="text-slate-800">Tentang Event</span>'
);

// 2. Fix Section Titles (Lineup, Didukung Oleh, Pilih Tiket)
content = content.replace(
  '<h3 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-secondary-400 uppercase tracking-widest mb-4">Lineup & Penampil</h3>',
  '<h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Lineup & Penampil</h3>'
);
content = content.replace(
  '<h3 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-secondary-400 uppercase tracking-widest mb-4">Didukung Oleh</h3>',
  '<h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Didukung Oleh</h3>'
);
content = content.replace(
  '<h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-500 mb-3 drop-shadow-sm">Pilih Tiket Anda</h2>',
  '<h2 className="text-3xl font-black text-slate-800 mb-3 drop-shadow-sm">Pilih Tiket Anda</h2>'
);

// 3. Fix WA Button (Line 244-249 approx)
content = content.replace(
  /bgClass = "bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100";\s*icon = <MessageCircle className="w-5 h-5 mr-2\.5 group-hover:scale-110 transition-transform" \/>;/,
  `bgClass = "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm";
                      icon = <MessageCircle className="w-5 h-5 mr-2.5 text-[#25D366] group-hover:scale-110 transition-transform" />;`
);

// 4. (Ticket styles removed, keeping default primary)

// 5. Fix Description text to be more readable
content = content.replace(
  'className="prose prose-slate md:prose-lg max-w-none text-slate-600 leading-relaxed font-medium"',
  'className="prose prose-slate md:prose-lg max-w-none text-slate-700 leading-relaxed font-medium"'
);

// 6. Fix Ticket benefit text color from primary to slate
content = content.replace(
  /<CheckCircle2 className="w-5 h-5 text-primary-500 mr-2 shrink-0 mt-0\.5" \/>/g,
  '<CheckCircle2 className="w-5 h-5 text-slate-400 mr-2 shrink-0 mt-0.5" />'
);

fs.writeFileSync(filePath, content);
console.log('UI/UX Refined for Professional look!');
