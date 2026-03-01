let pz;
let countriesMaster = [];
let CFR_DATA = {};

async function boot() {
    try {
        const [m, s, c] = await Promise.all([
            fetch('./countries.json').then(r => r.json()),
            fetch('./world.svg').then(r => r.text()),
            fetch('./conflicts.json').then(r => r.json())
        ]);
        
        countriesMaster = Object.values(m).flat();
        CFR_DATA = c;
        
        document.getElementById('map-wrapper').innerHTML = s;
        
        setup();
        draw();
        ticker();
        
        pz.fit();
        pz.center();

        const params = new URLSearchParams(window.location.search);
        const sectorCode = params.get('sector');
        if (sectorCode) {
            setTimeout(() => focus(sectorCode.toUpperCase()), 500);
        }
    } catch (e) {
        console.error("SYSTEM_FAILURE: Critical data load error.", e);
    }
}

function setup() {
    const v = document.querySelector('svg');
    pz = svgPanZoom(v, {
        zoomEnabled: true, fit: true, center: true, maxZoom: 80,
        eventsListenerElement: document.getElementById('map-wrapper')
    });

    document.querySelectorAll('path').forEach(p => {
        if (CFR_DATA[p.id]) p.classList.add('conflict-active');
        p.addEventListener('pointerdown', (e) => {
            e.preventDefault(); e.stopPropagation();
            focus(p.id);
        });
    });

    v.addEventListener('pointerdown', (e) => {
        if (e.target.tagName === 'svg') kill();
    });
}

/**
 * Handles board collapse with visual transparency logic
 */
function toggleBoard(forceState = null) {
    const board = document.getElementById('conflict-board');
    const btn = document.getElementById('board-toggle');
    
    if (forceState === 'collapse') {
        board.classList.add('collapsed');
    } else if (forceState === 'expand') {
        board.classList.remove('collapsed');
    } else {
        board.classList.toggle('collapsed');
    }
    
    btn.textContent = board.classList.contains('collapsed') ? '▵' : '_';
}

function draw() {
    const stream = document.getElementById('conflict-stream');
    const statsContainer = document.getElementById('level-stats');
    stream.innerHTML = '';
    
    const stats = { CRITICAL: 0, SIGNIFICANT: 0, LIMITED: 0 };
    Object.values(CFR_DATA).forEach(d => { if(stats[d.risk] !== undefined) stats[d.risk]++; });

    statsContainer.innerHTML = Object.entries(stats).map(([level, count]) => `
        <div class="stat-item">${level}:<span class="stat-count">${count}</span></div>
    `).join('');

    Object.entries(CFR_DATA).forEach(([code, data]) => {
        const country = countriesMaster.find(x => x.code === code);
        if (!country) return;

        const card = document.createElement('div');
        card.className = 'intel-card';
        card.innerHTML = `
            <div class="card-name">${country.emoji} ${country.name.toUpperCase()}</div>
            <div class="card-risk">IMPACT: ${data.risk}</div>
            <div class="card-subj">${data.subject}</div>
        `;
        card.onpointerdown = () => focus(code);
        stream.appendChild(card);
    });
}

function ticker() {
    const t = document.getElementById('news-ticker');
    const log = Object.entries(CFR_DATA).map(([code, data]) => {
        const country = countriesMaster.find(x => x.code === code);
        return `[LOG_${code}] ${country ? country.name.toUpperCase() : code} // ${data.subject} — `;
    }).join(' ');
    t.textContent = (log + " ").repeat(2);
}

function focus(code) {
    const path = document.getElementById(code);
    const country = countriesMaster.find(x => x.code === code);
    const portal = document.getElementById('info-portal');
    
    if (!path || !country) return;
    
    if (path.classList.contains('selected')) { kill(); return; }
    document.querySelectorAll('.selected').forEach(x => x.classList.remove('selected'));
    path.classList.add('selected');

    // AUTO-COLLAPSE to show map through transparent header
    toggleBoard('collapse');

    const data = CFR_DATA[code];
    document.getElementById('p-emoji').textContent = country.emoji;
    document.getElementById('p-name').textContent = country.name;
    document.getElementById('p-code').textContent = `SECTOR: ${code}`;
    
    const riskTag = document.getElementById('p-risk-tag');
    const subjectBox = document.getElementById('p-subject');
    const shareBtn = document.getElementById('share-intel-btn');
    
    shareBtn.onclick = () => shareConflict(code, country.name);

    if (data) {
        riskTag.textContent = `IMPACT: ${data.risk}`;
        riskTag.classList.add('risk-active-tag');
        subjectBox.textContent = data.subject;
        subjectBox.classList.add('subject-active');
    } else {
        riskTag.textContent = `STATUS: STABLE`;
        riskTag.classList.remove('risk-active-tag');
        subjectBox.textContent = "Sector monitoring active. No critical conflicts reported.";
        subjectBox.classList.remove('subject-active');
    }

    portal.classList.remove('hidden');
    const bbox = path.getBBox();
    const wrapper = document.getElementById('map-wrapper');
    const zoomLevel = Math.min(wrapper.clientWidth / bbox.width, wrapper.clientHeight / bbox.height) * 0.4;
    
    pz.zoom(1);
    pz.pan({
        x: (wrapper.clientWidth / 2) - ((bbox.x + bbox.width / 2) * pz.getSizes().realZoom),
        y: (wrapper.clientHeight / 2) - ((bbox.y + bbox.height / 2) * pz.getSizes().realZoom)
    });
    pz.zoomAtPoint(Math.min(zoomLevel, 12), { x: wrapper.clientWidth / 2, y: wrapper.clientHeight / 2 });
}

function shareConflict(code, name) {
    const url = `${window.location.origin}${window.location.pathname}?sector=${code}`;
    if (navigator.share) {
        navigator.share({ title: `Tactical Intel: ${name}`, url: url });
    } else {
        navigator.clipboard.writeText(url).then(() => {
            const btn = document.getElementById('share-intel-btn');
            btn.textContent = "COPIED TO CLIPBOARD";
            setTimeout(() => btn.textContent = "SHARE INTEL", 2000);
        });
    }
}

function kill() {
    document.querySelectorAll('.selected').forEach(x => x.classList.remove('selected'));
    document.getElementById('info-portal').classList.add('hidden');
    window.history.replaceState({}, document.title, window.location.pathname);
}

function zoomInMap() { pz.zoomIn(); }
function zoomOutMap() { pz.zoomOut(); }
function resetMap() { kill(); pz.fit(); pz.center(); }

window.onload = boot;
