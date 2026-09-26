// ============================================================
// CONFIGURAZIONE DEL GIOCO
// ============================================================
// Questo è l'UNICO file che devi modificare per aggiungere nuovi mondi.
//
// PER AGGIUNGERE UN NUOVO MONDO:
//   1. Copia le immagini nella cartella del gioco:
//      - una thumbnail (anteprima per il menu)
//      - uno sfondo di gioco
//      - un personaggio (PNG trasparente)
//      - un proiettile/palla (PNG trasparente)
//   2. (Opzionale) Copia i file audio:
//      - suono di quando si completa una parola
//      - suono di quando si perde una vita
//      - suono di quando si raccoglie una moneta
//   3. Aggiungi un oggetto all'array MONDI qui sotto
//   4. Fatto! Il mondo apparirà automaticamente nel menu
// ============================================================

// ============================================================
// SUPABASE
// ============================================================
// 1. Crea un progetto su https://supabase.com
// 2. Vai in Project Settings → API
// 3. Copia "Project URL" e la "Publishable key" (o "anon key")
// 4. Nel SQL Editor, crea le tabelle `scores`, `profiles`, `unlocked_worlds`
// 5. In Authentication → Providers → Email, attiva il provider
//    e DISATTIVA "Confirm email"
// ============================================================
const SUPABASE_URL = "https://nvfrytuubwhjighxbmgb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_PcRU10wB8eQXCoL2E4qhGg_E60I-xNz";

// ============================================================
// MONDI DISPONIBILI
// ============================================================
// Ogni mondo ha:
//   - id: identificatore univoco (usato anche nel DB)
//   - nome: nome mostrato nel menu
//   - descrizione: breve testo descrittivo
//   - thumbnail: immagine di anteprima
//   - sfondo, personaggio, palla: asset di gioco
//   - dizionario: array di parole da digitare
//   - suonoParola, suonoVita, suonoMoneta: file audio opzionali
//   - probabilitaOro: 0-1, probabilità che una parola sia dorata
//   - costo: 0 = gratis, altrimenti costo in monete per sbloccare
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
        probabilitaOro: 0.12,
        costo: 0,
        // Effetto neve che cade sullo sfondo (specifico del mondo)
        effettoNeve: true,
        // Colori del pavimento (gradiente verticale a 2 colori)
        coloriPavimento: {
            top: "rgba(248, 253, 255, 0.96)",
            bottom: "rgba(190, 220, 240, 1)"
        },
        // Scala del proiettile (moltiplicatore di DIMENSIONE_PALLA).
        // Se omesso, usa il valore globale SCALA_PALLA.
        scalaPalla: 1,
        scalaPersonaggio: 1.0
    }
    ,
    {
        id: "halloween",
        nome: "Hotel Transylvania",
        descrizione: "Esplora il mondo tenebroso di Hotel Transylvania.",
        thumbnail: "images/bgHaloween.jpg",
        sfondo: "images/bgHaloween.jpg",
        personaggio: "images/chHotel.png",
        palla: "images/twCandy.png",
        dizionario: ["ALBERO", "FOGLIA", "VOLPE", "FUNGO", "RUSCELLO", "SENTIERO", "CERVO", "GUFO"],
        suonoParola: "sounds/wordStone.mp3",
        suonoVita: "sounds/forest-life.mp3",
        suonoMoneta: "sounds/coin.mp3",
        probabilitaOro: 0.15,
        costo: 20,
        effettoNeve: false,
        // Colori del pavimento (gradiente verticale a 2 colori)
        coloriPavimento: {
            top: "rgba(40, 41, 41, 0.96)",
            bottom: "rgb(16, 16, 16)"
        },
        scalaPalla: 2.5,
        scalaPersonaggio: 1.5
    }
];

// ============================================================
// COSTANTI GENERALI
// ============================================================
const BLUR_SFONDO_DEFAULT = 4;
const ALTEZZA_PERSONAGGIO_RATIO = 0.18;
const ALTEZZA_PAVIMENTO = 40;
const DIMENSIONE_PALLA = 36;
// Moltiplicatore globale della dimensione del proiettile (fallback per mondi
// che non specificano `scalaPalla`).
const SCALA_PALLA = 1.25;
// Moltiplicatore globale della dimensione del personaggio (fallback per mondi
// che non specificano `scalaPersonaggio`).
const SCALA_PERSONAGGIO = 1.0;
const DURATA_VOLO_PALLA = 380;
const ARCO_PALLA = 60;
const FONT_SIZE_PAROLE = 30;
const VITE_INIZIALI = 3;
const SOGLIA_SPAWN_MIN_RATIO = 0.20;
const SOGLIA_SPAWN_VAR_RATIO = 0.08;

// ============================================================
// COSTANTI ANIMAZIONE PERSONAGGIO
// ============================================================
// Durata dell'anticipazione (accucciamento prima del lancio) in ms
const DURATA_ANTICIPAZIONE_LANCIO = 90;
// Durata del follow-through (protesi in avanti dopo il lancio) in ms
const DURATA_FOLLOWTHROUGH_LANCIO = 220;
// Ampiezza del "respiro" idle in px
const AMPIEZZA_IDLE_BOB = 2;
// Velocità del "respiro" idle (radianti al ms)
const VELOCITA_IDLE_BOB = 0.002;

// ============================================================
// COSTANTI AUTH
// ============================================================
// Dominio "finto" usato per creare email a partire dal solo username.
const AUTH_EMAIL_DOMAIN = "@frozen-ice-typing.local";

