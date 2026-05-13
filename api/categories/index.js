import { query } from '../../src/db/index.js';
import { authenticateToken } from '../../src/utils/auth.js';
import { put } from '@vercel/blob';
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
  const { method } = req;

  if (method === 'GET') {
    try {
      const { slug } = req.query;

      if (slug) {
        const result = await query('SELECT * FROM categories WHERE slug = $1', [slug]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Categoria não encontrada' });
        return res.json(result.rows[0]);
      }

      const result = await query('SELECT * FROM categories ORDER BY id ASC');
      
      // Adicionar contagem de projetos
      const categories = await Promise.all(result.rows.map(async (cat) => {
        const countRes = await query('SELECT COUNT(*) as count FROM projects WHERE category = $1', [cat.slug]);
        return { ...cat, projectCount: parseInt(countRes.rows[0].count) };
      }));

      return res.json(categories);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'POST') {
    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ error: 'Acesso negado' });

    const form = formidable({});
    try {
      const [fields, files] = await form.parse(req);
      
      const name = fields.name?.[0];
      const description = fields.description?.[0];
      let slug = slugify(name);
      
      // Verificar se slug existe
      const existing = await query('SELECT id FROM categories WHERE slug = $1', [slug]);
      if (existing.rows.length > 0) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }

      let thumbnail_url = '';
      if (files.thumbnail?.[0]) {
        const blob = await put(`categories/${Date.now()}-${files.thumbnail[0].originalFilename}`, fs.readFileSync(files.thumbnail[0].filepath), { access: 'public' });
        thumbnail_url = blob.url;
      }

      let bg_desktop_url = '';
      if (files.bg_desktop?.[0]) {
        const blob = await put(`categories/${Date.now()}-${files.bg_desktop[0].originalFilename}`, fs.readFileSync(files.bg_desktop[0].filepath), { access: 'public' });
        bg_desktop_url = blob.url;
      }

      let bg_mobile_url = '';
      if (files.bg_mobile?.[0]) {
        const blob = await put(`categories/${Date.now()}-${files.bg_mobile[0].originalFilename}`, fs.readFileSync(files.bg_mobile[0].filepath), { access: 'public' });
        bg_mobile_url = blob.url;
      }

      const sql = `
        INSERT INTO categories (name, description, slug, thumbnail_url, bg_desktop_url, bg_mobile_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      const result = await query(sql, [name, description, slug, thumbnail_url, bg_desktop_url, bg_mobile_url]);
      
      return res.status(201).json({ id: result.rows[0].id, message: 'Categoria criada com sucesso' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${method} Not Allowed`);
}
