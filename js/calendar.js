let viewDate = new Date(); 
let currentMonthSongs = []; // DB에서 가져온 이번 달 노래들을 저장할 전역 변수
let selectedGroupId = 0; // 🔥 선택된 그룹 ID 기본값을 0(나)으로 설정
let selectedDateStr = null;

let isPlayAllMode = false;

document.addEventListener("DOMContentLoaded", () => {
    // 플레이어 초기화
    if (typeof PlayAll !== 'undefined') PlayAll.init();

    const playAllSwitch = document.getElementById('playAllSwitch');
    const playAllLabel = document.getElementById('playAllLabel');
    const playSelectedBtn = document.getElementById('playSelectedBtn');
    
    const periodModal = document.getElementById('periodModalOverlay');
    const periodCancelBtn = document.getElementById('periodCancelBtn');
    const periodPlayBtn = document.getElementById('periodPlayBtn');
    
    const periodStartDateInput = document.getElementById('periodStartDate');
    const periodEndDateInput = document.getElementById('periodEndDate');
    const periodPreviewList = document.getElementById('periodPreviewList');

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
                PlayAll.startPlayAll(true); // 🔥 true 추가: 무조건 재생(교체)
            } else {
                // [스위치 ON] 기간 선택 모달 띄우기
                if (periodModal) {
                    periodModal.style.display = 'flex';
                    if (periodPreviewList) {
                        periodPreviewList.style.display = 'none';
                        periodPreviewList.innerHTML = '';
                    }
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

    // 🔥 미리보기 리스트 로드 기능
    const loadPreviewSongs = async () => {
        const startVal = periodStartDateInput.value;
        const endVal = periodEndDateInput.value;

        if (!startVal || !endVal) {
            if(periodPreviewList) periodPreviewList.style.display = 'none';
            return;
        }

        const startDate = startVal.replace(/-/g, '.');
        const endDate = endVal.replace(/-/g, '.');

        if (startDate > endDate) {
            if(periodPreviewList) {
                periodPreviewList.style.display = 'block';
                periodPreviewList.innerHTML = '<div style="text-align:center; color:#ff4d4f; font-size:13px; padding:20px 0;">시작일이 종료일보다 늦을 수 없습니다.</div>';
            }
            return;
        }

        if(periodPreviewList) {
            periodPreviewList.style.display = 'block';
            periodPreviewList.innerHTML = '<div style="text-align:center; color:#888; font-size:13px; padding:20px 0;">노래를 불러오는 중...</div>';
        }

        try {
            const url = `../php/fetch_period_songs.php?group_id=${selectedGroupId}&start=${startDate}&end=${endDate}`;
            const res = await fetch(url);
            const data = await res.json();
            const periodSongs = data.songs || data;

            if (!Array.isArray(periodSongs) || periodSongs.length === 0) {
                if(periodPreviewList) periodPreviewList.innerHTML = '<div style="text-align:center; color:#888; font-size:13px; padding:20px 0;">해당 기간에 추천된 노래가 없습니다.</div>';
                return;
            }

            if(periodPreviewList) {
                periodPreviewList.innerHTML = '';
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
                    periodPreviewList.appendChild(item);
                });
            }
        } catch (err) {
            console.error(err);
            if(periodPreviewList) periodPreviewList.innerHTML = '<div style="text-align:center; color:#ff4d4f; font-size:13px; padding:20px 0;">노래를 불러오는데 실패했습니다.</div>';
        }
    };

    if (periodStartDateInput) periodStartDateInput.addEventListener('change', loadPreviewSongs);
    if (periodEndDateInput) periodEndDateInput.addEventListener('change', loadPreviewSongs);

    // 4. 모달 - 기간 선택 후 재생 버튼
    if (periodPlayBtn) {
        periodPlayBtn.addEventListener('click', async () => {
            const startDate = periodStartDateInput.value.replace(/-/g, '.');
            const endDate = periodEndDateInput.value.replace(/-/g, '.');

            if (!startDate || !endDate) {
                alert("시작일과 종료일을 모두 선택해주세요.");
                return;
            }

            try {
                const url = `../php/fetch_period_songs.php?group_id=${selectedGroupId}&start=${startDate}&end=${endDate}`;
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
                PlayAll.startPlayAll(true); // 🔥 true 추가: 이전 리스트를 덮어쓰고 강제 재생

            } catch (err) {
                console.error("기간별 데이터 불러오기 오류:", err);
                alert("노래 데이터를 불러오는데 실패했습니다.");
            }
        });
    }
});

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
    
    grid.innerHTML = ""; 
    
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

        if (selectedDateStr === dateStr) {
            dayEl.classList.add('active');
            showSongs(todaysSongs); 
        } else if (!selectedDateStr && year === now.getFullYear() && month === now.getMonth() && d === now.getDate()) {
            dayEl.classList.add('active');
        }

        dayEl.onclick = () => {
            document.querySelectorAll('.day').forEach(el => el.classList.remove('active'));
            dayEl.classList.add('active');
            selectedDateStr = dateStr; 
            showSongs(todaysSongs);
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
        wrapper.setAttribute("onmouseup", "resetToCenter(this)");
        wrapper.setAttribute("ontouchend", "resetToCenter(this)");
        
        const infoHtml = `
            <div class="info-area">
                <span class="user-name" style="font-weight: bold;">${song.userName}</span>
                <span class="user-id" style="font-size: 11px; color: #666;">@${song.loginId}</span>
                <span class="user-comment">"${song.comment}"</span>
                <span class="upload-time" style="font-size: 10px; color: #999;">${song.uploadTime}</span>
            </div>
        `;

        wrapper.innerHTML = `
            <div class="thumb-area" onclick="window.open('${song.url}', '_blank')">
                <img src="${song.thumb}" 
                    onload="if(this.naturalWidth === 120 && this.src.includes('maxresdefault')) this.src = this.src.replace('maxresdefault', 'hqdefault');" 
                    onerror="if(this.src.includes('maxresdefault')) this.src = this.src.replace('maxresdefault', 'hqdefault');" 
                    alt="thumbnail">
                <div class="video-overlay">
                    <div class="title">${song.videoTitle}</div>
                </div>
            </div>
            ${infoHtml}
        `;
        
        listContainer.appendChild(wrapper);
        setTimeout(() => { wrapper.scrollLeft = 0; }, 10);
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

// ============================================================
// 🔥 플로팅 미니 플레이어 & 전체 재생 모듈 (페이지 유지 기능 추가)
// ============================================================
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
// 🔥 공통 플로팅 미니 플레이어 & 전체 재생 모듈 (페이지 간 상태 유지 & 중복 재생 방지)
// ============================================================
const PlayAll = (() => {
    let player = null, apiReady = false, pendingStart = false;
    let pendingTime = 0, pendingAutoplay = false;
    let queue = [];      // 현재 진짜로 재생 중인 플레이어 큐
    let pageQueue = [];  // 현재 보고 있는 화면(페이지)의 노래 큐
    let currentIndex = -1, isPlaying = false, isExpanded = false;
    let isFloating = false;
    let playedSongIds = new Set();
    let $playAllBtn, $miniPlayer, $title, $sub, $thumb, $prev, $next, $playPause, $playPauseIcon, $queueList;
    let isDragging = false, dragStartX = 0, dragStartY = 0, initialLeft = 0, initialTop = 0;

    function extractYouTubeID(url) {
        const match = url ? url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i) : null;
        return (match && match[1].length === 11) ? match[1] : null;
    }

    // 🔥 공통 토스트 알림 (모든 페이지 호환용)
    function showToastSafe(msg) {
        if (typeof showToast === 'function') {
            showToast(msg);
        } else {
            const toast = document.createElement('div');
            toast.innerText = msg;
            toast.style.cssText = `
                position: fixed; bottom: 120px; left: 50%; transform: translateX(-50%);
                background-color: rgba(0, 0, 0, 0.75); color: #fff; padding: 12px 24px;
                border-radius: 25px; font-size: 11px; font-weight: 500; z-index: 10000;
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
                                // savePlayedSong 함수는 외부에 선언되어 있어야 함
                                if (typeof savePlayedSong === 'function') savePlayedSong(queue[currentIndex].songId);
                                playedSongIds.add(queue[currentIndex].songId);
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
            
            // 🔥 이미 재생 중인(혹은 일시정지 중인) 리스트가 있다면 덮어쓰지 않고 경고창 표시
            if (queue.length > 0) {
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

    function playAt(index) {
        if (index < 0 || index >= queue.length) return;
        currentIndex = index; renderMiniPlayer(); renderQueueList();
        if (!player || typeof player.cueVideoById !== 'function') { pendingStart = true; return; }
        try {
            player.cueVideoById(queue[currentIndex].videoId);
            setTimeout(() => { try { player.playVideo(); } catch(e){} }, 300);
        } catch (e) {}
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

    function renderQueueList() {
        if (!$queueList || !isExpanded) return;
        $queueList.innerHTML = '';
        queue.forEach((item, index) => {
            const isPlayed = playedSongIds.has(item.songId);
            const qItem = document.createElement('div');
            qItem.className = `q-item ${isPlayed ? 'played' : ''} ${index === currentIndex ? 'current' : ''}`;
            qItem.innerHTML = `<div class="q-thumb"><img src="${item.thumb}" alt=""></div>
                <div class="q-info">
                    <div class="q-title">${isPlayed ? '<span class="q-label-played">재생 완료</span>' : ''}${item.title}</div>
                    <div class="q-user">@${item.loginId}</div>
                </div>`;
            qItem.onclick = () => playAt(index);
            $queueList.appendChild(qItem);
        });
        const currentEl = $queueList.querySelector('.current');
        if (currentEl) currentEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
        
        // 5픽셀 이상 움직이면 드래그로 판정
        if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            isDragging = true;
            
            // 🔥 아직 플로팅 모드가 아니라면 전환 (긴 바 -> 썸네일 정사각형)
            if (!isFloating) {
                isFloating = true;
                $miniPlayer.classList.add('floating-mode');
                
                // 손가락 중앙에 정사각형 썸네일(64x64)이 오도록 즉각 위치 보정
                dragStartX = touch.clientX;
                dragStartY = touch.clientY;
                initialLeft = touch.clientX - 32;
                initialTop = touch.clientY - 32;
            }
        }
        
        if (isDragging) { 
            e.preventDefault(); 
            // 좌표를 재계산하여 손가락을 따라다니도록 설정
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
            // 🔥 제자리에서 터치(클릭)했을 때의 동작
            if (isFloating) {
                // 플로팅 모드(정사각형)를 클릭하면 원래 하단 긴 바로 복귀
                isFloating = false;
                $miniPlayer.classList.remove('floating-mode');
                $miniPlayer.style.left = ''; 
                $miniPlayer.style.top = ''; 
                $miniPlayer.style.transform = ''; // CSS 기본 위치(translate)로 복귀
            } else {
                // 하단 긴 바 모드에서 클릭하면 전체화면 확장
                toggleExpand();
            }
        }
        isDragging = false;
    }

    function stopAll() {
        try { player && player.stopVideo(); } catch (e) {}
        isPlaying = false; currentIndex = -1; queue = [];
        isFloating = false; // 🔥 재생 중지 시 플로팅 상태도 초기화
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
    function onDragEnd(e) {
        document.removeEventListener(e.type === 'touchend' ? 'touchmove' : 'mousemove', onDragMove);
        document.removeEventListener(e.type === 'touchend' ? 'touchend' : 'mouseup', onDragEnd);
        if (!isDragging) toggleExpand();
        isDragging = false;
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

    return { init, syncQueue, startPlayAll };
})();