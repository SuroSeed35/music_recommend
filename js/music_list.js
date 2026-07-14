const urlParams = new URLSearchParams(window.location.search);
const dateParam = urlParams.get('date');

// URL에 date 파라미터가 있으면 그 날짜로, 없으면 오늘 날짜로 세팅
let currentDate = dateParam ? new Date(dateParam) : new Date();
let isFloating = false;
currentDate.setHours(0, 0, 0, 0);

// 📌 현재 답글을 달고 있는 부모 댓글의 시간 식별자를 임시 저장할 변수
let currentReplyParentTime = null;

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
            window.location.replace("main.html");
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

        // 🔥 피드를 그리기 전에 내가 들었던 곡 ID 목록을 가져옵니다.
        const playedSongs = await fetchPlayedSongs();

        // 1. 피드(노래) 목록 출력
        renderFeedSongs(data.feed_songs, playedSongs);

        // 2. 전체 재생 큐 동기화
        PlayAll.syncQueue(data.feed_songs, playedSongs);

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
function renderFeedSongs(songs, playedSongs = []) {
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
            const isPlayed = playedSongs.includes(song.song_id);

            card.setAttribute('data-song-id', song.song_id);
            if (isPlayed) {
                card.classList.add('played'); 
            }

            // --- 🔥 HTML 템플릿 영역에 좋아요 오버레이와 버튼 추가 ---
            card.innerHTML = `
                <div class="song-scroll-wrapper">
                    <div class="thumb-area" style="cursor: pointer; position: relative;">
                        <div class="like-shine-overlay"></div>
                        
                        <button class="like-btn ${song.is_liked == 1 ? 'liked' : ''}" data-song-id="${song.song_id}" aria-label="좋아요">
                            <i class="${song.is_liked == 1 ? 'fas' : 'far'} fa-heart"></i>
                        </button>

                        <img src="${song.thumbnail_img}" alt="thumbnail" class="thumb-img" onload="if(this.naturalWidth === 120 && this.src.includes('maxresdefault')) this.src = this.src.replace('maxresdefault', 'hqdefault');" onerror="if(this.src.includes('maxresdefault')) this.src = this.src.replace('maxresdefault', 'hqdefault');">
                        
                        <div class="complete-mark" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 12px; display: ${isPlayed ? 'flex' : 'none'}; align-items: center; gap: 4px; z-index: 10; pointer-events: none;">
                            <span style="color: #fff; font-size: 12px; font-weight: bold;">재생 완료</span>
                        </div>

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
                            <span class="comment-count-num">${song.comment_count || 0}</span>
                        </button>
                    </div>
                </div>
            `;
            
            // --- 🔥 좋아요 & 꾹 누르기 이벤트 바인딩 추가 ---
            const thumbArea = card.querySelector('.thumb-area');
            const likeBtn = card.querySelector('.like-btn');
            const shineOverlay = card.querySelector('.like-shine-overlay');
            const heartIcon = likeBtn ? likeBtn.querySelector('i') : null;
            const commentBtn = card.querySelector('.comment-btn');

            // --- 완성된 좋아요 함수 ---
            const toggleLike = async () => {
                if (!likeBtn) return;
                const isCurrentlyLiked = likeBtn.classList.contains('liked');
                
                // 1. 화면(UI)부터 즉시 변경 (버벅임 방지)
                if (!isCurrentlyLiked) {
                    likeBtn.classList.add('liked');
                    if (heartIcon) {
                        heartIcon.classList.remove('far'); 
                        heartIcon.classList.add('fas');    
                    }
                    if (shineOverlay) {
                        shineOverlay.classList.add('active');
                        setTimeout(() => {
                            if(shineOverlay) shineOverlay.classList.remove('active');
                        }, 1500);
                    }
                } else {
                    likeBtn.classList.remove('liked');
                    if (heartIcon) {
                        heartIcon.classList.remove('fas');
                        heartIcon.classList.add('far');
                    }
                }

                // 2. 서버 DB에 저장 요청 
                try {
                    const res = await fetch('../php/api.php?action=toggle_like', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ song_id: song.song_id })
                    });
                    const data = await res.json();
                    if (!data.success) {
                        console.error("좋아요 처리 실패:", data.message);
                    }
                } catch (err) {
                    console.error("좋아요 서버 통신 오류:", err);
                }
            };

            if (likeBtn) {
                likeBtn.onclick = (e) => {
                    e.stopPropagation(); 
                    toggleLike();
                };
            }

            if (thumbArea && song.youtube_url) {
                let pressTimer;
                let isLongPressed = false;

                const startPress = (e) => {
                    if (e.target.closest('.like-btn')) return;
                    isLongPressed = false; 
                    pressTimer = setTimeout(() => {
                        isLongPressed = true; 
                        toggleLike();         
                    }, 600); 
                };

                const cancelPress = () => {
                    clearTimeout(pressTimer);
                };

                thumbArea.addEventListener('touchstart', startPress, { passive: true });
                thumbArea.addEventListener('touchend', cancelPress);
                thumbArea.addEventListener('touchcancel', cancelPress);
                
                thumbArea.addEventListener('mousedown', startPress);
                thumbArea.addEventListener('mouseup', cancelPress);
                thumbArea.addEventListener('mouseleave', cancelPress);

                thumbArea.onclick = (e) => {
                    if (e.target.closest('.like-btn')) return; 
                    if (isLongPressed) {
                        e.preventDefault();
                        return;
                    }
                    PlayAll.playSpecificSong(song.song_id);
                };
            }

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
                // 📌 타이머 청소 안전장치 추가
                if (typeof rollingIntervals === 'object') {
                    Object.keys(rollingIntervals).forEach(id => clearInterval(rollingIntervals[id]));
                }
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

        if (startTarget.closest('.mini-player')) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const deltaX = startX - endX;
        const deltaY = startY - endY;
        const THRESHOLD = 50;

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
// 롤링 댓글 타이머 중복 방지용 보관함
const rollingIntervals = {};

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

        // 📌 1. 댓글 수 카운트를 맨 위로 올려 0개일 때도 정상 반영되게 보정
        const totalCount = data.comments ? data.comments.length : 0;
        const countElement = document.getElementById('commentCount');
        if (countElement) {
            countElement.innerText = totalCount;
        }

        // 🔥 [치트키 추가] 대댓글 방식과 동일하게 메인 피드의 해당 노래 댓글 숫자도 실시간으로 똑같이 맞춰줍니다.
        const $mainCountBadge = document.querySelector(`.comment-btn[data-song-id="${songId}"] .comment-count-num`);
        if ($mainCountBadge) {
            $mainCountBadge.innerText = totalCount;
        }

        if (!data.comments || data.comments.length === 0) {
            listArea.innerHTML = '<div class="comment-empty">첫 댓글을 남겨보세요</div>';
            return;
        }

        listArea.innerHTML = '';

        // 📌 2. 일반 댓글(부모)과 대댓글(자식) 분리 가공 (프론트엔드 직접 파싱)
        // 📌 2. 일반 댓글(부모)과 대댓글(자식) 분리 가공 (엔터키 쳐도 고장 안 나게 수정!)
        const parents = [];
        const replies = [];
        data.comments.forEach(c => {
            if (c.content && c.content.startsWith('[REPLY:')) {
                const endIdx = c.content.indexOf(']');
                if (endIdx > -1) {
                    c.parent_id = c.content.substring(7, endIdx); // 부모 시간 추출
                    c.content = c.content.substring(endIdx + 1);  // [REPLY:...] 태그 제외한 알맹이만 남김
                    replies.push(c);
                    return; // 대댓글 배열에 넣었으니 다음 댓글로 패스!
                }
            }
            // 답글 형식이 아니거나, 예전에 썼던 답글이라 태그가 없으면 원댓글로 분류
            parents.push(c);
        });

       // 📌 3. 부모 댓글 뿌리기 (기존 UI 스타일 유지 + 메인 입력창 연동 [답글달기] 수정)
        parents.forEach(c => {
            const item = document.createElement('div');
            item.className = 'comment-item';

            const safeContent = escapeHtml(c.content);
            const safeUser = escapeHtml(c.username || '알 수 없음');
            const timeStr = formatCommentTime(c.created_at);
            const rawTime = c.created_at || '';
            const parentKey = rawTime.replace(/[^0-9]/g, ''); // 시간 기반 고유 식별 키

            const deleteBtn = (c.is_mine == 1)
                ? `<button class="comment-item-delete" data-id="${c.comment_id}">삭제</button>`
                : '';

            // 📌 [답글달기] 클릭 시 toggleReplyForm 대신 focusReplyField가 호출되도록 변경 (시간과 닉네임을 넘겨줍니다)
            const replyBtn = `<button class="comment-item-reply" onclick="focusReplyField('${rawTime}', '${escapeHtml(c.username)}')">답글달기</button>`;

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
                        ${replyBtn}
                        ${deleteBtn}
                    </div>
                </div>
                <div class="comment-item-content">${safeContent}</div>

                <div class="replies-container" id="replies-${parentKey}" style="margin-left: 20px; border-left: 2px solid #efefef; padding-left: 12px; margin-top: 8px;"></div>
            `;
            listArea.appendChild(item);
        });
        // 📌 4. 대댓글(자식) 매칭 후 들여쓰기 꽂아넣기
        replies.forEach(cc => {
            const targetKey = cc.parent_id.replace(/[^0-9]/g, '');
            const targetContainer = document.getElementById(`replies-${targetKey}`);
            
            if (targetContainer) {
                const replyItem = document.createElement('div');
                replyItem.style.cssText = 'margin-top:6px; font-size:13px; background:#f9f9f9; padding:6px 10px; border-radius:6px;';
                
                const deleteBtn = (cc.is_mine == 1) 
                    ? `<button style="cursor:pointer; float:right; font-size:11px; background:none; border:none; color:#ff4d4f;" onclick="deleteComment(${cc.comment_id})">삭제</button>` 
                    : '';

                replyItem.innerHTML = `
                    <div style="font-weight:bold; margin-bottom:2px; display:flex; justify-content:space-between;">
                        <div>
                            <span style="color:#007bff; font-weight:bold; margin-right:2px;">ㄴ</span> ${escapeHtml(cc.username)}
                            <span style="font-weight:normal; font-size:11px; color:#999; margin-left:6px;">${formatCommentTime(cc.created_at)}</span>
                        </div>
                        ${deleteBtn}
                    </div>
                    <div style="padding-left:14px; color:#444;">${escapeHtml(cc.content)}</div>
                `;
                targetContainer.appendChild(replyItem);
            }
        });

        // 기존의 일반 댓글 삭제 이벤트 바인딩 유지
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
        // 📌 1. 백엔드로 보낼 기본 데이터를 오브젝트로 먼저 만듭니다.
        let finalContent = content;
        
        // 📌 2. [변경] 답글달기를 누른 상태라면 내용 앞에 [REPLY:시간]을 강제로 붙여 보냅니다.
        if (currentReplyParentTime) {
            finalContent = `[REPLY:${currentReplyParentTime}]` + content;
        }

        const bodyData = { song_id: currentCommentSongId, content: finalContent };

        const res = await fetch('../php/api.php?action=add_comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData) // 📌 완성된 bodyData 패킷을 전송
        });
        const data = await res.json();

        if (data.success) {
            input.value = '';
            
            // 📌 3. [추가] 등록 성공 시 안내 문구를 명시적으로 원래대로 되돌립니다.
            input.placeholder = '댓글을 입력하세요...'; 
            
            currentReplyParentTime = null; // 📌 등록 성공 시 대댓글 타겟팅 기억을 초기화합니다.
            await loadComments(currentCommentSongId);
            await startRollingComments(currentCommentSongId);
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
    const targetSongId = currentCommentSongId; 
    showCustomModal('댓글을 삭제하시겠습니까?', async () => {
        try {
            const res = await fetch('../php/api.php?action=delete_comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment_id: commentId })
            });
            const data = await res.json();

            if (data.success) {
                await loadComments(targetSongId);
                showToast('댓글이 삭제되었습니다.'); 
                await startRollingComments(targetSongId);
            } else {
                alert(data.message || '삭제 실패');
            }
        } catch (err) {
            console.error('댓글 삭제 실패:', err);
            alert('서버 통신 오류');
        }
    });
}

window.focusReplyField = function(rawTime, username) {
    const mainInput = document.getElementById('commentInput');
    if (!mainInput) return;

    // 1. 부모 시간은 뒤에서 조용히 기억
    currentReplyParentTime = rawTime;

    // 2. 입력창 내용은 깔끔하게 비우고, 배경 안내문구(placeholder)만 연한 회색으로 변경!
    mainInput.value = ''; 
    mainInput.placeholder = `${username}님에게 답글 남기는 중...`;
    mainInput.focus();
};

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
        if (rollingIntervals[songId]) {
            clearInterval(rollingIntervals[songId]); 
            delete rollingIntervals[songId];
        }

        const res = await fetch(`../php/api.php?action=get_comments&song_id=${songId}`);
        const data = await res.json();

        const countLabel = document.getElementById(`comment-count-${songId}`);
        const commentCount = (data.success && data.comment_count !== undefined) ? data.comment_count : 0;
        
        if (countLabel) {
            countLabel.innerText = commentCount;
        }

        const rollingBox = document.getElementById(`rolling-comment-${songId}`);
        if (!rollingBox) return;

        if (!data.success || !data.comments || data.comments.length === 0) {
            rollingBox.innerHTML = '';
            rollingBox.style.opacity = '0';
            rollingBox.style.display = 'none';
            return;
        }

        rollingBox.style.display = 'block';
        const comments = data.comments;
        let currentIndex = 0;

        const displayComment = (comment) => {
            const safeUser = escapeHtml(comment.username || '익명');
            // 만약 롤링창에 표시될 댓글이 대댓글 표식을 가졌다면 필터링해서 알맹이만 보여줌
            let contentToShow = comment.content || '';
            if (contentToShow.startsWith('[REPLY:')) {
                const match = contentToShow.match(/^\[REPLY:(.*?)\](.*)$/);
                if (match) contentToShow = match[2];
            }
            const safeContent = escapeHtml(contentToShow);
            rollingBox.innerHTML = `<strong style="font-weight: 700; margin-right: 5px;">${safeUser}</strong>${safeContent}`;
        };

        displayComment(comments[currentIndex]);
        rollingBox.style.opacity = '1';

        if (comments.length > 1) {
            rollingIntervals[songId] = setInterval(() => {
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
// 🔥 공통 플로팅 미니 플레이어 & 전체 재생 모듈 
// ============================================================
    const PlayAll = (() => {
    let player = null, apiReady = false, pendingStart = false;
    let pendingTime = 0, pendingAutoplay = false;
    let queue = [];      
    let pageQueue = [];  
    let currentIndex = -1, isPlaying = false, isExpanded = false;
    let playedSongIds = new Set();

    let $playAllBtn, $miniPlayer, $title, $sub, $thumb, $prev, $next, $playPause, $playPauseIcon, $queueList, $close; // 👈 $close 추가 완료!

    function extractYouTubeID(url) {
        const match = url ? url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i) : null;
        return (match && match[1].length === 11) ? match[1] : null;
    }

    function showToastSafe(msg) {
        if (typeof showToast === 'function') {
            showToast(msg);
        } else {
            const toast = document.createElement('div');
            toast.innerText = msg;
            toast.style.cssText = `
                position: fixed; bottom: 120px; left: 50%; transform: translateX(-50%);
                background-color: rgba(0, 0, 0, 0.75); color: #fff; padding: 12px 24px;
                border-radius: 25px; font-size: 14px; font-weight: 500; z-index: 10000;
                opacity: 0; transition: opacity 0.3s ease-in-out; pointer-events: none; text-align: center;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            `;
            document.body.appendChild(toast);
            requestAnimationFrame(() => toast.style.opacity = '1');
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => document.body.removeChild(toast), 300);
            }, 2000);
        }
    }

    function saveState() {
        if (queue.length === 0) return;
        const state = {
            queue, 
            currentIndex,
            playedSongIds: Array.from(playedSongIds),
            currentTime: player && typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0, // 👈 객체 내부의 정상적인 속성으로 선언
            isPlaying, 
            isExpanded
        };
        sessionStorage.setItem('miniPlayerState', JSON.stringify(state));
    }
    
    window.addEventListener('beforeunload', saveState);

    function restoreState() {
        const stateStr = sessionStorage.getItem('miniPlayerState');
        if (!stateStr) return;
        try {
            const state = JSON.parse(stateStr);
            if (state && state.queue && state.queue.length > 0) {
                queue = state.queue;
                currentIndex = state.currentIndex;
                playedSongIds = new Set(state.playedSongIds || []);
                isExpanded = state.isExpanded;
                pendingTime = state.currentTime || 0;
                pendingAutoplay = state.isPlaying || false;

                $miniPlayer.classList.add('show');
                $miniPlayer.setAttribute('aria-hidden', 'false');
                $miniPlayer.removeAttribute('inert');

                if (isExpanded) {
                    $miniPlayer.style.transition = 'none';
                    $miniPlayer.classList.add('expanded');
                    setTimeout(() => { $miniPlayer.style.transition = ''; }, 50);
                    renderQueueList();
                }
                renderMiniPlayer();
                setPlayingUI(pendingAutoplay);
                pendingStart = true;
            }
        } catch(e) {}
    }

    // 🌟 PC/서버 버그 완벽 수정: JS가 이벤트를 뺏기지 않도록 설정 최적화
    window.onYouTubeIframeAPIReady = function() {
        apiReady = true;
        try {
            player = new YT.Player('yt-player', {
                host: 'https://www.youtube.com', // 🌟 어워드스페이스 접속용
                height: '100%', 
                width: '100%',
                playerVars: { 
                    autoplay: 1, // 🌟 즉시 실행 허용
                    controls: 1, 
                    playsinline: 1,
                    origin: window.location.origin // 🌟 크로스 도메인 재생 차단 방지
                },
                events: {
                    onReady: () => {
                        if (pendingStart && queue.length > 0) { 
                            pendingStart = false; 
                            if (pendingTime > 0) {
                                // 신형 명령어: 바로 시작 지점 지정 후 재생
                                player.loadVideoById({videoId: queue[currentIndex].videoId, startSeconds: pendingTime});
                                pendingTime = 0;
                            } else {
                                playAt(currentIndex >= 0 ? currentIndex : 0); 
                            }
                        } 
                    },
                    onStateChange: (e) => {
                        if (e.data === YT.PlayerState.PLAYING) setPlayingUI(true);
                        else if (e.data === YT.PlayerState.PAUSED) setPlayingUI(false);
                        else if (e.data === YT.PlayerState.ENDED) {
                            if (queue[currentIndex]) {
                                if (typeof savePlayedSong === 'function') savePlayedSong(queue[currentIndex].songId);
                                playedSongIds.add(queue[currentIndex].songId);
                                markQueueItemAsPlayed(currentIndex); 
                            }
                            currentIndex < queue.length - 1 ? playAt(currentIndex + 1) : stopAll();
                        }
                    }
                }
            });
        } catch (e) {
            console.error("유튜브 플레이어 초기화 에러:", e);
        }
    };

    function syncQueue(songs, pSongs = []) {
        playedSongIds = new Set(pSongs);
        pageQueue = (songs || []).map(s => ({
            songId: s.song_id || s.songId, 
            videoId: extractYouTubeID(s.youtube_url || s.url),
            title: s.title || s.videoTitle || '제목 없음', 
            thumb: s.thumbnail_img || s.thumb || '', 
            loginId: s.login_id || s.loginId || s.username
        })).filter(item => item.videoId);
        
        if ($playAllBtn) $playAllBtn.disabled = (pageQueue.length === 0);
        saveState(); 
    }

    function startPlayAll(forcePlay = false) {
        if (forcePlay) {
            if (pageQueue.length === 0) {
                showToastSafe('노래가 없습니다.');
                return;
            }
            if (queue.length > 0 && queue !== pageQueue) {
                showToastSafe('삭제하고 다시 시도해주세요');
                return;
            }
            queue = [...pageQueue];
            currentIndex = 0;
            saveState();
        }

        if (queue.length === 0) return;
        
        // 🔥 항상 플레이어를 화면에 띄웁니다.
        $miniPlayer.classList.add('show');
        $miniPlayer.setAttribute('aria-hidden', 'false');
        $miniPlayer.removeAttribute('inert');
        
        // 🚨 무조건 플레이어를 위로 확장시켜서 브라우저의 재생 차단을 원천 방지
        if (!isExpanded) {
            toggleExpand(); 
        }

        if (!apiReady || !player || typeof player.loadVideoById !== 'function') {
            pendingStart = true; pendingTime = 0; renderMiniPlayer(); setPlayingUI(true); return;
        }
        playAt(forcePlay ? 0 : currentIndex);
    }

    function updateUIInstantly(index) {
        currentIndex = parseInt(index, 10);
        renderMiniPlayer();
        if ($queueList) {
            const items = $queueList.querySelectorAll('.q-item');
            if (items.length > 0) {
                items.forEach((item, idx) => {
                    if (idx === currentIndex) {
                        item.classList.add('current');
                        setTimeout(() => {
                            try { item.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch(e) {}
                        }, 10);
                    } else {
                        item.classList.remove('current');
                    }
                });
            }
        }
    }

    // 🔥 딜레이를 완벽히 제거한 즉시 재생 함수
    function playAt(index) {
        if (index < 0 || index >= queue.length) return;
        
        updateUIInstantly(index);
        
        if (!player || typeof player.loadVideoById !== 'function') { 
            pendingStart = true; 
            return; 
        }
        
        try {
            // setTimeout 같은 눈속임 없이 바로 쏴줘야 컴퓨터와 스마트폰 모두 안 막힙니다.
            player.loadVideoById(queue[currentIndex].videoId);
        } catch (e) {
            console.error("유튜브 재생 에러:", e);
        }
    }

    function stopAll() {
        try { player && player.stopVideo(); } catch (e) {}
        isPlaying = false; currentIndex = -1; 
        queue = []; 
        isFloating = false;
        sessionStorage.removeItem('miniPlayerState');
        if ($miniPlayer) {
            isExpanded = false;
            $miniPlayer.classList.remove('expanded', 'show', 'floating-mode');
            $miniPlayer.setAttribute('aria-hidden', 'true');
            $miniPlayer.setAttribute('inert', '');
            $miniPlayer.style.transform = 'translate(-50%, 0)';
            $miniPlayer.style.left = ''; 
            $miniPlayer.style.top = ''; 
        }
    }

    function toggleExpand() {
        isExpanded = !isExpanded;
        if (isExpanded) {
            $miniPlayer.style.left = ''; $miniPlayer.style.top = ''; $miniPlayer.style.transform = '';
            requestAnimationFrame(() => $miniPlayer.classList.add('expanded'));
            renderQueueList();
        } else {
            $miniPlayer.classList.remove('expanded');
        }
    }

    function renderMiniPlayer() {
        const item = queue[currentIndex];
        if (!item) return;
        if ($title) $title.textContent = item.title;
        if ($sub) $sub.textContent = `@${item.loginId} · ${currentIndex + 1} / ${queue.length}`;
        if ($thumb) $thumb.src = item.thumb;
        if ($prev) $prev.disabled = (currentIndex <= 0);
        if ($next) $next.disabled = (currentIndex >= queue.length - 1);
    }
    
    function markQueueItemAsPlayed(index) {
        if (!$queueList) return;
        const items = $queueList.querySelectorAll('.q-item');
        if (items[index]) {
            items[index].classList.add('played');
            const titleEl = items[index].querySelector('.q-title');
            if (titleEl && !titleEl.querySelector('.q-label-played')) {
                titleEl.innerHTML = '<span class="q-label-played">재생 완료</span>' + titleEl.innerHTML;
            }
        }
    }

    function renderQueueList() {
        if (!$queueList || !isExpanded) return;

        if ($queueList.children.length !== queue.length) {
            $queueList.innerHTML = '';
            queue.forEach((item, index) => {
                const isPlayed = playedSongIds.has(item.songId);
                const qItem = document.createElement('div');
                qItem.className = `q-item ${isPlayed ? 'played' : ''}`; 
                
                qItem.innerHTML = `
                    <div class="q-thumb"><img src="${item.thumb}" alt=""></div>
                    <div class="q-info">
                        <div class="q-title">${isPlayed ? '<span class="q-label-played">재생 완료</span>' : ''}${item.title}</div>
                        <div class="q-user">@${item.loginId}</div>
                    </div>`;
                
                qItem.onclick = () => playAt(index);
                $queueList.appendChild(qItem);
            });
        }
        updateUIInstantly(currentIndex);
    }

    function setPlayingUI(playing) {
        isPlaying = playing;
        if ($playPauseIcon) $playPauseIcon.className = playing ? 'fas fa-pause' : 'fas fa-play';
    }

    function onDragStart(e) {
        if (e.target.closest('.mp-btn') || isExpanded) { if(isExpanded) toggleExpand(); return; }
        const touch = e.touches ? e.touches[0] : e;
        dragStartX = touch.clientX; dragStartY = touch.clientY; isDragging = false;
        
        const rect = $miniPlayer.getBoundingClientRect();
        if ($miniPlayer.style.transform !== 'none') {
            $miniPlayer.style.transform = 'none'; $miniPlayer.style.left = rect.left + 'px'; $miniPlayer.style.top = rect.top + 'px';
        }
        initialLeft = parseFloat($miniPlayer.style.left) || rect.left;
        initialTop = parseFloat($miniPlayer.style.top) || rect.top;
        
        document.addEventListener(e.type === 'touchstart' ? 'touchmove' : 'mousemove', onDragMove, {passive: false});
        document.addEventListener(e.type === 'touchstart' ? 'touchend' : 'mouseup', onDragEnd);
    }

    function onDragMove(e) {
        const touch = e.touches ? e.touches[0] : e;
        const dx = touch.clientX - dragStartX; 
        const dy = touch.clientY - dragStartY;
        
        if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            isDragging = true;
            if (!isFloating) {
                isFloating = true;
                $miniPlayer.classList.add('floating-mode');
                dragStartX = touch.clientX;
                dragStartY = touch.clientY;
                initialLeft = touch.clientX - 32;
                initialTop = touch.clientY - 32;
            }
        }
        
        if (isDragging) { 
            e.preventDefault(); 
            const currentDx = touch.clientX - dragStartX;
            const currentDy = touch.clientY - dragStartY;
            $miniPlayer.style.left = `${initialLeft + currentDx}px`; 
            $miniPlayer.style.top = `${initialTop + currentDy}px`; 
        }
    }

    function onDragEnd(e) {
        document.removeEventListener(e.type === 'touchend' ? 'touchmove' : 'mousemove', onDragMove);
        document.removeEventListener(e.type === 'touchend' ? 'touchend' : 'mouseup', onDragEnd);
        
        if (!isDragging) {
            if (isFloating) {
                isFloating = false;
                $miniPlayer.classList.remove('floating-mode');
                $miniPlayer.style.left = ''; 
                $miniPlayer.style.top = ''; 
                $miniPlayer.style.transform = '';
            } else {
                toggleExpand();
            }
        }
        isDragging = false;
    }

    function playSpecificSong(songId) {
        const targetIndex = pageQueue.findIndex(item => item.songId === songId || item.songId == songId);
        
        if (targetIndex === -1) {
            showToastSafe('이 곡을 현재 목록에서 찾을 수 없습니다.');
            return;
        }

        queue = [...pageQueue];
        saveState();

        if ($miniPlayer) {
            $miniPlayer.classList.add('show');
            $miniPlayer.setAttribute('aria-hidden', 'false');
            $miniPlayer.removeAttribute('inert');
        }

        // 🚨 여기서도 무조건 확장시켜서 재생 차단을 뚫어냅니다
        if (!isExpanded) {
            toggleExpand();
        }

        if (!apiReady || !player || typeof player.loadVideoById !== 'function') {
            currentIndex = targetIndex;
            pendingStart = true;
            pendingTime = 0;
            renderMiniPlayer();
            setPlayingUI(true);
            return;
        }
        
        playAt(targetIndex);
    }

    function init() {
        $playAllBtn = document.getElementById('play-all-btn');
        $miniPlayer = document.getElementById('miniPlayer');
        $queueList = document.getElementById('mpQueueList');
        $thumb = document.getElementById('miniPlayerThumb');
        $title = document.getElementById('miniPlayerTitle'); $sub = document.getElementById('miniPlayerSub');
        $prev = document.getElementById('mpPrevBtn'); $next = document.getElementById('mpNextBtn');
        $playPause = document.getElementById('mpPlayPauseBtn'); $playPauseIcon = document.getElementById('mpPlayPauseIcon');
        $close = document.getElementById('mpCloseBtn');

        if ($playAllBtn) $playAllBtn.onclick = () => startPlayAll(true);
        if ($prev) $prev.onclick = () => currentIndex > 0 ? playAt(currentIndex - 1) : (player && typeof player.seekTo === 'function' && player.seekTo(0, true));
        if ($next) $next.onclick = () => currentIndex < queue.length - 1 ? playAt(currentIndex + 1) : stopAll();
        if ($playPause) $playPause.onclick = () => player && (player.getPlayerState() === YT.PlayerState.PLAYING ? player.pauseVideo() : player.playVideo());
        if ($close) $close.onclick = stopAll;

        const $mpHeader = document.getElementById('mpHeader');
        if ($mpHeader) {
            $mpHeader.addEventListener('mousedown', onDragStart);
            $mpHeader.addEventListener('touchstart', onDragStart, {passive: true});
        }
        
        // 🌟 PC/서버 캐싱 버그 완벽 방지: HTML이 아니라 JS가 스크립트를 직접 주입하도록 변경
        if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(tag);
        } else if (typeof YT.Player === 'function') {
            if (window.onYouTubeIframeAPIReady) window.onYouTubeIframeAPIReady();
        }

        restoreState();
    }

    return { init, syncQueue, startPlayAll, playSpecificSong };
})();

// 1-1. 서버에서 내가 들은 곡 목록 가져오기
async function fetchPlayedSongs() {
    try {
        const response = await fetch('../php/api.php?action=get_played_history'); 
        if (!response.ok) throw new Error('네트워크 응답이 올바르지 않습니다.');
        
        const text = await response.text();
        if (!text) return []; 

        const data = JSON.parse(text); 
        return data.playedSongs || []; 
    } catch (error) {
        console.error('재생 기록을 불러오는데 실패했습니다:', error);
        return []; 
    }
}

// 1-2. 곡 재생 완료 시 서버에 저장하기
async function savePlayedSong(songId) {
    try {
        const response = await fetch('../php/api.php?action=save_played_history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song_id: songId })
        });

        if (response.ok) {
            const songCard = document.querySelector(`.song-card[data-song-id="${songId}"]`);
            if (songCard) {
                songCard.classList.add('played');
                const mark = songCard.querySelector('.complete-mark');
                if (mark) mark.style.display = 'flex'; 
            }
        }
    } catch (error) {
        console.error('재생 기록 저장 중 오류 발생:', error);
    }
}