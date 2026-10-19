// 画面なしでゲームを動かすハーネス：本物のcanvas(@napi-rs/canvas)で描画し、PNGに書き出せる
const fs = require('fs'), vm = require('vm');
const { createCanvas } = require('@napi-rs/canvas');

const html = fs.readFileSync(process.argv[2], 'utf8');
const js = html.split('<script>')[1].split('</script>')[0];
const W_ = +process.env.VW || 390, H_ = +process.env.VH || 800;

const real = createCanvas(W_, H_);
real.style = {}; real.addEventListener = () => {};
const els = { c: real };
const mkEl = id => els[id] || (els[id] = {
  id, hidden: false, scrollTop: 0, innerHTML: '', textContent: '', style: {}, dataset: {},
  classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, setPointerCapture() {},
  children: [{ textContent: '', classList: { toggle() {} } }, { textContent: '', classList: { toggle() {} } }],
});
const store = {};
const g = globalThis;
g.window = g; g.innerWidth = W_; g.innerHeight = H_; g.devicePixelRatio = 1;
g.document = { getElementById: mkEl, querySelectorAll: () => [], addEventListener() {}, createElement: () => createCanvas(1, 1) };
g.addEventListener = () => {};
g.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
g.__savePng = (name) => fs.writeFileSync(name, real.toBuffer('image/png'));
g.__store = store;

const test = process.argv[3] ? fs.readFileSync(process.argv[3], 'utf8') : '';
vm.runInThisContext(js + '\n' + test, { filename: 'game.js' });
