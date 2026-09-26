// ============================================================
// FROZEN ICE TYPING — Logica di gioco
// ============================================================

// ============================================================
// 1. RIFERIMENTI DOM
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-display');
const targetDisplay = document.getElementById('target-display');
const speedSlider = document.getElementById('speed-slider');
const restartBtn = document.getElementById('restart-btn');
const finalScoreDisplay = document.getElementById('final-score');
const multiplierHud = document.getElementById('multiplier-hud');
const multiplierHudValue = document.getElementById('multiplier-hud-value');
const multiplierInfoValue = document.getElementById('multiplier-info-value');
const hiddenInput = document.getElementById('hidden-input');

// Monete
const coinsHud = document.getElementById('coins-hud');
const coinsValue = document.getElementById('coins-value');
const coinToast = document.getElementById('coin-toast');

// Schermate
const loginScreen = document.getElementById('login-screen');
const mainMenu = document.getElementById('main-menu');
const menuPlayBtn = document.getElementById('menu-play-btn');
const menuBtn = document.getElementById('menu-btn');
const gameOverOverlay = document.getElementById('game-over-overlay');

// Login
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const guestBtn = document.getElementById('guest-btn');
const authMessage = document.getElementById('auth-message');

// Menu principale
const welcomeUser = document.getElementById('welcome-user');
const menuSettingsBtn = document.getElementById('menu-settings-btn');
const menuLogoutBtn = document.getElementById('menu-logout-btn');

// Selezione mondo
const worldSelectScreen = document.getElementById('world-select-screen');
const worldList = document.getElementById('world-list');
const worldSelectBackBtn = document.getElementById('world-select-back-btn');

// Overview mondo
const worldOverviewScreen = document.getElementById('world-overview-screen');
const worldOverviewImg = document.getElementById('world-overview-img');
const worldOverviewName = document.getElementById('world-overview-name');
const worldOverviewDesc = document.getElementById('world-overview-desc');
const worldOverviewPlayBtn = document.getElementById('world-overview-play-btn');
const worldOverviewBackBtn = document.getElementById('world-overview-back-btn');

// Pausa
const pauseBtn = document.getElementById('pause-btn');
const pauseScreen = document.getElementById('pause-screen');
const pauseResumeBtn = document.getElementById('pause-resume-btn');
const pauseMenuBtn = document.getElementById('pause-menu-btn');

// Impostazioni
const settingsScreen = document.getElementById('settings-screen');
const settingsBackBtn = document.getElementById('settings-back-btn');
const blurSlider = document.getElementById('blur-slider');
const blurValue = document.getElementById('blur-value');

// Game over - record
const goRecord = document.getElementById('go-record');
const goBestLine = document.getElementById('go-best-line');
const goBest = document.getElementById('go-best');

// Cuori
const hearts = [
    document.getElementById('heart-1'),
    document.getElementById('heart-2'),
    document.getElementById('heart-3')
];

// ============================================================
// 2. SUPABASE CLIENT
// ============================================================
// NON chiamare questa variabile `supabase`: la libreria CDN crea
// `window.supabase` non-configurabile e la ridefinizione andrebbe in errore.
let sbClient = null;
let currentUser = null;
let isGuest = false;

try {
    if (typeof window.supabase !== 'undefined' &&
        SUPABASE_URL && !SUPABASE_URL.includes("IL-TUO-PROGETTO")) {
        sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.warn("Supabase non configurato — login disabilitato, modalità ospite.");
    }
} catch (e) {
    console.warn("Errore init Supabase:", e);
    sbClient = null;
}

// ============================================================
// 3. STATO GLOBALE
// ============================================================
let blurSfondo = BLUR_SFONDO_DEFAULT;

// Audio
let audioCtx = null;
let suonoParolaAudio = null;
let suonoVitaAudio = null;
let suonoMonetaAudio = null;
const VOLUME_SUONO_PAROLA = 0.42;
const VOLUME_SUONO_VITA = 0.32;
const VOLUME_SUONO_MONETA = 0.45;

// Mondo
let mondoCorrente = MONDI[0];
let mondoInOverview = null;

// Asset
let sfondoImage = null;
let sfondoBlurCanvas = null;
let personaggioImage = null;
let pallaImage = null;

// Personaggio
let posPersonaggio = { x: 0, y: 0, larghezza: 0, altezza: 0 };
let direzionePersonaggio = 1;

// Partita
let punteggio = 0;
let vite = VITE_INIZIALI;
let giocoAttivo = false;
let gameOver = false;

// Entità
let paroleCadenti = [];
let palleNeve = [];
let particelle = [];

// Dinamici
let velocitaBase = 0.15;
let moltiplicatore = 1.0;
let prossimaSogliaSpawn = 110;

// Digitazione
let parolaAttiva = null;
let lettereDigitate = 0;
let shakeTimer = 0;

// Record
let bestScoreCache = 0;

// Monete
let currentCoins = 0;

// ============================================================
// 4. POSIZIONAMENTO PERSONAGGIO
// ============================================================
function aggiornaPosizionePersonaggio() {
    const h = canvas.height * ALTEZZA_PERSONAGGIO_RATIO;
    const w = personaggioImage
        ? h * (personaggioImage.width / personaggioImage.height)
        : h * 0.7;
    posPersonaggio = {
        x: canvas.width / 2,
        y: canvas.height - ALTEZZA_PAVIMENTO,
        larghezza: w,
        altezza: h
    };
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    aggiornaPosizionePersonaggio();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ============================================================
// 5. AUTENTICAZIONE
// ============================================================
function setAuthMessage(msg, type = 'info') {
    authMessage.textContent = msg;
    authMessage.className = 'auth-message ' + type;
}

function usernameToEmail(username) {
    return username.trim().toLowerCase() + AUTH_EMAIL_DOMAIN;
}

function validaCredenziali(username, password) {
    if (!username || username.trim().length < 3) {
        return "Il nome utente deve avere almeno 3 caratteri.";
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
        return "Il nome utente può contenere solo lettere, numeri e underscore.";
    }
    if (!password || password.length < 6) {
        return "La password deve avere almeno 6 caratteri.";
    }
    return null;
}

async function registrati(username, password) {
    if (!sbClient) {
        setAuthMessage("Supabase non configurato. Usa 'Gioca come ospite'.", "error");
        return;
    }
    const err = validaCredenziali(username, password);
    if (err) { setAuthMessage(err, "error"); return; }
    
    setAuthMessage("Registrazione in corso...", "info");
    const email = usernameToEmail(username);
    
    const { data, error } = await sbClient.auth.signUp({ email, password });
    
    if (error) {
        if (error.message.includes("already")) {
            setAuthMessage("Nome utente già in uso. Prova ad accedere.", "error");
        } else {
            setAuthMessage("Errore: " + error.message, "error");
        }
        return;
    }
    
    if (!data.user) {
        setAuthMessage("Errore imprevisto. Riprova.", "error");
        return;
    }
    
    await sbClient.auth.updateUser({
        data: { username: username.trim() }
    });
    
    currentUser = { id: data.user.id, username: username.trim() };
    isGuest = false;
    
    try {
        await sbClient.from('profiles').insert({
            id: currentUser.id,
            username: currentUser.username,
            coins: 0
        });
    } catch (e) {
        console.warn("Errore creazione profilo:", e);
    }
    currentCoins = 0;
    aggiornaCoinsHud();
    
    setAuthMessage("Registrazione completata!", "success");
    setTimeout(async () => {
        await caricaBestScore();
        mostraMenuPrincipale();
    }, 400);
}

async function accedi(username, password) {
    if (!sbClient) {
        setAuthMessage("Supabase non configurato. Usa 'Gioca come ospite'.", "error");
        return;
    }
    const err = validaCredenziali(username, password);
    if (err) { setAuthMessage(err, "error"); return; }
    
    setAuthMessage("Accesso in corso...", "info");
    const email = usernameToEmail(username);
    
    const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
    
    if (error) {
        if (error.message.includes("Invalid login")) {
            setAuthMessage("Nome utente o password errati.", "error");
        } else {
            setAuthMessage("Errore: " + error.message, "error");
        }
        return;
    }
    
    currentUser = {
        id: data.user.id,
        username: data.user.user_metadata?.username || username.trim()
    };
    isGuest = false;
    
    setAuthMessage("Accesso riuscito!", "success");
    setTimeout(async () => {
        await Promise.all([caricaBestScore(), caricaProfilo()]);
        mostraMenuPrincipale();
    }, 400);
}

async function logout() {
    if (sbClient) {
        try { await sbClient.auth.signOut(); } catch (e) {}
    }
    currentUser = null;
    isGuest = false;
    bestScoreCache = 0;
    currentCoins = 0;
    aggiornaCoinsHud();
    mostraLogin();
}

function entraComeOspite() {
    currentUser = null;
    isGuest = true;
    bestScoreCache = 0;
    currentCoins = 0;
    aggiornaCoinsHud();
    mostraMenuPrincipale();
}

async function ripristinaSessione() {
    if (!sbClient) return null;
    try {
        const { data: { session } } = await sbClient.auth.getSession();
        if (session && session.user) {
            return {
                id: session.user.id,
                username: session.user.user_metadata?.username ||
                          session.user.email.split('@')[0]
            };
        }
    } catch (e) {
        console.warn("Errore ripristino sessione:", e);
    }
    return null;
}

async function caricaBestScore() {
    if (!sbClient || !currentUser) { bestScoreCache = 0; return 0; }
    try {
        const { data, error } = await sbClient
            .from('scores')
            .select('score')
            .eq('user_id', currentUser.id)
            .order('score', { ascending: false })
            .limit(1);
        if (error) throw error;
        bestScoreCache = data && data.length > 0 ? data[0].score : 0;
        return bestScoreCache;
    } catch (e) {
        console.warn("Errore caricamento best score:", e);
        return 0;
    }
}

async function salvaPunteggio(score) {
    if (!sbClient || !currentUser) return;
    try {
        await sbClient.from('scores').insert({
            user_id: currentUser.id,
            username: currentUser.username,
            score: score
        });
    } catch (e) {
        console.warn("Errore salvataggio punteggio:", e);
    }
}

// --- Profilo & Monete ---
async function caricaProfilo() {
    if (!sbClient || !currentUser) {
        currentCoins = 0;
        aggiornaCoinsHud();
        return;
    }
    try {
        const { data, error } = await sbClient
            .from('profiles')
            .select('coins')
            .eq('id', currentUser.id)
            .maybeSingle();
        if (error) throw error;
        
        if (data) {
            currentCoins = data.coins || 0;
        } else {
            await sbClient.from('profiles').insert({
                id: currentUser.id,
                username: currentUser.username,
                coins: 0
            });
            currentCoins = 0;
        }
        aggiornaCoinsHud();
    } catch (e) {
        console.warn("Errore caricamento profilo:", e);
    }
}

async function aggiungiMoneta(quantita = 1) {
    currentCoins += quantita;
    aggiornaCoinsHud();
    if (!sbClient || !currentUser) return; // ospite: solo in memoria
    try {
        await sbClient
            .from('profiles')
            .update({ coins: currentCoins })
            .eq('id', currentUser.id);
    } catch (e) {
        console.warn("Errore salvataggio moneta:", e);
    }
}

function aggiornaCoinsHud() {
    if (coinsValue) coinsValue.innerText = currentCoins;
}

function mostraToastMoneta() {
    if (!coinToast) return;
    coinToast.classList.remove('show');
    void coinToast.offsetWidth; // forza reflow per far ripartire l'animazione
    coinToast.classList.add('show');
}

// ============================================================
// 6. AUDIO
// ============================================================
function ensureAudioReady() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { console.warn("Web Audio API non disponibile"); }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function riproduciSuonoParola() {
    ensureAudioReady();
    if (suonoParolaAudio) {
        try {
            suonoParolaAudio.currentTime = 0;
            suonoParolaAudio.play().catch(() => {});
            return;
        } catch (e) {}
    }
    suonaGhiaccioProcedurale();
}

function riproduciSuonoVita() {
    ensureAudioReady();
    if (suonoVitaAudio) {
        try {
            suonoVitaAudio.currentTime = 0;
            suonoVitaAudio.play().catch(() => {});
            return;
        } catch (e) {}
    }
    suonaVitaProcedurale();
}

function riproduciSuonoMoneta() {
    ensureAudioReady();
    if (suonoMonetaAudio) {
        try {
            suonoMonetaAudio.currentTime = 0;
            suonoMonetaAudio.play().catch(() => {});
            return;
        } catch (e) {}
    }
    // Nessun fallback procedurale: se il file manca, silenzio.
}

function suonaGhiaccioProcedurale() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const numCristalli = 3;
    for (let i = 0; i < numCristalli; i++) {
        const t = now + i * 0.025;
        const freq = 2200 + Math.random() * 2400;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.15, t + 0.08);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(VOLUME_SUONO_PAROLA * 0.35 / numCristalli, t + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(t); osc.stop(t + 0.18);
    }
    const noiseDur = 0.11;
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * noiseDur, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
        const env = Math.pow(1 - i / data.length, 2.5);
        data[i] = (Math.random() * 2 - 1) * env;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 4500;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.value = VOLUME_SUONO_PAROLA * 0.12;
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(audioCtx.destination);
    noise.start(now);
}

function suonaVitaProcedurale() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.45);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(VOLUME_SUONO_VITA * 0.5, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(now); osc.stop(now + 0.6);
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(160, now);
    osc2.frequency.exponentialRampToValueAtTime(90, now + 0.45);
    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.exponentialRampToValueAtTime(VOLUME_SUONO_VITA * 0.35, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc2.connect(gain2); gain2.connect(audioCtx.destination);
    osc2.start(now); osc2.stop(now + 0.55);
}

// ============================================================
// 7. CARICAMENTO ASSET
// ============================================================
function caricaAssetMondo(mondo) {
    sfondoImage = null;
    sfondoBlurCanvas = null;
    personaggioImage = null;
    pallaImage = null;
    suonoParolaAudio = null;
    suonoVitaAudio = null;
    suonoMonetaAudio = null;
    aggiornaPosizionePersonaggio();
    
    const imgBg = new Image();
    imgBg.onload = () => {
        if (mondoCorrente !== mondo) return;
        sfondoImage = imgBg;
        rigeneraSfondoSfocato();
    };
    imgBg.onerror = () => console.warn("Impossibile caricare lo sfondo: " + mondo.sfondo);
    imgBg.src = mondo.sfondo;
    
    const imgPers = new Image();
    imgPers.onload = () => {
        if (mondoCorrente !== mondo) return;
        personaggioImage = imgPers;
        aggiornaPosizionePersonaggio();
    };
    imgPers.onerror = () => {
        console.warn("Impossibile caricare il personaggio: " + mondo.personaggio);
        aggiornaPosizionePersonaggio();
    };
    imgPers.src = mondo.personaggio;
    
    const imgPalla = new Image();
    imgPalla.onload = () => {
        if (mondoCorrente !== mondo) return;
        pallaImage = imgPalla;
    };
    imgPalla.onerror = () => console.warn("Impossibile caricare la palla: " + mondo.palla);
    imgPalla.src = mondo.palla;
    
    if (mondo.suonoParola) {
        const a = new Audio();
        a.preload = 'auto';
        a.volume = VOLUME_SUONO_PAROLA;
        a.addEventListener('canplaythrough', () => {
            if (mondoCorrente === mondo) suonoParolaAudio = a;
        }, { once: true });
        a.addEventListener('error', () => {
            console.warn("Suono parola non caricato: " + mondo.suonoParola);
        });
        a.src = mondo.suonoParola;
    }
    
    if (mondo.suonoVita) {
        const a = new Audio();
        a.preload = 'auto';
        a.volume = VOLUME_SUONO_VITA;
        a.addEventListener('canplaythrough', () => {
            if (mondoCorrente === mondo) suonoVitaAudio = a;
        }, { once: true });
        a.addEventListener('error', () => {
            console.warn("Suono vita non caricato: " + mondo.suonoVita);
        });
        a.src = mondo.suonoVita;
    }
    
    if (mondo.suonoMoneta) {
        const a = new Audio();
        a.preload = 'auto';
        a.volume = VOLUME_SUONO_MONETA;
        a.addEventListener('canplaythrough', () => {
            if (mondoCorrente === mondo) suonoMonetaAudio = a;
        }, { once: true });
        a.addEventListener('error', () => {
            console.warn("Suono moneta non caricato: " + mondo.suonoMoneta);
        });
        a.src = mondo.suonoMoneta;
    }
}

function rigeneraSfondoSfocato() {
    if (!sfondoImage) return;
    sfondoBlurCanvas = creaSfondoSfocato(sfondoImage, blurSfondo);
}

function creaSfondoSfocato(img, blurPx) {
    const off = document.createElement('canvas');
    off.width = img.width;
    off.height = img.height;
    const octx = off.getContext('2d');
    if (blurPx <= 0) { octx.drawImage(img, 0, 0); return off; }
    const pad = blurPx * 2;
    const scala = (img.width + pad * 2) / img.width;
    const drawW = img.width * scala;
    const drawH = img.height * scala;
    const drawX = (img.width - drawW) / 2;
    const drawY = (img.height - drawH) / 2;
    octx.filter = `blur(${blurPx}px)`;
    octx.drawImage(img, drawX, drawY, drawW, drawH);
    octx.filter = 'none';
    return off;
}

// ============================================================
// 8. VELOCITÀ E MOLTIPLICATORE
// ============================================================
function calcolaMoltiplicatore(livello) {
    return 1 + (livello - 1) * 0.5;
}

function applicaSpeedSlider() {
    const livello = parseInt(speedSlider.value);
    velocitaBase = 0.15 + (livello - 1) * 0.117;
    moltiplicatore = calcolaMoltiplicatore(livello);
    multiplierHudValue.innerText = moltiplicatore.toFixed(1);
    multiplierInfoValue.innerText = 'x' + moltiplicatore.toFixed(1);
}

speedSlider.addEventListener('input', applicaSpeedSlider);

// ============================================================
// 9. NAVIGAZIONE SCHERMATE
// ============================================================
function resetStatoGioco() {
    punteggio = 0;
    vite = VITE_INIZIALI;
    gameOver = false;
    paroleCadenti = [];
    palleNeve = [];
    particelle = [];
    parolaAttiva = null;
    lettereDigitate = 0;
    prossimaSogliaSpawn = 110;
    shakeTimer = 0;
    direzionePersonaggio = 1;
    scoreDisplay.innerText = '0';
    targetDisplay.innerText = '-';
    hearts.forEach(h => h.classList.remove('lost', 'pulse'));
    hiddenInput.value = '';
}

function nascondiTutteLeSchermate() {
    loginScreen.style.display = 'none';
    mainMenu.style.display = 'none';
    gameOverOverlay.style.display = 'none';
    settingsScreen.style.display = 'none';
    pauseScreen.style.display = 'none';
    worldSelectScreen.style.display = 'none';
    worldOverviewScreen.style.display = 'none';
}

function mostraLogin() {
    giocoAttivo = false;
    resetStatoGioco();
    nascondiTutteLeSchermate();
    loginScreen.style.display = 'flex';
    setAuthMessage('', 'info');
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
}

function mostraMenuPrincipale() {
    giocoAttivo = false;
    resetStatoGioco();
    
    speedSlider.disabled = false;
    applicaSpeedSlider();
    multiplierHud.classList.remove('active');
    coinsHud.classList.remove('active');
    pauseBtn.style.display = 'none';
    
    if (currentUser) {
        welcomeUser.innerHTML = `Ciao, <strong>${currentUser.username}</strong>!<br>
            Record: <strong>${bestScoreCache}</strong> · Monete: <strong>🪙 ${currentCoins}</strong>`;
        menuLogoutBtn.style.display = 'block';
    } else if (isGuest) {
        welcomeUser.textContent = "Stai giocando come ospite — record e monete non verranno salvati.";
        menuLogoutBtn.style.display = 'block';
    } else {
        welcomeUser.textContent = "Impara a scrivere divertendoti!";
        menuLogoutBtn.style.display = 'none';
    }
    
    nascondiTutteLeSchermate();
    mainMenu.style.display = 'flex';
}

function mostraImpostazioni() {
    nascondiTutteLeSchermate();
    settingsScreen.style.display = 'flex';
}

function mostraSelezioneMondi() {
    nascondiTutteLeSchermate();
    renderizzaListaMondi();
    worldSelectScreen.style.display = 'flex';
}

function renderizzaListaMondi() {
    worldList.innerHTML = '';
    MONDI.forEach(mondo => {
        const card = document.createElement('button');
        card.className = 'world-card';
        card.type = 'button';
        
        const thumb = document.createElement('img');
        thumb.className = 'world-card-thumb';
        thumb.src = mondo.thumbnail;
        thumb.alt = mondo.nome;
        thumb.onerror = () => { thumb.style.opacity = '0.3'; };
        
        const info = document.createElement('div');
        info.className = 'world-card-info';
        
        const nome = document.createElement('div');
        nome.className = 'world-card-name';
        nome.textContent = mondo.nome;
        
        const desc = document.createElement('div');
        desc.className = 'world-card-desc';
        desc.textContent = mondo.descrizione;
        
        info.appendChild(nome);
        info.appendChild(desc);
        card.appendChild(thumb);
        card.appendChild(info);
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            mostraOverviewMondo(mondo);
        });
        worldList.appendChild(card);
    });
}

function mostraOverviewMondo(mondo) {
    mondoInOverview = mondo;
    worldOverviewImg.src = mondo.thumbnail;
    worldOverviewImg.alt = mondo.nome;
    worldOverviewImg.onerror = () => { worldOverviewImg.style.opacity = '0.3'; };
    worldOverviewName.textContent = mondo.nome;
    worldOverviewDesc.textContent = mondo.descrizione;
    nascondiTutteLeSchermate();
    worldOverviewScreen.style.display = 'flex';
}

function avviaGioco(mondo) {
    if (!mondo) mondo = mondoInOverview || mondoCorrente;
    if (mondo !== mondoCorrente) {
        mondoCorrente = mondo;
        caricaAssetMondo(mondo);
    }
    resetStatoGioco();
    giocoAttivo = true;
    speedSlider.disabled = true;
    multiplierHud.classList.add('active');
    coinsHud.classList.add('active');
    pauseBtn.style.display = 'flex';
    nascondiTutteLeSchermate();
    ensureAudioReady();
    hiddenInput.focus();
}

function mettiInPausa() {
    if (!giocoAttivo || gameOver) return;
    giocoAttivo = false;
    pauseScreen.style.display = 'flex';
}

function riprendiGioco() {
    if (gameOver) return;
    giocoAttivo = true;
    pauseScreen.style.display = 'none';
    hiddenInput.focus();
}

// --- LISTENER ---
loginBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    accedi(usernameInput.value, passwordInput.value);
});
signupBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    registrati(usernameInput.value, passwordInput.value);
});
guestBtn.addEventListener('click', (e) => { e.stopPropagation(); entraComeOspite(); });

[usernameInput, passwordInput].forEach(inp => {
    inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            accedi(usernameInput.value, passwordInput.value);
        }
    });
});

menuPlayBtn.addEventListener('click', (e) => { e.stopPropagation(); mostraSelezioneMondi(); });
menuSettingsBtn.addEventListener('click', (e) => { e.stopPropagation(); mostraImpostazioni(); });
menuLogoutBtn.addEventListener('click', (e) => { e.stopPropagation(); logout(); });
settingsBackBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    nascondiTutteLeSchermate();
    mainMenu.style.display = 'flex';
});
worldSelectBackBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    nascondiTutteLeSchermate();
    mainMenu.style.display = 'flex';
});
worldOverviewPlayBtn.addEventListener('click', (e) => { e.stopPropagation(); avviaGioco(mondoInOverview); });
worldOverviewBackBtn.addEventListener('click', (e) => { e.stopPropagation(); mostraSelezioneMondi(); });
pauseResumeBtn.addEventListener('click', (e) => { e.stopPropagation(); riprendiGioco(); });
pauseMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); mostraMenuPrincipale(); });
pauseBtn.addEventListener('click', (e) => { e.stopPropagation(); mettiInPausa(); });
restartBtn.addEventListener('click', (e) => { e.stopPropagation(); avviaGioco(mondoCorrente); });
menuBtn.addEventListener('click', (e) => { e.stopPropagation(); mostraMenuPrincipale(); });

blurSlider.addEventListener('input', (e) => {
    blurSfondo = parseInt(e.target.value);
    blurValue.innerText = blurSfondo + ' px';
    rigeneraSfondoSfocato();
});

// ============================================================
// 10. INPUT DI GIOCO
// ============================================================
canvas.addEventListener('click', () => {
    ensureAudioReady();
    if (giocoAttivo && !gameOver) hiddenInput.focus();
});
document.addEventListener('click', ensureAudioReady);
document.addEventListener('touchstart', ensureAudioReady, { passive: true });

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && giocoAttivo && !gameOver) {
        e.preventDefault();
        mettiInPausa();
    }
});

document.addEventListener('keydown', (e) => {
    if (!giocoAttivo || gameOver) return;
    const key = e.key;
    if (key.length !== 1) return;
    const lettera = key.toUpperCase();
    if (lettera < 'A' || lettera > 'Z') return;
    e.preventDefault();
    controllaLettera(lettera);
});

hiddenInput.addEventListener('input', () => {
    if (!giocoAttivo || gameOver) return;
    const inputVal = hiddenInput.value.toUpperCase();
    if (inputVal.length > 0) {
        for (const ch of inputVal) {
            if (ch >= 'A' && ch <= 'Z') controllaLettera(ch);
        }
    }
    hiddenInput.value = '';
});

// ============================================================
// 11. SPAWN PAROLE
// ============================================================
function misuraLarghezza(testo) {
    ctx.font = `bold ${FONT_SIZE_PAROLE}px 'Segoe UI', Arial`;
    return ctx.measureText(testo).width;
}

function dovreiSpawnare() {
    let minY = Infinity;
    for (const p of paroleCadenti) {
        if (p.colpita || p.inDistruzione) continue;
        if (p.y < minY) minY = p.y;
    }
    if (minY === Infinity) return true;
    return minY >= prossimaSogliaSpawn;
}

function creaParola() {
    const lista = mondoCorrente.dizionario;
    const testo = lista[Math.floor(Math.random() * lista.length)];
    const larghezzaNuova = misuraLarghezza(testo);
    const paddingBolla = 18, gap = 25, margine = 15;
    const halfNuova = larghezzaNuova / 2 + paddingBolla;
    const minX = margine + halfNuova;
    const maxX = canvas.width - margine - halfNuova;
    
    const probOro = (typeof mondoCorrente.probabilitaOro === 'number')
        ? mondoCorrente.probabilitaOro
        : 0.08;
    const dorata = Math.random() < probOro;
    
    if (minX >= maxX) {
        paroleCadenti.push({
            testo, x: canvas.width / 2, y: -30,
            velocita: velocitaBase * (0.9 + Math.random() * 0.2),
            colpita: false, inDistruzione: false,
            dorata: dorata
        });
        return;
    }
    
    const zonaControllo = Math.max(200, canvas.height * 0.5);
    const TENTATIVI = 15;
    let migliorX = (minX + maxX) / 2;
    let migliorDistanza = -Infinity;
    
    for (let t = 0; t < TENTATIVI; t++) {
        const x = minX + Math.random() * (maxX - minX);
        let distanzaMinima = Infinity;
        for (const p of paroleCadenti) {
            if (p.colpita) continue;
            if (p.y > zonaControllo) continue;
            const larghezzaEsistente = misuraLarghezza(p.testo) / 2 + paddingBolla;
            const dx = Math.abs(p.x - x);
            const distanza = dx - (larghezzaEsistente + halfNuova + gap);
            if (distanza < distanzaMinima) distanzaMinima = distanza;
        }
        if (distanzaMinima === Infinity) distanzaMinima = 10000;
        if (distanzaMinima > migliorDistanza) {
            migliorDistanza = distanzaMinima;
            migliorX = x;
        }
        if (distanzaMinima > 0) break;
    }
    
    paroleCadenti.push({
        testo, x: migliorX, y: -30,
        velocita: velocitaBase * (0.9 + Math.random() * 0.2),
        colpita: false, inDistruzione: false,
        dorata: dorata
    });
}

// ============================================================
// 12. DIGITAZIONE
// ============================================================
function controllaLettera(lettera) {
    if (!parolaAttiva) {
        let candidata = null, maxY = -1;
        for (const p of paroleCadenti) {
            if (p.colpita || p.inDistruzione) continue;
            if (p.testo[0] === lettera && p.y > maxY) {
                maxY = p.y; candidata = p;
            }
        }
        if (candidata) {
            parolaAttiva = candidata;
            lettereDigitate = 1;
            aggiornaTargetDisplay();
            if (lettereDigitate === candidata.testo.length) completaParola(candidata);
        }
        return;
    }
    const letteraAttesa = parolaAttiva.testo[lettereDigitate];
    if (lettera === letteraAttesa) {
        lettereDigitate++;
        aggiornaTargetDisplay();
        if (lettereDigitate === parolaAttiva.testo.length) completaParola(parolaAttiva);
    } else {
        shakeTimer = 15;
    }
}

function aggiornaTargetDisplay() {
    if (!parolaAttiva) { targetDisplay.innerText = '-'; return; }
    const fatta = parolaAttiva.testo.substring(0, lettereDigitate);
    const resta = parolaAttiva.testo.substring(lettereDigitate);
    targetDisplay.innerText = fatta + resta.toLowerCase();
}

function completaParola(parola) {
    parola.inDistruzione = true;
    const puntiBase = 10 * parola.testo.length;
    punteggio += Math.round(puntiBase * moltiplicatore);
    scoreDisplay.innerText = punteggio;
    
    // La moneta, il toast e il suono vengono gestiti SOLO al momento
    // dell'impatto con la palla di neve (vedi aggiornaPalleNeve).
    
    lanciaPallaVerso(parola);
    parolaAttiva = null;
    lettereDigitate = 0;
    targetDisplay.innerText = '-';
}

// ============================================================
// 13. PALLE DI NEVE
// ============================================================
function lanciaPallaVerso(parola) {
    const versoDestra = parola.x > posPersonaggio.x;
    direzionePersonaggio = versoDestra ? 1 : -1;
    const manoX = posPersonaggio.x + direzionePersonaggio * posPersonaggio.larghezza * 0.30;
    const manoY = posPersonaggio.y - posPersonaggio.altezza * 0.55;
    palleNeve.push({
        startX: manoX, startY: manoY,
        endX: parola.x, endY: parola.y,
        parola: parola,
        startTime: performance.now(),
        durata: DURATA_VOLO_PALLA,
        rotazione: 0,
        currX: manoX, currY: manoY
    });
}

function aggiornaPalleNeve(now) {
    for (let i = palleNeve.length - 1; i >= 0; i--) {
        const p = palleNeve[i];
        const t = Math.min(1, (now - p.startTime) / p.durata);
        p.currX = p.startX + (p.endX - p.startX) * t;
        const yBase = p.startY + (p.endY - p.startY) * t;
        p.currY = yBase - Math.sin(t * Math.PI) * ARCO_PALLA;
        p.rotazione += 0.20;
        if (t >= 1) {
            // Impatto: esplosione + suono parola
            creaEsplosione(p.parola.x, p.parola.y, p.parola.dorata);
            riproduciSuonoParola();
            
            // Se dorata, assegna moneta + toast + suono moneta SOLO ORA
            if (p.parola.dorata) {
                aggiungiMoneta(1);
                mostraToastMoneta();
                riproduciSuonoMoneta();
            }
            
            p.parola.colpita = true;
            palleNeve.splice(i, 1);
        }
    }
}

function disegnaPalleNeve() {
    for (const p of palleNeve) {
        ctx.save();
        ctx.translate(p.currX, p.currY);
        ctx.rotate(p.rotazione);
        if (pallaImage) {
            ctx.drawImage(pallaImage, -DIMENSIONE_PALLA / 2, -DIMENSIONE_PALLA / 2, DIMENSIONE_PALLA, DIMENSIONE_PALLA);
        } else {
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "#a0d8f0";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, DIMENSIONE_PALLA / 2, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = "rgba(180, 220, 240, 0.5)";
            ctx.beginPath();
            ctx.arc(-4, -4, 3, 0, Math.PI * 2);
            ctx.arc(5, 2, 2, 0, Math.PI * 2);
            ctx.arc(-2, 6, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

// ============================================================
// 14. DISEGNO PERSONAGGIO
// ============================================================
function disegnaPersonaggio() {
    ctx.save();
    ctx.translate(posPersonaggio.x, posPersonaggio.y);
    if (direzionePersonaggio === -1) ctx.scale(-1, 1);
    if (personaggioImage) {
        ctx.drawImage(personaggioImage,
            -posPersonaggio.larghezza / 2,
            -posPersonaggio.altezza,
            posPersonaggio.larghezza,
            posPersonaggio.altezza);
    } else {
        disegnaPupazzoNeveFallback(posPersonaggio.larghezza, posPersonaggio.altezza);
    }
    ctx.restore();
}

function disegnaPupazzoNeveFallback(w, h) {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#c8e6f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -h * 0.22, w * 0.38, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -h * 0.68, w * 0.26, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(0, -h * 0.30, 2.5, 0, Math.PI * 2);
    ctx.arc(0, -h * 0.20, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-w * 0.09, -h * 0.72, 2.5, 0, Math.PI * 2);
    ctx.arc(w * 0.09, -h * 0.72, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff8c1a";
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.68);
    ctx.lineTo(w * 0.18, -h * 0.66);
    ctx.lineTo(0, -h * 0.64);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#6b3e1f";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-w * 0.30, -h * 0.30); ctx.lineTo(-w * 0.55, -h * 0.42);
    ctx.moveTo(w * 0.30, -h * 0.30); ctx.lineTo(w * 0.55, -h * 0.42);
    ctx.stroke();
}

// ============================================================
// 15. PARTICELLE
// ============================================================
function creaEsplosione(x, y, dorata = false) {
    for (let i = 0; i < 18; i++) {
        const colore = dorata
            ? `hsl(${40 + Math.random() * 15}, 100%, ${60 + Math.random() * 25}%)`
            : `hsl(${180 + Math.random() * 40}, 100%, ${55 + Math.random() * 30}%)`;
        particelle.push({
            x, y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            vita: 1,
            colore,
            raggio: 2 + Math.random() * 3
        });
    }
}

function creaShatterNeve(x, y) {
    for (let i = 0; i < 22; i++) {
        particelle.push({
            x: x + (Math.random() - 0.5) * 40,
            y: y - Math.random() * 8,
            vx: (Math.random() - 0.5) * 12,
            vy: -Math.random() * 7 - 2,
            vita: 1,
            colore: `hsl(${195 + Math.random() * 25}, ${55 + Math.random() * 35}%, ${82 + Math.random() * 18}%)`,
            raggio: 2.5 + Math.random() * 4
        });
    }
}

function aggiornaParticelle() {
    for (let i = particelle.length - 1; i >= 0; i--) {
        const p = particelle[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.vita -= 0.02;
        if (p.vita <= 0) particelle.splice(i, 1);
    }
}

function disegnaParticelle() {
    for (const p of particelle) {
        ctx.globalAlpha = p.vita;
        ctx.fillStyle = p.colore;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.raggio * p.vita, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ============================================================
// 16. DISEGNO PAROLE (bolle)
// ============================================================
function disegnaParole() {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const shakeOffset = shakeTimer > 0 ? Math.sin(shakeTimer * 1.5) * 4 : 0;
    
    for (const p of paroleCadenti) {
        if (p.colpita) continue;
        
        ctx.font = `bold ${FONT_SIZE_PAROLE}px 'Segoe UI', Arial`;
        const larghezza = ctx.measureText(p.testo).width;
        const padding = 18;
        const offsetX = (parolaAttiva === p) ? shakeOffset : 0;
        const offsetY = (parolaAttiva === p) ? shakeOffset * 0.5 : 0;
        const drawX = p.x + offsetX;
        const drawY = p.y + offsetY;
        
        // --- BOLLA DORATA ---
        if (p.dorata) {
            ctx.shadowColor = 'rgba(255, 215, 0, 0.85)';
            ctx.shadowBlur = 18;
            
            const grad = ctx.createLinearGradient(
                drawX - larghezza/2, drawY - FONT_SIZE_PAROLE/2,
                drawX + larghezza/2, drawY + FONT_SIZE_PAROLE/2
            );
            grad.addColorStop(0, '#FFF2A0');
            grad.addColorStop(0.5, '#FFD700');
            grad.addColorStop(1, '#C99A00');
            
            ctx.fillStyle = grad;
            ctx.strokeStyle = shakeTimer > 0 && parolaAttiva === p
                ? "rgba(255, 60, 60, 1)"
                : "#8B6914";
            ctx.lineWidth = 3;
            
            roundRect(ctx, drawX - larghezza/2 - padding,
                      drawY - FONT_SIZE_PAROLE/2 - 10,
                      larghezza + padding*2,
                      FONT_SIZE_PAROLE + 20, 14);
            ctx.fill();
            ctx.stroke();
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            
            if (parolaAttiva === p) {
                const parteFatta = p.testo.substring(0, lettereDigitate);
                const parteResta = p.testo.substring(lettereDigitate);
                const larghezzaFatta = ctx.measureText(parteFatta).width;
                const larghezzaResta = ctx.measureText(parteResta).width;
                const totale = larghezzaFatta + larghezzaResta;
                const startX = drawX - totale / 2;
                
                ctx.textAlign = "left";
                ctx.fillStyle = "#ffffff";
                ctx.shadowColor = "rgba(0,0,0,0.6)";
                ctx.shadowBlur = 3;
                ctx.fillText(parteFatta, startX, drawY);
                
                ctx.fillStyle = "#2a1a00";
                ctx.shadowColor = "transparent";
                ctx.shadowBlur = 0;
                ctx.fillText(parteResta, startX + larghezzaFatta, drawY);
                ctx.textAlign = "center";
            } else if (p.inDistruzione) {
                ctx.fillStyle = "#2a1a00";
                ctx.fillText(p.testo, drawX, drawY);
            } else {
                ctx.fillStyle = "#2a1a00";
                ctx.fillText(p.testo, drawX, drawY);
            }
            
            continue;
        }
        
        // --- BOLLA NORMALE ---
        if (parolaAttiva === p) {
            ctx.fillStyle = "rgba(44, 66, 74, 0.95)";
            ctx.strokeStyle = shakeTimer > 0 ? "rgba(255, 100, 100, 0.9)" : "rgba(0, 212, 255, 0.9)";
            ctx.lineWidth = 3;
        } else if (p.inDistruzione) {
            ctx.fillStyle = "rgba(44, 66, 74, 0.95)";
            ctx.strokeStyle = "rgba(255, 215, 0, 0.9)";
            ctx.lineWidth = 3;
        } else {
            ctx.fillStyle = "rgba(44, 66, 74, 0.9)";
            ctx.strokeStyle = "rgba(0, 212, 255, 0.7)";
            ctx.lineWidth = 2.5;
        }
        
        roundRect(ctx, drawX - larghezza/2 - padding,
                  drawY - FONT_SIZE_PAROLE/2 - 10,
                  larghezza + padding*2,
                  FONT_SIZE_PAROLE + 20, 14);
        ctx.fill(); ctx.stroke();
        
        if (parolaAttiva === p) {
            const parteFatta = p.testo.substring(0, lettereDigitate);
            const parteResta = p.testo.substring(lettereDigitate);
            const larghezzaFatta = ctx.measureText(parteFatta).width;
            const larghezzaResta = ctx.measureText(parteResta).width;
            const totale = larghezzaFatta + larghezzaResta;
            const startX = drawX - totale / 2;
            ctx.textAlign = "left";
            ctx.fillStyle = "#00d4ff";
            ctx.fillText(parteFatta, startX, drawY);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(parteResta, startX + larghezzaFatta, drawY);
            ctx.textAlign = "center";
        } else if (p.inDistruzione) {
            ctx.fillStyle = "#00d4ff";
            ctx.fillText(p.testo, drawX, drawY);
        } else {
            ctx.fillStyle = "#ffffff";
            ctx.fillText(p.testo, drawX, drawY);
        }
    }
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ============================================================
// 17. SFONDO, PAVIMENTO, NEVE
// ============================================================
function disegnaSfondo() {
    if (sfondoBlurCanvas) {
        const imgW = sfondoBlurCanvas.width;
        const imgH = sfondoBlurCanvas.height;
        const scala = Math.max(canvas.width / imgW, canvas.height / imgH);
        const drawW = imgW * scala;
        const drawH = imgH * scala;
        const drawX = (canvas.width - drawW) / 2;
        const drawY = (canvas.height - drawH) / 2;
        ctx.drawImage(sfondoBlurCanvas, drawX, drawY, drawW, drawH);
        ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    const tempo = performance.now();
    for (let i = 0; i < 60; i++) {
        const x = (i * 137.5) % canvas.width;
        const y = (i * 73.3 + tempo * 0.015) % canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + (i % 3) * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function disegnaPavimento() {
    const floorTop = canvas.height - ALTEZZA_PAVIMENTO;
    const grad = ctx.createLinearGradient(0, floorTop, 0, canvas.height);
    grad.addColorStop(0, "rgba(248, 253, 255, 0.96)");
    grad.addColorStop(0.45, "rgba(220, 240, 252, 0.98)");
    grad.addColorStop(1, "rgba(190, 220, 240, 1)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, floorTop, canvas.width, ALTEZZA_PAVIMENTO);
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
    ctx.beginPath();
    ctx.moveTo(0, floorTop);
    const passo = 10;
    for (let x = 0; x <= canvas.width; x += passo) {
        const wave = Math.abs(Math.sin(x * 0.03 + 0.7)) * 5
                   + Math.abs(Math.sin(x * 0.09)) * 2;
        ctx.lineTo(x, floorTop + wave);
    }
    ctx.lineTo(canvas.width, floorTop + 14);
    ctx.lineTo(0, floorTop + 14);
    ctx.closePath();
    ctx.fill();
}

// ============================================================
// 18. CUORI
// ============================================================
function aggiornaCuori() {
    hearts.forEach((heart, index) => {
        const numeroCuore = index + 1;
        if (numeroCuore <= vite) {
            heart.classList.remove('lost');
        } else {
            heart.classList.add('lost');
            heart.classList.add('pulse');
            setTimeout(() => heart.classList.remove('pulse'), 500);
        }
    });
}

// ============================================================
// 19. FINE PARTITA
// ============================================================
async function finePartita() {
    gameOver = true;
    giocoAttivo = false;
    finalScoreDisplay.innerText = punteggio;
    gameOverOverlay.style.display = 'flex';
    targetDisplay.innerText = '-';
    multiplierHud.classList.remove('active');
    coinsHud.classList.remove('active');
    pauseBtn.style.display = 'none';
    speedSlider.disabled = false;
    
    goRecord.style.display = 'none';
    goBestLine.style.display = 'none';
    
    if (!currentUser || !sbClient) return;
    
    const punteggioFinale = punteggio;
    const recordPrecedente = bestScoreCache;
    
    await salvaPunteggio(punteggioFinale);
    
    if (punteggioFinale > recordPrecedente) {
        goRecord.style.display = 'block';
        if (recordPrecedente > 0) {
            goBestLine.style.display = 'block';
            goBest.innerText = recordPrecedente;
        } else {
            goBestLine.style.display = 'none';
        }
        bestScoreCache = punteggioFinale;
    } else {
        if (recordPrecedente > 0) {
            goBestLine.style.display = 'block';
            goBest.innerText = recordPrecedente;
        }
    }
}

// ============================================================
// 20. LOOP PRINCIPALE
// ============================================================
function draw(timestamp) {
    if (!timestamp) timestamp = performance.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    disegnaSfondo();
    disegnaPavimento();
    disegnaPersonaggio();
    
    if (shakeTimer > 0) shakeTimer--;
    
    if (giocoAttivo && !gameOver) {
        if (dovreiSpawnare()) {
            creaParola();
            prossimaSogliaSpawn = canvas.height * SOGLIA_SPAWN_MIN_RATIO
                                + Math.random() * canvas.height * SOGLIA_SPAWN_VAR_RATIO;
        }
        
        const floorTop = canvas.height - ALTEZZA_PAVIMENTO;
        const sogliaImpatto = floorTop - 15;
        
        for (let i = paroleCadenti.length - 1; i >= 0; i--) {
            const p = paroleCadenti[i];
            if (p.colpita) { paroleCadenti.splice(i, 1); continue; }
            p.y += p.velocita;
            
            if (p.y >= sogliaImpatto) {
                if (p.inDistruzione) {
                    creaShatterNeve(p.x, floorTop);
                    paroleCadenti.splice(i, 1);
                    continue;
                }
                if (parolaAttiva === p) {
                    parolaAttiva = null;
                    lettereDigitate = 0;
                    targetDisplay.innerText = '-';
                }
                creaShatterNeve(p.x, floorTop);
                shakeTimer = 12;
                paroleCadenti.splice(i, 1);
                vite--;
                aggiornaCuori();
                riproduciSuonoVita();
                
                if (vite <= 0) {
                    finePartita();
                }
            }
        }
        
        aggiornaPalleNeve(timestamp);
        aggiornaParticelle();
    }
    
    disegnaParole();
    disegnaPalleNeve();
    disegnaParticelle();
    
    requestAnimationFrame(draw);
}

// ============================================================
// 21. INIZIALIZZAZIONE
// ============================================================
async function init() {
    applicaSpeedSlider();
    aggiornaPosizionePersonaggio();
    blurSlider.value = blurSfondo;
    blurValue.innerText = blurSfondo + ' px';
    
    mondoCorrente = MONDI[0];
    caricaAssetMondo(mondoCorrente);
    
    const sessione = await ripristinaSessione();
    if (sessione) {
        currentUser = sessione;
        isGuest = false;
        await Promise.all([caricaBestScore(), caricaProfilo()]);
        mostraMenuPrincipale();
    } else if (!sbClient) {
        isGuest = true;
        mostraMenuPrincipale();
    } else {
        mostraLogin();
    }
    
    draw();
}

init();