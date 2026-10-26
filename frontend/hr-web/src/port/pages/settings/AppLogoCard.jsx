import { useRef, useState } from 'react';
import { useApp } from '../../store/AppStore.jsx';
import { T } from '../../lib/i18n.js';
import { readImage, isSafeDataImg } from '../../lib/images.js';
import { appBase } from '../../lib/brand.js';
import { setSetting } from '../../lib/api.js';
import { toast } from '../../components/Toast.jsx';
import { Card } from './shared.jsx';

/** شعار تطبيق الموظف (شاشة الدخول وقسيمة الراتب): منفصل عن شعار الشركة/الموقع. لو ما اتحدد يستخدم التطبيق شعار الشركة. */
export default function AppLogoCard() {
  const { settings, patchSettings } = useApp(); const ref = useRef(null); const [stat, setStat] = useState('');
  const base = appBase(settings);
  const src = isSafeDataImg(base.logo) ? base.logo : '';
  const write = async (logo, msg) => {
    const v = { ...base, updated: Date.now() }; if (logo) v.logo = logo; else delete v.logo;
    try { await setSetting('app_brand', v); patchSettings('appBrand', v); setStat(msg + ' — ' + T('تم الحفظ ✓ ويظهر في التطبيق خلال دقيقتين', 'Saved ✓ — shows in the app within two minutes')); toast('✓ ' + msg, 'tin'); }
    catch (e) { toast(T('تعذر الحفظ: ', 'Could not save: ') + (e.message || e), 'ter'); }
  };
  const pick = async (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; try { await write(await readImage(f, { maxW: 520, maxH: 520, maxLen: 380000 }), T('تغيّر شعار التطبيق', 'App logo updated')); } catch { toast(T('تعذر قراءة الصورة', 'Could not read the image'), 'ter'); } if (ref.current) ref.current.value = ''; };
  const lbl = { fontSize: 11, color: 'var(--mu)', fontWeight: 600, display: 'block', marginBottom: 4 };
  return (
    <Card icon="photo" title={T('شعار تطبيق الموظف', 'Employee app logo')} id="AL_CARD">
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div id="AL_PREV" style={{ width: 190, height: 110, background: '#fff', border: '1px dashed var(--bd)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, boxSizing: 'border-box' }}>
          {src ? <img src={src} alt="" style={{ maxHeight: 90, maxWidth: '100%', objectFit: 'contain' }} /> : <span style={{ color: 'var(--mu)', fontSize: 12 }}>{T('شعار الشركة الحالي', 'The company logo is used')}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 210 }}>
          <label style={lbl}>{T('اختر صورة الشعار (PNG بخلفية شفافة أفضل)', 'Choose the logo image (a transparent PNG works best)')}</label>
          <input ref={ref} type="file" id="AL_FILE" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={pick} style={{ width: '100%', fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn bgr bsm" id="AL_RM" style={{ display: src ? '' : 'none' }} onClick={() => write('', T('تمت إزالة شعار التطبيق', 'App logo removed'))}>{T('إزالة الشعار (يعود شعار الشركة)', 'Remove (back to the company logo)')}</button>
            <span style={{ fontSize: 12, color: 'var(--mu)' }}>{stat || (src ? T('شعار مخصص للتطبيق', 'Custom app logo') : T('بدون شعار خاص بالتطبيق', 'No app-specific logo'))}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginTop: 8, lineHeight: 1.7 }}>{T('يظهر في شاشة الدخول وقسيمة الراتب في تطبيق الموظف.', 'Shown on the employee app sign-in screen and payslip.')}</div>
        </div>
      </div>
    </Card>
  );
}
