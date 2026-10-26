import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { PRINT_COLS, defaultPrintCols, loadPrintCols, savePrintCols } from './output.js';

/** نافذة اختيار أعمدة طباعة المسير (للموارد البشرية والمالية). الاختيار يُحفظ على هذا الجهاز ويُستعمل في الطباعات القادمة. */
export default function PrintColsDlg({ open, rows, en, onClose, onPrint }) {
  const [sel, setSel] = useState([]);
  useEffect(() => { if (open) setSel(loadPrintCols(rows || [])); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const on = new Set(sel);
  const toggle = (k) => setSel((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]));
  const ordered = PRINT_COLS.map((c) => c.k).filter((k) => on.has(k));
  return (
    <Modal open={open} onClose={onClose} title={en ? 'Choose columns to print' : 'اختيار أعمدة الطباعة'} width={560}
      footer={<div style={{ display: 'flex', gap: 8, padding: '10px 16px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn bsm" onClick={() => setSel(PRINT_COLS.map((c) => c.k))}>{en ? 'All' : 'الكل'}</button>
          <button type="button" className="btn bsm" onClick={() => setSel(defaultPrintCols(rows || []))}>{en ? 'Default' : 'الافتراضي'}</button>
          <button type="button" className="btn bsm" onClick={() => setSel(['idx', 'name'])}>{en ? 'None' : 'إلغاء الكل'}</button>
        </span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn bsm" onClick={onClose}>{en ? 'Cancel' : 'إلغاء'}</button>
          <button type="button" className="btn bsm" style={{ background: 'var(--rd)', color: '#fff' }} disabled={ordered.length < 2}
            onClick={() => { savePrintCols(ordered); onPrint(ordered); }}><i className="ti ti-printer" /> {en ? 'Print' : 'طباعة'} ({ordered.length})</button>
        </span>
      </div>}>
      <div style={{ fontSize: 12, color: 'var(--mu)', marginBottom: 8 }}>{en ? 'Tick only the columns needed on the printed sheet. Your choice is remembered.' : 'علّم الأعمدة المطلوبة في الورقة المطبوعة فقط. يُحفظ اختيارك للمرات القادمة.'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 6 }}>
        {PRINT_COLS.map((c) => (
          <label key={c.k} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', border: '1px solid var(--bd)', borderRadius: 8, cursor: 'pointer', background: on.has(c.k) ? 'rgba(41,179,94,.12)' : 'transparent', fontSize: 12 }}>
            <input type="checkbox" checked={on.has(c.k)} onChange={() => toggle(c.k)} /> {en ? c.en : c.ar}
          </label>
        ))}
      </div>
    </Modal>
  );
}
