let currentDate = new Date();
currentDate.setHours(0, 0, 0, 0);

// 콜백 함수에 async를 붙여줍니다.
document.addEventListener("DOMContentLoaded", async () => {
    
    // 🚨 1. 페이지가 켜지자마자 오늘 노래를 등록했는지 서버에 물어봅니다.
    try {
        const checkRes = await fetch('../php/api.php?action=check_today_recommend');
        const checkData = await checkRes.json();
        
        // 권한이 없으면 로그인으로
        if (checkData.error === "Unauthorized") {
            window.location.replace("login.html");
            return;
        }
        
        // ✅ 오늘 등록을 안 했다면 강제로 메인 페이지로 튕겨냅니다.
        if (!checkData.already_done) {
            window.location.replace("main.html"); // replace를 쓰면 뒤로가기 버튼도 먹히지 않습니다.
            return;
        }
    } catch (e) {
        console.error("접근 권한 확인 실패:", e);
    }

    // 2. 노래를 등록한 착한 유저라면 기존 코드를 정상적으로 실행합니다.
    updateDateDisplay();
    setupDateNavigation();
    setupEventListeners();
    setupSwipeGesture();
    loadMyInfoIntoGroup();
    restoreToggleStates(); 
});

// --- 1. 날짜 포맷팅 함수 ---
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// --- 2. 상단 날짜 업데이트 및 리스트 로드 ---
function updateDateDisplay() {
    const dateEl = document.getElementById("today-date");
    if (dateEl) {
        dateEl.innerText = formatDate(currentDate).replace(/-/g, '.');
    }
    loadData();
}

// --- 3. 날짜 이동 네비게이션 ---
function setupDateNavigation() {
    const prevBtn = document.getElementById("prev-date");
    const nextBtn = document.getElementById("next-date");
    if (prevBtn) {
        prevBtn.onclick = () => {
            currentDate.setDate(currentDate.getDate() - 1);
            updateDateDisplay();
        };
    }
    if (nextBtn) {
        nextBtn.onclick = () => {
            currentDate.setDate(currentDate.getDate() + 1);
            updateDateDisplay();
        };
    }
    const dateDisplay = document.getElementById("today-date");
    if (dateDisplay) {
        dateDisplay.style.cursor = "pointer";
        dateDisplay.onclick = () => {
            currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);
            updateDateDisplay();
        };
    }
}

// --- 4. 데이터 로드 (DB 연동) ---
async function loadData() {
    try {
        const targetDate = formatDate(currentDate);
        const res = await fetch(`../php/api.php?action=get_data&date=${targetDate}`);
        const data = await res.json();

        if (data.error === "Unauthorized") {
            window.location.replace("login.html");
            return;
        }

        // 1. 피드(노래) 목록 출력
        renderFeedSongs(data.feed_songs);

        // 2. 전체 재생 큐 동기화
        PlayAll.syncQueue(data.feed_songs);

        // 3. 친구 요청 목록 출력
        renderRequests(data.requests);

        // 4. 그룹 목록 출력 
        renderGroups(data.groups);

        // 5. 친구 목록 출력
        renderFriends(data.friends);

    } catch (err) {
        console.error("데이터를 불러오는 중 오류가 발생했습니다:", err);
    }
}

/**
 * 🎵 피드 목록 렌더링
 */
function renderFeedSongs(songs) {
    const container = document.getElementById('song-list-container');
    if (!container) return;

    container.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(currentDate);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate > today) {
        const dateStr = formatDate(targetDate).replace(/-/g, '.');
        container.innerHTML = `<div class="empty-msg" style="text-align:center; margin-top:50px; color:#999; font-weight:700; font-size:16px;">아직 ${dateStr}가 되지 않았습니다.</div>`;
        return;
    }

    if (!songs || songs.length === 0) {
        container.innerHTML = '<div class="empty-msg" style="text-align:center; margin-top:50px; color:#999;">조회할 멤버가 없습니다.</div>';
        return;
    }

    let emptyMsg = '추천을 기다리고 있어요 🎧';
    if (targetDate < today) {
        emptyMsg = '추천한 노래가 없습니다.';
    }

    songs.forEach(song => {
        const card = document.createElement('div');
        card.className = 'song-card'; 

        const infoName = song.username;

        if (song.song_id) {
            card.innerHTML = `
                <div class="song-scroll-wrapper">
                    <div class="thumb-area" style="cursor: pointer;">
                        <img src="${song.thumbnail_img}" alt="thumbnail" class="thumb-img" onload="if(this.naturalWidth === 120 && this.src.includes('maxresdefault')) this.src = this.src.replace('maxresdefault', 'hqdefault');" onerror="if(this.src.includes('maxresdefault')) this.src = this.src.replace('maxresdefault', 'hqdefault');">
                        <div class="rolling-comment" id="rolling-comment-${song.song_id}"></div>
                        <div class="video-info-overlay">
                            <div class="video-title" style="color: #ffffff;">${song.title || '제목 없음'}</div>
                        </div>
                    </div>
                    <div class="info-area">
                        <div class="user" style="margin-bottom: 2px;">${infoName}</div>
                        <div style="font-size: 11px; color: rgba(0,0,0,0.4); margin-bottom: 8px; font-weight: 500;">@${song.login_id || '아이디 없음'}</div>
                        <div class="msg">${song.daily_comment || '등록된 코멘트가 없습니다.'}</div>
                        <div class="post-time">${song.log_date || ''} ${song.log_time || ''}</div>
                        <button class="comment-btn" data-song-id="${song.song_id}" aria-label="댓글">
                            <img src="../img/comment.png" alt="댓글">
                        </button>
                    </div>
                </div>
            `;
            
            const thumbArea = card.querySelector('.thumb-area');
            if (thumbArea && song.youtube_url) {
                thumbArea.onclick = () => window.open(song.youtube_url, '_blank');
            }

            const commentBtn = card.querySelector('.comment-btn');
            if (commentBtn) {
                commentBtn.onclick = (e) => {
                    e.stopPropagation();
                    openCommentModal(song.song_id);
                };
            }
        } else {
            card.innerHTML = `
                <div class="song-scroll-wrapper">
                    <div class="thumb-area wavy-bw-gradient">
                    </div>
                    <div class="info-area" style="background: #f8f9fa; display: flex; justify-content: center; align-items: center; text-align: center;">
                        <div class="msg" style="color: #adb5bd; font-weight: 600; margin: 0; font-size: 15px;">${emptyMsg}</div>
                    </div>
                </div>
            `;
        }

        container.appendChild(card);

        if (song.song_id) {
            startRollingComments(song.song_id);
        }
    });
}

function renderRequests(requests) {
    const reqList = document.getElementById('requestListContainer');
    if (!reqList) return;

    reqList.innerHTML = '';
    if (!requests || requests.length === 0) {
        reqList.innerHTML = '<div class="empty-msg" style="padding:10px; color:#999;">친구요청이 없습니다.</div>';
    } else {
        requests.forEach(req => {
            const div = document.createElement('div');
            div.className = 'friend-item highlight-yellow request-item';
            div.innerHTML = `<span>${req.username || '알 수 없는 유저'}님의 친구 요청</span>`;
            reqList.appendChild(div);
        });
    }
}

function renderGroups(groups) {
    const groupList = document.getElementById('groupListContainer');
    if (!groupList) return;

    groupList.innerHTML = '';
    groups.forEach(g => {
        const div = document.createElement('div');
        div.className = 'friend-item group-item';
        div.innerHTML = `
            <div class="group-name-clickable" style="flex: 1; cursor: pointer;">
                <span class="group-name-label">${g.group_name}</span>
            </div>
            <div class="group-member-info" style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <img src="../img/group.png" alt="group" class="action-icon" style="width:22px; height:22px;">
                <span class="group-count">${g.member_count}</span>
            </div>`;

        div.querySelector('.group-name-clickable').addEventListener('click', () => {
            if (typeof openGroupMainModal === 'function') {
                openGroupMainModal(g.group_id, g.group_name);
            }
        });

        div.querySelector('.group-member-info').addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof showGroupMembers === 'function') {
                showGroupMembers(g.group_id, g.group_name);
            }
        });

        groupList.appendChild(div);
    });
}

function renderFriends(friends) {
    const friendList = document.getElementById('friendMainList');
    if (!friendList) return;

    friendList.innerHTML = '';
    friends.forEach(f => {
        const div = document.createElement('div');
        div.className = 'friend-item highlight-white profile-trigger';
        div.innerHTML = `<span>${f.username || '알 수 없는 친구'}</span>`;
        friendList.appendChild(div);
    });
}

function restoreToggleStates() {
    document.querySelectorAll('.collapsible-content').forEach((list, index) => {
        const isCollapsed = localStorage.getItem(`section_collapsed_${index}`) === 'true';
        if (isCollapsed) {
            list.classList.add('collapsed');
            const btn = list.previousElementSibling;
            if (btn && btn.querySelector('.arrow')) btn.querySelector('.arrow').classList.add('rotated');
        }
    });
}

async function loadMyInfoIntoGroup() {
    const groupListContainer = document.getElementById("real-group-list");
    if (!groupListContainer) return;

    groupListContainer.className = "group-list-container";
    
    try {
        const userRes = await fetch('../php/get_user_info.php?t=' + new Date().getTime());
        const userData = await userRes.json();
        
        if (userData.success) {
            const currentMainGroupId = userData.main_group_id ? Number(userData.main_group_id) : 0; 

            const myItem = document.createElement('div');
            myItem.className = "group-item"; 
            
            if (currentMainGroupId === 0) {
                myItem.classList.add("active");
            }

            myItem.innerHTML = `
                <div class="group-icon-circle" style="background: none; overflow: hidden; border: 1px solid #eee;">
                    <img src="../img/user-profile.jpg" alt="me" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="group-name-text">${userData.username}</div>
            `;
            
            myItem.onclick = () => {
                if (currentMainGroupId === 0) return; 
                changeMainGroup(0, "전체");
            };
            groupListContainer.appendChild(myItem);

            const groupRes = await fetch('../php/fetch_my_groups.php?t=' + new Date().getTime());
            const groupData = await groupRes.json();

            if (groupData.success && groupData.groups.length > 0) {
                groupData.groups.forEach(group => {
                    const gItem = document.createElement('div');
                    gItem.className = "group-item"; 

                    if (currentMainGroupId === Number(group.group_id)) {
                        gItem.classList.add("active"); 
                    }

                    let groupImg = group.group_profile_img;
                    if (!groupImg || groupImg === '../img/group.png') {
                        groupImg = '../img/group-profile.jpg';
                    }
                    
                    gItem.innerHTML = `
                        <div class="group-icon-circle" style="background: none; overflow: hidden; border: 1px solid #eee;">
                            <img src="${groupImg}" alt="group" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div class="group-name-text">${group.group_name}</div>
                    `;

                    gItem.onclick = () => {
                        if (currentMainGroupId === Number(group.group_id)) return;
                        changeMainGroup(group.group_id, group.group_name);
                    };
                    groupListContainer.appendChild(gItem);
                });
            }
        }
    } catch (err) {
        console.error('그룹 정보를 불러오는 중 오류 발생:', err);
    }
}

function showCustomModal(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 9999; opacity: 0; transition: opacity 0.2s;';

    const box = document.createElement('div');
    box.style.cssText = 'background: #fff; padding: 25px 20px; border-radius: 16px; width: 80%; max-width: 300px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); transform: translateY(20px); transition: transform 0.2s; text-align: center;';

    const text = document.createElement('div');
    text.innerHTML = message;
    text.style.cssText = 'font-size: 16px; font-weight: 700; color: #333; margin-bottom: 25px; word-break: keep-all; line-height: 1.4;';

    const btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display: flex; gap: 10px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = '취소';
    cancelBtn.style.cssText = 'flex: 1; padding: 12px; border: none; border-radius: 10px; background: #f1f3f5; color: #495057; font-size: 15px; font-weight: 700; cursor: pointer;';

    const confirmBtn = document.createElement('button');
    confirmBtn.innerText = '확인';
    confirmBtn.style.cssText = 'flex: 1; padding: 12px; border: none; border-radius: 10px; background: #fdd835; color: #111; font-size: 15px; font-weight: 700; cursor: pointer;'; 

    const closeModal = () => {
        overlay.style.opacity = '0';
        box.style.transform = 'translateY(20px)';
        setTimeout(() => document.body.removeChild(overlay), 200);
    };

    cancelBtn.onclick = closeModal;
    confirmBtn.onclick = () => {
        closeModal();
        onConfirm();
    };

    btnWrap.appendChild(cancelBtn);
    btnWrap.appendChild(confirmBtn);
    box.appendChild(text);
    box.appendChild(btnWrap);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        box.style.transform = 'translateY(0)';
    });
}

function changeMainGroup(groupId, groupName) {
    showCustomModal(`'${groupName}'(으)로 변경하시겠습니까?`, async () => {
        try {
            const res = await fetch('../php/api.php?action=set_main_group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_id: groupId })
            });
            const result = await res.json();
            if (result.success) {
                location.reload(); 
            }
        } catch (err) {
            alert("변경 중 오류가 발생했습니다.");
        }
    });
}

function setupSwipeGesture() {
    const sheet = document.getElementById('bottomSheet');
    if (!sheet) return;

    let currentState = 'closed';
    let startX = 0; 
    let startY = 0;
    let startTarget = null;
    let isInsideScroll = false;

    const groupList = document.getElementById('real-group-list');

    const applyState = (next) => {
        if (next === currentState) return;
        sheet.classList.remove('state-closed', 'state-half', 'state-full', 'show');
        if (next === 'half') sheet.classList.add('state-half');
        else if (next === 'full') sheet.classList.add('state-full');
        currentState = next;
    };

    const transition = (direction) => {
        if (direction === 'up') {
            if (currentState === 'closed') applyState('half');
            else if (currentState === 'half') applyState('full');
        } else if (direction === 'down') {
            if (currentState === 'full') applyState('half');
            else if (currentState === 'half') applyState('closed');
        }
    };

    document.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTarget = e.target;
        isInsideScroll = !!(groupList && groupList.contains(startTarget));
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        if (!startTarget) return;

        // 🔥 [철벽 방어] 미니 플레이어(재생바 포함) 영역 터치 시 바텀시트 동작 원천 차단
        if (startTarget.closest('.mini-player')) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const deltaX = startX - endX;
        const deltaY = startY - endY;
        const THRESHOLD = 50;

        // 🔥 [철벽 방어] 좌우(재생바 조절) 드래그가 위아래보다 크면 바텀시트 이동 금지
        if (Math.abs(deltaX) > Math.abs(deltaY)) return;

        if (Math.abs(deltaY) < THRESHOLD) return;

        const direction = deltaY > 0 ? 'up' : 'down';

        if (currentState === 'full' && isInsideScroll && groupList) {
            const canScrollDown = groupList.scrollTop + groupList.clientHeight < groupList.scrollHeight - 1;
            const canScrollUp   = groupList.scrollTop > 0;
            if (direction === 'up' && canScrollDown) return;
            if (direction === 'down' && canScrollUp) return;
        }

        if (currentState === 'closed' && direction === 'up') {
            const startedFromSheet = sheet.contains(startTarget);
            const startedFromBottom = startY > window.innerHeight * 0.7;
            if (!startedFromSheet && !startedFromBottom) return;
        }

        transition(direction);
    }, { passive: true });
}

function setupEventListeners() {
    const toggle = document.getElementById('sideBarToggle');
    const content = document.getElementById('sideBarContent');
    if (toggle) {
        toggle.onclick = () => content.classList.toggle('collapsed');
    }
    PlayAll.init();
}

// ============================================================
// 댓글 모달 기능
// ============================================================
let currentCommentSongId = null;

function openCommentModal(songId) {
    currentCommentSongId = songId;
    const overlay = document.getElementById('commentModalOverlay');
    const input = document.getElementById('commentInput');
    if (!overlay) return;

    overlay.classList.add('show');
    if (input) input.value = '';

    checkCommentPermission();
    loadComments(songId);

    overlay.onclick = (e) => {
        if (e.target === overlay) closeCommentModal();
    };

    const closeBtn = document.getElementById('commentModalClose');
    if (closeBtn) closeBtn.onclick = closeCommentModal;

    const submitBtn = document.getElementById('commentSubmitBtn');
    if (submitBtn) submitBtn.onclick = submitComment;

    if (input) {
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitComment();
            }
        };
    }
}

function closeCommentModal() {
    const overlay = document.getElementById('commentModalOverlay');
    if (overlay) overlay.classList.remove('show');
    currentCommentSongId = null;
}

async function loadComments(songId) {
    const listArea = document.getElementById('commentListArea');
    if (!listArea) return;
    listArea.innerHTML = '<div class="comment-empty">불러오는 중...</div>';

    try {
        const res = await fetch(`../php/api.php?action=get_comments&song_id=${songId}`);
        const data = await res.json();

        if (!data.success) {
            listArea.innerHTML = `<div class="comment-empty">${data.message || '불러올 수 없습니다.'}</div>`;
            return;
        }

        if (!data.comments || data.comments.length === 0) {
            listArea.innerHTML = '<div class="comment-empty">첫 댓글을 남겨보세요</div>';
            return;
        }

        listArea.innerHTML = '';
        data.comments.forEach(c => {
            const item = document.createElement('div');
            item.className = 'comment-item';

            const safeContent = escapeHtml(c.content);
            const safeUser = escapeHtml(c.username || '알 수 없음');
            const timeStr = formatCommentTime(c.created_at);
            const deleteBtn = (c.is_mine == 1)
                ? `<button class="comment-item-delete" data-id="${c.comment_id}">삭제</button>`
                : '';

            const groupBadge = c.group_name 
                ? `<span style="font-size: 11px; color: #666; background: #e9ecef; padding: 2px 6px; border-radius: 8px; margin-left: 6px; font-weight: 600;">${escapeHtml(c.group_name)}</span>` 
                : '';

            item.innerHTML = `
                <div class="comment-item-header">
                    <div style="display: flex; align-items: center;">
                        <span class="comment-item-user">${safeUser}</span>
                        ${groupBadge}
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span class="comment-item-time">${timeStr}</span>
                        ${deleteBtn}
                    </div>
                </div>
                <div class="comment-item-content">${safeContent}</div>
            `;
            listArea.appendChild(item);
        });

        listArea.querySelectorAll('.comment-item-delete').forEach(btn => {
            btn.onclick = () => deleteComment(parseInt(btn.dataset.id));
        });

        listArea.scrollTop = listArea.scrollHeight;

    } catch (err) {
        console.error('댓글 로드 실패:', err);
        listArea.innerHTML = '<div class="comment-empty">오류가 발생했습니다.</div>';
    }
}

async function submitComment() {
    if (!currentCommentSongId) return;
    const input = document.getElementById('commentInput');
    const submitBtn = document.getElementById('commentSubmitBtn');
    if (!input) return;

    const content = input.value.trim();
    if (!content) {
        input.focus();
        return;
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
        const res = await fetch('../php/api.php?action=add_comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song_id: currentCommentSongId, content })
        });
        const data = await res.json();

        if (data.success) {
            input.value = '';
            await loadComments(currentCommentSongId);
        } else {
            alert(data.message || '등록 실패');
        }
    } catch (err) {
        console.error('댓글 등록 실패:', err);
        alert('서버 통신 오류');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

function deleteComment(commentId) {
    showCustomModal('댓글을 삭제하시겠습니까?', async () => {
        try {
            const res = await fetch('../php/api.php?action=delete_comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment_id: commentId })
            });
            const data = await res.json();

            if (data.success) {
                await loadComments(currentCommentSongId);
                showToast('댓글이 삭제되었습니다.'); 
            } else {
                alert(data.message || '삭제 실패');
            }
        } catch (err) {
            console.error('댓글 삭제 실패:', err);
            alert('서버 통신 오류');
        }
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatCommentTime(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp.replace(' ', 'T'));
    if (isNaN(d.getTime())) return timestamp;
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHr < 24) return `${diffHr}시간 전`;
    if (diffDay < 7) return `${diffDay}일 전`;
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.65);
        color: #fff;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
        pointer-events: none;
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
}

function isToday(dateToCheck) {
    const today = new Date();
    return dateToCheck.getFullYear() === today.getFullYear() &&
           dateToCheck.getMonth() === today.getMonth() &&
           dateToCheck.getDate() === today.getDate();
}

function checkCommentPermission() {
    const commentInputContainer = document.querySelector('.comment-input-area');
    const existingMsg = document.getElementById('not-today-msg');
    if (existingMsg) existingMsg.remove();

    if (isToday(currentDate)) {
        if (commentInputContainer) commentInputContainer.style.display = 'flex'; 
    } else {
        if (commentInputContainer) {
            commentInputContainer.style.display = 'none';
            const msgDiv = document.createElement('div');
            msgDiv.id = 'not-today-msg';
            msgDiv.style.cssText = 'text-align: center; padding: 15px; color: #888; font-size: 13px;';
            msgDiv.innerText = '당일 추천 곡에만 댓글을 작성할 수 있습니다.';
            commentInputContainer.parentNode.insertBefore(msgDiv, commentInputContainer.nextSibling);
        }
    }
}

async function startRollingComments(songId) {
    try {
        const res = await fetch(`../php/api.php?action=get_comments&song_id=${songId}`);
        const data = await res.json();

        if (!data.success || !data.comments || data.comments.length === 0) return;

        const rollingBox = document.getElementById(`rolling-comment-${songId}`);
        if (!rollingBox) return;

        const comments = data.comments;
        let currentIndex = 0;

        const displayComment = (comment) => {
            const safeUser = escapeHtml(comment.username || '익명');
            const safeContent = escapeHtml(comment.content || '');
            rollingBox.innerHTML = `<strong style="font-weight: 700; margin-right: 5px;">${safeUser}</strong>${safeContent}`;
        };

        displayComment(comments[currentIndex]);
        rollingBox.style.opacity = '1';

        if (comments.length > 1) {
            setInterval(() => {
                rollingBox.style.opacity = '0'; 
                setTimeout(() => {
                    currentIndex = (currentIndex + 1) % comments.length;
                    displayComment(comments[currentIndex]);
                    rollingBox.style.opacity = '1'; 
                }, 500);
            }, 3500);
        }
    } catch (err) {
        console.error('롤링 댓글 로드 실패:', err);
    }
}

// ============================================================
// 🔥 플로팅/확장형 미니 플레이어 & 전체 재생 모듈
// ============================================================
const PlayAll = (() => {
    let player = null;
    let apiReady = false;
    let pendingStart = false;
    let queue = [];
    let currentIndex = -1;
    let isPlaying = false;
    let initialized = false;
    let isExpanded = false;

    let $playAllBtn, $miniPlayer, $mpHeader, $thumb, $title, $sub;
    let $prev, $playPause, $playPauseIcon, $next, $close, $queueList;

    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let initialLeft = 0, initialTop = 0;

    function extractYouTubeID(url) {
        if (!url) return null;
        const reg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const m = url.match(reg);
        return (m && m[1].length === 11) ? m[1] : null;
    }

    window.onYouTubeIframeAPIReady = function() {
        apiReady = true;
        try {
            player = new YT.Player('yt-player', {
                height: '100%',
                width: '100%',
                playerVars: { autoplay: 0, controls: 1, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1, rel: 0 },
                events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange, onError: onPlayerError }
            });
        } catch (e) {
            console.error('[PlayAll] YT.Player 생성 실패:', e);
        }
    };

    function onPlayerReady() {
        if (pendingStart && queue.length > 0) {
            pendingStart = false;
            playAt(0);
        }
    }

    function onPlayerStateChange(e) {
        if (e.data === YT.PlayerState.PLAYING) setPlayingUI(true);
        else if (e.data === YT.PlayerState.PAUSED) setPlayingUI(false);
        else if (e.data === YT.PlayerState.ENDED) playNext();
    }

    function onPlayerError(e) {
        showToastSafe('이 영상은 재생할 수 없습니다. 다음 곡으로 넘어갑니다.');
        setTimeout(() => playNext(), 400);
    }

    function syncQueue(feedSongs) {
        const newQueue = (feedSongs || [])
            .filter(s => s && s.song_id && s.youtube_url)
            .map(s => ({
                songId: s.song_id,
                videoId: extractYouTubeID(s.youtube_url),
                title: s.title || '제목 없음',
                thumb: s.thumbnail_img || '',
                username: s.username || '',
                loginId: s.login_id || ''
            }))
            .filter(item => item.videoId);

        const wasPlayingThisQueue = isPlaying && queue.length > 0;
        queue = newQueue;
        if ($playAllBtn) $playAllBtn.disabled = (queue.length === 0);

        if (wasPlayingThisQueue) {
            if (queue.length === 0) stopAll();
            else playAt(0);
        }
    }

    function startPlayAll() {
        if (queue.length === 0) { showToastSafe('재생할 곡이 없습니다'); return; }
        showMiniPlayer();
        if (!apiReady || !player || typeof player.loadVideoById !== 'function') {
            pendingStart = true;
            currentIndex = 0;
            renderMiniPlayer();
            setPlayingUI(true);
            return;
        }
        playAt(0);
    }

    function playAt(index) {
        if (index < 0 || index >= queue.length) return;
        currentIndex = index;
        renderMiniPlayer();
        renderQueueList();

        if (!player || typeof player.loadVideoById !== 'function') {
            pendingStart = true;
            return;
        }
        try {
            player.cueVideoById(queue[currentIndex].videoId);
            setTimeout(() => { try { player.playVideo(); player.setVolume(100); player.unMute(); } catch (e) {} }, 300);
        } catch (e) {}
    }

    function playPrev() { currentIndex > 0 ? playAt(currentIndex - 1) : (player && player.seekTo(0, true)); }
    function playNext() { currentIndex < queue.length - 1 ? playAt(currentIndex + 1) : stopAll(); }
    
    function togglePlayPause() {
        if (!player) return;
        const state = player.getPlayerState && player.getPlayerState();
        state === YT.PlayerState.PLAYING ? player.pauseVideo() : player.playVideo();
    }

    function stopAll() {
        try { player && player.stopVideo(); } catch (e) {}
        isPlaying = false;
        currentIndex = -1;
        hideMiniPlayer();
    }

    function renderMiniPlayer() {
        if (currentIndex < 0 || !queue[currentIndex]) return;
        const item = queue[currentIndex];
        if ($title) $title.textContent = item.title;
        if ($sub) $sub.textContent = `@${item.loginId || item.username} · ${currentIndex + 1} / ${queue.length}`;
        if ($thumb) { $thumb.src = item.thumb || ''; $thumb.alt = item.title; }
        if ($prev) $prev.disabled = (currentIndex <= 0);
        if ($next) $next.disabled = (currentIndex >= queue.length - 1);
    }

    // --- [수정된 렌더링 로직] 상태 표시가 확실하게 반영됩니다 ---
    function renderQueueList() {
        if (!$queueList || !isExpanded) return;
        
        $queueList.innerHTML = '';
        
        queue.forEach((item, index) => {
            const isCurrent = (index === currentIndex);
            const isPlayed = (index < currentIndex);
            
            const qItem = document.createElement('div');
            qItem.className = 'q-item';
            
            // 상태별 클래스 추가
            if (isPlayed) qItem.classList.add('played');
            if (isCurrent) qItem.classList.add('current');
            
            // 재생 완료 라벨 (과거 곡인 경우)
            const badge = isPlayed ? `<span class="q-label-played">재생 완료</span>` : '';
            
            qItem.innerHTML = `
                <div class="q-thumb"><img src="${item.thumb}" alt=""></div>
                <div class="q-info">
                    <div class="q-title">${badge}${item.title}</div>
                    <div class="q-user">@${item.loginId || item.username}</div>
                </div>
            `;
            
            // 클릭 시 해당 곡으로 점프
            qItem.onclick = () => playAt(index);
            $queueList.appendChild(qItem);
        });

        // 현재 곡이 리스트에 표시되도록 자동 스크롤
        const currentEl = $queueList.querySelector('.current');
        if (currentEl) {
            currentEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // 🔥 핵심: 애니메이션이 꼬이지 않게 인라인 스타일을 완벽하게 초기화하는 토글 함수
    function toggleExpand() {
        isExpanded = !isExpanded;
        if (isExpanded) {
            // 드래그 중 생겼던 인라인 위치 값 제거 (CSS 트랜지션을 살리기 위함)
            $miniPlayer.style.left = '';
            $miniPlayer.style.top = '';
            $miniPlayer.style.bottom = '';
            $miniPlayer.style.transform = '';

            // 스타일 초기화가 DOM에 반영된 직후 애니메이션 클래스를 붙여 튕김 방지
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    $miniPlayer.classList.add('expanded');
                });
            });
            renderQueueList();
        } else {
            $miniPlayer.classList.remove('expanded');
        }
    }

    function onDragStart(e) {
        if (e.target.closest('.mp-btn')) return;

        if (isExpanded) {
            toggleExpand();
            return;
        }

        const touch = e.touches ? e.touches[0] : e;
        dragStartX = touch.clientX;
        dragStartY = touch.clientY;
        isDragging = false;

        const rect = $miniPlayer.getBoundingClientRect();
        if ($miniPlayer.style.transform !== 'none') {
            $miniPlayer.style.transform = 'none';
            $miniPlayer.style.left = rect.left + 'px';
            $miniPlayer.style.top = rect.top + 'px';
            $miniPlayer.style.bottom = 'auto';
            $miniPlayer.style.right = 'auto';
        }
        initialLeft = parseFloat($miniPlayer.style.left) || rect.left;
        initialTop = parseFloat($miniPlayer.style.top) || rect.top;

        const moveEvt = e.type === 'touchstart' ? 'touchmove' : 'mousemove';
        const upEvt = e.type === 'touchstart' ? 'touchend' : 'mouseup';
        document.addEventListener(moveEvt, onDragMove, {passive: false});
        document.addEventListener(upEvt, onDragEnd);
    }

    function onDragMove(e) {
        const touch = e.touches ? e.touches[0] : e;
        const dx = touch.clientX - dragStartX;
        const dy = touch.clientY - dragStartY;

        if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) isDragging = true;

        if (isDragging) {
            e.preventDefault(); 
            $miniPlayer.style.left = `${initialLeft + dx}px`;
            $miniPlayer.style.top = `${initialTop + dy}px`;
        }
    }

    function onDragEnd(e) {
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('touchend', onDragEnd);
        document.removeEventListener('mouseup', onDragEnd);

        if (!isDragging) {
            toggleExpand();
        }
        isDragging = false;
    }

    function setPlayingUI(playing) {
        isPlaying = playing;
        if (!$playPauseIcon) return;
        $playPauseIcon.className = playing ? 'fas fa-pause' : 'fas fa-play';
    }

    function showMiniPlayer() {
        if ($miniPlayer) {
            $miniPlayer.classList.add('show');
            $miniPlayer.setAttribute('aria-hidden', 'false');
            $miniPlayer.removeAttribute('inert');
        }
    }

    function hideMiniPlayer() {
        if ($miniPlayer) {
            isExpanded = false;
            $miniPlayer.classList.remove('expanded', 'show');
            $miniPlayer.setAttribute('aria-hidden', 'true');
            $miniPlayer.setAttribute('inert', '');
            
            $miniPlayer.style.left = '50%';
            $miniPlayer.style.top = 'auto';
            $miniPlayer.style.bottom = '16px';
            $miniPlayer.style.transform = 'translate(-50%, 0)';
        }
    }

    function showToastSafe(msg) {
        if (typeof showToast === 'function') { try { showToast(msg); return; } catch (e) {} }
        console.log('[PlayAll]', msg);
    }

    function init() {
        if (initialized) return;
        initialized = true;

        $playAllBtn = document.getElementById('play-all-btn');
        $miniPlayer = document.getElementById('miniPlayer');
        $mpHeader = document.getElementById('mpHeader');
        $queueList = document.getElementById('mpQueueList');
        
        $thumb = document.getElementById('miniPlayerThumb');
        $title = document.getElementById('miniPlayerTitle');
        $sub = document.getElementById('miniPlayerSub');
        
        $prev = document.getElementById('mpPrevBtn');
        $playPause = document.getElementById('mpPlayPauseBtn');
        $playPauseIcon = document.getElementById('mpPlayPauseIcon');
        $next = document.getElementById('mpNextBtn');
        $close = document.getElementById('mpCloseBtn');

        if ($playAllBtn) $playAllBtn.addEventListener('click', startPlayAll);
        if ($prev) $prev.addEventListener('click', playPrev);
        if ($next) $next.addEventListener('click', playNext);
        if ($playPause) $playPause.addEventListener('click', togglePlayPause);
        if ($close) $close.addEventListener('click', stopAll);

        if ($mpHeader) {
            $mpHeader.addEventListener('mousedown', onDragStart);
            $mpHeader.addEventListener('touchstart', onDragStart, {passive: true});
        }
    }

    return { init, syncQueue };
})();