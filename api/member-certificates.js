const SUPABASE_URL = 'https://tywgekdisyxflcfjwaou.supabase.co';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { church_id, member_id } = req.query;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!church_id || !member_id || !SERVICE_KEY) {
    return res.status(200).json([]);
  }

  try {
    const url =
      `${SUPABASE_URL}/rest/v1/letter_history` +
      `?church_id=eq.${encodeURIComponent(church_id)}` +
      `&member_id=eq.${encodeURIComponent(member_id)}` +
      `&letter_type=in.(BATISMO,APRESENTACAO)` +
      `&order=issued_at.desc`;

    const response = await fetch(url, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[api/member-certificates] Supabase error:', response.status);
      return res.status(200).json([]);
    }

    const data = await response.json();
    return res.status(200).json(Array.isArray(data) ? data : []);
  } catch (e) {
    console.error('[api/member-certificates] error:', e);
    return res.status(200).json([]);
  }
}
