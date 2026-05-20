let currentDate = new Date();
currentDate.setHours(0, 0, 0, 0);

// CSS 파일을 수정하지 않기 위해 JS에서 직접 울렁거리는 그라데이션 애니메이션을 주입합니다.
const style = document.createElement('style');
style.innerHTML = `
    @keyframes waveGradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    .wavy-bw-gradient {
        background: linear-gradient(-45deg, #1a1a1a, #868e96, #ced4da, #495057);
        background-size: 400% 400%;
        animation: waveGradient 8s ease infinite;
    }
    
    /* 롤링 댓글 스타일 수정 */
    .thumb-area { position: relative; }
    .rolling-comment {
        position: absolute;
        bottom: 14px; /* [수정] 기존 6px에서 위로 더 띄움 */
        left: 14px;   /* [수정] 기존 6px에서 오른쪽으로 더 이동 (여백 추가) */
        
        /* 💡 만약 아예 '오른쪽 아래' 구석에 배치하고 싶다면 위의 left: 14px; 대신 right: 14px; 를 적어주시면 됩니다! */
        
        background: rgba(255, 255, 255, 0.9); /* [수정] 배경 흰색 (90% 투명도) */
        color: #222222;                       /* [수정] 글자색을 어두운 색으로 변경 */
        padding: 5px 10px;
        border-radius: 12px;
        font-size: 11px;
        max-width: 85%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        opacity: 0; 
        transition: opacity 0.5s ease-in-out;
        pointer-events: none;
        z-index: 10;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15); /* [추가] 흰색 배경이 썸네일 위에서 잘 보이도록 부드러운 그림자 추가 */
    }
`;
document.head.appendChild(style);

document.addEventListener("DOMContentLoaded", () => {
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
        dateDisplay.style.cursor = "pointer"; // 클릭 가능하다는 시각적 표시
        dateDisplay.onclick = () => {
            currentDate = new Date(); // 오늘 날짜로 초기화
            currentDate.setHours(0, 0, 0, 0);
            updateDateDisplay(); // 화면 갱신
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

        // 2. 친구 요청 목록 출력
        renderRequests(data.requests);

        // 3. 그룹 목록 출력 
        renderGroups(data.groups);

        // 4. 친구 목록 출력
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

    // 오늘 날짜와 현재 화면의 날짜를 비교하기 위한 세팅
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(currentDate);
    targetDate.setHours(0, 0, 0, 0);

    // 1. 미래의 날짜인 경우 전체 안내문 출력 후 종료
    if (targetDate > today) {
        const dateStr = formatDate(targetDate).replace(/-/g, '.');
        container.innerHTML = `<div class="empty-msg" style="text-align:center; margin-top:50px; color:#999; font-weight:700; font-size:16px;">아직 ${dateStr}가 되지 않았습니다.</div>`;
        return;
    }

    if (!songs || songs.length === 0) {
        container.innerHTML = '<div class="empty-msg" style="text-align:center; margin-top:50px; color:#999;">조회할 멤버가 없습니다.</div>';
        return;
    }

    // 2. 과거인지 오늘인지에 따라 빈 상태일 때의 안내 문구 변경
    let emptyMsg = '추천을 기다리고 있어요 🎧';
    if (targetDate < today) {
        emptyMsg = '추천한 노래가 없습니다.';
    }

    songs.forEach(song => {
        const card = document.createElement('div');
        card.className = 'song-card'; 

        // 썸네일용 이름: 내 것인 경우 앞에 '(나)'를 붙임
        const thumbName = song.is_me == 1 ? `(나) ${song.username}` : song.username;
        // 정보칸용 이름: '(나)' 없이 깔끔하게 닉네임만 표시
        const infoName = song.username;

        if (song.song_id) {
            // ✅ 음악을 등록한 사람: 정보칸 이름은 '(나)' 없이 나옴 + 댓글 버튼 포함
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

            // ▼▼▼ 댓글 버튼 이벤트 연결 ▼▼▼
            const commentBtn = card.querySelector('.comment-btn');
            if (commentBtn) {
                commentBtn.onclick = (e) => {
                    e.stopPropagation();
                    openCommentModal(song.song_id);
                };
            }
        } else {
            // ✅ 음악을 등록하지 않은 사람 (z-index: 2 추가하여 완전한 흰색으로 표시)
            card.innerHTML = `
                <div class="song-scroll-wrapper">
                    <div class="thumb-area wavy-bw-gradient">
                        <!-- 🔥 z-index: 2 를 추가하여 어두운 필터보다 위로 올렸습니다! -->
                        <div style="position: absolute; bottom: 20px; left: 20px; color: #ffffff; text-shadow: 0 1px 6px rgba(0,0,0,0.8); font-size: 17px; font-weight: 800; z-index: 2;">
                            
                        </div>
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

/**
 * 나에게 온 친구 요청 렌더링
 */
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

/**
 * 그룹 목록 렌더링
 */
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

/**
 * 친구 목록 렌더링
 */
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

/**
 * 기존 섹션 접힘 상태 복원
 */
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

// --- 5. 사이드바 바텀 시트 그룹 정보 로드 ---
async function loadMyInfoIntoGroup() {
    const groupListContainer = document.getElementById("real-group-list");
    if (!groupListContainer) return;

    groupListContainer.className = "group-list-container";
    
    try {
        // [수정 완료] 캐시 방지 시간값 추가
        const userRes = await fetch('../php/get_user_info.php?t=' + new Date().getTime());
        const userData = await userRes.json();
        
        if (userData.success) {
            const currentMainGroupId = userData.main_group_id ? Number(userData.main_group_id) : 0; 

            // --- [나] 항목 ---
            const myItem = document.createElement('div');
            myItem.className = "group-item"; 
            
            if (currentMainGroupId === 0) {
                myItem.classList.add("active");
            }

            // [수정 완료] 나 항목 user-profile.jpg 강제 적용
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

            // --- [참여 중인 그룹] 목록 ---
            const groupRes = await fetch('../php/fetch_my_groups.php?t=' + new Date().getTime());
            const groupData = await groupRes.json();

            if (groupData.success && groupData.groups.length > 0) {
                groupData.groups.forEach(group => {
                    const gItem = document.createElement('div');
                    gItem.className = "group-item"; 

                    if (currentMainGroupId === Number(group.group_id)) {
                        gItem.classList.add("active"); 
                    }

                    // [수정 완료] 그룹 항목 group-profile.jpg 강제 적용
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

// --- 예쁜 커스텀 모달 생성 함수 ---
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

// 메인 그룹 변경 실행 함수 
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

// --- 7. 바텀 시트 제스처 ---
// 🔥 [수정됨] 3단계 상태 머신: closed ↔ half ↔ full
function setupSwipeGesture() {
    const sheet = document.getElementById('bottomSheet');
    if (!sheet) return;

    // 상태: 'closed' | 'half' | 'full'
    let currentState = 'closed';

    // 터치 시작 정보
    let startY = 0;
    let startTarget = null;
    let isInsideScroll = false; // 시작점이 그룹 리스트(스크롤 영역) 내부였는지

    const groupList = document.getElementById('real-group-list');

    // 상태 전이 적용 (DOM 클래스 토글)
    const applyState = (next) => {
        if (next === currentState) return;
        sheet.classList.remove('state-closed', 'state-half', 'state-full', 'show');
        if (next === 'half') {
            sheet.classList.add('state-half');
        } else if (next === 'full') {
            sheet.classList.add('state-full');
        }
        // closed 상태는 클래스 없는 것이 기본 (CSS의 transform 기본값)
        currentState = next;
    };

    // 상태 전이 규칙
    const transition = (direction) => {
        // direction: 'up' | 'down'
        if (direction === 'up') {
            if (currentState === 'closed') applyState('half');
            else if (currentState === 'half') applyState('full');
            // full 상태에서 위로 스와이프는 무시
        } else if (direction === 'down') {
            if (currentState === 'full') applyState('half');
            else if (currentState === 'half') applyState('closed');
            // closed 상태에서 아래로 스와이프는 무시
        }
    };

    // === 터치 시작 ===
    document.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        startTarget = e.target;

        // 시작점이 그룹 리스트 내부인지 검사 (스크롤 위임 판단용)
        isInsideScroll = !!(groupList && groupList.contains(startTarget));
    }, { passive: true });

    // === 터치 종료 ===
    document.addEventListener('touchend', (e) => {
        const endY = e.changedTouches[0].clientY;
        const deltaY = startY - endY; // 양수=위로, 음수=아래로
        const THRESHOLD = 50; // 임계값 (px)

        // 임계값 미달이면 무시
        if (Math.abs(deltaY) < THRESHOLD) return;

        const direction = deltaY > 0 ? 'up' : 'down';

        // === 내부 스크롤 위임 판단 ===
        // 시트가 full 상태이고, 시작점이 스크롤 영역 안이며,
        // 스크롤이 끝에 도달하지 않은 경우 → 시트 제스처 무시 (내부 스크롤 우선)
        if (currentState === 'full' && isInsideScroll && groupList) {
            const canScrollDown = groupList.scrollTop + groupList.clientHeight < groupList.scrollHeight - 1;
            const canScrollUp   = groupList.scrollTop > 0;

            // 위로 스와이프(콘텐츠를 위로 = 아래로 스크롤) 가능 → 시트 무시
            if (direction === 'up' && canScrollDown) return;
            // 아래로 스와이프 시: 스크롤이 맨 위가 아니라면 스크롤 우선
            if (direction === 'down' && canScrollUp) return;
        }

        // === 시트 외부에서의 시작 제약 ===
        // closed 상태일 때 위로 스와이프는, 시트 위에서 시작하거나 화면 하단에서 시작한 경우만 인정
        // (화면 중앙에서 시작한 스와이프로 시트가 갑자기 뜨는 것 방지 - 기존 동작 호환)
        if (currentState === 'closed' && direction === 'up') {
            const startedFromSheet = sheet.contains(startTarget);
            const startedFromBottom = startY > window.innerHeight * 0.7;
            if (!startedFromSheet && !startedFromBottom) return;
        }

        // 상태 전이 실행
        transition(direction);
    }, { passive: true });

    // === 핸들 클릭(탭)으로도 단계 전환 (데스크톱 보강) ===
    const handle = document.getElementById('dragHandle');
    if (handle) {
        handle.addEventListener('click', () => {
            if (currentState === 'closed') applyState('half');
            else if (currentState === 'half') applyState('full');
            else if (currentState === 'full') applyState('closed');
        });
    }
}

// --- 8. 사이드바 이벤트 ---
function setupEventListeners() {
    const toggle = document.getElementById('sideBarToggle');
    const content = document.getElementById('sideBarContent');
    if (toggle) {
        toggle.onclick = () => content.classList.toggle('collapsed');
    }
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

    // 오버레이 바깥 클릭 시 닫기
    overlay.onclick = (e) => {
        if (e.target === overlay) closeCommentModal();
    };

    // X 버튼
    const closeBtn = document.getElementById('commentModalClose');
    if (closeBtn) closeBtn.onclick = closeCommentModal;

    // 등록 버튼
    const submitBtn = document.getElementById('commentSubmitBtn');
    if (submitBtn) submitBtn.onclick = submitComment;

    // 엔터로 등록
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

            // 👇 [추가] 방 이름(group_name)이 있을 때만 유저 이름 옆에 회색 뱃지를 생성합니다.
            // 나 혼자 있는 방이 아닐 때는 백엔드에서 group_name을 비워서 주므로 자동으로 안 뜹니다!
            const groupBadge = c.group_name 
                ? `<span style="font-size: 11px; color: #666; background: #e9ecef; padding: 2px 6px; border-radius: 8px; margin-left: 6px; font-weight: 600;">${escapeHtml(c.group_name)}</span>` 
                : '';

            // 👇 [수정] 헤더 구조를 정렬하여 이름 바로 옆에 뱃지가 붙도록 수정했습니다.
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

        // 삭제 버튼 이벤트 연결
        listArea.querySelectorAll('.comment-item-delete').forEach(btn => {
            btn.onclick = () => deleteComment(parseInt(btn.dataset.id));
        });

        // 스크롤 맨 아래로 (최신 댓글 보이게)
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
                await loadComments(currentCommentSongId); // 기존 댓글 목록 새로고침
                
                // 👇 이 부분이 추가되었습니다!
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

// XSS 방지용 HTML 이스케이프
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 시간 포맷팅
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

// --- 토스트 알림 (하단에 연하게 떴다가 사라지는 알림) ---
function showToast(message) {
    const toast = document.createElement('div');
    toast.innerText = message;
    
    // 토스트 스타일 설정 (하단 중앙 배치, 반투명 검정 배경, 둥근 모서리)
    toast.style.cssText = `
        position: fixed;
        bottom: 80px; /* 화면 하단에서의 높이 */
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.65); /* 연한 검정 반투명 */
        color: #fff;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
        pointer-events: none; /* 클릭 방해 안 함 */
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    `;
    
    document.body.appendChild(toast);

    // 약간의 딜레이 후 서서히 나타나게 함 (fade-in)
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });

    // 2초 뒤에 서서히 사라지고 (fade-out), DOM에서 완전히 제거
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
}

// 1. 오늘 날짜인지 체크하는 헬퍼 함수 (파일 상단이나 빈 곳에 추가)
function isToday(dateToCheck) {
    const today = new Date();
    return dateToCheck.getFullYear() === today.getFullYear() &&
           dateToCheck.getMonth() === today.getMonth() &&
           dateToCheck.getDate() === today.getDate();
}

// 2. 댓글 모달을 열거나 렌더링하는 함수 내부에서 입력창 제어
function checkCommentPermission() {
    const commentInputContainer = document.querySelector('.comment-input-area'); // 댓글 입력창(input + button)을 감싸는 div 클래스명
    
    // 만약 이미 안내 문구가 있다면 제거
    const existingMsg = document.getElementById('not-today-msg');
    if (existingMsg) existingMsg.remove();

    if (isToday(currentDate)) {
        // 오늘이면 입력창 표시
        if (commentInputContainer) commentInputContainer.style.display = 'flex'; 
    } else {
        // 오늘이 아니면 입력창 숨기고 안내 메시지 표시
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

// 특정 곡의 댓글들을 가져와서 썸네일 위에서 롤링(돌아가며 보여줌)하는 함수
// 특정 곡의 댓글들을 가져와서 썸네일 위에서 롤링(이름 볼드체 + 배경 화이트)하는 함수
async function startRollingComments(songId) {
    try {
        // 해당 곡의 댓글 목록 가져오기
        const res = await fetch(`../php/api.php?action=get_comments&song_id=${songId}`);
        const data = await res.json();

        // 댓글이 없거나 실패하면 종료
        if (!data.success || !data.comments || data.comments.length === 0) return;

        const rollingBox = document.getElementById(`rolling-comment-${songId}`);
        if (!rollingBox) return;

        const comments = data.comments;
        let currentIndex = 0;

        // 💡 [추가] 이름(Bold) + 댓글 내용을 안전하게 가공하여 넣어주는 헬퍼 함수
        const displayComment = (comment) => {
            const safeUser = escapeHtml(comment.username || '익명');
            const safeContent = escapeHtml(comment.content || '');
            // 왼쪽에 이름을 볼드체(strong)로 배치하고 약간의 여백(margin-right)을 줍니다.
            rollingBox.innerHTML = `<strong style="font-weight: 700; margin-right: 5px;">${safeUser}</strong>${safeContent}`;
        };

        // 첫 번째 댓글 즉시 표시
        displayComment(comments[currentIndex]);
        rollingBox.style.opacity = '1';

        // 댓글이 2개 이상일 경우 3.5초마다 변경
        if (comments.length > 1) {
            setInterval(() => {
                // 1. 서서히 사라짐
                rollingBox.style.opacity = '0'; 
                
                setTimeout(() => {
                    // 2. 텍스트 변경
                    currentIndex = (currentIndex + 1) % comments.length;
                    displayComment(comments[currentIndex]);
                    
                    // 3. 서서히 나타남
                    rollingBox.style.opacity = '1'; 
                }, 500); // 0.5초(사라지는 시간) 대기 후 교체
                
            }, 3500); // 3.5초 주기로 실행
        }
    } catch (err) {
        console.error('롤링 댓글 로드 실패:', err);
    }
}