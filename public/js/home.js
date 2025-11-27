
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

// Busca o ranking de jogadores pela API
async function fetchAndRenderLeaderboard() {
    const leaderboardEl = document.getElementById('leaderboard');
    try {
        const res = await fetch('/API/user/');
        if (!res.ok) {
            console.warn('Erro ao buscar ranking:', res.status);
            // mostrar mensagem de erro na UI
            if (leaderboardEl) leaderboardEl.innerHTML = '<div class="text-muted p-2">Não foi possível carregar o ranking no momento.</div>';
            currentLeaderboard = [];
            return;
        }
        const rows = await res.json();
        currentLeaderboard = rows;
        renderLeaderboardFromApi(rows);
    } catch (err) {
        console.error('Erro de rede ao buscar ranking:', err);
        if (leaderboardEl) leaderboardEl.innerHTML = '<div class="text-muted p-2">Erro de rede ao carregar o ranking. Tente novamente.</div>';
        currentLeaderboard = [];
    }
}


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
function renderFriendsList(friends = []) {
    const friendsListEl = document.getElementById('friendsList');
    if (!friendsListEl) return;

    friendsListEl.innerHTML = (friends || []).map(friend => {
        const avatar = friend.foto_usuario ? `<img src="${friend.foto_usuario}" alt="" style="width:28px;height:28px;border-radius:50%;margin-right:8px;object-fit:cover">` : (friend.avatar || '👤');
        return `
            <div class="list-group-item friend-item d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center flex-grow-1">
                    <div class="flex-grow-1">
                        <div class="fw-bold">${avatar} ${friend.nome_usuario || friend.name}</div>
                        <small class="text-muted">
                            <i class="bi bi-trophy"></i> ${friend.score_usuario || friend.score || 0} pts
                        </small>
                    </div>
                </div>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-sm btn-outline-primary" onclick="viewProfile(${friend.id_usuario || friend.id})" title="Ver Perfil">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Busca os amigos do usuário pela API e renderiza a lista
 */
async function fetchAndRenderFriends() {
    const friendsListEl = document.getElementById('friendsList');
    if (!friendsListEl) return;

    try {
        const res = await fetch('/API/user/friends', { credentials: 'same-origin' });
        if (!res.ok) {
            console.warn('Erro ao buscar amigos:', res.status);
            renderFriendsList([]);
            return;
        }

        const rows = await res.json();
        // render directly from DB rows
        renderFriendsList(rows || []);
    } catch (err) {
        console.error('Erro de rede ao buscar amigos:', err);
        renderFriendsList([]);
    }
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
        .then(async data => {
            if (data.length === 0) {
                searchResults.innerHTML = '<small class="text-muted d-block text-center py-2">Nenhum usuário encontrado</small>';
                return;
            }
            // carregar lista de amigos diretamente da API para decidir se mostramos botão
            const friendsList = await (async () => {
                try {
                    const fRes = await fetch('/API/user/friends', { credentials: 'same-origin' });
                    if (!fRes.ok) return [];
                    return await fRes.json();
                } catch (e) {
                    return [];
                }
            })();

            searchResults.innerHTML = data.map(user => {
                const isFriend = Array.isArray(friendsList) && friendsList.some(f => Number(f.id_usuario) === Number(user.id_usuario));
                const addButton = isFriend ? '' : `
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="addFriend(${user.id_usuario}, '${user.nome_usuario}')" title="Adicionar Amigo">
                                <i class="bi bi-person-plus"></i>
                            </button>
                        </div>`;

                return `
                    <div class="list-group-item search-result-item d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center flex-grow-1">
                            <div class="flex-grow-1">
                                <div class="fw-bold"><img src="${user.foto_usuario}" alt="${user.nome_usuario}" class="rounded-circle me-2" width="30" height="30"> ${user.nome_usuario}</div>
                            </div>
                        </div>
                        ${addButton}
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
    try {
        const res = await fetch('/API/user/friends', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friendId: userId })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showNotification(err.message || 'Erro ao adicionar amigo.', 'danger');
            return;
        }

        const data = await res.json();
        const friend = data.friend;

        // Recarrega a lista de amigos da API e atualiza a busca caso esteja aberta
        await fetchAndRenderFriends();
        // re-executar pesquisa para atualizar botões (se houver texto de busca)
        const searchInput = document.getElementById('searchUser');
        if (searchInput && searchInput.value.trim().length >= 2) searchUsers();

        showNotification(`${friend.nome_usuario} adicionado(a) aos seus amigos!`, 'success');
    } catch (err) {
        console.error('Erro ao adicionar amigo:', err);
        showNotification('Erro de rede ao adicionar amigo.', 'danger');
    }
}

/**
 * Remove um usuário dos amigos
 * TODO: Integrar com API para remover amigo
 */
async function removeFriend(userId, userName) {
    try {
        const res = await fetch(`/API/user/friends/${userId}`, {
            method: 'DELETE',
            credentials: 'same-origin'
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showNotification(err.message || 'Erro ao remover amigo.', 'danger');
            return;
        }

        // Recarrega a lista de amigos e atualiza busca
        await fetchAndRenderFriends();
        const searchInput = document.getElementById('searchUser');
        if (searchInput && searchInput.value.trim().length >= 2) searchUsers();

        showNotification(`${userName} removido(a) dos seus amigos.`, 'success');
    } catch (err) {
        console.error('Erro ao remover amigo:', err);
        showNotification('Erro de rede ao remover amigo.', 'danger');
    }
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
            showNotification(`Perfil de ${player.nome_usuario} será implementado em breve!`, 'info');
            return;
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
    fetchAndRenderFriends();
    setupSearchDebounce();
    
    console.log('✅ Página inicial carregada com sucesso!');
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}
