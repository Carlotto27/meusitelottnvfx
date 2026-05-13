import { query } from '../src/db/index.js';
import { authenticateToken } from '../src/utils/auth.js';
import { put, del } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'GET') {
    try {
      const result = await query('SELECT * FROM contact_info WHERE id = 1');
      return res.json(result.rows[0] || {});
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'PUT') {
    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ error: 'Acesso negado' });

    const form = formidable({});
    try {
      const [fields, files] = await form.parse(req);
      
      const currentRes = await query('SELECT profile_image_url FROM contact_info WHERE id = 1');
      let profile_image_url = currentRes.rows[0]?.profile_image_url;

      if (files.profile_image?.[0]) {
        if (profile_image_url?.includes('blob.vercel-storage.com')) await del(profile_image_url);
        const blob = await put(`contact/${Date.now()}-${files.profile_image[0].originalFilename}`, fs.readFileSync(files.profile_image[0].filepath), { access: 'public' });
        profile_image_url = blob.url;
      }

      const { name, profession, city, description, email, whatsapp, instagram } = fields;

      await query(
        `UPDATE contact_info 
         SET name = $1, profession = $2, city = $3, description = $4, email = $5, whatsapp = $6, instagram = $7, profile_image_url = $8, updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`,
        [name?.[0], profession?.[0], city?.[0], description?.[0], email?.[0], whatsapp?.[0], instagram?.[0], profile_image_url]
      );

      return res.json({ message: 'Contato atualizado com sucesso', profile_image_url });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  res.status(405).end(`Method ${method} Not Allowed`);
}
