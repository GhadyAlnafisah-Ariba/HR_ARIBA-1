/* eslint-disable */
// @ts-nocheck
// leaveAnnual + leaveExempt from ARIBA_HR_React_22oct/src/engines/leave.js (annual days of the contract; Egypt by age and service;
// consultant / Tamheer / trainee have none unless Settings grants it), verbatim.
import * as C from './country';
import { noLeave } from './empkind';
export const leaveExempt = (e) => !!e && noLeave(e);
export function leaveAnnual(e) { if (leaveExempt(e)) return 0; if (C.isEG()) return C.annualDays(e, new Date()); return Math.max(0, Number(e.leaveDaysContract || e.ldc || 21) || 21); }
