// ===================================================
// CONFIGURAÇÃO DA API
// Quando o frontend for servido pelo FastAPI (Dia 3), a API está
// no mesmo servidor — usamos uma URL relativa ou o endereço completo.
// ===================================================
const API_BASE_URL = "http://localhost:8000";

// ===================================================
// CHAVES DE PERSISTÊNCIA (localStorage)
// ===================================================
const KEY_COLLECTED = "stranger-album:collected";
const KEY_MUTED = "stranger-album:muted";
const KEY_USER_PHOTO = "stranger-album:user-photo";

const PACK_SIZE = 5; // quantas figurinhas novas cada pacote revela

// Estado do catálogo, preenchido após a resposta da API
let catalogoPorId = new Map();
let slotsPorId = new Map();
let totalColecionaveis = 0;

// ===================================================
// PERSISTÊNCIA: coleção de figurinhas já reveladas
// ===================================================
function getCollectedIds() {
    try {
        const raw = localStorage.getItem(KEY_COLLECTED);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) {
        console.warn("Não foi possível ler o progresso salvo:", e.message);
        return new Set();
    }
}

function saveCollectedIds(collected) {
    try {
        localStorage.setItem(KEY_COLLECTED, JSON.stringify([...collected]));
    } catch (e) {
        console.warn("Não foi possível salvar o progresso:", e.message);
    }
}

// ===================================================
// MAPEIA OS SLOTS HTML PELO NÚMERO (#01 → 1, etc.)
// ===================================================
function construirSlotsPorId() {
    const map = new Map();
    document.querySelectorAll(".sticker-slot .slot-number").forEach((el) => {
        const id = parseInt(el.textContent.replace("#", ""), 10);
        map.set(id, el.closest(".sticker-slot"));
    });
    return map;
}

// ===================================================
// COLA a imagem de uma figurinha dentro de um slot,
// com um breve shimmer enquanto a imagem carrega da rede.
// ===================================================
function colarFigurinha(slot, figurinha) {
    if (slot.querySelector(".sticker-img")) return; // já preenchido

    slot.classList.add("slot-loading");

    const img = document.createElement("img");
    img.src = `${API_BASE_URL}${figurinha.imagem_url}`;
    img.alt = figurinha.nome;
    img.className = "sticker-img";

    img.onload = () => {
        slot.classList.remove("slot-loading");
        slot.classList.add("slot-preenchido");
    };
    img.onerror = () => {
        slot.classList.remove("slot-loading");
        console.warn(`Imagem não encontrada: ${figurinha.nome}`);
    };

    slot.insertBefore(img, slot.firstChild);
}

// Preenche o mini-card flutuante da capa correspondente, se existir (#01, #03, #09)
function preencherMiniCardSeExistir(id, figurinha) {
    const card = [...document.querySelectorAll(".mini-card")].find((c) => {
        const numEl = c.querySelector(".mc-num");
        return numEl && parseInt(numEl.textContent.replace("#", ""), 10) === id;
    });
    if (!card) return;

    const avatar = card.querySelector(".mc-avatar");
    if (!avatar || avatar.querySelector(".mc-avatar-img")) return;

    const img = document.createElement("img");
    img.src = `${API_BASE_URL}${figurinha.imagem_url}`;
    img.alt = figurinha.nome;
    img.className = "mc-avatar-img";
    img.onerror = () => console.warn(`Imagem da capa não encontrada: ${figurinha.nome}`);

    avatar.appendChild(img);
}

// Revela uma figurinha (slot da página + mini-card da capa, se houver)
function revelarFigurinha(id, { animarBrilho = false } = {}) {
    const figurinha = catalogoPorId.get(id);
    const slot = slotsPorId.get(id);
    if (!figurinha || !slot) return;

    colarFigurinha(slot, figurinha);
    preencherMiniCardSeExistir(id, figurinha);

    if (animarBrilho) {
        slot.classList.add("just-collected");
        setTimeout(() => slot.classList.remove("just-collected"), 2000);
    }
}

// ===================================================
// PROGRESSO E BOTÃO "ABRIR PACOTE"
// ===================================================
function atualizarProgresso(qtdColetadas) {
    const badge = document.getElementById("progress-badge");
    if (badge) badge.textContent = `${qtdColetadas}/${totalColecionaveis}`;
}

function atualizarBotaoPacote(qtdColetadas) {
    const btn = document.getElementById("btn-pack");
    if (!btn) return;
    const label = btn.querySelector(".pack-btn-label");

    if (totalColecionaveis > 0 && qtdColetadas >= totalColecionaveis) {
        label.textContent = "Álbum completo!";
        btn.classList.add("complete");
        btn.disabled = true;
    } else {
        label.textContent = "Abrir Pacote";
        btn.classList.remove("complete");
        btn.disabled = false;
    }
}

// ===================================================
// BANNER DE ERRO (falha ao conectar com o backend)
// ===================================================
function mostrarErroBanner(mensagem) {
    const banner = document.getElementById("error-banner");
    const texto = document.getElementById("error-banner-text");
    if (!banner || !texto) return;
    texto.textContent = mensagem;
    banner.classList.remove("hidden");
    document.body.classList.add("has-error-banner");
}

function esconderErroBanner() {
    const banner = document.getElementById("error-banner");
    if (banner) banner.classList.add("hidden");
    document.body.classList.remove("has-error-banner");
}

// ===================================================
// Busca o catálogo na API e aplica o progresso já salvo
// ===================================================
async function carregarCatalogo() {
    const btnPack = document.getElementById("btn-pack");

    try {
        const response = await fetch(`${API_BASE_URL}/figurinhas`);
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
        }

        const figurinhas = await response.json();
        catalogoPorId = new Map(figurinhas.map((f) => [f.id, f]));
        totalColecionaveis = figurinhas.length;

        esconderErroBanner();

        // Remove do progresso salvo qualquer ID que não exista mais no catálogo
        const salvos = getCollectedIds();
        const validos = new Set([...salvos].filter((id) => catalogoPorId.has(id)));
        if (validos.size !== salvos.size) saveCollectedIds(validos);

        for (const id of validos) {
            revelarFigurinha(id, { animarBrilho: false });
        }

        atualizarProgresso(validos.size);
        atualizarBotaoPacote(validos.size);

        console.log(`✅ Catálogo carregado: ${figurinhas.length} figurinhas disponíveis.`);
    } catch (erro) {
        console.warn("⚠️  Não foi possível conectar à API do backend:", erro.message);
        console.info("ℹ️  Inicie o servidor: cd backend && uvicorn main:app --reload");
        mostrarErroBanner("Não foi possível conectar ao servidor. Verifique se o backend está rodando em http://localhost:8000.");

        if (btnPack) {
            btnPack.querySelector(".pack-btn-label").textContent = "Indisponível";
            btnPack.disabled = true;
        }
    } finally {
        // Só mostra os controles depois que sabemos o resultado (sucesso ou erro),
        // evitando exibir um estado intermediário de "carregando"
        const controls = document.getElementById("pack-controls");
        if (controls) controls.classList.remove("hidden");
    }
}

// ===================================================
// FOTO DO USUÁRIO (slot #31 "Você")
// ===================================================
function aplicarFotoUsuario(slot, dataUrl) {
    const existente = slot.querySelector(".sticker-img");
    if (existente) existente.remove();

    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "Sua foto";
    img.className = "sticker-img";

    slot.insertBefore(img, slot.firstChild);
    slot.classList.add("slot-preenchido");
}

// Redimensiona/comprime a imagem escolhida antes de salvar no localStorage
function prepararFotoUsuario(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error("Arquivo de imagem inválido"));
            img.onload = () => {
                const MAX_DIMENSAO = 480;
                let { width, height } = img;

                if (width > height && width > MAX_DIMENSAO) {
                    height = Math.round(height * (MAX_DIMENSAO / width));
                    width = MAX_DIMENSAO;
                } else if (height > MAX_DIMENSAO) {
                    width = Math.round(width * (MAX_DIMENSAO / height));
                    height = MAX_DIMENSAO;
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                canvas.getContext("2d").drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL("image/jpeg", 0.82));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const bookElement = document.getElementById("book");
    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");
    const soundToggle = document.getElementById("sound-toggle");
    const iconOn = soundToggle.querySelector(".sound-icon-on");
    const iconOff = soundToggle.querySelector(".sound-icon-off");

    // Estado inicial do mudo é lido do localStorage (preferência persistida)
    let isMuted = localStorage.getItem(KEY_MUTED) === "true";
    if (isMuted) {
        iconOn.classList.add("hidden");
        iconOff.classList.remove("hidden");
    }

    let pageFlip = null;

    // 1. Initialize St.PageFlip
    try {
        pageFlip = new St.PageFlip(bookElement, {
            width: 550, // Base page width
            height: 800, // Base page height
            size: "stretch",
            minWidth: 315,
            maxWidth: 1000,
            minHeight: 420,
            maxHeight: 1350,
            drawShadow: true,
            maxShadowOpacity: 0.4, // Aumenta levemente contraste da sombra
            showCover: true,
            mobileScrollSupport: true,
            useMouseEvents: false, // Desativa gestos padrão do StPageFlip para evitar cliques indesejados nas bordas/páginas
            showPageCorners: false, // Remove dobras dos cantos no hover
            disableFlipByClick: true, // Garante que a virada por cliques simples esteja desativada
            flippingTime: 800 // Transição mais ágil e snappier (800ms em vez de 1000ms)
        });

        // Load pages from HTML
        pageFlip.loadFromHTML(document.querySelectorAll(".page"));

        // Estado de arraste personalizado
        let activeDragPage = null;
        let isClicking = false;
        let startX = 0;
        let startY = 0;
        let dragStarted = false;

        // Monitora o mousedown/touchstart em cada página para iniciar a intenção de arraste
        document.querySelectorAll(".page").forEach((page, index) => {
            page.addEventListener("mousedown", (e) => {
                if (e.target.closest("button") || e.target.closest("a")) return;
                isClicking = true;
                startX = e.clientX;
                startY = e.clientY;
                dragStarted = false;
                activeDragPage = { page, index };
            });

            page.addEventListener("touchstart", (e) => {
                if (e.target.closest("button") || e.target.closest("a")) return;
                const touch = e.touches[0];
                isClicking = true;
                startX = touch.clientX;
                startY = touch.clientY;
                dragStarted = false;
                activeDragPage = { page, index };
            });
        });

        // Executa o movimento de dobra apenas se o mouse/dedo se mover além de um limiar (threshold)
        const handleMove = (clientX, clientY, isTouch = false) => {
            if (!isClicking || !activeDragPage) return;

            const deltaX = clientX - startX;
            const deltaY = clientY - startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            const bookRect = bookElement.getBoundingClientRect();

            // Só ativa o flip se mover mais de 10px (evita disparar ao clicar e soltar estático)
            if (distance > 10 && !dragStarted) {
                dragStarted = true;
                let cornerX, cornerY;

                // Determina canto vertical (topo vs base) em coordenadas relativas ao livro
                const centerY = bookRect.top + bookRect.height / 2;
                if (startY < centerY) {
                    cornerY = 0; // Canto superior
                } else {
                    cornerY = bookRect.height; // Canto inferior
                }

                // Determina canto horizontal (direita vs esquerda) em coordenadas relativas ao livro
                if (activeDragPage.index % 2 === 0) {
                    cornerX = bookRect.width; // Canto direito
                } else {
                    cornerX = 0; // Canto esquerdo
                }

                document.body.classList.add("dragging");
                pageFlip.startUserTouch({ x: cornerX, y: cornerY });
            }

            if (dragStarted) {
                const relX = clientX - bookRect.left;
                const relY = clientY - bookRect.top;
                pageFlip.userMove({ x: relX, y: relY }, isTouch);
            }
        };

        const handleRelease = (clientX, clientY, isTouch = false) => {
            if (dragStarted) {
                const bookRect = bookElement.getBoundingClientRect();
                const relX = clientX - bookRect.left;
                const relY = clientY - bookRect.top;
                pageFlip.userStop({ x: relX, y: relY }, isTouch);
            }
            isClicking = false;
            dragStarted = false;
            activeDragPage = null;
            document.body.classList.remove("dragging");
        };

        window.addEventListener("mousemove", (e) => {
            handleMove(e.clientX, e.clientY, false);
        });

        window.addEventListener("touchmove", (e) => {
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                handleMove(touch.clientX, touch.clientY, true);
            }
        });

        window.addEventListener("mouseup", (e) => {
            handleRelease(e.clientX, e.clientY, false);
        });

        window.addEventListener("touchend", (e) => {
            const touch = e.changedTouches[0] || e.touches[0];
            if (touch) {
                handleRelease(touch.clientX, touch.clientY, true);
            } else {
                handleRelease(startX, startY, true);
            }
        });

        // Show book after successful initialization
        bookElement.style.display = "block";

        // Mapeia os slots pelo número e busca o catálogo/progresso da API
        slotsPorId = construirSlotsPorId();
        carregarCatalogo();

    } catch (error) {
        console.error("Erro ao inicializar a biblioteca PageFlip:", error);
    }

    // 2. Sound Effect Generator (Web Audio API)
    function playPaperTurnSound() {
        if (isMuted) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const audioCtx = new AudioContext();
            const duration = 0.45; // seconds
            const sampleRate = audioCtx.sampleRate;
            const bufferSize = sampleRate * duration;
            const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
            const data = buffer.getChannelData(0);

            // Synthesize white noise with a custom page-flip volume envelope
            for (let i = 0; i < bufferSize; i++) {
                const progress = i / bufferSize;
                // Noise value between -1 and 1
                const noise = Math.random() * 2 - 1;

                // Volume envelope: smooth curve that peaks around 30% of the duration
                let envelope = 0;
                if (progress < 0.3) {
                    envelope = progress / 0.3; // Rapid ramp up
                } else {
                    envelope = (1 - progress) / 0.7; // Smooth decay
                }

                // Add minor irregular spikes to simulate paper friction/crackle
                const paperCrackle = Math.random() > 0.985 ? (Math.random() * 2 - 1) * 0.35 : 0;

                data[i] = (noise * 0.65 + paperCrackle) * envelope * 0.12;
            }

            // Create nodes
            const noiseNode = audioCtx.createBufferSource();
            noiseNode.buffer = buffer;

            // Bandpass filter to extract the "whoosh" sound of paper shuffling
            const bandpassFilter = audioCtx.createBiquadFilter();
            bandpassFilter.type = "bandpass";
            bandpassFilter.Q.value = 2.0;

            // Dynamic frequency sweep: starts at 1500Hz, sweeps down to 350Hz (sound of page moving away)
            bandpassFilter.frequency.setValueAtTime(1500, audioCtx.currentTime);
            bandpassFilter.frequency.exponentialRampToValueAtTime(350, audioCtx.currentTime + duration);

            // Lowpass filter to remove harsh high-frequency digital artifacts
            const lowpassFilter = audioCtx.createBiquadFilter();
            lowpassFilter.type = "lowpass";
            lowpassFilter.frequency.setValueAtTime(3800, audioCtx.currentTime);

            // Connect graph: Source -> Bandpass -> Lowpass -> Destination
            noiseNode.connect(bandpassFilter);
            bandpassFilter.connect(lowpassFilter);
            lowpassFilter.connect(audioCtx.destination);

            noiseNode.start();
        } catch (e) {
            console.warn("Falha ao tocar som de virada de página:", e);
        }
    }

    // 3. Audio State Controls (preferência de mudo persistida no localStorage)
    soundToggle.addEventListener("click", () => {
        isMuted = !isMuted;
        localStorage.setItem(KEY_MUTED, String(isMuted));
        if (isMuted) {
            iconOn.classList.add("hidden");
            iconOff.classList.remove("hidden");
        } else {
            iconOn.classList.remove("hidden");
            iconOff.classList.add("hidden");
        }
    });

    // 4. Navigation controls and events
    if (pageFlip) {
        // Play turn sound when page starts flipping
        pageFlip.on("changeState", (e) => {
            if (e.data === "flipping") {
                playPaperTurnSound();
            }
        });

        // Discrete arrow toggle depending on current page
        pageFlip.on("flip", (e) => {
            const currentPage = e.data;
            const totalPages = pageFlip.getPageCount();

            // Hide left button on cover page
            if (currentPage === 0) {
                btnPrev.classList.add("hidden");
            } else {
                btnPrev.classList.remove("hidden");
            }

            // Hide right button on back cover
            if (currentPage === totalPages - 1) {
                btnNext.classList.add("hidden");
            } else {
                btnNext.classList.remove("hidden");
            }
        });

        // Click events for navigational arrows
        btnPrev.addEventListener("click", () => {
            pageFlip.flipPrev();
        });

        btnNext.addEventListener("click", () => {
            pageFlip.flipNext();
        });

        // Keyboard events for navigational arrows
        document.addEventListener("keydown", (e) => {
            if (e.key === "ArrowLeft") {
                pageFlip.flipPrev();
            } else if (e.key === "ArrowRight") {
                pageFlip.flipNext();
            }
        });

        // Hide left button initially since start page is 0
        btnPrev.classList.add("hidden");
    }

    // 5. Botão "Abrir Pacote": revela um lote de figurinhas ainda não coletadas
    const btnPack = document.getElementById("btn-pack");
    btnPack.addEventListener("click", () => {
        if (btnPack.disabled || totalColecionaveis === 0) return;

        const collected = getCollectedIds();
        const faltando = [...catalogoPorId.keys()].filter((id) => !collected.has(id));
        if (faltando.length === 0) return;

        // Embaralha (Fisher-Yates) e pega até PACK_SIZE ids
        for (let i = faltando.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [faltando[i], faltando[j]] = [faltando[j], faltando[i]];
        }
        const sorteadas = faltando.slice(0, PACK_SIZE);

        btnPack.disabled = true;
        sorteadas.forEach((id, index) => {
            setTimeout(() => {
                collected.add(id);
                saveCollectedIds(collected);
                revelarFigurinha(id, { animarBrilho: true });
                atualizarProgresso(collected.size);
                atualizarBotaoPacote(collected.size);
            }, index * 150);
        });
    });

    // 6. Botão de reiniciar coleção (mantém a foto do usuário no slot #31)
    const btnReset = document.getElementById("btn-reset");
    btnReset.addEventListener("click", () => {
        const confirmado = window.confirm(
            "Isso vai apagar todo o progresso da sua coleção de figurinhas (sua foto no slot #31 não será afetada). Deseja continuar?"
        );
        if (!confirmado) return;

        localStorage.removeItem(KEY_COLLECTED);

        document.querySelectorAll(".sticker-slot.slot-preenchido").forEach((slot) => {
            if (slot.id === "slot-31") return; // preserva a foto do usuário
            const img = slot.querySelector(".sticker-img");
            if (img) img.remove();
            slot.classList.remove("slot-preenchido");
        });
        document.querySelectorAll(".mc-avatar-img").forEach((img) => img.remove());

        atualizarProgresso(0);
        atualizarBotaoPacote(0);
    });

    // 7. Banner de erro: fechar e tentar novamente
    document.getElementById("error-banner-close").addEventListener("click", esconderErroBanner);
    document.getElementById("error-banner-retry").addEventListener("click", () => {
        esconderErroBanner();
        carregarCatalogo();
    });

    // 8. Slot #31 ("Você"): clique para colar a própria foto
    const slotUsuario = document.getElementById("slot-31");
    const inputFotoUsuario = document.getElementById("user-photo-input");

    const fotoSalva = localStorage.getItem(KEY_USER_PHOTO);
    if (fotoSalva) aplicarFotoUsuario(slotUsuario, fotoSalva);

    slotUsuario.addEventListener("click", () => inputFotoUsuario.click());

    inputFotoUsuario.addEventListener("change", async () => {
        const file = inputFotoUsuario.files[0];
        inputFotoUsuario.value = ""; // permite selecionar o mesmo arquivo de novo depois

        if (!file || !file.type.startsWith("image/")) return;

        try {
            const dataUrl = await prepararFotoUsuario(file);
            localStorage.setItem(KEY_USER_PHOTO, dataUrl);
            aplicarFotoUsuario(slotUsuario, dataUrl);
        } catch (e) {
            console.warn("Não foi possível salvar sua foto:", e.message);
            alert("Não foi possível usar essa imagem. Tente uma foto diferente.");
        }
    });
});
