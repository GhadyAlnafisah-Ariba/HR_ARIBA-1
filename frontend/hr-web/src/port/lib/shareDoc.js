// مشاركة مستند رسمي (PDF بصفحة واحدة عند الإمكان) مع Teams أو أي تطبيق عبر نافذة المشاركة في النظام.
// لو المتصفح لا يدعم مشاركة الملفات (أو رفضها بعد وقت إنشاء الملف) يُنزَّل الملف وتُفتح محادثة Teams جاهزة ليُرفق فيها.
import { htmlToPdfBlob } from './htmlPdf.js';
import { shareFile, saveBlob, teamsChatUrl } from './exporter.js';
import { toast } from '../components/Toast.jsx';

export async function shareDoc(title, html, { emails = [], message = '' } = {}) {
  let blob;
  try { blob = await htmlToPdfBlob(html, { onePage: true }); } catch (e) { toast('⚠️ ' + (e.message || 'تعذر تجهيز المستند'), 'ter'); return false; }
  const file = { blob, name: String(title || 'document').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 100) + '.pdf', mime: 'application/pdf' };
  const r = await shareFile(file, message || title);
  if (r === 'shared' || r === 'cancelled') return r === 'shared';
  saveBlob(file);
  window.open(teamsChatUrl(emails, (message || title) + ' — ' + file.name), '_blank', 'noopener');
  toast('نُزّل الملف وفُتحت محادثة Teams — أرفق الملف فيها', 'tin');
  return true;
}
