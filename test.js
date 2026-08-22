const fetch = require('node-fetch');
async function test() {
  const res = await fetch('https://google-arsenal-gdg.vercel.app/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test Team', members: ['Test Member'] })
  });
  console.log('Status:', res.status, res.statusText);
  console.log('Headers:', res.headers.raw());
  const text = await res.text();
  console.log('Body:', text);
  console.log('Body:', text);
}
test();
