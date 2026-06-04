document.addEventListener('DOMContentLoaded', () => {
    let attendanceData = []; 
    let currentDate = new Date(); 

    const confirmModal = document.getElementById('confirmModal');
    const modalMsg = document.getElementById('modalMsg');
    const weekDaysContainer = document.getElementById('weekDays');
    const calendarMonth = document.getElementById('calendarMonth');
    const contributionGrid = document.getElementById('contributionGrid');
    const backBtn = document.getElementById("backToMain");
    const logoutBtn = document.getElementById('logout-btn');
    
    const logoutConfirmModal = document.getElementById('logoutConfirmModal');
    const logoutCancelBtn = document.getElementById('logoutCancelBtn');
    const logoutProceedBtn = document.getElementById('logoutProceedBtn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => logoutConfirmModal.classList.remove('hidden'));
    }

    if (typeof PlayAll !== 'undefined') PlayAll.init();

    if (logoutCancelBtn) {
        logoutCancelBtn.addEventListener('click', () => logoutConfirmModal.classList.add('hidden'));
    }

    if (logoutProceedBtn) {
        logoutProceedBtn.addEventListener('click', () => {
            logoutConfirmModal.classList.add('hidden');
            fetch('../php/logout.php')
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        showModal("로그아웃 되었습니다.");
                        setTimeout(() => { window.location.href = 'login.html'; }, 1200);
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
        backBtn.onclick = () => { location.href = "../html/music_list.html"; };
    }

    function showModal(msg) {
        if (modalMsg) modalMsg.innerText = msg;
        if (confirmModal) confirmModal.classList.remove('hidden');
    }
    
    function loadUserData() {
        fetch('../php/mypage_api.php')
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    if (data.error === "Unauthorized") {
                        window.location.replace("login.html");
                    } else {
                        console.error(data.error);
                    }
                    return;
                }
                
                const userNameText = data.username || "이름 없음";
                const lockIconHtml = (data.is_private == 1) ? `<img src="../img/lock.png" alt="비공개" style="width:20px; height:20px; margin-right:6px; vertical-align:middle;">` : '';
                
                const displayIdEl = document.getElementById('displayId');
                if (displayIdEl) {
                    displayIdEl.innerHTML = `${lockIconHtml}<span id="pureUsername">${userNameText}</span>`;
                }
                
                const privateCheckbox = document.getElementById('editPrivate');
                if (privateCheckbox) privateCheckbox.checked = (data.is_private == 1);

                const displayLoginIdEl = document.getElementById('displayLoginId');
                if (displayLoginIdEl) displayLoginIdEl.innerText = data.login_id ? `@${data.login_id}` : "@아이디 없음";

                const displayStatusEl = document.getElementById('displayStatus');
                if (displayStatusEl) displayStatusEl.innerText = data.bio || "소개글이 없습니다.";

                const ddayText = document.querySelector('.dday-text');
                if (ddayText) ddayText.innerText = data.dday ? `D+${data.dday}` : "D+1";

                if (data.youtube_url) { 
                    const recMsg = document.getElementById('recommendMsg');
                    if (recMsg) recMsg.innerText = data.daily_comment || "작성된 한 줄 소감이 없습니다.";
                    
                    const ytUrl = document.getElementById('youtubeUrl');
                    if (ytUrl) ytUrl.value = data.youtube_url;

                    updatePencilVisibility(true, true);
                    
                    const vLink = document.getElementById('videoLink');
                    if (vLink) vLink.href = data.youtube_url;
                    
                    const tImg = document.getElementById('thumbImg');
                    if (tImg && data.thumbnail_img) tImg.src = data.thumbnail_img;
                }

                if (data.attendance_list) {
                    attendanceData = data.attendance_list;
                    renderGrid(); 
                    renderWeek(currentDate); 
                }
            })
            .catch(err => console.error("데이터 로드 에러:", err));
    }

    loadUserData();

    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');
    const editModal = document.getElementById('editModal');

    const inputUsername = document.getElementById('editUsername');
    const inputLoginId = document.getElementById('editLoginId');
    const inputStatus = document.getElementById('editStatus');

    if (editBtn) {
        editBtn.onclick = () => {
            const pureName = document.getElementById('pureUsername');
            inputUsername.value = pureName ? pureName.innerText : (document.getElementById('displayId').innerText || '');
            
            const displayLoginIdEl = document.getElementById('displayLoginId');
            inputLoginId.value = displayLoginIdEl ? displayLoginIdEl.innerText.replace('@', '') : ''; 
            
            const displayStatusEl = document.getElementById('displayStatus');
            inputStatus.value = displayStatusEl ? displayStatusEl.innerText : '';
            
            if (editModal) editModal.classList.remove('hidden');
        };
    }

    if (saveBtn) {
        saveBtn.onclick = () => {
            const updatedUsername = inputUsername.value;
            const updatedLoginId = inputLoginId.value;
            const updatedBio = inputStatus.value;
            const isPrivateChecked = document.getElementById('editPrivate').checked;

            fetch('../php/mypage_update.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: updatedUsername,
                    login_id: updatedLoginId,
                    bio: updatedBio, 
                    is_private: isPrivateChecked ? 1 : 0
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const newLockHtml = isPrivateChecked ? `<img src="../img/lock.png" alt="비공개" style="width:20px; height:20px; margin-right:6px; vertical-align:middle;">` : '';
                    const displayIdEl = document.getElementById('displayId');
                    if (displayIdEl) displayIdEl.innerHTML = `${newLockHtml}<span id="pureUsername">${updatedUsername}</span>`;
                    
                    const displayLoginIdEl = document.getElementById('displayLoginId');
                    if (displayLoginIdEl) displayLoginIdEl.innerText = `@${updatedLoginId}`;
                    
                    const displayStatusEl = document.getElementById('displayStatus');
                    if (displayStatusEl) displayStatusEl.innerText = updatedBio;
                    
                    if (editModal) editModal.classList.add('hidden');
                    showModal("프로필이 변경되었습니다.");
                } else {
                    alert(data.message || "저장에 실패했습니다."); 
                }
            })
            .catch(err => {
                console.error("저장 중 오류 발생:", err);
                alert("서버 통신 중 오류가 발생했습니다.");
            });
        };
    }

    const closeEditBtn = document.querySelector('.close-edit-x-btn');
    if (closeEditBtn) closeEditBtn.onclick = () => { if (editModal) editModal.classList.add('hidden'); };

    const editCommentBtn = document.getElementById('editCommentBtn');
    const commentEditModal = document.getElementById('commentEditModal');
    const editCommentInput = document.getElementById('editComment');
    const saveCommentBtn = document.getElementById('saveCommentBtn');
    const commentCharCount = document.getElementById('commentCharCount');
    const closeCommentBtn = document.querySelector('.close-comment-x-btn');
    const recommendMsgEl = document.getElementById('recommendMsg');

    if (editCommentBtn) {
        editCommentBtn.onclick = () => {
            const current = recommendMsgEl ? recommendMsgEl.innerText : '';
            const placeholderTexts = ['노래 정보를 불러오는 중...', '작성된 한 줄 소감이 없습니다.'];
            editCommentInput.value = placeholderTexts.includes(current) ? '' : current;
            if (commentCharCount) commentCharCount.innerText = `${editCommentInput.value.length} / 50자`;
            if (commentEditModal) commentEditModal.classList.remove('hidden');
        };
    }

    if (editCommentInput && commentCharCount) {
        editCommentInput.addEventListener('input', () => {
            commentCharCount.innerText = `${editCommentInput.value.length} / 50자`;
        });
    }

    if (closeCommentBtn) {
        closeCommentBtn.onclick = () => { if (commentEditModal) commentEditModal.classList.add('hidden'); };
    }

    if (commentEditModal) {
        commentEditModal.onclick = (e) => {
            if (e.target === commentEditModal) {
                commentEditModal.classList.add('hidden');
            }
        };
    }

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
                    if (recommendMsgEl) recommendMsgEl.innerText = newComment || "작성된 한 줄 소감이 없습니다.";
                    if (commentEditModal) commentEditModal.classList.add('hidden');
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
                scrollWrapper.scrollTo({ left: scrollWrapper.scrollWidth, behavior: 'smooth' });
            }, 300); 
        }
    }

    const ddayBanner = document.getElementById('ddayBanner');
    const ddayContent = document.getElementById('ddayContent');
    const attendanceContent = document.getElementById('attendanceContent');

    if (ddayBanner) {
        ddayBanner.onclick = (e) => {
            if (!e.target.classList.contains('grass-box')) {
                if (ddayContent) ddayContent.classList.toggle('hidden');
                if (attendanceContent) {
                    const isAttendanceVisible = !attendanceContent.classList.toggle('hidden');
                    if (isAttendanceVisible) {
                        const scrollWrapper = document.querySelector('.scroll-wrapper');
                        if (scrollWrapper) {
                            setTimeout(() => { scrollWrapper.scrollLeft = scrollWrapper.scrollWidth; }, 50); 
                        }
                    }
                }
            }
        };
    }

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
    if (modalConfirmBtn) modalConfirmBtn.onclick = () => { if(confirmModal) confirmModal.classList.add('hidden'); };
    if (modalCloseX) modalCloseX.onclick = () => { if(confirmModal) confirmModal.classList.add('hidden'); };
});

function updatePencilVisibility(hasSong, isToday) {
    const penBtn = document.getElementById('editCommentBtn');
    if (!penBtn) return;
    penBtn.style.display = (hasSong && isToday) ? 'block' : 'none';
}

function loadSongForDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

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

                updatePencilVisibility(true, isToday);
            }
        })
        .catch(err => console.error("날짜별 노래 로드 에러:", err));
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
        isPlaying = false; currentIndex = -1; queue = []; isFloating = false;
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
                dragStartX = touch.clientX; dragStartY = touch.clientY;
                initialLeft = touch.clientX - 32; initialTop = touch.clientY - 32;
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
                $miniPlayer.style.left = ''; $miniPlayer.style.top = ''; $miniPlayer.style.transform = '';
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
            pendingStart = true; pendingTime = 0; renderMiniPlayer(); setPlayingUI(true); return;
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
// 🔥 마이페이지 - 내가 좋아요한 노래 모달 기능 (맨 아래 추가)
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    const openLikedBtn = document.getElementById('openLikedModalBtn');
    const closeLikedBtn = document.getElementById('closeLikedModalBtn');
    const likedOverlay = document.getElementById('likedModalOverlay');
    const likedContainer = document.getElementById('likedSongsContainer');

    // 1. HTML 요소들이 정상적으로 있는지 확인
    if (openLikedBtn && closeLikedBtn && likedOverlay) {
        
        // 모달 열기 버튼 클릭 시
        openLikedBtn.addEventListener('click', () => {
            likedOverlay.classList.add('show');
            loadLikedSongs(); // 데이터 로드
        });

        // 모달 닫기 버튼(X) 클릭 시
        closeLikedBtn.addEventListener('click', () => {
            likedOverlay.classList.remove('show');
        });

        // 모달 바깥 어두운 배경 클릭 시 닫기
        likedOverlay.addEventListener('click', (e) => {
            if (e.target === likedOverlay) {
                likedOverlay.classList.remove('show');
            }
        });
        
    } else {
        console.error("❌ 좋아요 모달 관련 HTML 요소를 찾을 수 없습니다. HTML에 ID가 제대로 들어갔는지 확인해주세요.");
    }

    // 2. 서버에서 좋아요 리스트 가져와서 그리기
    async function loadLikedSongs() {
        if (!likedContainer) return;
        likedContainer.innerHTML = '<div class="liked-empty">불러오는 중...</div>';
        
        try {
            const res = await fetch('../php/api.php?action=get_liked_songs');
            const data = await res.json();
            
            if (!data.success) {
                likedContainer.innerHTML = '<div class="liked-empty">오류가 발생했습니다.</div>';
                return;
            }

            if (!data.liked_songs || data.liked_songs.length === 0) {
                likedContainer.innerHTML = '<div class="liked-empty">아직 좋아요한 노래가 없습니다.</div>';
                return;
            }

            likedContainer.innerHTML = ''; // 초기화
            data.liked_songs.forEach(song => {
                const item = document.createElement('div');
                item.className = 'liked-song-item';
                
                // 🌟 [수정 핵심] 리스트 누르면 해당 날짜 캘린더 페이지(calendar.html)로 점프!
                item.onclick = () => {
                    window.location.href = `calendar.html?date=${song.log_date}`; 
                };

                item.innerHTML = `
                    <div class="liked-song-thumb">
                        <img src="${song.thumbnail_img}" alt="thumb">
                    </div>
                    <div class="liked-song-info">
                        <div class="liked-song-title">${song.title}</div>
                        <div class="liked-song-date">${song.log_date.replace(/-/g, '.')}</div>
                    </div>
                    <div class="liked-song-recommender">@${song.recommender_id}</div>
                `;
                likedContainer.appendChild(item);
            });
        } catch (err) {
            console.error("좋아요 목록 로드 실패:", err);
            likedContainer.innerHTML = '<div class="liked-empty">서버와 통신할 수 없습니다.</div>';
        }
    }
});