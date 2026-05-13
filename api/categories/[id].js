import { query } from '../../src/db/index.js';
import { authenticateToken } from '../../src/utils/auth.js';
import { put, del } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const slugify = (str) => {
    return str.toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9 -]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-');
};

export default async function handler(req, res) {
  const { id } = req.query;
  const { method } = req;

  if (method === 'GET') {
    try {
      const result = await query('SELECT * FROM categories WHERE id = $1', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Categoria não encontrada' });
      return res.json(result.rows[0]);
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
      
      const currentRes = await query('SELECT * FROM categories WHERE id = $1', [id]);
      if (currentRes.rows.length === 0) return res.status(404).json({ error: 'Categoria não encontrada' });
      const current = currentRes.rows[0];

      const name = fields.name?.[0];
      const description = fields.description?.[0];
      let slug = current.slug;
      if (name !== current.name) {
          slug = slugify(name);
          const existing = await query('SELECT id FROM categories WHERE slug = $1 AND id != $2', [slug, id]);
          if (existing.rows.length > 0) slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }

      let thumbnail_url = current.thumbnail_url;
      if (files.thumbnail?.[0]) {
        if (thumbnail_url?.includes('blob.vercel-storage.com')) await del(thumbnail_url);
        const blob = await put(`categories/${Date.now()}-${files.thumbnail[0].originalFilename}`, fs.readFileSync(files.thumbnail[0].filepath), { access: 'public' });
        thumbnail_url = blob.url;
      }

      let bg_desktop_url = current.bg_desktop_url;
      if (files.bg_desktop?.[0]) {
        if (bg_desktop_url?.includes('blob.vercel-storage.com')) await del(bg_desktop_url);
        const blob = await put(`categories/${Date.now()}-${files.bg_desktop[0].originalFilename}`, fs.readFileSync(files.bg_desktop[0].filepath), { access: 'public' });
        bg_desktop_url = blob.url;
      }

      let bg_mobile_url = current.bg_mobile_url;
      if (files.bg_mobile?.[0]) {
        if (bg_mobile_url?.includes('blob.vercel-storage.com')) await del(bg_mobile_url);
        const blob = await put(`categories/${Date.now()}-${files.bg_mobile[0].originalFilename}`, fs.readFileSync(files.bg_mobile[0].filepath), { access: 'public' });
        bg_mobile_url = blob.url;
      }

      await query(
        'UPDATE categories SET name = $1, description = $2, slug = $3, thumbnail_url = $4, bg_desktop_url = $5, bg_mobile_url = $6 WHERE id = $7',
        [name, description, slug, thumbnail_url, bg_desktop_url, bg_mobile_url, id]
      );

      if (slug !== current.slug) {
          await query('UPDATE projects SET category = $1 WHERE category = $2', [slug, current.slug]);
      }

      return res.json({ message: 'Categoria atualizada com sucesso' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'DELETE') {
    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ error: 'Acesso negado' });

    try {
      const currentRes = await query('SELECT * FROM categories WHERE id = $1', [id]);
      if (currentRes.rows.length === 0) return res.status(404).json({ error: 'Categoria não encontrada' });
      const { thumbnail_url, bg_desktop_url, bg_mobile_url } = currentRes.rows[0];

      if (thumbnail_url?.includes('blob.vercel-storage.com')) await del(thumbnail_url);
      if (bg_desktop_url?.includes('blob.vercel-storage.com')) await del(bg_desktop_url);
      if (bg_mobile_url?.includes('blob.vercel-storage.com')) await del(bg_mobile_url);

      await query('DELETE FROM categories WHERE id = $1', [id]);
      return res.json({ message: 'Categoria excluída com sucesso' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${method} Not Allowed`);
}
