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

export default async function handler(req, res) {
  const { id } = req.query;
  const { method } = req;

  if (method === 'GET') {
    try {
      const result = await query('SELECT * FROM projects WHERE id = $1', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Projeto não encontrado' });
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
      
      const currentResult = await query('SELECT video_url, thumbnail_url FROM projects WHERE id = $1', [id]);
      if (currentResult.rows.length === 0) return res.status(404).json({ error: 'Projeto não encontrado' });
      
      const currentProject = currentResult.rows[0];
      
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

      let video_url = currentProject.video_url;
      let youtube_video_id = null;

      if (video_type === 'youtube') {
        // Se mudou para youtube, deleta o vídeo antigo do blob se existia
        if (video_url && video_url.includes('public.blob.vercel-storage.com')) {
           await del(video_url);
        }
        video_url = '';
        if (youtube_url) {
          const match = youtube_url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/);
          youtube_video_id = (match && match[2].length === 11) ? match[2] : null;
        }
      } else if (files.video?.[0]) {
        // Se enviou novo vídeo local, deleta o antigo e sobe o novo
        if (video_url && video_url.includes('public.blob.vercel-storage.com')) {
           await del(video_url);
        }
        const videoFile = files.video[0];
        const blob = await put(`videos/${Date.now()}-${videoFile.originalFilename}`, fs.readFileSync(videoFile.filepath), {
          access: 'public',
        });
        video_url = blob.url;
      }

      let thumbnail_url = currentProject.thumbnail_url;
      if (files.thumbnail?.[0]) {
        if (thumbnail_url && thumbnail_url.includes('public.blob.vercel-storage.com')) {
           await del(thumbnail_url);
        }
        const thumbFile = files.thumbnail[0];
        const blob = await put(`thumbnails/${Date.now()}-${thumbFile.originalFilename}`, fs.readFileSync(thumbFile.filepath), {
          access: 'public',
        });
        thumbnail_url = blob.url;
      }

      const sql = `
        UPDATE projects 
        SET title = $1, location = $2, objective = $3, client = $4, equipment = $5, category = $6, description = $7, video_url = $8, thumbnail_url = $9, date = $10, video_type = $11, youtube_url = $12, youtube_video_id = $13
        WHERE id = $14
      `;
      const params = [title, location, objective, client, equipment, category, description, video_url, thumbnail_url, date, video_type, youtube_url, youtube_video_id, id];

      await query(sql, params);
      return res.json({ message: 'Projeto atualizado com sucesso' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'DELETE') {
    const user = authenticateToken(req);
    if (!user) return res.status(401).json({ error: 'Acesso negado' });

    try {
      const currentResult = await query('SELECT video_url, thumbnail_url FROM projects WHERE id = $1', [id]);
      if (currentResult.rows.length === 0) return res.status(404).json({ error: 'Projeto não encontrado' });
      
      const { video_url, thumbnail_url } = currentResult.rows[0];
      
      if (video_url && video_url.includes('public.blob.vercel-storage.com')) await del(video_url);
      if (thumbnail_url && thumbnail_url.includes('public.blob.vercel-storage.com')) await del(thumbnail_url);

      await query('DELETE FROM projects WHERE id = $1', [id]);
      return res.json({ message: 'Projeto excluído com sucesso' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${method} Not Allowed`);
}
