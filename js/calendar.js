let viewDate = new Date(); 
let currentMonthSongs = []; // DB에서 가져온 이번 달 노래들을 저장할 전역 변수
let selectedGroupId = 0; // 🔥 선택된 그룹 ID 기본값을 0(나)으로 설정
let selectedDateStr = null;

let isPlayAllMode = false;

// 🔥 모달 캘린더용 변수
let modalViewDate = new Date();
let rangeStartStr = null;
let rangeEndStr = null;

document.addEventListener("DOMContentLoaded", () => {
    // 플레이어 초기화
    if (typeof PlayAll !== 'undefined') PlayAll.init();

    const playAllSwitch = document.getElementById('playAllSwitch');
    const playAllLabel = document.getElementById('playAllLabel');
    const playSelectedBtn = document.getElementById('playSelectedBtn');
    
    const periodModal = document.getElementById('periodModalOverlay');
    const periodCancelBtn = document.getElementById('periodCancelBtn');
    const periodPlayBtn = document.getElementById('periodPlayBtn');
    const periodPreviewList = document.getElementById('periodPreviewList');

    // 🔥 새롭게 추가된 모달 내 화면 전환 요소들
    const modalStep1 = document.getElementById('modal-step-1');
    const modalStep2 = document.getElementById('modal-step-2');
    const periodNextBtn = document.getElementById('periodNextBtn');
    const periodBackBtn = document.getElementById('periodBackBtn');

    // 1. 스위치 토글 이벤트
    if (playAllSwitch) {
        playAllSwitch.addEventListener('change', (e) => {
            isPlayAllMode = e.target.checked;
            playAllLabel.innerText = isPlayAllMode ? '기간 전체 듣기' : '날짜별 듣기';
        });
    }

    // 2. 모아듣기 버튼 클릭
    if (playSelectedBtn) {
        playSelectedBtn.addEventListener('click', async () => {
            if (!isPlayAllMode) {
                // [스위치 OFF] 선택된 날짜만 재생
                if (!selectedDateStr) {
                    alert("재생할 날짜를 먼저 캘린더에서 선택해주세요.");
                    return;
                }
                const todaysSongs = currentMonthSongs.filter(s => s.uploadDate === selectedDateStr);
                if (todaysSongs.length === 0) {
                    alert("선택하신 날짜에 재생할 노래가 없습니다.");
                    return;
                }
                
                const mappedSongs = todaysSongs.map(s => ({
                    song_id: s.songId,
                    youtube_url: s.url,
                    title: s.videoTitle,
                    thumbnail_img: s.thumb,
                    username: s.userName,
                    login_id: s.loginId
                }));
                
                const playedSongs = await fetchPlayedSongs();
                PlayAll.syncQueue(mappedSongs, playedSongs);
                PlayAll.startPlayAll(true); // 무조건 재생(교체)
            } else {
                // [스위치 ON] 기간 선택 모달 띄우기 및 달력 초기화
                if (periodModal) {
                    modalViewDate = new Date(); // 현재 달력으로 초기화
                    rangeStartStr = null;
                    rangeEndStr = null;
                    
                    // 초기화 시 달력 화면(STEP 1)이 보이도록 설정
                    if(modalStep1) modalStep1.style.display = 'flex';
                    if(modalStep2) modalStep2.style.display = 'none';
                    if (periodPreviewList) periodPreviewList.innerHTML = '';
                    
                    periodModal.style.display = 'flex';
                    renderModalCalendar(); // 커스텀 달력 그리기
                }
            }
        });
    }

    // 3. 모달 - 취소 버튼
    if (periodCancelBtn) {
        periodCancelBtn.addEventListener('click', () => {
            periodModal.style.display = 'none';
        });
    }

    // 🔥 '다음' 버튼 누를 때 음악 리스트 불러오고 뷰 전환
    if (periodNextBtn) {
        periodNextBtn.addEventListener('click', () => {
            if (!rangeStartStr || !rangeEndStr) {
                alert("시작일과 종료일을 캘린더에서 모두 선택해주세요.");
                return;
            }
            modalStep1.style.display = 'none';
            modalStep2.style.display = 'flex';
            loadCustomPreviewSongs(rangeStartStr, rangeEndStr);
        });
    }

    // 🔥 '뒤로' 버튼 누를 때 다시 달력으로 전환
    if (periodBackBtn) {
        periodBackBtn.addEventListener('click', () => {
            modalStep2.style.display = 'none';
            modalStep1.style.display = 'flex';
        });
    }

    // 4. 모달 - 캘린더 월 이동 버튼
    const modalPrevBtn = document.getElementById("modal-prev-month");
    const modalNextBtn = document.getElementById("modal-next-month");
    
    if (modalPrevBtn) {
        modalPrevBtn.onclick = () => {
            modalViewDate.setMonth(modalViewDate.getMonth() - 1);
            renderModalCalendar();
        };
    }
    if (modalNextBtn) {
        modalNextBtn.onclick = () => {
            modalViewDate.setMonth(modalViewDate.getMonth() + 1);
            renderModalCalendar();
        };
    }

    // 5. 모달 - 기간 선택 후 재생 버튼
    if (periodPlayBtn) {
        periodPlayBtn.addEventListener('click', async () => {
            if (!rangeStartStr || !rangeEndStr) {
                alert("시작일과 종료일을 캘린더에서 모두 선택해주세요.");
                return;
            }

            try {
                const url = `../php/fetch_period_songs.php?group_id=${selectedGroupId}&start=${rangeStartStr}&end=${rangeEndStr}`;
                const res = await fetch(url);
                const data = await res.json();

                const periodSongs = data.songs || data;

                if (!Array.isArray(periodSongs) || periodSongs.length === 0) {
                    alert("선택한 기간 내에 추천된 노래가 없습니다.");
                    return;
                }

                periodModal.style.display = 'none';
                
                const playedSongs = await fetchPlayedSongs();
                PlayAll.syncQueue(periodSongs, playedSongs);
                PlayAll.startPlayAll(true); // 이전 리스트 덮어쓰고 강제 재생

            } catch (err) {
                console.error("기간별 데이터 불러오기 오류:", err);
                alert("노래 데이터를 불러오는데 실패했습니다.");
            }
        });
    }
});

// 🔥 모달 내부의 커스텀 달력을 그리는 함수
function renderModalCalendar() {
    const grid = document.getElementById("modal-calendar-grid");
    const headerText = document.getElementById("modal-month-year");
    const rangeText = document.getElementById("modal-selected-range");
    
    if (!grid || !headerText) return;
    
    grid.innerHTML = "";
    const year = modalViewDate.getFullYear();
    const month = modalViewDate.getMonth();
    
    headerText.innerText = `${year}.${String(month + 1).padStart(2, '0')}`;

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    // 빈칸 채우기
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="modal-day empty"></div>`;
    }

    // 날짜 그리기
    for (let d = 1; d <= lastDate; d++) {
        const dateStr = `${year}.${String(month + 1).padStart(2, '0')}.${String(d).padStart(2, '0')}`;
        const dayEl = document.createElement("div");
        dayEl.className = "modal-day";
        dayEl.innerText = d;

        // 선택 영역 색칠 로직
        if (rangeStartStr === dateStr) {
            dayEl.classList.add("range-start");
        }
        if (rangeEndStr === dateStr) {
            dayEl.classList.add("range-end");
        }
        if (rangeStartStr && rangeEndStr && dateStr > rangeStartStr && dateStr < rangeEndStr) {
            dayEl.classList.add("in-range");
        }

        // 터치 클릭 이벤트
        dayEl.onclick = () => handleModalDayClick(dateStr);
        grid.appendChild(dayEl);
    }

    // 상단 선택 텍스트 갱신
    if (rangeStartStr && rangeEndStr) {
        rangeText.innerText = `${rangeStartStr} ~ ${rangeEndStr}`;
    } else if (rangeStartStr) {
        rangeText.innerText = `${rangeStartStr} ~ (종료일 선택)`;
    } else {
        rangeText.innerText = `시작일을 선택해주세요`;
    }
}

// 🔥 달력 날짜 클릭 시 (시작일/종료일 지정 로직)
function handleModalDayClick(dateStr) {
    if (!rangeStartStr || (rangeStartStr && rangeEndStr)) {
        // 아무것도 선택 안되어 있거나, 이미 두개 다 골라져 있으면 새로 시작
        rangeStartStr = dateStr;
        rangeEndStr = null;
    } else {
        // 시작일만 선택되어 있는 상태에서 끝나는 날 선택
        if (dateStr < rangeStartStr) {
            // 과거를 누르면 그게 시작일이 됨
            rangeStartStr = dateStr;
        } else {
            // 정상적으로 종료일 등록
            rangeEndStr = dateStr;
        }
    }
    
    // 달력 다시 그리기 (색칠)
    renderModalCalendar();
    // [변경점] 여기 있던 하단 리스트 자동 표시 로직은 제거 (이제 '다음' 버튼 클릭 시 뜹니다)
}

// 🔥 지정된 기간으로 서버에서 미리보기용 노래 가져오기
async function loadCustomPreviewSongs(start, end) {
    const previewList = document.getElementById('periodPreviewList');
    if (!previewList) return;

    previewList.innerHTML = '<div style="text-align:center; color:#888; font-size:13px; padding:20px 0;">노래를 불러오는 중...</div>';

    try {
        const url = `../php/fetch_period_songs.php?group_id=${selectedGroupId}&start=${start}&end=${end}`;
        const res = await fetch(url);
        const data = await res.json();
        const periodSongs = data.songs || data;

        if (!Array.isArray(periodSongs) || periodSongs.length === 0) {
            previewList.innerHTML = '<div style="text-align:center; color:#888; font-size:13px; padding:20px 0;">해당 기간에 추천된 노래가 없습니다.</div>';
            return;
        }

        previewList.innerHTML = '';
        periodSongs.forEach(song => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;';
            item.innerHTML = `
                <div style="width: 45px; height: 45px; border-radius: 6px; overflow: hidden; flex-shrink: 0; background: #eee;">
                    <img src="${song.thumbnail_img || song.thumb}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div style="display: flex; flex-direction: column; overflow: hidden;">
                    <span style="font-size: 13px; font-weight: 700; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${song.title || song.videoTitle}</span>
                    <span style="font-size: 11px; color: #888;">@${song.login_id || song.loginId} · ${song.log_date || song.uploadDate}</span>
                </div>
            `;
            previewList.appendChild(item);
        });
    } catch (err) {
        console.error(err);
        previewList.innerHTML = '<div style="text-align:center; color:#ff4d4f; font-size:13px; padding:20px 0;">노래를 불러오는데 실패했습니다.</div>';
    }
}


document.addEventListener("DOMContentLoaded", async () => {
    await loadGroupCategories(); 
    fetchAndRenderCalendar(true);
    setupEventListeners();

    const prevBtn = document.getElementById("prev-month");
    const nextBtn = document.getElementById("next-month");
    
    if(prevBtn) prevBtn.onclick = () => { 
        viewDate.setMonth(viewDate.getMonth() - 1); 
        fetchAndRenderCalendar(); 
    };
    if(nextBtn) nextBtn.onclick = () => { 
        viewDate.setMonth(viewDate.getMonth() + 1); 
        fetchAndRenderCalendar(); 
    };

    const backBtn = document.getElementById("backToMain");
    if (backBtn) {
        backBtn.onclick = () => {
            location.href = "../html/main.html";
        };
    }

    const headerText = document.getElementById("current-month-year");
    if (headerText) {
        headerText.onclick = () => {
            viewDate = new Date();
            fetchAndRenderCalendar();
        };
    }

    const selectWrapper = document.querySelector(".category-select-wrapper");
    const dropdown = document.getElementById("category-dropdown");
    const arrow = document.querySelector(".select-arrow");

    if (selectWrapper && dropdown) {
        selectWrapper.onclick = (e) => {
            dropdown.classList.toggle("show");
            if (arrow) {
                arrow.style.transform = dropdown.classList.contains("show") ? "rotate(180deg)" : "rotate(0deg)";
            }
            e.stopPropagation();
        };
    }

    document.addEventListener("click", () => {
        if (dropdown) dropdown.classList.remove("show");
        if (arrow) arrow.style.transform = "rotate(0deg)";
    });
});

function fetchAndRenderCalendar(isInitial = false) {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth() + 1;
    const url = `../php/fetch_calendar.php?year=${year}&month=${month}&group_id=${selectedGroupId}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            currentMonthSongs = data || []; 
            if (isInitial && !selectedDateStr) {
                const now = new Date();
                selectedDateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
            }
            renderCalendar(); 
        })
        .catch(error => {
            console.error('Error fetching calendar data:', error);
            currentMonthSongs = [];
            renderCalendar();
        });
}

async function loadGroupCategories() {
    const dropdown = document.getElementById("category-dropdown");
    const currentName = document.getElementById("current-category-name");
    
    if (!dropdown) return;
    dropdown.innerHTML = ""; 

    try {
        const userRes = await fetch('../php/api.php?action=get_my_info');
        if (!userRes.ok) throw new Error('내 정보 로드 실패 (404 혹은 500)');
        const userData = await userRes.json();
        const myName = userData.username || "";

        addDropdownItem(`(나) ${myName}`, 0); 
        if (currentName) currentName.innerText = `(나) ${myName}`;

        const groupRes = await fetch('../php/api.php?action=get_my_groups');
        if (!groupRes.ok) throw new Error('그룹 목록 로드 실패');
        const groupData = await groupRes.json();

        if (groupData.success && groupData.groups && groupData.groups.length > 0) {
            groupData.groups.forEach(group => {
                addDropdownItem(group.group_name, group.group_id);
            });
        }
    } catch (err) {
        console.error("카테고리 로드 중 오류 발생:", err);
        addDropdownItem("(나)", 0);
    }

    function addDropdownItem(name, id) {
        const item = document.createElement('div');
        item.className = "dropdown-item";
        item.innerText = name;
        item.onclick = (e) => {
            e.stopPropagation(); 
            if (currentName) currentName.innerText = name; 
            if (dropdown) dropdown.classList.remove("show");
            const arrow = document.querySelector(".select-arrow");
            if (arrow) arrow.style.transform = "rotate(0deg)";
            selectCategory(id); 
        };
        dropdown.appendChild(item);
    }
}

function selectCategory(groupId) {
    selectedGroupId = groupId;
    fetchAndRenderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const headerText = document.getElementById("current-month-year");
    const listContainer = document.getElementById("selected-song-list"); // 리스트 컨테이너
    
    grid.innerHTML = ""; 
    
    // 달력을 새로 그릴 때 하단 리스트를 일단 비웁니다
    if (listContainer) listContainer.innerHTML = ""; 
    
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    headerText.innerText = `${year}.${String(month + 1).padStart(2, '0')}`;

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const now = new Date();

    for (let i = 0; i < firstDay; i++) { 
        grid.innerHTML += `<div class="day empty"></div>`; 
    }

    for (let d = 1; d <= lastDate; d++) {
        const dateStr = `${year}.${String(month + 1).padStart(2, '0')}.${String(d).padStart(2, '0')}`;
        const todaysSongs = currentMonthSongs.filter(s => s.uploadDate === dateStr);
        
        const dayEl = document.createElement("div");
        dayEl.className = "day";
        dayEl.innerText = d;
        
        if (todaysSongs.length > 0) {
            dayEl.classList.add('attended');
        }

        // 초기 페이지 로드 시 오늘 날짜에 노래가 있으면 자동 표시
        if (!selectedDateStr && year === now.getFullYear() && month === now.getMonth() && d === now.getDate()) {
            dayEl.classList.add('active');
            selectedDateStr = dateStr;
            showSongs(todaysSongs);
        } else if (selectedDateStr === dateStr) {
            dayEl.classList.add('active');
            showSongs(todaysSongs);
        }

        dayEl.onclick = () => {
            document.querySelectorAll('.day').forEach(el => el.classList.remove('active'));
            dayEl.classList.add('active');
            selectedDateStr = dateStr; 
            showSongs(todaysSongs); // 날짜를 눌렀을 때만 리스트 갱신
        };
        grid.appendChild(dayEl);
    }
}

function showSongs(songs) {
    const listContainer = document.getElementById("selected-song-list");
    if (!listContainer) return;
    
    listContainer.innerHTML = "";

    if (songs.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; color:#999; margin-top:40px; font-size:14px; font-weight:500;">추천된 노래가 없습니다.</p>`;
        return;
    }

    songs.reverse().forEach(song => {
        const wrapper = document.createElement("div");
        wrapper.className = "video-scroll-wrapper";
        
        // 카드 내부에 즉각 반응 로직 적용
        const infoHtml = `
            <div class="info-area">
                <span class="user-name" style="font-weight: bold;">${song.userName}</span>
                <span class="user-id" style="font-size: 11px; color: #666;">@${song.loginId}</span>
                <span class="user-comment">"${song.comment}"</span>
                <span class="upload-time" style="font-size: 10px; color: #999;">${song.uploadTime}</span>
            </div>
        `;

        wrapper.innerHTML = `
            <div class="thumb-area" onclick="PlayAll.playSpecificSong('${song.songId}')">
                <img src="${song.thumb}" alt="thumbnail">
                <div class="video-overlay">
                    <div class="title">${song.videoTitle}</div>
                </div>
            </div>
            ${infoHtml}
        `;
        
        listContainer.appendChild(wrapper);
    });
}

function resetToCenter(element) {
    const scrollLeft = element.scrollLeft;
    const scrollWidth = element.scrollWidth;
    const clientWidth = element.clientWidth;
    const threshold = 60; 

    if (scrollLeft > threshold) {
        element.scrollTo({ left: scrollWidth - clientWidth, behavior: 'smooth' });
    } else {
        element.scrollTo({ left: 0, behavior: 'smooth' });
    }
}

function setupEventListeners() {
    const toggleBtn = document.getElementById('sideBarToggle');
    const content = document.getElementById('sideBarContent');
    
    if (toggleBtn && content) {
        toggleBtn.onclick = (e) => {
            e.stopPropagation();
            content.classList.toggle('collapsed');
        };
    }

    document.addEventListener('click', (e) => {
        if (content && !content.classList.contains('collapsed') && !e.target.closest('.side-bar-container')) {
            content.classList.add('collapsed');
        }
    });
}


async function fetchPlayedSongs() {
    try {
        const response = await fetch('../php/api.php?action=get_played_history'); 
        if (!response.ok) return [];
        const text = await response.text();
        return text ? JSON.parse(text).playedSongs || [] : []; 
    } catch (error) { return []; }
}
async function savePlayedSong(songId) {
    try {
        await fetch('../php/api.php?action=save_played_history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song_id: songId })
        });
    } catch (error) {}
}

// ============================================================
// 🔥 공통 플로팅 미니 플레이어 & 전체 재생 모듈 
// (완벽한 단일화: 어디서 누르든 0.001초 UI 변경 -> 유튜브 로딩)
// ============================================================
const PlayAll = (() => {
    let player = null, apiReady = false, pendingStart = false;
    let pendingTime = 0, pendingAutoplay = false;
    let queue = [];      
    let pageQueue = [];  
    let currentIndex = -1, isPlaying = false, isExpanded = false;
    let playedSongIds = new Set();
    let isFloating = false;
    
    let $playAllBtn, $miniPlayer, $title, $sub, $thumb, $prev, $next, $playPause, $playPauseIcon, $queueList;
    let isDragging = false, dragStartX = 0, dragStartY = 0, initialLeft = 0, initialTop = 0;

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
            queue, currentIndex,
            playedSongIds: Array.from(playedSongIds),
            currentTime: player && typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0,
            isPlaying, isExpanded
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

    window.onYouTubeIframeAPIReady = function() {
        apiReady = true;
        try {
            player = new YT.Player('yt-player', {
                height: '100%', width: '100%',
                playerVars: { autoplay: 0, controls: 1, playsinline: 1 },
                events: {
                    onReady: () => { 
                        if (pendingStart && queue.length > 0) { 
                            pendingStart = false; 
                            if (pendingTime > 0) {
                                player.cueVideoById(queue[currentIndex].videoId, pendingTime);
                                if (pendingAutoplay) setTimeout(() => { try { player.playVideo(); } catch(e){} }, 300);
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
        } catch (e) {}
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
        
        if (!forcePlay && $miniPlayer && $miniPlayer.classList.contains('show')) { 
            toggleExpand(); 
            return; 
        }
        
        $miniPlayer.classList.add('show');
        $miniPlayer.setAttribute('aria-hidden', 'false');
        $miniPlayer.removeAttribute('inert');

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

    function playAt(index) {
        if (index < 0 || index >= queue.length) return;
        
        updateUIInstantly(index);
        
        if (!player || typeof player.cueVideoById !== 'function') { 
            pendingStart = true; 
            return; 
        }
        
        setTimeout(() => {
            try {
                player.cueVideoById(queue[currentIndex].videoId);
                setTimeout(() => { try { player.playVideo(); } catch(e){} }, 300);
            } catch (e) {}
        }, 50);
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
        
        restoreState();
    }

    return { init, syncQueue, startPlayAll, playSpecificSong };
})();