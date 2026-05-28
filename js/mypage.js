document.addEventListener('DOMContentLoaded', () => {
    // --- [1] 전역 변수 및 초기 설정 ---
    let attendanceData = []; 
    let currentDate = new Date(); 

    const confirmModal = document.getElementById('confirmModal');
    const modalMsg = document.getElementById('modalMsg');
    const weekDaysContainer = document.getElementById('weekDays');
    const calendarMonth = document.getElementById('calendarMonth');
    const contributionGrid = document.getElementById('contributionGrid');
    const backBtn = document.getElementById("backToMain");
    const logoutBtn = document.getElementById('logout-btn');
    // --- [모달 요소 가져오기] ---
    const logoutConfirmModal = document.getElementById('logoutConfirmModal');
    const logoutCancelBtn = document.getElementById('logoutCancelBtn');
    const logoutProceedBtn = document.getElementById('logoutProceedBtn');

    // --- [로그아웃 흐름 제어] ---
    if (logoutBtn) {
        // 1. 마이페이지에서 로그아웃 버튼 클릭 시 -> 모달 띄우기
        logoutBtn.addEventListener('click', () => {
            logoutConfirmModal.classList.remove('hidden');
        });
    }

    if (typeof PlayAll !== 'undefined') PlayAll.init();

    if (logoutCancelBtn) {
        // 2. 모달에서 '취소' 클릭 시 -> 모달 닫기
        logoutCancelBtn.addEventListener('click', () => {
            logoutConfirmModal.classList.add('hidden');
        });
    }

    if (logoutProceedBtn) {
        // 3. 모달에서 '로그아웃' 클릭 시 -> 진짜 로그아웃 실행
        logoutProceedBtn.addEventListener('click', () => {
            logoutConfirmModal.classList.add('hidden'); // 일단 모달 닫기

            // php 서버로 통신
            fetch('../php/logout.php')
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        // 성공 시 기존에 만들어둔 1버튼 알림 모달 사용
                        showModal("로그아웃 되었습니다.");
                        
                        // 모달 메시지를 읽을 수 있도록 1.2초 대기 후 로그인 창으로 자동 이동
                        setTimeout(() => {
                            window.location.href = 'login.html'; 
                        }, 1200);
                    } else {
                        showModal('로그아웃 처리에 실패했습니다. 다시 시도해 주세요.');
                    }
                })
                .catch(error => {
                    console.error('Error during logout:', error);
                    showModal('서버와 통신 중 오류가 발생했습니다.');
                });
        });
    }
    
    if (backBtn) {
        backBtn.onclick = () => {
            // 프로젝트 구조에 맞게 메인 페이지 경로를 확인하세요.
            location.href = "../html/music_list.html";
        };
    }

    // 공통 알림 모달 표시 함수
    function showModal(msg) {
        modalMsg.innerText = msg;
        confirmModal.classList.remove('hidden');
    }
    

    // --- [2] 서버 데이터 로드 로직 ---
    function loadUserData() {
        fetch('../php/mypage_api.php')
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    console.error(data.error);
                    return;
                }
                
                const userNameText = data.username || "이름 없음";
                const lockIconHtml = (data.is_private == 1) ? `<img src="../img/lock.png" alt="비공개" style="width:20px; height:20px; margin-right:6px; vertical-align:middle;">` : '';
                document.getElementById('displayId').innerHTML = `${lockIconHtml}${userNameText}`;
                
                // 체크박스 상태 불러오기
                const privateCheckbox = document.getElementById('editPrivate');
                if (privateCheckbox) {
                    privateCheckbox.checked = (data.is_private == 1);
                }

                // 🔥 새로 추가한 로그인 아이디 매핑! (DB에 login_id가 있다면 앞쪽에 @를 붙여서 출력)
                const displayLoginIdEl = document.getElementById('displayLoginId');

                if (displayLoginIdEl) {
                    displayLoginIdEl.innerText = data.login_id ? `@${data.login_id}` : "@아이디 없음";
                }

                document.getElementById('displayStatus').innerText = data.bio || "소개글이 없습니다.";

                // 디데이 매핑
                const ddayText = document.querySelector('.dday-text');
                if (ddayText) {
                    ddayText.innerText = data.dday ? `D+${data.dday}` : "D+1";
                }

                // 노래 정보 매핑 (오늘 데이터)
                if (data.youtube_url) { 
                    document.getElementById('recommendMsg').innerText = data.daily_comment || "작성된 한 줄 소감이 없습니다.";
                    document.getElementById('youtubeUrl').value = data.youtube_url;

                    updatePencilVisibility(true, true);
                    
                    if (document.getElementById('videoLink')) {
                        document.getElementById('videoLink').href = data.youtube_url;
                    }
                    if (document.getElementById('thumbImg') && data.thumbnail_img) {
                        document.getElementById('thumbImg').src = data.thumbnail_img;
                    }
                }

                // 서버에서 받은 출석 리스트를 변수에 담고 UI 갱신
                if (data.attendance_list) {
                    attendanceData = data.attendance_list;
                    renderGrid(); 
                    renderWeek(currentDate); 
                }
            })
            .catch(err => console.error("데이터 로드 에러:", err));
    }

    // 초기 데이터 호출
    loadUserData();

    // --- [3] 프로필 수정 및 DB 저장 로직 ---
    // --- [3] 프로필 수정 및 DB 저장 로직 수정 ---
    const editBtn = document.getElementById('editBtn');
const saveBtn = document.getElementById('saveBtn');
const editModal = document.getElementById('editModal');

const displayId = document.getElementById('displayId'); 
const displayLoginId = document.getElementById('displayLoginId'); 
const displayStatus = document.getElementById('displayStatus');

const inputUsername = document.getElementById('editUsername');
const inputLoginId = document.getElementById('editLoginId');
const inputStatus = document.getElementById('editStatus');

// [수정 버튼 클릭 시] 기존 정보를 입력창에 로드
if (editBtn) {
    editBtn.onclick = () => {
        inputUsername.value = displayId.innerText;
        // @ 기호를 제외한 순수 아이디만 가져오기
        inputLoginId.value = displayLoginId.innerText.replace('@', ''); 
        inputStatus.value = displayStatus.innerText;
        editModal.classList.remove('hidden');
    };
}

// [저장 버튼 클릭 시] 서버로 데이터 전송 (중복 로직 통합 버전)
if (saveBtn) {
    saveBtn.onclick = () => {
        const updatedUsername = inputUsername.value;
        const updatedLoginId = inputLoginId.value;
        const updatedBio = inputStatus.value;

        fetch('../php/mypage_update.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: updatedUsername,
                login_id: updatedLoginId,
                bio: updatedBio, // 👈 콤마 잊지 마세요!
                is_private: document.getElementById('editPrivate').checked ? 1 : 0
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // 저장 성공 시 화면의 텍스트들을 즉시 갱신
                const isPrivateChecked = document.getElementById('editPrivate').checked;
                const newLockHtml = isPrivateChecked ? `<img src="../img/lock.png" alt="비공개" style="width:20px; height:20px; margin-right:6px; vertical-align:middle;">` : '';
                displayId.innerHTML = `${newLockHtml}${updatedUsername}`;
                displayLoginId.innerText = `@${updatedLoginId}`;
                displayStatus.innerText = updatedBio;
                
                editModal.classList.add('hidden');
                showModal("프로필이 변경되었습니다.");
            } else {
                // 중복 아이디 등 서버에서 보낸 에러 메시지 알림
                alert(data.message || "저장에 실패했습니다."); 
            }
        })
        .catch(err => {
            console.error("저장 중 오류 발생:", err);
            alert("서버 통신 중 오류가 발생했습니다.");
        });
    };
}

// 모달 닫기 버튼 로직
const closeEditBtn = document.querySelector('.close-edit-x-btn');
if (closeEditBtn) closeEditBtn.onclick = () => editModal.classList.add('hidden');
    // --- [3-1] 오늘의 한마디 수정 로직 ---
    const editCommentBtn = document.getElementById('editCommentBtn');
    const commentEditModal = document.getElementById('commentEditModal');
    const editCommentInput = document.getElementById('editComment');
    const saveCommentBtn = document.getElementById('saveCommentBtn');
    const commentCharCount = document.getElementById('commentCharCount');
    const closeCommentBtn = document.querySelector('.close-comment-x-btn');
    const recommendMsgEl = document.getElementById('recommendMsg');

    // 연필 클릭 → 현재 한마디를 입력창에 채우고 모달 열기
    if (editCommentBtn) {
        editCommentBtn.onclick = () => {
            const current = recommendMsgEl ? recommendMsgEl.innerText : '';
            // 안내 문구가 떠 있는 경우엔 빈 값으로 시작
            const placeholderTexts = [
                '노래 정보를 불러오는 중...',
                '작성된 한 줄 소감이 없습니다.'
            ];
            editCommentInput.value = placeholderTexts.includes(current) ? '' : current;
            commentCharCount.innerText = `${editCommentInput.value.length} / 50자`;
            commentEditModal.classList.remove('hidden');
        };
    }

    // 글자 수 카운터
    if (editCommentInput) {
        editCommentInput.addEventListener('input', () => {
            commentCharCount.innerText = `${editCommentInput.value.length} / 50자`;
        });
    }

    // 모달 닫기 (X 버튼)
    if (closeCommentBtn) {
        closeCommentBtn.onclick = () => commentEditModal.classList.add('hidden');
    }

    if (commentEditModal) {
        commentEditModal.onclick = (e) => {
            if (e.target === commentEditModal) {
                commentEditModal.classList.add('hidden');
            }
        };
    }

    // 저장 버튼 → 서버 전송
    if (saveCommentBtn) {
        saveCommentBtn.onclick = () => {
            const newComment = editCommentInput.value.trim();

            fetch('../php/update_comment.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ daily_comment: newComment })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    recommendMsgEl.innerText = newComment || "작성된 한 줄 소감이 없습니다.";
                    commentEditModal.classList.add('hidden');
                    showModal("오늘의 한마디가 수정되었습니다.");
                } else {
                    alert(data.message || "수정에 실패했습니다.");
                }
            })
            .catch(err => {
                console.error("한마디 수정 중 오류:", err);
                alert("서버 통신 중 오류가 발생했습니다.");
            });
        };
    }

    // --- [4] 잔디 그리드(기여도) 로직 ---
    function renderGrid() {
        if (!contributionGrid) return;
        contributionGrid.innerHTML = '';
        const today = new Date();
        const totalDays = 800; 
        
        let lastYear = null;
        let currentColumn = null;

        for (let i = 0; i < totalDays; i++) {
            const boxDate = new Date();
            boxDate.setDate(today.getDate() - (totalDays - 1 - i));
            const year = boxDate.getFullYear();
            const dateStr = boxDate.toISOString().split('T')[0];

            if (year !== lastYear) {
                const yearLabel = document.createElement('div');
                yearLabel.className = 'year-label';
                yearLabel.innerText = `${year}`;
                contributionGrid.appendChild(yearLabel);
                lastYear = year;
                currentColumn = null;
            }

            if (i % 5 === 0 || !currentColumn) {
                currentColumn = document.createElement('div');
                currentColumn.className = 'grass-column';
                contributionGrid.appendChild(currentColumn);
            }

            const box = document.createElement('div');
            box.className = 'grass-box';
            if (attendanceData.includes(dateStr)) box.classList.add('active'); 
            
            box.onclick = (e) => {
                e.stopPropagation(); 
                const status = attendanceData.includes(dateStr) ? "추천 완료" : "기록 없음";
                showModal(`${dateStr} : ${status}`);
            };
            currentColumn.appendChild(box);
        }
        
        const scrollWrapper = document.querySelector('.scroll-wrapper');
        if (scrollWrapper) {
            setTimeout(() => {
                scrollWrapper.scrollTo({
                    left: scrollWrapper.scrollWidth,
                    behavior: 'smooth' 
                });
            }, 300); 
        }
    }

    const ddayBanner = document.getElementById('ddayBanner');
    const ddayContent = document.getElementById('ddayContent');
    const attendanceContent = document.getElementById('attendanceContent');

    if (ddayBanner) {
        ddayBanner.onclick = (e) => {
            if (!e.target.classList.contains('grass-box')) {
                const isDdayHidden = ddayContent.classList.toggle('hidden');
                const isAttendanceVisible = attendanceContent.classList.toggle('hidden');

                if (!isAttendanceVisible) {
                    const scrollWrapper = document.querySelector('.scroll-wrapper');
                    if (scrollWrapper) {
                        setTimeout(() => {
                            scrollWrapper.scrollLeft = scrollWrapper.scrollWidth;
                        }, 50); 
                    }
                }
            }
        };
    }

    // --- [5] 주간 달력 로직 ---
    function renderWeek(baseDate) {
        if(!weekDaysContainer || !calendarMonth) return;
        weekDaysContainer.innerHTML = '';
        const startOfWeek = new Date(baseDate);
        startOfWeek.setDate(baseDate.getDate() - baseDate.getDay()); 
        calendarMonth.innerText = `${startOfWeek.getFullYear()}년 ${startOfWeek.getMonth() + 1}월`;

        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            
            const y = day.getFullYear();
            const m = String(day.getMonth() + 1).padStart(2, '0');
            const d = String(day.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;

            const dayCell = document.createElement('div');
            dayCell.className = 'day-cell';
            dayCell.innerText = day.getDate();
            
            if (attendanceData.includes(dateStr)) {
                dayCell.classList.add('attended');
            }
            
            if (day.toDateString() === baseDate.toDateString()) {
                dayCell.classList.add('selected');
                loadSongForDate(day); 
            }

            dayCell.onclick = () => {
                document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('selected'));
                dayCell.classList.add('selected');
                loadSongForDate(day);
            };
            weekDaysContainer.appendChild(dayCell);
        }
    }
    
    const prevWeekBtn = document.getElementById('prevWeek');
    const nextWeekBtn = document.getElementById('nextWeek');
    if (prevWeekBtn) prevWeekBtn.onclick = () => { currentDate.setDate(currentDate.getDate() - 7); renderWeek(currentDate); };
    if (nextWeekBtn) nextWeekBtn.onclick = () => { currentDate.setDate(currentDate.getDate() + 7); renderWeek(currentDate); };

    // --- [6] 링크 복사 기능 ---
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.onclick = () => {
            const urlInput = document.getElementById('youtubeUrl');
            if (urlInput) {
                urlInput.select();
                document.execCommand('copy'); 
                showModal("링크가 복사되었습니다.");
            }
        };
    }

    const modalConfirmBtn = document.querySelector('#confirmModal .confirm-btn');
    const modalCloseX = document.querySelector('#confirmModal .close-x-btn');
    if (modalConfirmBtn) modalConfirmBtn.onclick = () => confirmModal.classList.add('hidden');
    if (modalCloseX) modalCloseX.onclick = () => confirmModal.classList.add('hidden');
});

function updatePencilVisibility(hasSong, isToday) {
    const penBtn = document.getElementById('editCommentBtn');
    if (!penBtn) return;
    // 오늘 + 노래 있음 일 때만 연필 노출 (오늘 곡만 수정 가능하므로)
    penBtn.style.display = (hasSong && isToday) ? 'block' : 'none';
}

// --- [7] 특정 날짜 노래 정보 로드 함수 ---
function loadSongForDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    // 보고 있는 날짜가 '진짜 오늘'인지 판별
    const realToday = new Date();
    const isToday = (dateObj.toDateString() === realToday.toDateString());

    fetch(`../php/mypage_date_api.php?date=${dateStr}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) return;

            const cardEl = document.getElementById('recommendationCard');
            let emptyMsgEl = document.getElementById('emptyDateMsg');

            if (!emptyMsgEl && cardEl) {
                emptyMsgEl = document.createElement('div');
                emptyMsgEl.id = 'emptyDateMsg';
                emptyMsgEl.style.textAlign = 'center';
                emptyMsgEl.style.color = '#999';
                emptyMsgEl.style.padding = '40px 0';
                emptyMsgEl.style.fontWeight = '500';
                cardEl.parentNode.insertBefore(emptyMsgEl, cardEl);
            }

            if (data.message === "no_data") {
                if (cardEl) cardEl.style.display = 'none';
                if (emptyMsgEl) {
                    emptyMsgEl.innerText = "이 날 추천한 노래가 없습니다.";
                    emptyMsgEl.style.display = 'block';
                }
                // 노래 없음 → 연필 숨김
                updatePencilVisibility(false, isToday);
            } else {
                if (emptyMsgEl) emptyMsgEl.style.display = 'none';
                if (cardEl) cardEl.style.display = 'block';

                const msgEl = document.getElementById('recommendMsg');
                const urlInput = document.getElementById('youtubeUrl');
                const videoLink = document.getElementById('videoLink');
                const thumbImg = document.getElementById('thumbImg');

                if (msgEl) msgEl.innerText = data.daily_comment || "작성된 한 줄 소감이 없습니다.";
                if (urlInput) urlInput.value = data.youtube_url;
                if (videoLink) videoLink.href = data.youtube_url;
                if (thumbImg) thumbImg.src = data.thumbnail_img;

                // 노래 있음 + 오늘일 때만 연필 노출
                updatePencilVisibility(true, isToday);
            }
        })
        .catch(err => console.error("날짜별 노래 로드 에러:", err));
}

async function fetchPlayedSongs() {
    try {
        const response = await fetch('../php/api.php?action=get_played_history'); 
        if (!response.ok) return [];
        const text = await response.text();
        return text ? (JSON.parse(text).playedSongs || []) : []; 
    } catch (error) { return []; }
}
async function savePlayedSong(songId) {
    try {
        const response = await fetch('../php/api.php?action=save_played_history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song_id: songId })
        });
        if (response.ok) {
            // 음악 리스트 화면에서의 체크마크 동기화
            const songCard = document.querySelector(`.song-card[data-song-id="${songId}"]`);
            if (songCard) {
                songCard.classList.add('played');
                const mark = songCard.querySelector('.complete-mark');
                if (mark) mark.style.display = 'flex';
            }
        }
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
    let playedSongIds = new Set();
    let isFloating = false;
    let $playAllBtn, $miniPlayer, $title, $sub, $thumb, $prev, $next, $playPause, $playPauseIcon, $queueList;
    let isDragging = false, dragStartX = 0, dragStartY = 0, initialLeft = 0, initialTop = 0;
    let isFloating = false;

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

    function stopAll() {
        try { player && player.stopVideo(); } catch (e) {}
        isPlaying = false; currentIndex = -1; queue = [];
        isFloating = false; // 🔥 플로팅 초기화 추가
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