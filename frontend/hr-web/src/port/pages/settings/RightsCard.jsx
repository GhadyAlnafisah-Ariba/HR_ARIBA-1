import { useApp } from '../../store/AppStore.jsx';
import { T } from '../../lib/i18n.js';
import { Card, Note, useSaveSetting } from './shared.jsx';

const KINDS = [['tamheer', 'التمهير', 'Tamheer'], ['trainee', 'التدريب', 'Training'], ['consultant', 'الاستشاري', 'Consultant']];
/** استحقاقات الأنواع الخاصة: علامة = يستحق. الافتراضي بدون علامة (لا إجازات ولا مكافأة نهاية خدمة). */
export default function RightsCard({ pre = 'RT' }) {
  const { settings } = useApp(); const save = useSaveSetting();
  const r = settings.rights && typeof settings.rights === 'object' ? settings.rights : {};
  const on = (k, w) => !!(r[k] && r[k][w] === true);
  const toggle = (k, w, v) => {
    const next = {}; KINDS.forEach(([kk]) => { next[kk] = { leave: on(kk, 'leave'), eos: on(kk, 'eos') }; });
    next[k][w] = v;
    save('rights', 'special_rights', next, T('اتحفظت استحقاقات الأنواع الخاصة', 'Special-type entitlements saved'));
  };
  const CB = ({ k, w }) => <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer', fontSize: 12.5 }}><input type="checkbox" id={pre + '_' + k + '_' + w} checked={on(k, w)} onChange={(e) => toggle(k, w, e.target.checked)} />{w === 'leave' ? T('استحقاق إجازة', 'Leave entitlement') : T('استحقاق مكافأة نهاية خدمة', 'End-of-service award')}</label>;
  return (
    <Card icon="user-check" title={T('استحقاقات التمهير والتدريب والاستشاري', 'Tamheer / Training / Consultant entitlements')} id={pre + '_CARD'}>
      <div style={{ display: 'grid', gap: 8 }}>
        {KINDS.map(([k, ar, en]) => (
          <div key={k} style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', padding: '8px 10px', border: '1px solid var(--bd)', borderRadius: 8 }}>
            <b style={{ minWidth: 80, fontSize: 13 }}>{T(ar, en)}</b>
            <CB k={k} w="leave" /><CB k={k} w="eos" />
          </div>
        ))}
      </div>
      <Note style={{ marginTop: 8 }}>{T('بدون علامة = لا يستحق: يصبح رصيد الإجازات ومكافأة نهاية الخدمة وبدل الإجازة صفرًا في كل مكان (المسير، المخالصة، نهاية الخدمة، المخصصات، الأرصدة، تطبيق الموظف). الوضع الافتراضي بدون علامات.', 'Unchecked = not entitled: leave balance, end-of-service award and leave pay are zero everywhere. Default: unchecked.')}</Note>
    </Card>
  );
}
