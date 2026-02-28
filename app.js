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
        
        countriesMaster = m;
        CFR_DATA = c;
        document.getElementById('map-wrapper').innerHTML = s;
        
        setup();
        draw();
        ticker();
        
        pz.fit();
        pz.center();
    } catch (e) {
        console.error("BOOT_FAILURE: Verify JSON/SVG paths.");
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

function draw() {
    const stream = document.getElementById('conflict-stream');
    stream.innerHTML = '';
    Object.entries(CFR_DATA).forEach(([i, d]) => {
        const m = countriesMaster.find(x => x.code === i);
        if (!m) return;
        const e = document.createElement('div');
        e.className = 'intel-card';
        e.innerHTML = `<div style="font-size:0.8rem; font-weight:700;">${m.emoji} ${m.name}</div><div class="card-risk">${d.risk}</div><div class="card-subj">${d.subject}</div>`;
        e.onpointerdown = () => focus(i);
        stream.appendChild(e);
    });
}

function ticker() {
    const t = document.getElementById('news-ticker');
    const l = Object.entries(CFR_DATA).map(([i, d]) => {
        const m = countriesMaster.find(x => x.code === i);
        return `[LOG_${i}] ${m ? m.name.toUpperCase() : i} // ${d.subject} — `;
    }).join(' ');
    t.textContent = (l + " ").repeat(2);
}

function focus(i) {
    const p = document.getElementById(i);
    const m = countriesMaster.find(x => x.code === i);
    const o = document.getElementById('info-portal');
    if (!p || !m) return;
    
    if (p.classList.contains('selected')) { kill(); return; }
    document.querySelectorAll('.selected').forEach(x => x.classList.remove('selected'));
    p.classList.add('selected');

    const d = CFR_DATA[i];
    document.getElementById('p-emoji').textContent = m.emoji;
    document.getElementById('p-name').textContent = m.name;
    document.getElementById('p-code').textContent = `SECTOR: ${i}`;
    
    const g = document.getElementById('p-risk-tag');
    const s = document.getElementById('p-subject');
    
    if (d) {
        g.textContent = `IMPACT: ${d.risk}`;
        g.classList.add('risk-active-tag');
        s.textContent = d.subject;
        s.classList.add('subject-active');
    } else {
        g.textContent = `STATUS: STABLE`;
        g.classList.remove('risk-active-tag');
        s.textContent = "Sector monitoring active. No critical conflicts reported in this region via CFR Global Tracker.";
        s.classList.remove('subject-active');
    }

    o.classList.remove('hidden');
    const b = p.getBBox();
    const c = document.getElementById('map-wrapper');
    const z = Math.min(c.clientWidth / b.width, c.clientHeight / b.height) * 0.4;
    pz.zoom(1);
    pz.pan({
        x: (c.clientWidth / 2) - ((b.x + b.width / 2) * pz.getSizes().realZoom),
        y: (c.clientHeight / 2) - ((b.y + b.height / 2) * pz.getSizes().realZoom)
    });
    pz.zoomAtPoint(Math.min(z, 12), { x: c.clientWidth / 2, y: c.clientHeight / 2 });
}

function kill() {
    document.querySelectorAll('.selected').forEach(x => x.classList.remove('selected'));
    document.getElementById('info-portal').classList.add('hidden');
}

function zoomInMap() { pz.zoomIn(); }
function zoomOutMap() { pz.zoomOut(); }
function resetMap() { kill(); pz.fit(); pz.center(); }

window.onload = boot;
