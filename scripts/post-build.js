const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, '../dist/build/mp-weixin/common/assets.js'),
  path.join(__dirname, '../dist/dev/mp-weixin/common/assets.js')
];

targets.forEach(target => {
  try {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(target)) {
      fs.writeFileSync(target, '"use strict";\nmodule.exports = {};\n');
    }
  } catch (err) {
    // ignore
  }
});
