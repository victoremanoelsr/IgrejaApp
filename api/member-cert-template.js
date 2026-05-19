const SUPABASE_URL = 'https://tywgekdisyxflcfjwaou.supabase.co';

const sbFetch = async (path, serviceKey) => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) return null;
  return response.json();
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { church_id, letter_type } = req.query;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!church_id || !letter_type || !SERVICE_KEY) {
    return res.status(200).json({ template: null, church: null });
  }

  try {
    const [templates, churches] = await Promise.all([
      sbFetch(
        `letter_templates?church_id=eq.${encodeURIComponent(church_id)}` +
        `&type=in.(${encodeURIComponent(letter_type)},GENERICO)` +
        `&order=created_at.desc`,
        SERVICE_KEY,
      ),
      sbFetch(
        `churches?id=eq.${encodeURIComponent(church_id)}&select=id,name,address,pastor_name,logo_url`,
        SERVICE_KEY,
      ),
    ]);

    const templateList = Array.isArray(templates) ? templates : [];
    const template =
      templateList.find((t) => t.type === letter_type) ||
      templateList.find((t) => t.type === 'GENERICO') ||
      null;

    const church =
      Array.isArray(churches) && churches.length > 0 ? churches[0] : null;

    return res.status(200).json({ template, church });
  } catch (e) {
    console.error('[api/member-cert-template] error:', e);
    return res.status(200).json({ template: null, church: null });
  }
}
