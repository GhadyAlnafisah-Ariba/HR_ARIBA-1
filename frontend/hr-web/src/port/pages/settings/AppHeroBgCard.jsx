import { useRef, useState } from 'react';
import { useApp } from '../../store/AppStore.jsx';
import { T } from '../../lib/i18n.js';
import { readImage, isSafeDataImg } from '../../lib/images.js';
import { appBase } from '../../lib/brand.js';
import { setSetting } from '../../lib/api.js';
import { toast } from '../../components/Toast.jsx';
import { Card } from './shared.jsx';

/** شعار تطبيق الموظف (شاشة الدخول وقسيمة الراتب): منفصل عن شعار الشركة/الموقع. لو ما اتحدد يستخدم التطبيق شعار الشركة. */
export default function AppHeroBgCard() {
  const { settings, patchSettings } = useApp(); const ref = useRef(null); const [stat, setStat] = useState('');
  const base = appBase(settings);
  const src = isSafeDataImg(base.heroImage) ? base.heroImage : '';
  const write = async (logo, msg) => {
    const v = { ...base, updated: Date.now() }; if (logo) v.heroImage = logo; else delete v.heroImage;
    try { await setSetting('app_brand', v); patchSettings('appBrand', v); setStat(msg + ' — ' + T('تم الحفظ ✓ ويظهر في التطبيق خلال دقيقتين', 'Saved ✓ — shows in the app within two minutes')); toast('✓ ' + msg, 'tin'); }
    catch (e) { toast(T('تعذر الحفظ: ', 'Could not save: ') + (e.message || e), 'ter'); }
  };
  const pick = async (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; try { await write(await readImage(f, { maxW: 1100, maxH: 1100, maxLen: 900000 }), T('تغيّرت الصورة', 'Picture updated')); } catch { toast(T('تعذر قراءة الصورة', 'Could not read the image'), 'ter'); } if (ref.current) ref.current.value = ''; };
  const lbl = { fontSize: 11, color: 'var(--mu)', fontWeight: 600, display: 'block', marginBottom: 4 };
  return (
    <Card icon="photo" title={T('صورة خلف البصمة (تطبيق الموظف)', 'Picture behind the punch button (employee app)')} id="AH_CARD">
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div id="AH_PREV" style={{ width: 220, height: 150, background: '#fff', border: '1px dashed var(--bd)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, boxSizing: 'border-box' }}>
          {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} /> : <span style={{ color: 'var(--mu)', fontSize: 12 }}>{T('الافتراضي: الخلفية الخضراء', 'Default: the green background')}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 210 }}>
          <label style={lbl}>{T('اختر الصورة (JPG أو PNG)', 'Choose the picture (JPG or PNG)')}</label>
          <input ref={ref} type="file" id="AH_FILE" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={pick} style={{ width: '100%', fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn bgr bsm" id="AH_RM" style={{ display: src ? '' : 'none' }} onClick={() => write('', T('تمت إزالة الصورة', 'Picture removed'))}>{T('إزالة الصورة (تعود الخلفية الخضراء)', 'Remove (back to the green background)')}</button>
            <span style={{ fontSize: 12, color: 'var(--mu)' }}>{stat || (src ? T('صورة مخصصة', 'Custom picture') : T('الخلفية الخضراء الافتراضية', 'Default green background'))}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 8, lineHeight: 1.7 }}>{T('تملأ البطاقة الرئيسية التي فيها دائرة الحضور بالكامل، ويُظلَّل عليها قليلًا ليبقى النص واضحًا. تظهر في التطبيق خلال دقيقتين.', 'Fills the whole home card that holds the check-in circle, with a light shade so the text stays readable. It reaches the app within two minutes.')}</div>
        </div>
      </div>
    </Card>
  );
}
