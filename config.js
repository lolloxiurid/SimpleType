// ============================================================
// CONFIGURAZIONE DEL GIOCO
// ============================================================

// ============================================================
// SUPABASE
// ============================================================
// 1. Crea un progetto su https://supabase.com
// 2. Vai in Project Settings → API
// 3. Copia "Project URL" e "anon public key" qui sotto
// 4. Nel SQL Editor, crea la tabella `scores` (vedi README nel messaggio)
// 5. In Authentication → Providers → Email, disattiva "Confirm email"
// ============================================================
const SUPABASE_URL = "https://nvfrytuubwhjighxbmgb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_PcRU10wB8eQXCoL2E4qhGg_E60I-xNz";

// ============================================================
// MONDI DISPONIBILI
// ============================================================
// Per aggiungere un nuovo mondo basta aggiungere un oggetto a questo
// array con: id univoco, nome, descrizione, thumbnail, sfondo,
// personaggio, palla, dizionario di parole, suoni (opzionali).
// ============================================================
const MONDI = [
    {
        id: "frozen",
        nome: "Frozen",
        descrizione: "Esplora il regno di ghiaccio con Olaf e impara le parole dell'inverno.",
        thumbnail: "images/bgElsa.jpg",
        sfondo: "images/bgElsa.jpg",
        personaggio: "images/chOlaf.png",
        palla: "images/twSnowball.png",
        dizionario: ["NEVE", "GELO", "ORSO", "PINO", "CASA", "SOLE", "VENTO", "STELLA", "FIOCCO", "GATTO", "CANE", "MARE", "LUNA", "PANE", "MANO", "PALLA", "BOCCA", "ACQUA"],
        suonoParola: "sounds/wordIce.mp3",
        suonoVita: "sounds/lostLife.mp3",
        suonoMoneta: "sounds/coin.mp3",
        probabilitaOro: 0.1
    }
    
];

// ============================================================
// COSTANTI GENERALI
// ============================================================
const BLUR_SFONDO_DEFAULT = 4;
const ALTEZZA_PERSONAGGIO_RATIO = 0.18;
const ALTEZZA_PAVIMENTO = 40;
const DIMENSIONE_PALLA = 36;
const DURATA_VOLO_PALLA = 380;
const ARCO_PALLA = 60;
const FONT_SIZE_PAROLE = 30;
const VITE_INIZIALI = 3;
const SOGLIA_SPAWN_MIN_RATIO = 0.20;
const SOGLIA_SPAWN_VAR_RATIO = 0.08;

// ============================================================
// COSTANTI AUTH
// ============================================================
// Dominio "finto" usato per creare email a partire dal solo username.
// Non serve un'email reale: Supabase Auth richiede un formato email,
// quindi usiamo questo suffisso.
const AUTH_EMAIL_DOMAIN = "@frozen-ice-typing.local";