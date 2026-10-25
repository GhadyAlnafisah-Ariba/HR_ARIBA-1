import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp, usePerm } from '../../store/AppStore.jsx';
import { rpc } from '../../lib/api.js';
import { toast } from '../../components/Toast.jsx';
import { OCCASIONS, REGISTERABLE, occ, getAuto, setAuto, sendAnn, pickRecipients, DEF_AUTO } from '../../lib/occasions.js';

const noDb = (e) => /Could not find|schema cache|PGRST202|ariba_ann|ariba_occ/i.test(String((e && e.message) || e));
const fmt = (d) => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
const INP = { width: '100%', boxSizing: 'border-box' };
const Lb = ({ children }) => <label style={{ display: 'block', fontSize: 11.5, color: 'var(--mu)', margin: '0 0 3px' }}>{children}</label>;

/** الإعلانات والتهاني: إرسال يدوي، تلقائي، مناسبات الموظفين، والسجل */
export default function Announcements() {
  const { employees } = useApp(); const can = usePerm().edit('employees');
  const [tab, setTab] = useState('send'); const [nodb, setNodb] = useState(false);
  const act = useMemo(() => (employees || []).filter((e) => !(e.isTerminated || e.term)), [employees]);
  const employers = useMemo(() => [...new Set(act.map((e) => e.employer).filter(Boolean))], [act]);
  const tabs = [['send', 'ti-send', 'إرسال إعلان / تهنئة'], ['auto', 'ti-robot', 'التهاني التلقائية'], ['occ', 'ti-calendar-heart', 'مناسبات الموظفين'], ['log', 'ti-history', 'سجل المُرسَل']];
  return (
    <div id="pg-ann">
      {nodb && <div className="al alb" style={{ marginBottom: 10, fontSize: 12 }}><i className="ti ti-info-circle" /><span>شغّل ملف <b>sql/21_announcements_greetings.sql</b> مرة واحدة في Supabase SQL Editor لتفعيل الإعلانات والتهاني.</span></div>}
      <div className="tabs" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {tabs.map((t) => <button key={t[0]} className={'btn bsm' + (tab === t[0] ? ' bpl' : '')} id={'ANN_TAB_' + t[0]} onClick={() => setTab(t[0])}><i className={'ti ' + t[1]} /> {t[2]}</button>)}
      </div>
      {tab === 'send' && <Send can={can} employees={employees} act={act} employers={employers} onNoDb={() => setNodb(true)} />}
      {tab === 'auto' && <Auto can={can} onNoDb={() => setNodb(true)} />}
      {tab === 'occ' && <Occasions can={can} act={act} onNoDb={() => setNodb(true)} />}
      {tab === 'log' && <Log can={can} onNoDb={() => setNodb(true)} />}
    </div>
  );
}

function EmpPick({ act, ids, setIds }) {
  const [q, setQ] = useState('');
  const list = act.filter((e) => !q || (String(e.nameAr || '') + ' ' + String(e.nameEn || '') + ' ' + String(e.empNo || e.id)).toLowerCase().includes(q.toLowerCase()));
  const set = new Set(ids.map(String));
  const tog = (id) => setIds(set.has(String(id)) ? ids.filter((x) => String(x) !== String(id)) : [...ids, String(id)]);
  return <div style={{ border: '1px solid var(--bd)', borderRadius: 8, padding: 8 }}>
    <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو الرقم" style={{ flex: 1, minWidth: 160 }} />
      <button type="button" className="btn bsm" onClick={() => setIds([...new Set([...ids, ...list.map((e) => String(e.id))])])}>تحديد الكل</button>
      <button type="button" className="btn bsm" onClick={() => setIds([])}>مسح</button>
    </div>
    <div style={{ maxHeight: 180, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 4 }}>
      {list.map((e) => <label key={e.id} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, cursor: 'pointer' }}><input type="checkbox" checked={set.has(String(e.id))} onChange={() => tog(e.id)} /> {e.nameAr || e.nameEn}</label>)}
    </div>
    <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 4 }}>المحدد: {ids.length}</div>
  </div>;
}

function Send({ can, employees, act, employers, onNoDb }) {
  const [k, setK] = useState('announcement'), [title, setTitle] = useState(''), [body, setBody] = useState('');
  const [aud, setAud] = useState('all'), [emp, setEmp] = useState(''), [ids, setIds] = useState([]), [pin, setPin] = useState(false), [exp, setExp] = useState(''), [busy, setBusy] = useState(false);
  const o = occ(k), isAnn = k === 'announcement';
  const pickOcc = (v) => { setK(v); const x = occ(v); if (x.t) { setTitle(x.t); setBody(x.b); } else if (v === 'announcement') { setTitle(''); setBody(''); } };
  const n = pickRecipients(employees, aud, emp || employers[0], ids).length;
  async function send() {
    if (!title.trim()) return toast('اكتب العنوان', 'ter');
    if (aud === 'employer' && !(emp || employers[0])) return toast('اختر الشركة', 'ter');
    if (aud === 'employees' && !ids.length) return toast('اختر موظفًا واحدًا على الأقل', 'ter');
    if (!window.confirm('إرسال ' + (isAnn ? 'الإعلان' : 'التهنئة') + ' إلى ' + n + ' موظف؟')) return;
    setBusy(true);
    try {
      const res = await sendAnn({ kind: isAnn ? 'announcement' : 'greeting', occasion: isAnn ? null : k, title: title.trim(), body: body.trim(), audience: aud, employer: emp || employers[0], ids, pinned: isAnn && pin, expires: isAnn ? exp : '', employees });
      const what = isAnn ? 'الإعلان' : 'التهنئة';
      if (res.sent === 0) toast('⚠️ ما وصلت ' + what + ' لأي موظف' + (res.failed.length ? ' — غير مسجّل في تطبيق الموظف: ' + res.failed.slice(0, 5).join('، ') : ' — الموظف غير مفعّل/منتهي الخدمة أو غير مسجّل في تطبيق الموظف'), 'ter');
      else if (res.sent < res.expected) { toast('⚠️ وصلت ' + what + ' لـ ' + res.sent + ' من ' + res.expected + ' موظف' + (res.failed.length ? ' — لم تصل: ' + res.failed.slice(0, 5).join('، ') : ' — الباقي غير مسجّل في تطبيق الموظف'), 'ter'); setTitle(''); setBody(''); }
      else { toast('✓ وصلت ' + what + ' إلى ' + res.sent + ' موظف (إشعار في تطبيق الموظف)', 'tin'); setTitle(''); setBody(''); }
    } catch (e) { if (noDb(e)) onNoDb(); toast('⚠️ ' + (e.message || 'تعذر الإرسال'), 'ter'); } finally { setBusy(false); }
  }
  return (
    <div className="card"><div className="ch"><div className="ct"><i className="ti ti-send" /> <span>إرسال إلى تطبيق الموظف</span></div></div>
      <div style={{ padding: 12, display: 'grid', gap: 10 }}>
        <div><Lb>النوع / المناسبة (فلتر)</Lb>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {OCCASIONS.map((x) => <button key={x.k} type="button" className={'btn bsm' + (k === x.k ? ' bpl' : '')} onClick={() => pickOcc(x.k)}>{x.ic} {x.ar}</button>)}
          </div>
        </div>
        <div><Lb>العنوان {!isAnn && <span style={{ color: 'var(--mu)' }}>— استخدم {'{name}'} لاسم الموظف الأول و{'{years}'} لسنوات الخدمة (يُرسل لكل موظف باسمه)</span>}</Lb><input id="ANN_TITLE" style={INP} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder={isAnn ? 'مثال: إجازة العيد من 28 مارس إلى 5 أبريل' : o.t} /></div>
        <div><Lb>النص</Lb><textarea id="ANN_BODY" style={{ ...INP, minHeight: 90 }} value={body} onChange={(e) => setBody(e.target.value)} placeholder="تفاصيل الإعلان أو نص التهنئة" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
          <div><Lb>المستلمون</Lb><select style={INP} value={aud} onChange={(e) => setAud(e.target.value)} id="ANN_AUD"><option value="all">كل الموظفين</option><option value="employer">شركة / نطاق عمل</option><option value="employees">موظفون محددون</option></select></div>
          {aud === 'employer' && <div><Lb>الشركة</Lb><select style={INP} value={emp || employers[0] || ''} onChange={(e) => setEmp(e.target.value)}>{employers.map((x) => <option key={x}>{x}</option>)}</select></div>}
          {isAnn && <div><Lb>ينتهي عرضه في (اختياري)</Lb><input type="date" style={INP} value={exp} onChange={(e) => setExp(e.target.value)} /></div>}
        </div>
        {aud === 'employees' && <EmpPick act={act} ids={ids} setIds={setIds} />}
        {isAnn && <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12.5 }}><input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} /> تثبيت الإعلان أعلى الصفحة الرئيسية في تطبيق الموظف حتى ينتهي</label>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn bpl" id="ANN_SEND" disabled={busy || !can} onClick={send}><i className="ti ti-send" /> {busy ? 'جاري الإرسال…' : 'إرسال الآن'}</button>
          <span style={{ fontSize: 12, color: 'var(--mu)' }}>سيصل لـ <b>{n}</b> موظف: إشعار في الجرس + بطاقة في الرئيسية{isAnn ? '' : ' (آخر 3 أيام)'} + إيميل لو إشعارات الإيميل مفعّلة.</span>
          {!can && <span className="b br">للاطلاع فقط — لا توجد صلاحية إرسال</span>}
        </div>
      </div>
    </div>
  );
}

function Auto({ can, onNoDb }) {
  const [c, setC] = useState(null), [busy, setBusy] = useState(false);
  useEffect(() => { getAuto().then(setC); }, []);
  if (!c) return <div className="card" style={{ padding: 14 }}>جاري التحميل…</div>;
  const set = (p) => setC((x) => ({ ...x, ...p }));
  const tpl = (k, f, v) => setC((x) => ({ ...x, tpl: { ...(x.tpl || {}), [k]: { ...((x.tpl || {})[k] || {}), [f]: v } } }));
  async function save(next) { setBusy(true); try { await setAuto(next || c); toast('✓ اتحفظ إعداد التهاني التلقائية', 'tin'); } catch (e) { toast('⚠️ ' + e.message, 'ter'); } finally { setBusy(false); } }
  async function runNow() { setBusy(true); try { const r = await rpc('ariba_occ_run_auto', {}); toast(r.sent ? '✓ اتبعت ' + r.sent + ' تهنئة اليوم' : 'لا توجد مناسبات اليوم (أو اتبعت قبل كده / التلقائي موقوف)', 'tin'); } catch (e) { if (noDb(e)) onNoDb(); toast('⚠️ ' + e.message, 'ter'); } finally { setBusy(false); } }
  const T = (k) => (c.tpl && c.tpl[k]) || {};
  return (
    <div className="card"><div className="ch"><div className="ct"><i className="ti ti-robot" /> <span>التهاني التلقائية</span></div></div>
      <div style={{ padding: 12, display: 'grid', gap: 12 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 }}><input type="checkbox" id="OCC_ON" checked={!!c.enabled} disabled={!can} onChange={(e) => { const n = { ...c, enabled: e.target.checked }; setC(n); save(n); }} /> تفعيل الإرسال التلقائي {c.enabled ? <span className="b bg">شغّال</span> : <span className="b br">موقوف — لن يُرسل شيء إلا يدويًا</span>}</label>
        <div style={{ fontSize: 12, color: 'var(--mu)', lineHeight: 1.8 }}>لما يكون شغّال: كل موظف يوصله تهنئة <b>في يوم المناسبة</b> تلقائيًا (مرة واحدة في السنة لكل مناسبة). بتتولّد أول ما يفتح أي مستخدم برنامج الموارد أو تطبيق الموظف في اليوم، ولو إضافة <b>pg_cron</b> مفعّلة على Supabase بتتولّد الساعة 6 صباحًا بدون فتح أي برنامج.</div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {[['birthday', '🎂 عيد الميلاد (من تاريخ الميلاد)'], ['anniversary', '🎉 سنوية التعيين (من تاريخ المباشرة)'], ['custom', '🎓 المناسبات المسجّلة للموظفين (تخرج، زواج، مولود…)']].map(([k, l]) =>
            <label key={k} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={c[k] !== false} disabled={!can} onChange={(e) => set({ [k]: e.target.checked })} /> {l}</label>)}
        </div>
        {[['birthday', '🎂 نص تهنئة الميلاد'], ['anniversary', '🎉 نص سنوية التعيين']].map(([k, l]) => (
          <div key={k} style={{ border: '1px solid var(--bd)', borderRadius: 8, padding: 10, display: 'grid', gap: 6 }}>
            <b style={{ fontSize: 13 }}>{l}</b>
            <input style={INP} placeholder={occ(k).t} value={T(k).title || ''} onChange={(e) => tpl(k, 'title', e.target.value)} disabled={!can} />
            <textarea style={{ ...INP, minHeight: 60 }} placeholder={occ(k).b} value={T(k).body || ''} onChange={(e) => tpl(k, 'body', e.target.value)} disabled={!can} />
            <div style={{ fontSize: 11, color: 'var(--mu)' }}>المتغيرات: {'{name}'} = الاسم الأول{k === 'anniversary' ? ' ، {years} = عدد السنوات' : ''}. اتركه فاضي لاستخدام النص الافتراضي.</div>
          </div>))}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn bpl" disabled={busy || !can} onClick={() => save()}><i className="ti ti-device-floppy" /> حفظ</button>
          <button className="btn" disabled={busy || !can} onClick={runNow}><i className="ti ti-player-play" /> تشغيل الآن (تهاني اليوم)</button>
          <button className="btn" disabled={busy || !can} onClick={() => { setC({ ...DEF_AUTO, enabled: c.enabled }); }}>استرجاع الافتراضي</button>
        </div>
      </div>
    </div>
  );
}

function Occasions({ can, act, onNoDb }) {
  const [list, setList] = useState(null), [f, setF] = useState({ emp: '', k: 'graduation', d: new Date().toISOString().slice(0, 10), y: false, note: '' }), [busy, setBusy] = useState(false);
  const load = useCallback(() => rpc('ariba_occ_list', {}).then((r) => setList(r.items || [])).catch((e) => { if (noDb(e)) onNoDb(); setList([]); }), [onNoDb]);
  useEffect(() => { load(); }, [load]);
  async function add() {
    if (!f.emp) return toast('اختر الموظف', 'ter');
    setBusy(true);
    try { await rpc('ariba_occ_save', { p_employee_id: String(f.emp), p_occasion: f.k, p_date: f.d, p_yearly: f.y, p_note: f.note || null }); toast('✓ اتسجّلت المناسبة — هتتبعت تلقائيًا في يومها (لو التلقائي شغّال)', 'tin'); setF({ ...f, note: '' }); load(); }
    catch (e) { toast('⚠️ ' + e.message, 'ter'); } finally { setBusy(false); }
  }
  async function del(id) { if (!window.confirm('حذف المناسبة؟')) return; try { await rpc('ariba_occ_delete', { p_id: id }); load(); } catch (e) { toast('⚠️ ' + e.message, 'ter'); } }
  return (
    <div className="card"><div className="ch"><div className="ct"><i className="ti ti-calendar-heart" /> <span>مناسبات الموظفين المسجّلة</span></div></div>
      <div style={{ padding: 12, display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--mu)', lineHeight: 1.8 }}>سجّل مناسبة لموظف بتاريخها (تخرج، زواج، مولود، ترقية…) وهتتبعت له تهنئة <b>تلقائيًا في ذلك اليوم</b> لو «التهاني التلقائية» شغّالة. «تتكرر سنويًا» مناسبة لحاجة زي ذكرى الزواج. عيد الميلاد وسنوية التعيين بيتحسبوا من بيانات الموظف تلقائيًا فلا تحتاج تسجلهم.</div>
        {can && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 8, alignItems: 'end' }}>
          <div><Lb>الموظف</Lb><select style={INP} value={f.emp} onChange={(e) => setF({ ...f, emp: e.target.value })}><option value="">— اختر —</option>{act.map((e) => <option key={e.id} value={e.id}>{e.nameAr || e.nameEn}</option>)}</select></div>
          <div><Lb>المناسبة</Lb><select style={INP} value={f.k} onChange={(e) => setF({ ...f, k: e.target.value })}>{REGISTERABLE.map((o) => <option key={o.k} value={o.k}>{o.ic} {o.ar}</option>)}</select></div>
          <div><Lb>التاريخ</Lb><input type="date" style={INP} value={f.d} onChange={(e) => setF({ ...f, d: e.target.value })} /></div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12.5, paddingBottom: 6 }}><input type="checkbox" checked={f.y} onChange={(e) => setF({ ...f, y: e.target.checked })} /> تتكرر سنويًا</label>
          <div style={{ gridColumn: '1/-1' }}><Lb>ملاحظة (اختياري)</Lb><input style={INP} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
          <button className="btn bpl bsm" disabled={busy} onClick={add}><i className="ti ti-plus" /> تسجيل</button>
        </div>}
        <div style={{ overflow: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr><th>الموظف</th><th>المناسبة</th><th>التاريخ</th><th>سنوي</th><th>ملاحظة</th><th /></tr></thead>
          <tbody>{list === null ? <tr><td colSpan={6} style={{ padding: 14, textAlign: 'center' }}>جاري التحميل…</td></tr> : !list.length ? <tr><td colSpan={6} style={{ padding: 14, textAlign: 'center', color: 'var(--mu)' }}>لا توجد مناسبات مسجّلة</td></tr>
            : list.map((r) => <tr key={r.id}><td>{r.name}</td><td>{occ(r.occasion).ic} {occ(r.occasion).ar}</td><td>{r.occ_date}</td><td>{r.yearly ? 'نعم' : '—'}</td><td>{r.note || ''}</td><td>{can && <button className="btn bsm" onClick={() => del(r.id)}><i className="ti ti-trash" /></button>}</td></tr>)}</tbody></table></div>
      </div>
    </div>
  );
}

function Log({ can, onNoDb }) {
  const [list, setList] = useState(null);
  const load = useCallback(() => rpc('ariba_ann_hr_list', {}).then((r) => setList(r.items || [])).catch((e) => { if (noDb(e)) onNoDb(); setList([]); }), [onNoDb]);
  useEffect(() => { load(); }, [load]);
  async function del(id) { if (!window.confirm('إخفاء من قائمة الموظفين؟ (الإشعارات المرسلة بالفعل تبقى)')) return; try { await rpc('ariba_ann_delete', { p_id: id }); load(); } catch (e) { toast('⚠️ ' + e.message, 'ter'); } }
  return (
    <div className="card"><div className="ch"><div className="ct"><i className="ti ti-history" /> <span>سجل الإعلانات والتهاني المُرسَلة</span></div><button className="btn bsm" onClick={load}>تحديث</button></div>
      <div style={{ overflow: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr><th>التاريخ</th><th>النوع</th><th>العنوان</th><th>المستلمون</th><th>المصدر</th><th /></tr></thead>
        <tbody>{list === null ? <tr><td colSpan={6} style={{ padding: 14, textAlign: 'center' }}>جاري التحميل…</td></tr> : !list.length ? <tr><td colSpan={6} style={{ padding: 14, textAlign: 'center', color: 'var(--mu)' }}>لا يوجد</td></tr>
          : list.map((r) => <tr key={r.id}><td>{fmt(r.created_at)}</td><td>{r.kind === 'greeting' ? (occ(r.occasion).ic + ' ' + occ(r.occasion).ar) : '📢 إعلان' + (r.pinned ? ' 📌' : '')}</td><td title={r.body}>{r.title}</td><td>{r.audience === 'all' ? 'الكل' : r.audience === 'employer' ? r.employer : (r.employee_ids || []).length + ' موظف'} ({r.sent_count})</td><td>{r.source === 'auto' ? <span className="b bb">تلقائي</span> : 'يدوي'}</td><td>{can && <button className="btn bsm" onClick={() => del(r.id)}><i className="ti ti-eye-off" /></button>}</td></tr>)}</tbody></table></div>
    </div>
  );
}
