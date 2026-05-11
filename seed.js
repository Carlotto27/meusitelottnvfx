const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const db = require('./database');

const pagesDir = path.join(__dirname, 'pages');

const extractData = () => {
    fs.readdir(pagesDir, (err, files) => {
        if (err) return console.error(err);

        files.filter(f => f.endsWith('.html')).forEach(file => {
            const category = file.replace('.html', '');
            const filePath = path.join(pagesDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const $ = cheerio.load(content);

            $('.card2').each((i, el) => {
                const title = $(el).find('h3').text().trim();
                const video_url_raw = $(el).find('source').attr('data-src') || $(el).find('source').attr('src');
                const thumbnail_url_raw = $(el).find('video').attr('poster');
                
                // Tratar os caminhos para remover '../'
                const video_url = video_url_raw ? video_url_raw.replace('../', './') : '';
                const thumbnail_url = thumbnail_url_raw ? thumbnail_url_raw.replace('../', './') : '';

                let location = '', objective = '', equipment = '', client = '', date = '', description = '';

                // O texto vem em tags p e strong.
                // Exemplo: <p><strong>Local:</strong> Anápolis<br><strong>Objetivo:</strong> ...</p>
                const pHtml = $(el).find('p').html();
                if (pHtml) {
                    const parts = pHtml.split('<br>');
                    parts.forEach(part => {
                        const cleanPart = cheerio.load(part).text().trim();
                        if (cleanPart.includes('Local:')) location = cleanPart.replace('Local:', '').trim();
                        if (cleanPart.includes('Objetivo:')) objective = cleanPart.replace('Objetivo:', '').trim();
                        if (cleanPart.includes('Equipamentos:')) equipment = cleanPart.replace('Equipamentos:', '').trim();
                        if (cleanPart.includes('Cliente:')) client = cleanPart.replace('Cliente:', '').trim();
                        if (cleanPart.includes('Data:')) date = cleanPart.replace('Data:', '').trim();
                        if (cleanPart.includes('Destaques:')) description = cleanPart.replace('Destaques:', '').trim();
                    });
                }

                // Inserir no banco (apenas se tiver título e video)
                if (title && video_url) {
                    db.get('SELECT id FROM projects WHERE title = ? AND category = ?', [title, category], (err, row) => {
                        if (!row) {
                            db.run(`
                                INSERT INTO projects (title, location, objective, client, equipment, category, description, video_url, thumbnail_url, date)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `, [title, location, objective, client, equipment, category, description, video_url, thumbnail_url, date], (err) => {
                                if (err) console.error("Erro ao inserir:", err.message);
                                else console.log(`Inserido: ${title} (${category})`);
                            });
                        }
                    });
                }
            });
        });
    });
};

setTimeout(extractData, 1000); // Aguarda banco conectar
