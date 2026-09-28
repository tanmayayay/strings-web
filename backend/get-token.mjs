import 'dotenv/config';
const base = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/, '');
const res = await fetch(base + '/auth/v1/token?grant_type=password', {
  method: 'POST',
  headers: { apikey: process.env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'demo@strings.app', password: 'DemoPass123!' })
});
const j = await res.json();
if (!res.ok) { console.error('SIGNIN FAILED:', JSON.stringify(j).slice(0, 200)); process.exit(1); }
const fs = await import('fs');
fs.writeFileSync('/tmp/jwt.txt', j.access_token);
console.log('token saved, length', j.access_token.length);
