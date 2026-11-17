document.addEventListener('DOMContentLoaded', async () => {

    // ---- Load admin-managed content (falls back to the static markup if the API is unreachable) ----
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const CATS = {
        nature: 'Nature & Landscapes', wildlife: 'Wildlife & Biodiversity', aerial: 'Aerial Perspectives',
        underwater: 'Underwater & Marine Life', resorts: 'Resorts & Hospitality',
        people: 'People & Nature', conservation: 'Conservation & Environment'
    };
    const setText = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.textContent = v; };
    const setImg = (id, v) => { const el = document.getElementById(id); if (el && v) el.src = v; };

    try {
        const res = await fetch('/api/content', { cache: 'no-store' });
        if (!res.ok) throw new Error('no api');
        const c = await res.json();

        if (c.hero) {
            setImg('heroImg', c.hero.image); setText('heroEyebrow', c.hero.eyebrow);
            setText('heroTitle', c.hero.title); setText('heroSub', c.hero.subtitle);
        }
        if (c.about) {
            setImg('aboutImg', c.about.image); setText('aboutName', c.about.name); setText('aboutRole', c.about.role);
            setText('aboutBio', c.about.bio); setText('aboutQuote', c.about.quote ? '\u201C' + c.about.quote + '\u201D' : '');
            setText('aboutYears', c.about.years);
        }
        const grid = document.getElementById('galleryGrid');
        if (grid && Array.isArray(c.gallery)) {
            grid.innerHTML = c.gallery.map(p => `
            <div class="masonry-item gallery-card group cursor-pointer relative overflow-hidden bg-cardBg border border-borderDark"
                 data-category="${esc(p.category)}" data-title="${esc(p.title)}"
                 data-category-label="${esc(CATS[p.category] || p.category)}"
                 data-camera="${esc(p.camera)}" data-lens="${esc(p.lens)}" data-iso="${esc(p.iso)}"
                 data-shutter="${esc(p.shutter)}" data-src="${esc(p.image)}">
                <img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy"
                     class="w-full h-auto  object-cover transition-transform duration-500 group-hover:scale-105">
                <div class="absolute inset-0 bg-darkBg/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                    <span class="text-xs font-mono text-mutedText tracking-widest uppercase mb-1">${esc(CATS[p.category] || p.category)}</span>
                    <h3 class="text-lg font-bold text-lightText tracking-wide">${esc(p.title)}</h3>
                </div>
            </div>`).join('');
        }
        const sg = document.getElementById('storiesGrid');
        if (sg && Array.isArray(c.stories)) {
            sg.innerHTML = c.stories.map(s => `
            <a href="story.html?id=${encodeURIComponent(s.id)}" class="group border border-borderDark bg-darkBg overflow-hidden flex flex-col justify-between hover:border-lightText transition-all duration-300">
                <div>
                    <div class="relative h-64 sm:h-80 overflow-hidden bg-cardBg">
                        <img src="${esc(s.cover)}" alt="${esc(s.title)}" loading="lazy" class="w-full h-full object-cover  transition-transform duration-500 group-hover:scale-105">
                        <span class="absolute top-4 left-4 bg-darkBg/90 border border-borderDark px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-lightText">${esc(s.label)}</span>
                    </div>
                    <div class="p-8">
                        <span class="text-xs font-mono text-mutedText uppercase tracking-widest">${esc(s.tag)}</span>
                        <h3 class="text-2xl font-bold uppercase tracking-wide text-lightText mt-2 mb-4 group-hover:text-mutedText transition-colors">${esc(s.title)}</h3>
                        <p class="text-sm text-mutedText font-light leading-relaxed mb-6">${esc(s.excerpt)}</p>
                    </div>
                </div>
                <div class="px-8 pb-8 flex justify-between items-center text-xs font-mono text-mutedText border-t border-borderDark/60 pt-4">
                    <span>${esc(s.readTime)} min read</span>
                    <span class="text-lightText font-bold uppercase tracking-widest flex items-center group-hover:translate-x-1 transition-transform">Read Essay <i class="fa-solid fa-arrow-right ml-2 text-[10px]"></i></span>
                </div>
            </a>`).join('');
        }
    } catch (err) {
        console.warn('Could not load /api/content, showing static markup.', err);
    }

    // Mobile Navigation Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Mobile Portfolio Submenu Accordion
    const mobilePortfolioBtn = document.getElementById('mobilePortfolioBtn');
    const mobilePortfolioDropdown = document.getElementById('mobilePortfolioDropdown');
    const mobilePortfolioArrow = document.getElementById('mobilePortfolioArrow');

    if (mobilePortfolioBtn && mobilePortfolioDropdown && mobilePortfolioArrow) {
        mobilePortfolioBtn.addEventListener('click', () => {
            mobilePortfolioDropdown.classList.toggle('hidden');
            mobilePortfolioArrow.classList.toggle('rotate-180');
        });
    }

    // Close mobile menu when clicking general links
    mobileNavLinks.forEach(link => {
        if (link.id !== 'mobilePortfolioBtn') {
            link.addEventListener('click', () => {
                if (mobileMenu) {
                    mobileMenu.classList.add('hidden');
                }
            });
        }
    });

    // Filter Gallery Function
    const filterBtns = document.querySelectorAll('.filter-btn');
    const galleryCards = document.querySelectorAll('.gallery-card');

    const applyFilter = (filterCategory) => {
        filterBtns.forEach(b => {
            if (b.getAttribute('data-filter') === filterCategory) {
                b.classList.remove('bg-cardBg', 'text-mutedText');
                b.classList.add('bg-lightText', 'text-darkBg');
            } else {
                b.classList.remove('bg-lightText', 'text-darkBg');
                b.classList.add('bg-cardBg', 'text-mutedText');
            }
        });

        galleryCards.forEach(card => {
            if (filterCategory === 'all' || card.getAttribute('data-category') === filterCategory) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    };

    // Main Filter Button Click Handlers
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');
            applyFilter(filter);
        });
    });

    // Sync Dropdown Subcategory Items to Gallery Filter
    const dropdownItems = document.querySelectorAll('.portfolio-dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const subfilter = item.getAttribute('data-subfilter');
            if (subfilter) {
                applyFilter(subfilter);
            }
            if (mobileMenu) {
                mobileMenu.classList.add('hidden');
            }
        });
    });

    // Lightbox Modal Logic
    const lightboxModal = document.getElementById('lightboxModal');
    const closeLightbox = document.getElementById('closeLightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxCategory = document.getElementById('lightboxCategory');
    const exifCamera = document.getElementById('exifCamera');
    const exifLens = document.getElementById('exifLens');
    const exifISO = document.getElementById('exifISO');
    const exifShutter = document.getElementById('exifShutter');     
    const lightboxInquireBtn = document.getElementById('lightboxInquireBtn');

    galleryCards.forEach(card => {
        card.addEventListener('click', () => {
            if (lightboxImg) lightboxImg.src = card.getAttribute('data-src');
            if (lightboxTitle) lightboxTitle.textContent = card.getAttribute('data-title');
            if (lightboxCategory) lightboxCategory.textContent = card.getAttribute('data-category-label');
            if (exifCamera) exifCamera.textContent = card.getAttribute('data-camera') || 'N/A';
            if (exifLens) exifLens.textContent = card.getAttribute('data-lens') || 'N/A';
            if (exifISO) exifISO.textContent = card.getAttribute('data-iso') || 'N/A';
            if (exifShutter) exifShutter.textContent = card.getAttribute('data-shutter') || 'N/A';

            if (lightboxModal) {
                lightboxModal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    const hideLightbox = () => {
        if (lightboxModal) {
            lightboxModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    };

    if (closeLightbox) {
        closeLightbox.addEventListener('click', hideLightbox);
    }

    if (lightboxModal) {
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) {
                hideLightbox();
            }
        });
    }

    if (lightboxInquireBtn) {
        lightboxInquireBtn.addEventListener('click', hideLightbox);
    }

    // Contact Form Logic
    // Paste your form endpoint here (Formspree, Web3Forms, Netlify Forms, etc.).
    // Example: 'https://formspree.io/f/xxxxxxxx'
    const FORM_ENDPOINT = '';

    const contactForm = document.getElementById('contactForm');
    const formSuccess = document.getElementById('formSuccess');
    const formError = document.getElementById('formError');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = new FormData(contactForm);
            if (data.get('_gotcha')) return; // spam honeypot

            if (formError) formError.classList.add('hidden');
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending...'; }

            try {
                if (FORM_ENDPOINT) {
                    const res = await fetch(FORM_ENDPOINT, {
                        method: 'POST',
                        body: data,
                        headers: { 'Accept': 'application/json' }
                    });
                    if (!res.ok) throw new Error('Request failed');
                } else {
                    console.warn('FORM_ENDPOINT is empty: inquiry was not actually sent.');
                }
                if (formSuccess) formSuccess.classList.remove('hidden');
                contactForm.reset();
                setTimeout(() => formSuccess && formSuccess.classList.add('hidden'), 5000);
            } catch (err) {
                if (formError) formError.classList.remove('hidden');
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Inquiry'; }
            }
        });
    }

    // Close lightbox with the Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideLightbox();
    });

});