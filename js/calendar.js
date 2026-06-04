// 🌟 1. URL에서 마이페이지가 넘겨준 date 파라미터 가져오기 (?date=YYYY-MM-DD)
const urlParams = new URLSearchParams(window.location.search);
const paramDate = urlParams.get('date');

// 🌟 2. 파라미터가 있으면 해당 월로 캘린더 세팅, 없으면 오늘 날짜로 세팅
let viewDate = paramDate ? new Date(paramDate) : new Date(); 
let currentMonthSongs = []; 
let selectedGroupId = 0; 

// 🌟 3. 파라미터가 있으면 포맷을 변환(YYYY.MM.DD)하여 달력에 '미리 선택된 날짜'로 지정
let selectedDateStr = paramDate ? paramDate.replace(/-/g, '.') : null;

// 🌟 세그먼트 모드 변수 (daily: 날짜별, period: 기간별, liked: 좋아요)
let currentPlayMode = 'daily';

// 🔥 모달 캘린더용 변수
let modalTargetMode = 'period'; // 어떤 모드로 모달을 띄웠는지 저장 ('period' or 'liked')
let modalViewDate = new Date();
let rangeStartStr = null;
let rangeEndStr = null;

// ============================================================
// [1] 상단 컨트롤 및 모달 이벤트 세팅
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    // 플레이어 초기화
    if (typeof PlayAll !== 'undefined') PlayAll.init();

    const modeRadios = document.querySelectorAll('input[name="playMode"]');
    const playSelectedBtn = document.getElementById('playSelectedBtn');
    
    const periodModal = document.getElementById('periodModalOverlay');
    const periodCancelBtn = document.getElementById('periodCancelBtn');
    const periodPlayBtn = document.getElementById('periodPlayBtn');
    const periodPreviewList = document.getElementById('periodPreviewList');

    const modalStep1 = document.getElementById('modal-step-1');
    const modalStep2 = document.getElementById('modal-step-2');
    const periodNextBtn = document.getElementById('periodNextBtn');
    const periodBackBtn = document.getElementById('periodBackBtn');
    
    // 🌟 추가됨: 전체 기간 버튼
    const selectAllPeriodBtn = document.getElementById('selectAllPeriodBtn');

    // 1. 세그먼트 컨트롤 모드 변경 이벤트
    if (modeRadios.length > 0) {
        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) currentPlayMode = e.target.value;
            });
        });
    }

    // 2. 모아듣기 버튼 클릭
    if (playSelectedBtn) {
        playSelectedBtn.addEventListener('click', async () => {
            
            // [모드 1] 날짜별 듣기
            if (currentPlayMode === 'daily') {
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
                    songId: s.songId,
                    videoId: PlayAll.extractYouTubeID(s.url),
                    title: s.videoTitle,
                    thumb: s.thumb,
                    loginId: s.loginId
                }));
                
                const playedSongs = await fetchPlayedSongs();
                PlayAll.syncQueue(mappedSongs, playedSongs);
                PlayAll.startPlayAll(true); 

            // [모드 2 & 3] 기간별 듣기 OR 좋아요 모아듣기 (모두 달력 모달 띄움)
            } else if (currentPlayMode === 'period' || currentPlayMode === 'liked') {
                if (periodModal) {
                    modalTargetMode = currentPlayMode; // 현재 클릭한 모드 기억하기
                    modalViewDate = new Date(); // 현재 달력으로 초기화
                    rangeStartStr = null;
                    rangeEndStr = null;
                    
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

    // 🌟 4. 모달 - '전체 기간' 자동 선택 버튼
    if (selectAllPeriodBtn) {
        selectAllPeriodBtn.addEventListener('click', () => {
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            
            rangeStartStr = '2024.01.01'; // 앱 최초 시작일 기준으로 넉넉히 세팅
            rangeEndStr = `${y}.${m}.${d}`; // 오늘 날짜
            
            modalViewDate = new Date(); // 달력 뷰를 이번 달로 이동
            renderModalCalendar();
        });
    }

    // 5. 모달 - '다음' 버튼 (화면 전환 및 리스트 불러오기)
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

    // 6. 모달 - '뒤로' 버튼
    if (periodBackBtn) {
        periodBackBtn.addEventListener('click', () => {
            modalStep2.style.display = 'none';
            modalStep1.style.display = 'flex';
        });
    }

    // 7. 모달 - 캘린더 월 이동 버튼
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

    // 8. 모달 - 최종 재생하기 버튼
    if (periodPlayBtn) {
        periodPlayBtn.addEventListener('click', async () => {
            if (!rangeStartStr || !rangeEndStr) return;
            
            // loadCustomPreviewSongs에서 미리 세팅해둔 글로벌 리스트 사용
            const songsToPlay = window.tempLoadedSongs || [];
            if (songsToPlay.length === 0) {
                alert("선택한 기간 내에 재생할 노래가 없습니다.");
                return;
            }

            periodModal.style.display = 'none';
            
            try {
                const playedSongs = await fetchPlayedSongs();
                PlayAll.syncQueue(songsToPlay, playedSongs);
                PlayAll.startPlayAll(true); // 덮어쓰고 강제 재생
            } catch (err) {
                alert("재생 목록을 준비하는데 실패했습니다.");
            }
        });
    }
});

// ============================================================
// [2] 메인 캘린더 및 데이터 로드 기능
// ============================================================
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

// 달력 데이터 Fetch
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

// 그룹 카테고리 로드
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

// 메인 달력 그리기
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const headerText = document.getElementById("current-month-year");
    const listContainer = document.getElementById("selected-song-list");
    
    grid.innerHTML = ""; 
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
            showSongs(todaysSongs); 
        };
        grid.appendChild(dayEl);
    }
}

// ============================================================
// 하단 리스트 렌더링 (좋아요 하트 탑재)
// ============================================================
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
        
        const infoHtml = `
            <div class="info-area">
                <span class="user-name" style="font-weight: bold;">${song.userName}</span>
                <span class="user-id" style="font-size: 11px; color: #666;">@${song.loginId}</span>
                <span class="user-comment">"${song.comment}"</span>
                <span class="upload-time" style="font-size: 10px; color: #999;">${song.uploadTime}</span>
            </div>
        `;

        wrapper.innerHTML = `
            <div class="thumb-area" style="cursor: pointer; position: relative;">
                
                <div class="like-shine-overlay"></div>
                <button class="like-btn ${song.isLiked == 1 ? 'liked' : ''}" data-song-id="${song.songId}" aria-label="좋아요">
                    <i class="${song.isLiked == 1 ? 'fas' : 'far'} fa-heart"></i>
                </button>

                <img src="${song.thumb}" alt="thumbnail">
                <div class="video-overlay">
                    <div class="title">${song.videoTitle}</div>
                </div>
            </div>
            ${infoHtml}
        `;
        
        listContainer.appendChild(wrapper);

        const thumbArea = wrapper.querySelector('.thumb-area');
        const likeBtn = wrapper.querySelector('.like-btn');
        const shineOverlay = wrapper.querySelector('.like-shine-overlay');
        const heartIcon = likeBtn ? likeBtn.querySelector('i') : null;

        const toggleLike = async () => {
            if (!likeBtn) return;
            const isCurrentlyLiked = likeBtn.classList.contains('liked');
            
            // UI 즉시 반영
            if (!isCurrentlyLiked) {
                likeBtn.classList.add('liked');
                if (heartIcon) { heartIcon.classList.remove('far'); heartIcon.classList.add('fas'); }
                if (shineOverlay) {
                    shineOverlay.classList.add('active');
                    setTimeout(() => { if(shineOverlay) shineOverlay.classList.remove('active'); }, 1500);
                }
            } else {
                likeBtn.classList.remove('liked');
                if (heartIcon) { heartIcon.classList.remove('fas'); heartIcon.classList.add('far'); }
            }

            try {
                const res = await fetch('../php/api.php?action=toggle_like', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ song_id: song.songId })
                });
                const data = await res.json();
                if (data.success) {
                    song.isLiked = !isCurrentlyLiked ? 1 : 0; 
                } else { 
                    console.error("좋아요 처리 실패:", data.message); 
                }
            } catch (err) { console.error("서버 오류:", err); }
        };

        if (likeBtn) {
            likeBtn.onclick = (e) => { 
                e.stopPropagation(); 
                toggleLike(); 
            };
        }

        if (thumbArea) {
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
            const cancelPress = () => clearTimeout(pressTimer);
            
            thumbArea.addEventListener('touchstart', startPress, { passive: true });
            thumbArea.addEventListener('touchend', cancelPress);
            thumbArea.addEventListener('touchcancel', cancelPress);
            thumbArea.addEventListener('mousedown', startPress);
            thumbArea.addEventListener('mouseup', cancelPress);
            thumbArea.addEventListener('mouseleave', cancelPress);
            
            thumbArea.onclick = (e) => {
                if (e.target.closest('.like-btn')) return;
                if (isLongPressed) { e.preventDefault(); return; }
                PlayAll.playSpecificSong(song.songId);
            };
        }
    });
}

// 사이드바 이벤트
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
// [3] 모달 달력 및 미리보기 로직
// ============================================================

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

    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="modal-day empty"></div>`;
    }

    for (let d = 1; d <= lastDate; d++) {
        const dateStr = `${year}.${String(month + 1).padStart(2, '0')}.${String(d).padStart(2, '0')}`;
        const dayEl = document.createElement("div");
        dayEl.className = "modal-day";
        dayEl.innerText = d;

        if (rangeStartStr === dateStr) {
            dayEl.classList.add("range-start");
        }
        if (rangeEndStr === dateStr) {
            dayEl.classList.add("range-end");
        }
        if (rangeStartStr && rangeEndStr && dateStr > rangeStartStr && dateStr < rangeEndStr) {
            dayEl.classList.add("in-range");
        }

        dayEl.onclick = () => handleModalDayClick(dateStr);
        grid.appendChild(dayEl);
    }

    if (rangeStartStr && rangeEndStr) {
        rangeText.innerText = `${rangeStartStr} ~ ${rangeEndStr}`;
    } else if (rangeStartStr) {
        rangeText.innerText = `${rangeStartStr} ~ (종료일 선택)`;
    } else {
        rangeText.innerText = `기간을 선택해주세요`;
    }
}

function handleModalDayClick(dateStr) {
    if (!rangeStartStr || (rangeStartStr && rangeEndStr)) {
        rangeStartStr = dateStr;
        rangeEndStr = null;
    } else {
        if (dateStr < rangeStartStr) {
            rangeStartStr = dateStr;
        } else {
            rangeEndStr = dateStr;
        }
    }
    renderModalCalendar();
}

async function loadCustomPreviewSongs(start, end) {
    const previewList = document.getElementById('periodPreviewList');
    if (!previewList) return;

    previewList.innerHTML = '<div style="text-align:center; color:#888; font-size:13px; padding:20px 0;">노래를 불러오는 중...</div>';
    
    // 글로벌 큐에 임시 저장할 배열
    window.tempLoadedSongs = [];

    try {
        let rawSongs = [];

        // 1) 기간별 모드일 때
        if (modalTargetMode === 'period') {
            const url = `../php/fetch_period_songs.php?group_id=${selectedGroupId}&start=${start}&end=${end}`;
            const res = await fetch(url);
            const data = await res.json();
            rawSongs = data.songs || data;

        // 2) 좋아요 모드일 때 (전체 좋아요 리스트를 불러와서 클라이언트 단에서 날짜로 자르기)
        } else if (modalTargetMode === 'liked') {
            const res = await fetch('../php/api.php?action=get_liked_songs');
            const data = await res.json();
            if (data.success && data.liked_songs) {
                // 지정된 날짜 사이에 있는 좋아요 곡만 남기기
                rawSongs = data.liked_songs.filter(s => {
                    const d = s.log_date.replace(/-/g, '.');
                    return d >= start && d <= end;
                }).map(s => {
                    // 🔥 썸네일 URL (https://img.youtube.com/vi/영상ID/0.jpg)에서 11자리 비디오 ID 직접 추출
                    let extractedId = null;
                    if (s.thumbnail_img && s.thumbnail_img.includes('/vi/')) {
                        extractedId = s.thumbnail_img.split('/vi/')[1].substring(0, 11);
                    }
                    
                    return {
                        songId: s.song_id,
                        videoId: extractedId, // 🌟 제대로 된 영상 ID를 넣어줍니다
                        videoTitle: s.title,
                        thumb: s.thumbnail_img,
                        loginId: s.recommender_id,
                        uploadDate: s.log_date.replace(/-/g, '.')
                    };
                });
            }
        }

        if (!Array.isArray(rawSongs) || rawSongs.length === 0) {
            previewList.innerHTML = '<div style="text-align:center; color:#888; font-size:13px; padding:20px 0;">해당 기간에 포함된 노래가 없습니다.</div>';
            return;
        }

        window.tempLoadedSongs = rawSongs; // 최종 큐 등록용으로 저장

        previewList.innerHTML = '';
        rawSongs.forEach(song => {
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


// ============================================================
// [4] 서버 재생기록 연동 및 PlayAll 모듈
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

    // 🌟 URL에서 비디오 아이디 추출 (외부 호출 가능하도록 세팅)
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

                if ($miniPlayer) {
                    $miniPlayer.classList.add('show');
                    $miniPlayer.setAttribute('aria-hidden', 'false');
                    $miniPlayer.removeAttribute('inert');

                    if (isExpanded) {
                        $miniPlayer.style.transition = 'none';
                        $miniPlayer.classList.add('expanded');
                        setTimeout(() => { $miniPlayer.style.transition = ''; }, 50);
                        renderQueueList();
                    }
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
                playerVars: { 
                    autoplay: 0, 
                    controls: 1, 
                    playsinline: 1,
                    origin: window.location.origin
                },
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
            videoId: s.videoId || extractYouTubeID(s.youtube_url || s.url), 
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
                showToastSafe('리스트가 갱신되었습니다.');
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
        
        if ($miniPlayer) {
            $miniPlayer.classList.add('show');
            $miniPlayer.setAttribute('aria-hidden', 'false');
            $miniPlayer.removeAttribute('inert');
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

    return { init, syncQueue, startPlayAll, playSpecificSong, extractYouTubeID };
})();