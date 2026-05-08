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

const groupListScrollArea = document.getElementById("real-group-list");

    if (groupListScrollArea) {
        // 💡 손가락으로 밀었을 때(터치 이벤트) 처리
        groupListScrollArea.addEventListener('touchstart', (e) => {
            // 터치 시작 시 이벤트 전파 차단
            e.stopPropagation();
        }, { passive: true });

        groupListScrollArea.addEventListener('touchmove', (e) => {
            // 💡 중요: 리스트 내부에서 손가락을 움직일 때는 
            // 바깥쪽 바텀 시트의 '스와이프 닫기' 로직이 실행되지 않게 차단합니다.
            e.stopPropagation();
        }, { passive: true });
    }

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
            // ✅ 음악을 등록한 사람: 정보칸 이름은 '(나)' 없이 나옴
            card.innerHTML = `
                <div class="song-scroll-wrapper">
                    <div class="thumb-area" style="cursor: pointer;">
                        <img src="${song.thumbnail_img}" alt="thumbnail" class="thumb-img" onload="if(this.naturalWidth === 120 && this.src.includes('maxresdefault')) this.src = this.src.replace('maxresdefault', 'hqdefault');" onerror="if(this.src.includes('maxresdefault')) this.src = this.src.replace('maxresdefault', 'hqdefault');">
                        <div class="video-info-overlay">
                            <div class="video-title" style="color: #ffffff;">${song.title || '제목 없음'}</div>
                        </div>
                    </div>
                    <div class="info-area">
                        <div class="user" style="margin-bottom: 2px;">${infoName}</div>
                        <div style="font-size: 11px; color: rgba(0,0,0,0.4); margin-bottom: 8px; font-weight: 500;">@${song.login_id || '아이디 없음'}</div>
                        <div class="msg">${song.daily_comment || '등록된 코멘트가 없습니다.'}</div>
                        <div class="post-time">${song.log_date || ''} ${song.log_time || ''}</div>
                    </div>
                </div>
            `;

            const thumbArea = card.querySelector('.thumb-area');
            if (thumbArea && song.youtube_url) {
                thumbArea.onclick = () => window.open(song.youtube_url, '_blank');
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
            // 🔥 [에러 해결!] 여기서 groupRes를 딱 한 번만 선언해야 합니다.
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
function setupSwipeGesture() {
    const sheet = document.getElementById('bottomSheet');
    if (!sheet) return;
    let startY = 0;
    document.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
    document.addEventListener('touchend', (e) => {
        const deltaY = startY - e.changedTouches[0].clientY;
        if (startY > window.innerHeight * 0.7 && deltaY > 50) sheet.classList.add('show');
        else if (deltaY < -50) sheet.classList.remove('show');
    }, { passive: true });
}

// --- 8. 사이드바 이벤트 ---
function setupEventListeners() {
    const toggle = document.getElementById('sideBarToggle');
    const content = document.getElementById('sideBarContent');
    if (toggle) {
        toggle.onclick = () => content.classList.toggle('collapsed');
    }
}