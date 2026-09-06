import fs from 'fs';
import path from 'path';

const filePath = path.join(__dirname, '../src/components/EventDetailClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Wrap the whole content in the theme wrapper class!
// The component starts with `<div className="min-h-screen relative pb-32 md:pb-12 overflow-x-hidden bg-slate-50">`
const configLogic = `  const config = event.ticketConfig || {};
  const themeClass = config.themeName === 'pink' ? 'theme-pink' : 'theme-emerald';
`;

content = content.replace(
  '  const [showLoginModal, setShowLoginModal] = useState(false);',
  configLogic + '\n  const [showLoginModal, setShowLoginModal] = useState(false);'
);

content = content.replace(
  '<div className="min-h-screen relative pb-32 md:pb-12 overflow-x-hidden bg-slate-50">',
  '<div className={`min-h-screen relative pb-32 md:pb-12 overflow-x-hidden bg-slate-50 ${themeClass}`}>'
);

// Replace emerald with primary
content = content.replace(/emerald/g, 'primary');
// Replace teal with secondary
content = content.replace(/teal/g, 'secondary');

fs.writeFileSync(filePath, content);
console.log('Successfully refactored EventDetailClient.tsx with CSS variables!');
