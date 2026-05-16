const header = document.querySelector('.site-header');
const navToggle = document.querySelector('.nav-toggle');
const navLinksList = document.querySelector('.nav-links');
const sections = document.querySelectorAll('section[id]');
const navLinkItems = document.querySelectorAll('.nav-links a');

// Scrolled state for header
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
  updateActiveNavLink();
}, { passive: true });

// Mobile menu toggle
navToggle.addEventListener('click', () => {
  const isOpen = navLinksList.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

// Close mobile menu when a link is clicked
navLinksList.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinksList.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Highlight active nav link based on scroll position
function updateActiveNavLink() {
  let currentSection = '';
  sections.forEach(section => {
    if (window.scrollY >= section.offsetTop - 90) {
      currentSection = section.getAttribute('id');
    }
  });
  navLinkItems.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${currentSection}`);
  });
}

// Scroll-triggered fade-in animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Run active link check on load
updateActiveNavLink();

// Lightbox
const lightbox = document.getElementById('lightbox');
const lightboxImg = lightbox.querySelector('.lightbox-img');

document.querySelectorAll('.photo-card img').forEach(img => {
  img.addEventListener('click', () => {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
});

lightbox.addEventListener('click', e => {
  if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    lightbox.classList.remove('open');
    closeAllDemos();
  }
});

// Demo modals
function openDemo(id) {
  const modal = document.getElementById('modal-' + id);
  if (!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (id === 'commuter') initCommuterClock();
}

function closeAllDemos() {
  document.querySelectorAll('.demo-modal').forEach(m => m.classList.remove('open'));
  document.body.style.overflow = '';
}

document.querySelectorAll('.demo-modal').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeAllDemos();
  });
});

document.querySelectorAll('.demo-modal-close').forEach(btn => {
  btn.addEventListener('click', closeAllDemos);
});

// Phenology "Run Analysis" button — updates title to reflect selected park/site
document.getElementById('pheno-run-btn').addEventListener('click', () => {
  const park = document.querySelector('#modal-phenology .pheno-control:nth-child(2) select').value;
  const site = document.querySelector('#modal-phenology .pheno-control:nth-child(3) select').value;
  const shortPark = park.replace(' National Park', '');
  document.getElementById('pheno-main-title').textContent =
    `Seasonal Greenness — ${shortPark} · ${site}`;
});

// Commuter clock — shows live time and offsets departure times
let commuterClockInterval = null;
function initCommuterClock() {
  if (commuterClockInterval) return;
  function tick() {
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes();
    const fmt = (hh, mm) => {
      const suffix = hh >= 12 ? 'PM' : 'AM';
      const h12 = ((hh % 12) || 12);
      return `${h12}:${String(mm).padStart(2, '0')} ${suffix}`;
    };
    document.getElementById('commuter-clock').textContent = fmt(h, m);
    // Departures: +8 min, +5 min, +16 min from now
    const offsets = [8, 5, 16];
    ['departs-1', 'departs-2', 'departs-3'].forEach((id, i) => {
      const total = m + offsets[i];
      document.getElementById(id).textContent = fmt(h + Math.floor(total / 60), total % 60);
    });
  }
  tick();
  commuterClockInterval = setInterval(tick, 30000);
}
