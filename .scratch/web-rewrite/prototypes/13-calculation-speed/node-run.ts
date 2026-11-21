import { runAll } from './bench';
console.log(JSON.stringify(runAll(s => process.stderr.write(s + ' ')), null, 2));
