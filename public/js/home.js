
// Renderiza leaderboard vindo da API
function renderLeaderboardFromApi(data) {
    const leaderboardEl = document.getElementById('leaderboard');
    if (!leaderboardEl) return;

    leaderboardEl.innerHTML = (data || []).map((player, index) => {
        const rank = index + 1;
        const avatar = player.foto_usuario ? `<img src="${player.foto_usuario}" alt="" style="width:28px;height:28px;border-radius:50%;margin-right:8px;object-fit:cover">` : '🏅';
        const name = player.nome_usuario || '—';
        const score = player.score_usuario != null ? player.score_usuario : 0;

        return `
            <div class="list-group-item leaderboard-item d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center flex-grow-1">
                    <span class="rank-medal me-2">${rank}º</span>
                    <div class="flex-grow-1">
                        <div class="fw-bold">${avatar} ${name}</div>
                        <small class="text-muted">
                            <i class="bi bi-trophy"></i> ${score.toLocaleString()} pontos
                        </small>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-primary" onclick="viewProfile(${player.id_usuario})" title="Ver Perfil">
                    <i class="bi bi-eye"></i>
                </button>
            </div>
        `;
    }).join('');
}

async function fetchAndRenderLeaderboard() {
    try {
        const res = await fetch('/API/user/ranking');
        if (!res.ok) {
            console.warn('Erro ao buscar ranking:', res.status);
            // fallback para dados estáticos
            currentLeaderboard = null;
            renderLeaderboard();
            return;
        }
        const rows = await res.json();
        currentLeaderboard = rows;
        renderLeaderboardFromApi(rows);
    } catch (err) {
        console.error('Erro de rede ao buscar ranking:', err);
        currentLeaderboard = null;
        renderLeaderboard();
    }
}

const friendsData = [
    { id: 4, name: "Ana Costa", score: 13, avatar: "🎨", lastSeen: "2h atrás" },
    { id: 5, name: "Carlos Souza", score: 14, avatar: "🎯", lastSeen: "5h atrás" },
    { id: 1, name: "João Silva", score: 10, avatar: "🎮", lastSeen: "Agora" },
    { id: 2, name: "Maria Santos", score: 11, avatar: "🌸", lastSeen: "Agora" },
    { id: 3, name: "Pedro Oliveira", score: 12, avatar: "⚡", lastSeen: "Agora" },
];

/**
 * Renderiza o ranking de jogadores
 */
function renderLeaderboard() {
    const leaderboardEl = document.getElementById('leaderboard');
    if (!leaderboardEl) return;

    leaderboardEl.innerHTML = leaderboardData.map(player => {
        let medalClass = '';
        let medal = '';

        medal = `${player.rank}º`;

        return `
            <div class="list-group-item leaderboard-item d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center flex-grow-1">
                    <span class="rank-medal ${medalClass} me-2">${medal}</span>
                    <div class="flex-grow-1">
                        <div class="fw-bold">${player.avatar} ${player.name}</div>
                        <small class="text-muted">
                            <i class="bi bi-trophy"></i> ${player.score.toLocaleString()} pontos
                        </small>
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-primary" onclick="viewProfile(${player.rank})" title="Ver Perfil">
                    <i class="bi bi-eye"></i>
                </button>
            </div>
        `;
    }).join('');
}

/**
 * Renderiza a lista de amigos
 */
function renderFriendsList() {
    const friendsListEl = document.getElementById('friendsList');
    if (!friendsListEl) return;
    friendsListEl.innerHTML = friendsData.map(friend => {
        return `
            <div class="list-group-item friend-item d-flex justify-content-between align-items-center" data-user-id="${friend.id_usuario}">
                <div class="d-flex align-items-center flex-grow-1">
                    <div class="flex-grow-1">
                        <div class="fw-bold">${friend.avatar} ${friend.name}</div>
                        <small class="text-muted">
                            <i class="bi bi-trophy"></i> ${friend.score} pts
                        </small>
                    </div>
                </div>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewProfile(${friend.id})" title="Ver Perfil">
                        <i class="bi bi-person"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Busca usuários por nome
 */
function searchUsers() {
    const searchInput = document.getElementById('searchUser');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchInput || !searchResults) return;

    const searchTerm = searchInput.value.trim();
    
    if (searchTerm.length < 2) {
        searchResults.innerHTML = '<small class="text-muted d-block text-center py-2">Digite pelo menos 2 caracteres</small>';
        return;
    }

    // Exibe indicador de carregamento
    searchResults.innerHTML = '<small class="text-muted d-block text-center py-2"><i class="bi bi-hourglass-split"></i> Buscando...</small>';

    // Chama a API para buscar os usuários pelo nome
    fetch(`/API/user/search?nome=${encodeURIComponent(searchTerm)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro na busca');
            }
            return response.json();
        })
        .then(data => {
            if (data.length === 0) {
                searchResults.innerHTML = '<small class="text-muted d-block text-center py-2">Nenhum usuário encontrado</small>';
                return;
            }
            searchResults.innerHTML = data.map(user => {
                return `
                    <div class="list-group-item search-result-item d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center flex-grow-1">
                            <div class="flex-grow-1">
                                <div class="fw-bold"><img src="${user.foto_usuario}" alt="${user.nome_usuario}" class="rounded-circle me-2" width="30" height="30"> ${user.nome_usuario}</div>
                            </div>
                        </div>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="addFriend(${user.id_usuario}, '${user.nome_usuario}')" title="Adicionar Amigo">
                                <i class="bi bi-person-plus"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        })
        .catch(err => {
            console.error('Erro ao buscar usuários:', err);
            searchResults.innerHTML = '<small class="text-danger d-block text-center py-2">Erro ao buscar usuários. Tente novamente.</small>';
        });
}

/**
 * Adiciona um usuário como amigo
 * TODO: Integrar com API para adicionar amigo
 */
async function addFriend(userId, userName) {
    // TODO: Implementar chamada à API
    // const response = await fetch('/api/friends', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ userId })
    // });
    // const result = await response.json();
    
    showNotification(`Funcionalidade será implementada com a API`, 'info');
}

/**
 * Remove um usuário dos amigos
 * TODO: Integrar com API para remover amigo
 */
async function removeFriend(userId, userName) {
    // TODO: Implementar chamada à API
    // const response = await fetch(`/api/friends/${userId}`, {
    //     method: 'DELETE',
    //     headers: { 'Content-Type': 'application/json' }
    // });
    // const result = await response.json();
    
    showNotification(`Funcionalidade será implementada com a API`, 'info');
}

/**
 * Visualiza o perfil de um jogador
 */
let currentLeaderboard = null; // armazenará dados vindos da API

function viewProfile(id) {
    // procurar no leaderboard atual (API)
    if (currentLeaderboard && Array.isArray(currentLeaderboard)) {
        const player = currentLeaderboard.find(p => p.id_usuario === id);
        if (player) {
            return showProfileModal(player);
        }
    }

    // fallback para dados estáticos (compatibilidade)
    const playerStatic = leaderboardData.find(p => p.rank === id || p.name === id);
    if (playerStatic) {
        showNotification(`Perfil de ${playerStatic.name} será implementado em breve!`, 'info');
        return;
    }

    showNotification('Perfil não encontrado.', 'warning');
}

// --- Mostrar modal de perfil  ---
function showProfileModal(user) {
    const overlay = document.getElementById('profileModal');
    const contentEl = document.getElementById('profileModalContent');
    if (!overlay || !contentEl) return;

    const foto = user.foto_usuario || '/img/usuario.png';
    const nome = user.nome_usuario || '—';
    const score = (user.score_usuario != null) ? user.score_usuario : (user.score != null ? user.score : 0);
    const userId = user.id_usuario ?? user.id ?? null;
    const friendExists = !!(userId != null && document.querySelector(`#friendsList [data-user-id="${userId}"]`));
    const actionButtons = friendExists
        ? `<button class="btn btn-danger btn-sm" id="modalRemoveFriendBtn">Remover Amigo</button>`
        : `<button class="btn btn-primary btn-sm" id="modalAddFriendBtn">Adicionar Amigo</button>`;

    contentEl.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center">
            <img src="${foto}" alt="${nome}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid rgba(0,0,0,0.06)">
            <div style="flex:1">
                <div style="font-weight:700;font-size:1.05rem">${nome}</div>
                <div class="text-muted" style="font-size:0.9rem;margin-top:6px"><i class="bi bi-trophy"></i> ${score.toLocaleString()} pontos</div>
            </div>
        </div>
        <hr style="margin:12px 0">
        <div>
            <p style="margin:0 0 8px 0">ID: <strong>${user.id_usuario ?? user.id ?? '—'}</strong></p>
            <p style="margin:0 0 8px 0">Nome: <strong>${nome}</strong></p>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
            ${actionButtons}
            <button class="btn btn-secondary btn-sm" id="profileModalCloseBtn">Fechar</button>
        </div>
    `;

    overlay.classList.remove('d-none');
    overlay.style.display = 'flex';

    // fechar handlers
    const closeBtn = document.getElementById('profileModalClose');
    if (closeBtn) closeBtn.onclick = hideProfileModal;
    const closeBtn2 = document.getElementById('profileModalCloseBtn');
    if (closeBtn2) closeBtn2.onclick = hideProfileModal;

    // fechar ao clicar fora do card
    overlay.onclick = (e) => { if (e.target === overlay) hideProfileModal(); };

    // ligar botões de ação do modal
    const addBtn = document.getElementById('modalAddFriendBtn');
    if (addBtn) addBtn.onclick = () => {
        addFriend(userId, nome);
        hideProfileModal();
    };
    const removeBtn = document.getElementById('modalRemoveFriendBtn');
    if (removeBtn) removeBtn.onclick = () => {
        removeFriend(userId, nome);
        hideProfileModal();
    };
}

function hideProfileModal() {
    const overlay = document.getElementById('profileModal');
    if (!overlay) return;
    overlay.classList.add('d-none');
    overlay.style.display = 'none';
}

/**
 * Exibe notificações toast
 */
function showNotification(message, type = 'info') {
    // Cria um elemento de notificação
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(toast);
    
    // Remove após 4 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 150);
    }, 4000);
}

/**
 * Adiciona efeito de digitação no campo de busca
 */
function setupSearchDebounce() {
    const searchInput = document.getElementById('searchUser');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(searchUsers, 300);
    });
}

/**
 * Inicializa a página
 */
function initializePage() {
    fetchAndRenderLeaderboard();
    renderFriendsList();
    setupSearchDebounce();
    
    console.log('✅ Página inicial carregada com sucesso!');
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}
