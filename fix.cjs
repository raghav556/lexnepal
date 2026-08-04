const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const files = walk('next-app/app/api/v1/envelopes').filter(f => f.endsWith('route.ts'));
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/`n/g, '\n');
  fs.writeFileSync(f, content);
  console.log('Fixed newlines', f);
});
