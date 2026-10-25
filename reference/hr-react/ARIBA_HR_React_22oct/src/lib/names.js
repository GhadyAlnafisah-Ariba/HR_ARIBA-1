// الاسم المختصر للعرض والطباعة: الاسم الأول + اسم الأب + اسم العائلة.
// يفهم «بن / بنت / ابن / ابنة» (فيكون اسم الأب بعدها)، والأسماء المركّبة (عبد الله، عبد الرحمن، أبو بكر…)،
// وأسماء العائلة المركّبة (آل الشيخ، بن لادن). لو الاسم 3 كلمات أو أقل يرجع كما هو.
const CONN = new Set(['بن', 'ابن', 'بنت', 'ابنة', 'ابنه', 'bin', 'ibn', 'bint', 'ben']);
const FAMPFX = new Set(['آل', 'ال', 'al', 'el', 'bin', 'ibn', 'bint', 'بن', 'ابن', 'بنت']);
const COMPOUND = new Set(['عبد', 'عبدال', 'أبو', 'ابو', 'أبي', 'ذو', 'abu', 'abd', 'abdul', 'abdel', 'abdal']);
const norm = (w) => String(w).replace(/[ًٌٍَُِّْـ]/g, '').toLowerCase();

export function shortName(full) {
  const t = String(full == null ? '' : full).trim().split(/\s+/).filter(Boolean);
  if (t.length <= 3) return t.join(' ');
  // يدمج الاسم المركّب مع اللي بعده (عبد + الله)
  const grab = (i) => { if (i >= t.length) return [null, i]; return COMPOUND.has(norm(t[i])) && i + 1 < t.length ? [t[i] + ' ' + t[i + 1], i + 2] : [t[i], i + 1]; };
  let [first, i] = grab(0);
  let father = null;
  if (i < t.length && CONN.has(norm(t[i]))) { const c = t[i]; const [f, j] = grab(i + 1); father = f ? c + ' ' + f : c; i = j; }
  else { const [f, j] = grab(i); father = f; i = j; }
  // اسم العائلة: آخر كلمة (أو آخر كلمتين لو الأولى بادئة مثل آل / بن)
  const rest = t.slice(i);
  let fam = '';
  if (rest.length) { const last = rest[rest.length - 1]; fam = (rest.length >= 2 && FAMPFX.has(norm(rest[rest.length - 2]))) ? rest[rest.length - 2] + ' ' + last : last; }
  return [first, father, fam].filter(Boolean).join(' ');
}
