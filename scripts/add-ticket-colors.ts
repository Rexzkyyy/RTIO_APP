import fs from 'fs';
import path from 'path';

const filePath = path.join(__dirname, '../src/components/EventDetailClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The replacement function
const newFunction = `function getTicketStyle(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('diamond')) {
    return {
      colors: 'from-blue-400 to-cyan-500',
      bgClass: 'bg-cyan-50',
      textClass: 'text-cyan-700',
      borderClass: 'border-cyan-200 hover:border-cyan-400',
      shadowClass: 'shadow-cyan-900/10 hover:shadow-cyan-900/20',
      icon: <Award className="w-6 h-6 text-cyan-600" />,
      checkColor: 'text-cyan-500'
    };
  }
  if (lower.includes('vvip') || lower.includes('vip')) {
    return {
      colors: 'from-purple-600 to-indigo-600',
      bgClass: 'bg-indigo-50',
      textClass: 'text-indigo-700',
      borderClass: 'border-indigo-200 hover:border-indigo-400',
      shadowClass: 'shadow-indigo-900/10 hover:shadow-indigo-900/20',
      icon: <Crown className="w-6 h-6 text-indigo-600" />,
      checkColor: 'text-indigo-500'
    };
  }
  if (lower.includes('gold') || lower.includes('emas')) {
    return {
      colors: 'from-amber-400 to-orange-500',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-700',
      borderClass: 'border-amber-200 hover:border-amber-400',
      shadowClass: 'shadow-amber-900/10 hover:shadow-amber-900/20',
      icon: <Star className="w-6 h-6 text-amber-600" />,
      checkColor: 'text-amber-500'
    };
  }
  if (lower.includes('silver') || lower.includes('perak')) {
    return {
      colors: 'from-slate-700 to-slate-900',
      bgClass: 'bg-slate-100',
      textClass: 'text-slate-800',
      borderClass: 'border-slate-300 hover:border-slate-500',
      shadowClass: 'shadow-slate-900/20 hover:shadow-slate-900/30',
      icon: <Shield className="w-6 h-6 text-slate-800" />,
      checkColor: 'text-slate-500'
    };
  }
  // Default/Reguler
  return {
    colors: 'from-primary-400 to-secondary-500',
    bgClass: 'bg-primary-50',
    textClass: 'text-primary-700',
    borderClass: 'border-primary-200 hover:border-primary-400',
    shadowClass: 'shadow-primary-900/10 hover:shadow-primary-900/20',
    icon: <Ticket className="w-6 h-6 text-primary-600" />,
    checkColor: 'text-primary-500'
  };
}`;

// Replace everything from `function getTicketStyle` up to `// Simple CSS-based`
const matchRegex = /function getTicketStyle[\s\S]*?\}\r?\n\r?\n\/\/ Simple CSS-based/;
content = content.replace(matchRegex, newFunction + '\\n\\n// Simple CSS-based');

// Replace the CheckCircle2 inside the ticket benefits map (not the modal one)
const oldCheck = '<CheckCircle2 className="w-5 h-5 text-slate-400 mr-2 shrink-0 mt-0.5" />';
const newCheck = '<CheckCircle2 className={`w-5 h-5 ${style.checkColor} mr-2 shrink-0 mt-0.5`} />';

// Since there are two CheckCircle2 elements, we only want to replace the first one which is inside the loop where \`style\` exists.
content = content.replace(oldCheck, newCheck);

// Also need to import Award icon
if (!content.includes('Award')) {
  content = content.replace('Ticket, Crown,', 'Ticket, Crown, Award,');
}

fs.writeFileSync(filePath, content);
console.log("Ticket colors added successfully!");
