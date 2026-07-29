/* アプリ自身の3Dレンダラで、椅子以外の5テーマのサンプル画像を事前生成する。
   各テーマの合成コーパス（buildCorpus）と同じプロファイル分布を使い、
   1点ずつ視点を少し変えて描く。出力は samples/renders.js */
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage({ viewport:{width:1400,height:1000} });
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('file:///home/user/design_generative_visual/index.html');
  await pg.waitForTimeout(2500);
  const data = await pg.evaluate(() => {
    const themes = ["glasses","fridge","ct","robot","bus"];
    const out = {};
    const save = { preset:state.preset, yaw:state.yaw, pitch:state.pitch, goal:{...state.goal} };
    themes.forEach(id => {
      const items = buildCorpus(id);
      out[id] = items.map((it, i) => {
        state.preset = id;
        AXES.forEach(a => state.goal[a.key] = it.p[a.key]);
        // 視点は決まった揺らぎ（同じ入力なら同じ絵になる）
        state.yaw = -28 + ((i * 47) % 31) - 15;
        state.pitch = -14 - ((i * 29) % 9) + 4;
        const c = document.createElement('canvas'); c.width = c.height = 448;
        render3D(c);
        return { id:i, cat:it.cat, ci:it.ci, name:it.name, p:it.p,
                 src:c.toDataURL('image/jpeg', .55) };
      });
    });
    state.preset = save.preset; state.yaw = save.yaw; state.pitch = save.pitch;
    Object.assign(state.goal, save.goal);
    return out;
  });
  const counts = Object.fromEntries(Object.entries(data).map(([k,v]) => [k, v.length]));
  const body = "/* 自動生成ファイル。アプリ自身の3Dレンダラ（render3D）で各テーマの合成コーパスを事前描画したもの。\n"
    + "   作り直すときは tools/gensamples.js を実行する。\n"
    + "   実写に差し替えるときも同じ形式（{id, cat, ci, name, p, src}）に合わせれば、そのまま載る。 */\n"
    + "window.__SAMPLES = " + JSON.stringify(data) + ";\n";
  fs.writeFileSync('/home/user/design_generative_visual/samples/renders.js', body);
  console.log('counts', JSON.stringify(counts), 'bytes', body.length);
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
