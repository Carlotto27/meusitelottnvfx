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

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'GET') {
    try {
      const { category } = req.query;
      let sql = 'SELECT * FROM projects ORDER BY id DESC';
      let params = [];

      if (category) {
        sql = 'SELECT * FROM projects WHERE category = $1 ORDER BY id DESC';
        params = [category];
      }

      const result = await query(sql, params);
      return res.json(result.rows);
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
      
      const title = fields.title?.[0];
      const location = fields.location?.[0];
      const objective = fields.objective?.[0];
      const client = fields.client?.[0];
      const equipment = fields.equipment?.[0];
      const category = fields.category?.[0];
      const description = fields.description?.[0];
      const date = fields.date?.[0];
      const youtube_url = fields.youtube_url?.[0];
      const video_type = fields.video_type?.[0];

      let video_url = '';
      let youtube_video_id = null;

      if (video_type === 'youtube') {
        if (youtube_url) {
          const match = youtube_url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/);
          youtube_video_id = (match && match[2].length === 11) ? match[2] : null;
        }
      } else if (files.video?.[0]) {
        const videoFile = files.video[0];
        const blob = await put(`videos/${Date.now()}-${videoFile.originalFilename}`, fs.readFileSync(videoFile.filepath), {
          access: 'public',
        });
        video_url = blob.url;
      }

      let thumbnail_url = '';
      if (files.thumbnail?.[0]) {
        const thumbFile = files.thumbnail[0];
        const blob = await put(`thumbnails/${Date.now()}-${thumbFile.originalFilename}`, fs.readFileSync(thumbFile.filepath), {
          access: 'public',
        });
        thumbnail_url = blob.url;
      }

      const sql = `
        INSERT INTO projects (title, location, objective, client, equipment, category, description, video_url, thumbnail_url, date, video_type, youtube_url, youtube_video_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `;
      const params = [title, location, objective, client, equipment, category, description, video_url, thumbnail_url, date, video_type, youtube_url, youtube_video_id];

      const result = await query(sql, params);
      return res.status(201).json({ id: result.rows[0].id, message: 'Projeto criado com sucesso' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${method} Not Allowed`);
}
