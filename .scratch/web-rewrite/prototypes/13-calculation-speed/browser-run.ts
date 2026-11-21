import { runAll } from './bench';
const out = runAll();
(out as any).userAgent = navigator.userAgent;
document.getElementById('out')!.textContent = JSON.stringify(out, null, 2);
