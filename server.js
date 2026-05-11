const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const fs = require('fs');
require('dotenv').config();
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'lottin_films_secret_key_12345';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files correctly to avoid exposing backend files
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));

// Public index.html
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Configuration for Multer (File Uploads)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = '';
        if (file.mimetype.startsWith('video/')) {
            uploadPath = path.join(__dirname, 'assets', 'videos');
        } else if (file.mimetype.startsWith('image/')) {
            uploadPath = path.join(__dirname, 'assets', 'images');
        } else {
            return cb(new Error('Formato de arquivo inválido.'));
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const token = req.cookies.admin_token;
    if (!token) return res.status(401).json({ error: 'Acesso negado. Faça login.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido ou expirado.' });
        req.user = user;
        next();
    });
};

// Middleware for redirecting unauthenticated users from pages
const requireAdminLogin = (req, res, next) => {
    const token = req.cookies.admin_token;
    if (!token) return res.redirect('/admin/login.html');

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.redirect('/admin/login.html');
        req.user = user;
        next();
    });
};

// --- AUTH ROUTES ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Erro no servidor' });
        if (!user) return res.status(401).json({ error: 'Usuário ou senha incorretos' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Usuário ou senha incorretos' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        
        // Set cookie
        res.cookie('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({ message: 'Login realizado com sucesso', token });
    });
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('admin_token');
    res.json({ message: 'Logout realizado com sucesso' });
});

app.get('/api/check-auth', authenticateToken, (req, res) => {
    res.json({ authenticated: true, user: req.user });
});

// --- PROJECTS ROUTES ---
// Obter todos os projetos ou filtrar por categoria
app.get('/api/projects', (req, res) => {
    const { category } = req.query;
    let query = 'SELECT * FROM projects ORDER BY id DESC';
    let params = [];

    if (category) {
        query = 'SELECT * FROM projects WHERE category = ? ORDER BY id DESC';
        params = [category];
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Obter um projeto específico
app.get('/api/projects/:id', (req, res) => {
    db.get('SELECT * FROM projects WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Projeto não encontrado' });
        res.json(row);
    });
});

// Criar projeto (Protegido)
app.post('/api/projects', authenticateToken, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), (req, res) => {
    const { title, location, objective, client, equipment, category, description, date, youtube_url, video_type } = req.body;
    
    let video_url = req.files['video'] ? `./assets/videos/${req.files['video'][0].filename}` : '';
    let final_youtube_url = youtube_url || null;
    let youtube_video_id = null;

    if (video_type === 'youtube') {
        video_url = ''; // Remove qualquer lixo de upload local se youtube for selecionado
        if (final_youtube_url) {
            const match = final_youtube_url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/);
            youtube_video_id = (match && match[2].length === 11) ? match[2] : null;
        }
    } else {
        final_youtube_url = null; // Remove link se local for selecionado
    }

    let thumbnail_url = req.files['thumbnail'] ? `./assets/images/${req.files['thumbnail'][0].filename}` : '';

    const query = `
        INSERT INTO projects (title, location, objective, client, equipment, category, description, video_url, thumbnail_url, date, youtube_link, video_type, youtube_url, youtube_video_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    // We keep `youtube_link` as null to avoid breaking schema immediately, and use the new explicit columns
    const params = [title, location, objective, client, equipment, category, description, video_url, thumbnail_url, date, null, video_type, final_youtube_url, youtube_video_id];

    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, message: 'Projeto criado com sucesso' });
    });
});

// Atualizar projeto (Protegido)
app.put('/api/projects/:id', authenticateToken, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), (req, res) => {
    const { title, location, objective, client, equipment, category, description, date, youtube_url, video_type } = req.body;
    const id = req.params.id;

    db.get('SELECT video_url, thumbnail_url FROM projects WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Projeto não encontrado' });

        let video_url = row.video_url;
        let thumbnail_url = row.thumbnail_url;
        let final_youtube_url = youtube_url || null;
        let youtube_video_id = null;

        // Se o tipo escolhido for youtube, apagamos o vídeo físico existente
        if (video_type === 'youtube') {
            if (video_url && fs.existsSync(path.join(__dirname, video_url))) {
                fs.unlinkSync(path.join(__dirname, video_url));
            }
            video_url = '';
            if (final_youtube_url) {
                const match = final_youtube_url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/);
                youtube_video_id = (match && match[2].length === 11) ? match[2] : null;
            }
        } else {
            // Se for local, apagamos o link do youtube
            final_youtube_url = null;
        }

        // Se novos arquivos foram enviados, atualiza (só vai enviar se video_type === 'local' graças ao frontend)
        if (req.files && req.files['video'] && video_type === 'local') {
            if (video_url && fs.existsSync(path.join(__dirname, video_url))) {
                fs.unlinkSync(path.join(__dirname, video_url));
            }
            video_url = `./assets/videos/${req.files['video'][0].filename}`;
        }

        if (req.files && req.files['thumbnail']) {
            if (thumbnail_url && fs.existsSync(path.join(__dirname, thumbnail_url))) {
                fs.unlinkSync(path.join(__dirname, thumbnail_url));
            }
            thumbnail_url = `./assets/images/${req.files['thumbnail'][0].filename}`;
        }

        const query = `
            UPDATE projects 
            SET title = ?, location = ?, objective = ?, client = ?, equipment = ?, category = ?, description = ?, video_url = ?, thumbnail_url = ?, date = ?, youtube_link = ?, video_type = ?, youtube_url = ?, youtube_video_id = ?
            WHERE id = ?
        `;
        const params = [title, location, objective, client, equipment, category, description, video_url, thumbnail_url, date, null, video_type, final_youtube_url, youtube_video_id, id];

        db.run(query, params, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Projeto atualizado com sucesso' });
        });
    });
});

// Excluir projeto (Protegido)
app.delete('/api/projects/:id', authenticateToken, (req, res) => {
    const id = req.params.id;

    db.get('SELECT video_url, thumbnail_url FROM projects WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Projeto não encontrado' });

        // Apagar arquivos físicos
        if (row.video_url && fs.existsSync(path.join(__dirname, row.video_url))) {
            fs.unlinkSync(path.join(__dirname, row.video_url));
        }
        if (row.thumbnail_url && fs.existsSync(path.join(__dirname, row.thumbnail_url))) {
            fs.unlinkSync(path.join(__dirname, row.thumbnail_url));
        }

        db.run('DELETE FROM projects WHERE id = ?', [id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Projeto excluído permanentemente' });
        });
    });
});

// --- CATEGORIES ROUTES ---
const slugify = (str) => {
    return str.toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9 -]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-');
};

const generateCategoryPage = (slug, name, desc, bg_desktop, bg_mobile) => {
    const templatePath = path.join(__dirname, 'pages', 'template_categoria.html');
    const targetPath = path.join(__dirname, 'pages', `${slug}.html`);
    
    if (fs.existsSync(templatePath)) {
        let template = fs.readFileSync(templatePath, 'utf8');
        template = template.replace(/{{CATEGORY_NAME}}/g, name);
        template = template.replace(/{{CATEGORY_DESC}}/g, desc || '');
        
        const formatImgPath = (imgUrl) => imgUrl ? imgUrl.replace('./', '') : '';
        
        template = template.replace(/{{BG_DESKTOP}}/g, formatImgPath(bg_desktop));
        template = template.replace(/{{BG_MOBILE}}/g, formatImgPath(bg_mobile));
        
        fs.writeFileSync(targetPath, template);
    }
};

const deleteCategoryPage = (slug) => {
    const targetPath = path.join(__dirname, 'pages', `${slug}.html`);
    if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
    }
};

app.get('/api/categories', (req, res) => {
    db.all('SELECT * FROM categories ORDER BY id ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Adicionar uma contagem de projetos para cada categoria de forma assíncrona
        const promises = rows.map(cat => {
            return new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM projects WHERE category = ?', [cat.slug], (err, row) => {
                    if (err) resolve({...cat, projectCount: 0});
                    else resolve({...cat, projectCount: row.count});
                });
            });
        });
        
        Promise.all(promises).then(results => res.json(results));
    });
});

app.post('/api/categories', authenticateToken, upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'bg_desktop', maxCount: 1 }, { name: 'bg_mobile', maxCount: 1 }]), (req, res) => {
    const { name, description } = req.body;
    let slug = slugify(name);
    
    let thumbnail_url = req.files['thumbnail'] ? `./assets/images/${req.files['thumbnail'][0].filename}` : '';
    let bg_desktop_url = req.files['bg_desktop'] ? `./assets/images/${req.files['bg_desktop'][0].filename}` : '';
    let bg_mobile_url = req.files['bg_mobile'] ? `./assets/images/${req.files['bg_mobile'][0].filename}` : '';

    const query = `
        INSERT INTO categories (name, description, slug, thumbnail_url, bg_desktop_url, bg_mobile_url)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [name, description, slug, thumbnail_url, bg_desktop_url, bg_mobile_url];

    db.run(query, params, function(err) {
        if (err) {
            // Se o slug já existir, tenta adicionar um sufixo numérico simples (fallback)
            if (err.message.includes('UNIQUE constraint failed: categories.slug')) {
                 slug = slug + '-' + Date.now().toString().slice(-4);
                 db.run(query, [name, description, slug, thumbnail_url, bg_desktop_url, bg_mobile_url], function(err2) {
                     if(err2) return res.status(500).json({ error: err2.message });
                     generateCategoryPage(slug, name, description, bg_desktop_url, bg_mobile_url);
                     return res.status(201).json({ id: this.lastID, message: 'Categoria criada com sucesso' });
                 });
                 return;
            }
            return res.status(500).json({ error: err.message });
        }
        
        generateCategoryPage(slug, name, description, bg_desktop_url, bg_mobile_url);
        res.status(201).json({ id: this.lastID, message: 'Categoria criada com sucesso' });
    });
});

app.put('/api/categories/:id', authenticateToken, upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'bg_desktop', maxCount: 1 }, { name: 'bg_mobile', maxCount: 1 }]), (req, res) => {
    const id = req.params.id;
    const { name, description } = req.body;

    db.get('SELECT * FROM categories WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Categoria não encontrada' });

        let thumbnail_url = row.thumbnail_url;
        let bg_desktop_url = row.bg_desktop_url;
        let bg_mobile_url = row.bg_mobile_url;
        
        // Verifica se o nome mudou para gerar novo slug e renomear arquivo HTML
        let slug = row.slug;
        let originalSlug = row.slug;
        if (name !== row.name) {
            slug = slugify(name);
        }

        if (req.files && req.files['thumbnail']) {
            if (thumbnail_url && fs.existsSync(path.join(__dirname, thumbnail_url))) fs.unlinkSync(path.join(__dirname, thumbnail_url));
            thumbnail_url = `./assets/images/${req.files['thumbnail'][0].filename}`;
        }
        if (req.files && req.files['bg_desktop']) {
            if (bg_desktop_url && fs.existsSync(path.join(__dirname, bg_desktop_url))) fs.unlinkSync(path.join(__dirname, bg_desktop_url));
            bg_desktop_url = `./assets/images/${req.files['bg_desktop'][0].filename}`;
        }
        if (req.files && req.files['bg_mobile']) {
            if (bg_mobile_url && fs.existsSync(path.join(__dirname, bg_mobile_url))) fs.unlinkSync(path.join(__dirname, bg_mobile_url));
            bg_mobile_url = `./assets/images/${req.files['bg_mobile'][0].filename}`;
        }

        const query = `
            UPDATE categories 
            SET name = ?, description = ?, slug = ?, thumbnail_url = ?, bg_desktop_url = ?, bg_mobile_url = ?
            WHERE id = ?
        `;
        const params = [name, description, slug, thumbnail_url, bg_desktop_url, bg_mobile_url, id];

        const executeUpdate = (finalSlug) => {
            db.run(`UPDATE categories SET name = ?, description = ?, slug = ?, thumbnail_url = ?, bg_desktop_url = ?, bg_mobile_url = ? WHERE id = ?`, 
            [name, description, finalSlug, thumbnail_url, bg_desktop_url, bg_mobile_url, id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                
                if (originalSlug !== finalSlug) {
                    deleteCategoryPage(originalSlug);
                    // Atualiza também os projetos que usavam o slug antigo para o novo slug
                    db.run(`UPDATE projects SET category = ? WHERE category = ?`, [finalSlug, originalSlug]);
                }
                generateCategoryPage(finalSlug, name, description, bg_desktop_url, bg_mobile_url);
                res.json({ message: 'Categoria atualizada com sucesso' });
            });
        };

        if (slug !== originalSlug) {
            // Verificar se o novo slug já existe (exceto para a própria categoria)
            db.get(`SELECT id FROM categories WHERE slug = ? AND id != ?`, [slug, id], (err, slugRow) => {
                if (slugRow) slug = slug + '-' + Date.now().toString().slice(-4);
                executeUpdate(slug);
            });
        } else {
            executeUpdate(slug);
        }
    });
});

app.delete('/api/categories/:id', authenticateToken, (req, res) => {
    const id = req.params.id;

    db.get('SELECT slug, thumbnail_url, bg_desktop_url, bg_mobile_url FROM categories WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Categoria não encontrada' });

        if (row.thumbnail_url && fs.existsSync(path.join(__dirname, row.thumbnail_url))) fs.unlinkSync(path.join(__dirname, row.thumbnail_url));
        if (row.bg_desktop_url && fs.existsSync(path.join(__dirname, row.bg_desktop_url))) fs.unlinkSync(path.join(__dirname, row.bg_desktop_url));
        if (row.bg_mobile_url && fs.existsSync(path.join(__dirname, row.bg_mobile_url))) fs.unlinkSync(path.join(__dirname, row.bg_mobile_url));

        deleteCategoryPage(row.slug);

        db.run('DELETE FROM categories WHERE id = ?', [id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            // Remove the projects related to this category?
            // The prompt says "A ação não poderá ser desfeita" but didn't specify cascading. It's safer not to delete projects automatically.
            res.json({ message: 'Categoria excluída permanentemente' });
        });
    });
});

// --- CONTACT INFO ROUTES ---
app.get('/api/contact', (req, res) => {
    db.get('SELECT * FROM contact_info WHERE id = 1', (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || {});
    });
});

app.put('/api/contact', authenticateToken, upload.single('profile_image'), (req, res) => {
    const { name, profession, city, description, email, whatsapp, instagram } = req.body;
    
    db.get('SELECT profile_image_url FROM contact_info WHERE id = 1', (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        let profile_image_url = row ? row.profile_image_url : null;

        if (req.file) {
            if (profile_image_url && profile_image_url !== './assets/images/ImagemMinha2.webp' && fs.existsSync(path.join(__dirname, profile_image_url))) {
                fs.unlinkSync(path.join(__dirname, profile_image_url));
            }
            profile_image_url = `./assets/images/${req.file.filename}`;
        }

        const query = `
            UPDATE contact_info 
            SET name = ?, profession = ?, city = ?, description = ?, email = ?, whatsapp = ?, instagram = ?, profile_image_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `;
        const params = [name, profession, city, description, email, whatsapp, instagram, profile_image_url];

        db.run(query, params, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Informações de contato atualizadas com sucesso', profile_image_url });
        });
    });
});


// Admin Login route
app.get('/admin/login.html', (req, res) => {
    const token = req.cookies.admin_token;
    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) {
                return res.redirect('/admin/'); // Já está logado, vai direto pro painel
            }
            res.sendFile(path.join(__dirname, 'admin', 'login.html'));
        });
    } else {
        res.sendFile(path.join(__dirname, 'admin', 'login.html'));
    }
});

// Protected Admin routes
app.get(['/admin', '/admin/', '/admin/index.html', '/admin-panel'], requireAdminLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
