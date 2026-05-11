document.addEventListener('DOMContentLoaded', () => {
    // Verificar Autenticação
    fetch('/api/check-auth')
        .then(res => {
            if (!res.ok) throw new Error('Not authenticated');
        })
        .catch(() => {
            window.location.href = '/admin/login.html';
        });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/admin/login.html';
        });
    }

    // TABS
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    const sections = document.querySelectorAll('.admin-section');

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            item.classList.add('active');
            document.getElementById(`tab-${item.dataset.tab}`).classList.add('active');
        });
    });

    // --- PORTFOLIO LOGIC ---
    let projectsData = [];
    let currentProjectId = null;

    const loadProjects = async () => {
        try {
            const category = document.getElementById('filterCategory').value;
            const url = category ? `/api/projects?category=${category}` : '/api/projects';
            const res = await fetch(url);
            projectsData = await res.json();
            renderProjects();
        } catch (error) {
            console.error('Erro ao carregar projetos:', error);
        }
    };

    const renderProjects = () => {
        const grid = document.getElementById('projectsGrid');
        const searchTerm = document.getElementById('searchProject').value.toLowerCase();
        
        grid.innerHTML = '';
        
        const filtered = projectsData.filter(p => p.title.toLowerCase().includes(searchTerm));

        if (filtered.length === 0) {
            grid.innerHTML = '<p>Nenhum projeto encontrado.</p>';
            return;
        }

        filtered.forEach(proj => {
            const card = document.createElement('div');
            card.className = 'admin-card';
            card.innerHTML = `
                <img src="../${proj.thumbnail_url}" alt="${proj.title}" class="admin-card-thumb">
                <div class="admin-card-content">
                    <span class="cat-badge">${proj.category}</span>
                    <h4>${proj.title}</h4>
                    <div class="admin-card-actions">
                        <button class="admin-btn secondary-btn btn-edit" data-id="${proj.id}">Editar</button>
                        <button class="admin-btn danger-btn btn-delete" data-id="${proj.id}">Excluir</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        // Event Listeners for Edit and Delete
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => openProjectModal(e.target.dataset.id));
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => openDeleteModal(e.target.dataset.id));
        });
    };

    document.getElementById('filterCategory').addEventListener('change', loadProjects);
    document.getElementById('searchProject').addEventListener('input', renderProjects);

    // MODAL DE PROJETO (NOVO / EDITAR)
    const projectModal = document.getElementById('projectModal');
    const projectForm = document.getElementById('projectForm');
    const projectFeedback = document.getElementById('projectFeedback');

    document.getElementById('btnNewProject').addEventListener('click', () => {
        openProjectModal(null);
    });

    document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            projectModal.classList.remove('active');
            document.getElementById('deleteModal').classList.remove('active');
        });
    });

    const openProjectModal = (id) => {
        projectForm.reset();
        projectFeedback.textContent = '';
        document.getElementById('thumbPreviewText').textContent = '';
        document.getElementById('videoPreviewText').textContent = '';
        
        if(document.getElementById('projYoutubeLink')) {
            document.getElementById('projYoutubeLink').style.borderColor = '#333';
            document.getElementById('youtubeStatusIcon').innerHTML = '';
            document.getElementById('youtubeFeedback').textContent = '';
        }

        if (id) {
            currentProjectId = id;
            document.getElementById('modalProjectTitle').textContent = 'Editar Projeto';
            const proj = projectsData.find(p => p.id == id);
            if (proj) {
                document.getElementById('projectId').value = proj.id;
                document.getElementById('projTitle').value = proj.title;
                document.getElementById('projCategory').value = proj.category;
                document.getElementById('projLocation').value = proj.location || '';
                document.getElementById('projClient').value = proj.client || '';
                document.getElementById('projEquipment').value = proj.equipment || '';
                document.getElementById('projObjective').value = proj.objective || '';
                document.getElementById('projDescription').value = proj.description || '';
                
                if (proj.video_type === 'youtube') {
                    document.getElementById('videoType').value = 'youtube';
                    document.getElementById('youtubeContainer').style.display = 'block';
                    document.getElementById('localVideoContainer').style.display = 'none';
                    document.getElementById('projYoutubeLink').value = proj.youtube_url || proj.youtube_link || '';
                    validateYouTubeLink();
                } else {
                    document.getElementById('videoType').value = 'local';
                    document.getElementById('youtubeContainer').style.display = 'none';
                    document.getElementById('localVideoContainer').style.display = 'flex';
                    document.getElementById('projYoutubeLink').value = '';
                    isYoutubeValid = true;
                    // Reset preview
                    if(document.getElementById('youtubePreviewContainer')) {
                        document.getElementById('youtubePreviewContainer').style.display = 'none';
                        document.getElementById('youtubePreviewIframe').src = '';
                    }
                }
                
                document.getElementById('thumbPreviewText').textContent = `Atual: ${proj.thumbnail_url}`;
                if(proj.video_url) {
                    document.getElementById('videoPreviewText').textContent = `Atual: ${proj.video_url}`;
                } else {
                    document.getElementById('videoPreviewText').textContent = '';
                }
            }
        } else {
            currentProjectId = null;
            document.getElementById('projectId').value = '';
            document.getElementById('modalProjectTitle').textContent = 'Novo Projeto';
            document.getElementById('projVideo').required = true;
            
            document.getElementById('videoType').value = 'local';
            document.getElementById('youtubeContainer').style.display = 'none';
            document.getElementById('localVideoContainer').style.display = 'flex';
            document.getElementById('projYoutubeLink').value = '';
            isYoutubeValid = true;
        }

        projectModal.classList.add('active');
    };

    const videoTypeSelect = document.getElementById('videoType');
    const youtubeContainer = document.getElementById('youtubeContainer');
    const localVideoContainer = document.getElementById('localVideoContainer');
    const projVideo = document.getElementById('projVideo');
    const projYoutubeLink = document.getElementById('projYoutubeLink');
    const youtubeFeedback = document.getElementById('youtubeFeedback');
    const youtubeStatusIcon = document.getElementById('youtubeStatusIcon');

    let isYoutubeValid = true;
    let youtubeDebounceTimer;

    function extractYouTubeId(url) {
        var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        var match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    const youtubePreviewContainer = document.getElementById('youtubePreviewContainer');
    const youtubePreviewIframe = document.getElementById('youtubePreviewIframe');

    function validateYouTubeLink() {
        const url = projYoutubeLink.value.trim();
        
        projYoutubeLink.style.borderColor = '#333';
        youtubeStatusIcon.innerHTML = '';
        youtubeFeedback.textContent = '';
        youtubeFeedback.className = 'feedback-msg';
        
        if (youtubePreviewContainer) {
            youtubePreviewContainer.style.display = 'none';
            youtubePreviewIframe.src = '';
        }

        if (!url) {
            isYoutubeValid = false;
            return;
        }

        const videoId = extractYouTubeId(url);

        if (!videoId) {
            isYoutubeValid = false;
            projYoutubeLink.style.borderColor = '#ff4444';
            youtubeStatusIcon.innerHTML = '❌';
            youtubeFeedback.textContent = 'Formato de link inválido. Insira uma URL válida do YouTube.';
            youtubeFeedback.classList.add('feedback-error');
            return;
        }

        youtubeStatusIcon.innerHTML = '⏳';
        youtubeFeedback.textContent = 'Validando vídeo...';
        youtubeFeedback.style.color = '#aaa';

        const img = new Image();
        img.onload = function() {
            youtubeFeedback.style.color = ''; // reset inline style
            if (this.width === 120) { // 120x90 is YouTube's placeholder for missing/private videos
                isYoutubeValid = false;
                projYoutubeLink.style.borderColor = '#ff4444';
                youtubeStatusIcon.innerHTML = '❌';
                youtubeFeedback.textContent = 'O vídeo informado não existe ou não está acessível.';
                youtubeFeedback.className = 'feedback-msg feedback-error';
            } else {
                isYoutubeValid = true;
                projYoutubeLink.style.borderColor = '#00C851';
                youtubeStatusIcon.innerHTML = '✅';
                youtubeFeedback.textContent = 'Vídeo encontrado com sucesso!';
                youtubeFeedback.className = 'feedback-msg feedback-success';
                
                if (youtubePreviewContainer) {
                    youtubePreviewContainer.style.display = 'block';
                    youtubePreviewIframe.src = `https://www.youtube.com/embed/${videoId}`;
                }
            }
        };
        img.onerror = function() {
            youtubeFeedback.style.color = '';
            isYoutubeValid = false;
            projYoutubeLink.style.borderColor = '#ff4444';
            youtubeStatusIcon.innerHTML = '❌';
            youtubeFeedback.textContent = 'Erro ao verificar o vídeo.';
            youtubeFeedback.className = 'feedback-msg feedback-error';
        };
        img.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }

    if(projYoutubeLink) {
        projYoutubeLink.addEventListener('input', () => {
            clearTimeout(youtubeDebounceTimer);
            youtubeDebounceTimer = setTimeout(validateYouTubeLink, 800);
        });
    }

    if(videoTypeSelect) {
        videoTypeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'youtube') {
                youtubeContainer.style.display = 'block';
                localVideoContainer.style.display = 'none';
                if(!currentProjectId) {
                   projVideo.required = false;
                }
                validateYouTubeLink();
            } else {
                youtubeContainer.style.display = 'none';
                localVideoContainer.style.display = 'flex';
                isYoutubeValid = true;
                if(!currentProjectId) {
                   projVideo.required = true;
                }
            }
        });
    }

    projectForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (videoTypeSelect.value === 'youtube' && !isYoutubeValid) {
            projectFeedback.className = 'feedback-msg feedback-error';
            projectFeedback.textContent = 'Por favor, insira um link de YouTube válido antes de salvar.';
            return;
        }
        const btnSave = document.getElementById('btnSaveProject');
        btnSave.disabled = true;
        btnSave.textContent = 'Salvando...';
        projectFeedback.className = 'feedback-msg';
        projectFeedback.textContent = '';

        const formData = new FormData(projectForm);
        
        // Remove dados não utilizados dependendo do tipo selecionado
        if (videoTypeSelect.value === 'youtube') {
            formData.delete('video'); // Remove o arquivo se enviar youtube
        } else {
            formData.delete('youtube_url'); // Remove o link se for envio local
        }

        const method = currentProjectId ? 'PUT' : 'POST';
        const url = currentProjectId ? `/api/projects/${currentProjectId}` : '/api/projects';

        try {
            const res = await fetch(url, { method, body: formData });
            const data = await res.json();
            
            if (res.ok) {
                projectFeedback.classList.add('feedback-success');
                projectFeedback.textContent = data.message;
                loadProjects();
                setTimeout(() => projectModal.classList.remove('active'), 1500);
            } else {
                projectFeedback.classList.add('feedback-error');
                projectFeedback.textContent = data.error;
            }
        } catch (err) {
            projectFeedback.classList.add('feedback-error');
            projectFeedback.textContent = 'Erro ao salvar o projeto.';
        } finally {
            btnSave.disabled = false;
            btnSave.textContent = 'Salvar Projeto';
        }
    });

    // MODAL DE EXCLUSÃO
    const deleteModal = document.getElementById('deleteModal');
    let deleteId = null;

    const openDeleteModal = (id) => {
        deleteId = id;
        const proj = projectsData.find(p => p.id == id);
        if (proj) {
            document.getElementById('deleteProjectName').textContent = proj.title;
            deleteModal.classList.add('active');
        }
    };

    document.getElementById('btnCancelDelete').addEventListener('click', () => {
        deleteModal.classList.remove('active');
        deleteId = null;
    });

    document.getElementById('btnConfirmDelete').addEventListener('click', async () => {
        if (!deleteId) return;
        
        try {
            const res = await fetch(`/api/projects/${deleteId}`, { method: 'DELETE' });
            if (res.ok) {
                deleteModal.classList.remove('active');
                loadProjects();
            } else {
                alert('Erro ao excluir projeto.');
            }
        } catch (err) {
            alert('Erro de conexão ao tentar excluir.');
        }
    });


    // --- CONTACT LOGIC ---
    const contactForm = document.getElementById('contactForm');
    const contactFeedback = document.getElementById('contactFeedback');

    const loadContactInfo = async () => {
        try {
            const res = await fetch('/api/contact');
            const data = await res.json();
            
            if (data && data.name) {
                document.getElementById('contactName').value = data.name;
                document.getElementById('contactProfession').value = data.profession;
                document.getElementById('contactCity').value = data.city;
                document.getElementById('contactEmail').value = data.email;
                document.getElementById('contactWhatsapp').value = data.whatsapp;
                document.getElementById('contactInstagram').value = data.instagram;
                document.getElementById('contactDescription').value = data.description;
                if (data.profile_image_url) {
                    document.getElementById('contactImagePreview').src = '../' + data.profile_image_url;
                }
            }
        } catch (error) {
            console.error('Erro ao carregar informações de contato', error);
        }
    };

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        contactFeedback.className = 'feedback-msg';
        contactFeedback.textContent = 'Salvando...';

        const formData = new FormData(contactForm);

        try {
            const res = await fetch('/api/contact', { method: 'PUT', body: formData });
            const data = await res.json();
            
            if (res.ok) {
                contactFeedback.classList.add('feedback-success');
                contactFeedback.textContent = data.message;
                if (data.profile_image_url) {
                    document.getElementById('contactImagePreview').src = '../' + data.profile_image_url;
                }
            } else {
                contactFeedback.classList.add('feedback-error');
                contactFeedback.textContent = data.error;
            }
        } catch (err) {
            contactFeedback.classList.add('feedback-error');
            contactFeedback.textContent = 'Erro ao salvar contato.';
        }
    });

    // --- CATEGORIES LOGIC ---
    let categoriesData = [];
    let currentCategoryId = null;

    const loadCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            categoriesData = await res.json();
            renderCategories();
            populateCategorySelect(); // Update projects dropdown
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        }
    };

    const populateCategorySelect = () => {
        const filterCat = document.getElementById('filterCategory');
        const projCat = document.getElementById('projCategory');
        
        // Save current selections
        const currentFilter = filterCat.value;
        const currentProj = projCat.value;

        filterCat.innerHTML = '<option value="">Todas as Categorias</option>';
        projCat.innerHTML = '';

        categoriesData.forEach(cat => {
            filterCat.innerHTML += `<option value="${cat.slug}">${cat.name}</option>`;
            projCat.innerHTML += `<option value="${cat.slug}">${cat.name}</option>`;
        });

        // Restore selections
        filterCat.value = currentFilter;
        projCat.value = currentProj || (categoriesData.length > 0 ? categoriesData[0].slug : '');
    };

    const renderCategories = () => {
        const grid = document.getElementById('categoriesGrid');
        if (!grid) return;
        const searchTerm = document.getElementById('searchCategory').value.toLowerCase();
        
        grid.innerHTML = '';
        
        const filtered = categoriesData.filter(c => c.name.toLowerCase().includes(searchTerm));

        if (filtered.length === 0) {
            grid.innerHTML = '<p>Nenhuma categoria encontrada.</p>';
            return;
        }

        filtered.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'admin-card';
            card.innerHTML = `
                <img src="../${cat.thumbnail_url}" alt="${cat.name}" class="admin-card-thumb">
                <div class="admin-card-content">
                    <span class="cat-badge">${cat.projectCount || 0} Projetos</span>
                    <h4>${cat.name}</h4>
                    <p style="font-size: 0.9rem; color: #aaa; margin-bottom: 10px; max-height: 40px; overflow: hidden;">${cat.description || ''}</p>
                    <div class="admin-card-actions">
                        <button class="admin-btn secondary-btn btn-edit-cat" data-id="${cat.id}">Editar</button>
                        <button class="admin-btn danger-btn btn-delete-cat" data-id="${cat.id}">Excluir</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        document.querySelectorAll('.btn-edit-cat').forEach(btn => {
            btn.addEventListener('click', (e) => openCategoryModal(e.target.dataset.id));
        });
        document.querySelectorAll('.btn-delete-cat').forEach(btn => {
            btn.addEventListener('click', (e) => openDeleteCategoryModal(e.target.dataset.id));
        });
    };

    if (document.getElementById('searchCategory')) {
        document.getElementById('searchCategory').addEventListener('input', renderCategories);
    }

    const categoryModal = document.getElementById('categoryModal');
    const categoryForm = document.getElementById('categoryForm');
    const categoryFeedback = document.getElementById('categoryFeedback');

    if (document.getElementById('btnNewCategory')) {
        document.getElementById('btnNewCategory').addEventListener('click', () => {
            openCategoryModal(null);
        });
    }

    const openCategoryModal = (id) => {
        categoryForm.reset();
        categoryFeedback.textContent = '';
        document.getElementById('catThumbPreviewText').textContent = '';
        document.getElementById('catBgDesktopPreviewText').textContent = '';
        document.getElementById('catBgMobilePreviewText').textContent = '';
        
        if (id) {
            currentCategoryId = id;
            document.getElementById('modalCategoryTitle').textContent = 'Editar Categoria';
            const cat = categoriesData.find(c => c.id == id);
            if (cat) {
                document.getElementById('categoryId').value = cat.id;
                document.getElementById('catName').value = cat.name;
                document.getElementById('catDescription').value = cat.description || '';
                
                document.getElementById('catThumbnail').required = false;
                document.getElementById('catBgDesktop').required = false;
                document.getElementById('catBgMobile').required = false;

                document.getElementById('catThumbPreviewText').textContent = `Atual: ${cat.thumbnail_url}`;
                document.getElementById('catBgDesktopPreviewText').textContent = `Atual: ${cat.bg_desktop_url}`;
                document.getElementById('catBgMobilePreviewText').textContent = `Atual: ${cat.bg_mobile_url}`;
            }
        } else {
            currentCategoryId = null;
            document.getElementById('categoryId').value = '';
            document.getElementById('modalCategoryTitle').textContent = 'Nova Categoria';
            
            document.getElementById('catThumbnail').required = false;
            document.getElementById('catBgDesktop').required = false;
            document.getElementById('catBgMobile').required = false;
        }

        categoryModal.classList.add('active');
    };

    // Redimensionar/Cortar Imagem no Frontend
    const resizeAndCropImage = (file, targetRatio) => {
        return new Promise((resolve) => {
            if (!file) return resolve(null);
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                let srcWidth = img.width;
                let srcHeight = img.height;
                const srcRatio = srcWidth / srcHeight;

                let cropWidth = srcWidth;
                let cropHeight = srcHeight;
                let offsetX = 0;
                let offsetY = 0;

                if (srcRatio > targetRatio) {
                    cropWidth = srcHeight * targetRatio;
                    offsetX = (srcWidth - cropWidth) / 2;
                } else if (srcRatio < targetRatio) {
                    cropHeight = srcWidth / targetRatio;
                    offsetY = (srcHeight - cropHeight) / 2;
                }

                const MAX_WIDTH = targetRatio > 1 ? 1920 : 1080;
                const MAX_HEIGHT = targetRatio > 1 ? 1080 : 1920;

                let destWidth = cropWidth;
                let destHeight = cropHeight;

                if (destWidth > MAX_WIDTH) {
                    destWidth = MAX_WIDTH;
                    destHeight = destWidth / targetRatio;
                }
                if (destHeight > MAX_HEIGHT) {
                    destHeight = MAX_HEIGHT;
                    destWidth = destHeight * targetRatio;
                }

                canvas.width = destWidth;
                canvas.height = destHeight;

                ctx.drawImage(img, offsetX, offsetY, cropWidth, cropHeight, 0, 0, destWidth, destHeight);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: 'image/webp' });
                        resolve(newFile);
                    } else {
                        resolve(null);
                    }
                }, 'image/webp', 0.9);
            };
            img.onerror = () => resolve(null);
            img.src = URL.createObjectURL(file);
        });
    };

    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnSave = document.getElementById('btnSaveCategory');
            btnSave.disabled = true;
            btnSave.textContent = 'Processando imagens...';
            categoryFeedback.className = 'feedback-msg';
            categoryFeedback.textContent = '';

            try {
                const formData = new FormData(categoryForm);

                // Resize and crop images before sending
                const thumbFile = document.getElementById('catThumbnail').files[0];
                const bgDesktopFile = document.getElementById('catBgDesktop').files[0];
                const bgMobileFile = document.getElementById('catBgMobile').files[0];

                if (thumbFile) {
                    const resizedThumb = await resizeAndCropImage(thumbFile, 16/9);
                    if (resizedThumb) formData.set('thumbnail', resizedThumb);
                }
                if (bgDesktopFile) {
                    const resizedDesktop = await resizeAndCropImage(bgDesktopFile, 16/9);
                    if (resizedDesktop) formData.set('bg_desktop', resizedDesktop);
                }
                if (bgMobileFile) {
                    const resizedMobile = await resizeAndCropImage(bgMobileFile, 9/16);
                    if (resizedMobile) formData.set('bg_mobile', resizedMobile);
                }

                btnSave.textContent = 'Salvando...';

                const method = currentCategoryId ? 'PUT' : 'POST';
                const url = currentCategoryId ? `/api/categories/${currentCategoryId}` : '/api/categories';

                const res = await fetch(url, { method, body: formData });
                const data = await res.json();
                
                if (res.ok) {
                    categoryFeedback.classList.add('feedback-success');
                    categoryFeedback.textContent = data.message;
                    loadCategories();
                    setTimeout(() => categoryModal.classList.remove('active'), 1500);
                } else {
                    throw new Error(data.error || 'Erro no servidor');
                }
            } catch (err) {
                categoryFeedback.classList.add('feedback-error');
                categoryFeedback.textContent = err.message || 'Erro ao salvar a categoria.';
            } finally {
                btnSave.disabled = false;
                btnSave.textContent = 'Salvar Categoria';
            }
        });
    }

    // EXCLUIR CATEGORIA
    const deleteCategoryModal = document.getElementById('deleteCategoryModal');
    let deleteCatId = null;

    const openDeleteCategoryModal = (id) => {
        deleteCatId = id;
        const cat = categoriesData.find(c => c.id == id);
        if (cat) {
            document.getElementById('deleteCategoryName').textContent = cat.name;
            deleteCategoryModal.classList.add('active');
        }
    };

    if (document.getElementById('btnCancelCategoryDelete')) {
        document.getElementById('btnCancelCategoryDelete').addEventListener('click', () => {
            deleteCategoryModal.classList.remove('active');
            deleteCatId = null;
        });
    }

    if (document.getElementById('btnConfirmCategoryDelete')) {
        document.getElementById('btnConfirmCategoryDelete').addEventListener('click', async () => {
            if (!deleteCatId) return;
            try {
                const res = await fetch(`/api/categories/${deleteCatId}`, { method: 'DELETE' });
                if (res.ok) {
                    deleteCategoryModal.classList.remove('active');
                    loadCategories();
                } else {
                    alert('Erro ao excluir categoria.');
                }
            } catch (err) {
                alert('Erro de conexão ao tentar excluir.');
            }
        });
    }

    document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if(categoryModal) categoryModal.classList.remove('active');
            if(deleteCategoryModal) deleteCategoryModal.classList.remove('active');
        });
    });

    // Iniciar
    loadCategories();
    loadProjects();
    loadContactInfo();
});
