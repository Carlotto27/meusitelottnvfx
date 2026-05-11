const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar com o banco de dados SQLite', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        db.run('PRAGMA foreign_keys = ON');
    }
});

// Inicialização das tabelas
const initDb = () => {
    db.serialize(() => {
        // Tabela de Projetos (Portfólio)
        db.run(`
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                location TEXT,
                objective TEXT,
                client TEXT,
                equipment TEXT,
                category TEXT NOT NULL,
                description TEXT,
                video_url TEXT NOT NULL,
                thumbnail_url TEXT NOT NULL,
                date TEXT,
                youtube_link TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tenta adicionar a coluna caso a tabela já exista
        db.run('ALTER TABLE projects ADD COLUMN youtube_link TEXT', (err) => {
            if (!err) {
                console.log('Coluna youtube_link adicionada à tabela projects.');
            }
        });
        db.run('ALTER TABLE projects ADD COLUMN video_type TEXT DEFAULT "local"', (err) => {
            if (!err) console.log('Coluna video_type adicionada à tabela projects.');
        });
        db.run('ALTER TABLE projects ADD COLUMN youtube_url TEXT', (err) => {
            if (!err) console.log('Coluna youtube_url adicionada à tabela projects.');
        });
        db.run('ALTER TABLE projects ADD COLUMN youtube_video_id TEXT', (err) => {
            if (!err) console.log('Coluna youtube_video_id adicionada à tabela projects.');
        });

        // Tabela de Contato
        db.run(`
            CREATE TABLE IF NOT EXISTS contact_info (
                id INTEGER PRIMARY KEY CHECK (id = 1), -- Garante apenas uma linha
                name TEXT,
                profession TEXT,
                city TEXT,
                description TEXT,
                email TEXT,
                whatsapp TEXT,
                instagram TEXT,
                profile_image_url TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabela de Categorias
        db.run(`
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                slug TEXT UNIQUE NOT NULL,
                thumbnail_url TEXT NOT NULL,
                bg_desktop_url TEXT,
                bg_mobile_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabela de Usuários (Admin)
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        `, async () => {
            // Criar um usuário admin padrão ou atualizar a senha se já existir
            const adminPassword = process.env.ADMIN_PASSWORD || '#C4RL0Ss1t3!';
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            db.get(`SELECT id FROM users WHERE username = ?`, ['admin'], async (err, row) => {
                if (!row) {
                    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, ['admin', hashedPassword]);
                    console.log('Usuário admin criado a partir do .env');
                } else {
                    db.run(`UPDATE users SET password = ? WHERE username = ?`, [hashedPassword, 'admin']);
                    console.log('Senha do usuário admin atualizada a partir do .env');
                }
            });
        });

        // Inserir dados de contato padrão se vazio
        db.get(`SELECT id FROM contact_info WHERE id = 1`, (err, row) => {
            if (!row) {
                db.run(`
                    INSERT INTO contact_info (id, name, profession, city, description, email, whatsapp, instagram, profile_image_url) 
                    VALUES (1, 'Carlos Eduardo', 'Filmmaker e Editor', '📍 Goiânia | GO', '🧠 Curioso e sempre em busca de novos efeitos e técnicas visuais.\\n🎥 Especialista em edição, motion e pós-produção.\\n👨‍💻 Freelancer de criação audiovisual.', 'lottinvfx@gmail.com', '5562986531443', 'lottin.films', './assets/images/ImagemMinha2.webp')
                `);
            }
        });
        
        // Inserir categorias padrão se a tabela estiver vazia
        db.get(`SELECT count(*) as count FROM categories`, (err, row) => {
            if (!err && row && row.count === 0) {
                const defaultCategories = [
                    { name: 'Carros', desc: 'Aqui você encontra produções automotivas que unem qualidade cinematográfica e criatividade visual, de vídeos premium a edições com efeitos mais diferenciados!', slug: 'carros', thumb: './assets/images/thumbs-carros.webp', bg_desktop: './assets/images/fundo-porsche.webp', bg_mobile: './assets/images/fundo-porsche-mobile.webp' },
                    { name: 'Comerciais', desc: 'Produções desenvolvidas para dar destaque a marcas e negócios. Vídeos pensados estrategicamente para engajar, transmitir profissionalismo e gerar resultados!', slug: 'comerciais', thumb: './assets/images/thumbs-comerciais.webp', bg_desktop: './assets/images/fundo-porsche.webp', bg_mobile: './assets/images/fundo-porsche-mobile.webp' },
                    { name: 'Eventos', desc: 'Cobertura de eventos com um olhar cinematográfico. Vídeos que capturam a energia, a emoção e os momentos mais importantes com alta qualidade.', slug: 'eventos', thumb: './assets/images/thumbs-eventos.webp', bg_desktop: './assets/images/fundo-porsche.webp', bg_mobile: './assets/images/fundo-porsche-mobile.webp' },
                    { name: 'Imobiliário', desc: 'Apresentação de imóveis em alto padrão. Gravações fluidas que valorizam cada ambiente e despertam o desejo no cliente.', slug: 'imobiliario', thumb: './assets/images/thumbs-imobiliario.webp', bg_desktop: './assets/images/fundo-porsche.webp', bg_mobile: './assets/images/fundo-porsche-mobile.webp' },
                    { name: 'Institucionais', desc: 'Apresente a sua empresa com credibilidade e impacto visual. Vídeos que contam a sua história, missão e valores de forma profissional e envolvente.', slug: 'institucionais', thumb: './assets/images/thumbs-institucionais.webp', bg_desktop: './assets/images/fundo-porsche.webp', bg_mobile: './assets/images/fundo-porsche-mobile.webp' },
                    { name: 'Edições', desc: 'Edições dinâmicas, modernas e voltadas para retenção. Seja para vídeos curtos, VSLs ou conteúdos digitais, cada detalhe é pensado para prender a atenção.', slug: 'edicoes', thumb: './assets/images/thumb-edicoes.webp', bg_desktop: './assets/images/fundo-porsche.webp', bg_mobile: './assets/images/fundo-porsche-mobile.webp' },
                    { name: 'Trends', desc: 'Vídeos curtos, rápidos e no ritmo das redes sociais. Foco em engajamento, tendências do momento e formatos pensados para viralizar.', slug: 'trends', thumb: './assets/images/thumb-trends.webp', bg_desktop: './assets/images/fundo-porsche.webp', bg_mobile: './assets/images/fundo-porsche-mobile.webp' }
                ];
                
                const stmt = db.prepare(`INSERT INTO categories (name, description, slug, thumbnail_url, bg_desktop_url, bg_mobile_url) VALUES (?, ?, ?, ?, ?, ?)`);
                defaultCategories.forEach(cat => {
                    stmt.run(cat.name, cat.desc, cat.slug, cat.thumb, cat.bg_desktop, cat.bg_mobile);
                });
                stmt.finalize();
                console.log('Categorias padrão inseridas no banco de dados.');
            }
        });
    });
};

initDb();

module.exports = db;
