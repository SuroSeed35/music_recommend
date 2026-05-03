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
                
                // 프로필 정보 매핑
                document.getElementById('displayId').innerText = data.username || "이름 없음";
                
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
                bio: updatedBio
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // 저장 성공 시 화면의 텍스트들을 즉시 갱신
                displayId.innerText = updatedUsername;
                displayLoginId.innerText = `@${updatedLoginId}`;
                displayStatus.innerText = updatedBio;
                
                editModal.classList.add('hidden');
                showModal("프로필이 성공적으로 저장되었습니다.");
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

// --- [7] 특정 날짜 노래 정보 로드 함수 ---
function loadSongForDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

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
            }
        })
        .catch(err => console.error("날짜별 노래 로드 에러:", err));
}