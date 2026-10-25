import { useEffect } from 'react';
import { usePerm } from '../store/AppStore.jsx';
import { runAutoOncePerDay } from '../lib/occasions.js';

/** يشغّل التهاني التلقائية (ميلاد/سنوية/مناسبات مسجّلة) مرة في اليوم أول ما يفتح مسؤول البرنامج. آمن: السيرفر يمنع التكرار. */
export default function OccAuto() {
  const can = usePerm().edit('employees');
  useEffect(() => { if (!can) return undefined; const t = setTimeout(() => runAutoOncePerDay('hr'), 6000); return () => clearTimeout(t); }, [can]);
  return null;
}
