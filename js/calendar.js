let viewDate = new Date(); 
let currentMonthSongs = []; // DB에서 가져온 이번 달 노래들을 저장할 전역 변수
let selectedGroupId = 0; // 🔥 선택된 그룹 ID 기본값을 0(나)으로 설정
let selectedDateStr = null;

document.addEventListener("DOMContentLoaded", async () => {
    // 1. 그룹 카테고리를 먼저 로드 (비동기 처리로 초기 그룹 ID 설정 대기)
    await loadGroupCategories(); 
    
    // 2. 그룹 ID가 설정된 후 달력 데이터 가져오기
    fetchAndRenderCalendar(true);
    
    setupEventListeners();

    // 월 이동 버튼 이벤트
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
            location.href = "../html/main.html"; // 메인 페이지 경로 확인 필요
        };
    }

    // 년.월 헤더 클릭 시 오늘 날짜로 이동
    const headerText = document.getElementById("current-month-year");
    if (headerText) {
        headerText.onclick = () => {
            viewDate = new Date();
            fetchAndRenderCalendar();
        };
    }

    // --- 드롭다운 열기/닫기 로직 ---
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

    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener("click", () => {
        if (dropdown) dropdown.classList.remove("show");
        if (arrow) arrow.style.transform = "rotate(0deg)";
    });
});

// DB에서 이번 달 데이터를 가져오는 함수
// DB에서 이번 달 데이터를 가져오는 함수
// DB에서 데이터를 가져오는 함수
function fetchAndRenderCalendar(isInitial = false) {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth() + 1;

    // 그룹 ID와 연/월을 서버로 전달[cite: 4, 7]
    const url = `../php/fetch_calendar.php?year=${year}&month=${month}&group_id=${selectedGroupId}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            currentMonthSongs = data || []; 

            // 🔥 추가: 페이지 첫 로드 시에만 오늘 날짜를 선택된 날짜로 기억
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


// 드롭다운 카테고리 생성 함수
// 드롭다운 카테고리 생성 함수 (api.php 통합 버전)
async function loadGroupCategories() {
    const dropdown = document.getElementById("category-dropdown");
    const currentName = document.getElementById("current-category-name");
    
    if (!dropdown) return;
    dropdown.innerHTML = ""; // 기존 항목 초기화

    try {
        // 1. 내 정보 가져오기 (api.php의 get_my_info 액션 호출)[cite: 5, 9]
        const userRes = await fetch('../php/api.php?action=get_my_info');
        if (!userRes.ok) throw new Error('내 정보 로드 실패 (404 혹은 500)');
        const userData = await userRes.json();
        const myName = userData.username || "";

        // 2. (나) 항목 생성 및 닉네임 표시 [요청사항 1번 적용]
        addDropdownItem(`(나) ${myName}`, 0); 
        if (currentName) currentName.innerText = `(나) ${myName}`;

        // 3. 내가 가입한 그룹 목록 가져오기 (api.php의 get_my_groups 액션 호출)
        const groupRes = await fetch('../php/api.php?action=get_my_groups');
        if (!groupRes.ok) throw new Error('그룹 목록 로드 실패');
        const groupData = await groupRes.json();

        if (groupData.success && groupData.groups && groupData.groups.length > 0) {
            // 4. 그룹 목록을 순차적으로 드롭다운에 추가[cite: 3, 9]
            groupData.groups.forEach(group => {
                addDropdownItem(group.group_name, group.group_id);
            });
        }
    } catch (err) {
        console.error("카테고리 로드 중 오류 발생:", err);
        // 에러 발생 시 기본값이라도 표시
        addDropdownItem("(나)", 0);
    }

    /**
     * 드롭다운 항목 생성 및 클릭 이벤트 연결 공통 함수
     */
    function addDropdownItem(name, id) {
        const item = document.createElement('div');
        item.className = "dropdown-item";
        item.innerText = name;
        
        item.onclick = (e) => {
            e.stopPropagation(); // 부모(selectWrapper) 클릭 이벤트 전파 방지
            
            if (currentName) currentName.innerText = name; // 선택된 이름으로 상단 텍스트 변경[cite: 3]
            
            // 드롭다운 닫기 및 화살표 원위치
            if (dropdown) dropdown.classList.remove("show");
            const arrow = document.querySelector(".select-arrow");
            if (arrow) arrow.style.transform = "rotate(0deg)";

            // 5. 카테고리 선택 시 해당 그룹 ID로 데이터 갱신 로직 실행[cite: 3, 9]
            selectCategory(id); 
        };
        
        dropdown.appendChild(item);
    }
}

// 카테고리 선택 시 처리
function selectCategory(groupId) {
    console.log("선택된 그룹 ID:", groupId);
    selectedGroupId = groupId; // 전역 변수 업데이트
    fetchAndRenderCalendar(); // 선택된 그룹의 데이터로 달력 갱신
}

// 캘린더 그리기 함수
// 캘린더 그리기 함수
// 캘린더 그리기 함수
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const headerText = document.getElementById("current-month-year");
    
    grid.innerHTML = ""; // 기존 그리드 초기화
    
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    headerText.innerText = `${year}.${String(month + 1).padStart(2, '0')}`;

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const now = new Date();

    // 1. 시작 요일 맞추기 (공백 생성)[cite: 4]
    for (let i = 0; i < firstDay; i++) { 
        grid.innerHTML += `<div class="day empty"></div>`; 
    }

    // 2. 날짜 생성 루프
    for (let d = 1; d <= lastDate; d++) {
        const dateStr = `${year}.${String(month + 1).padStart(2, '0')}.${String(d).padStart(2, '0')}`;
        const todaysSongs = currentMonthSongs.filter(s => s.uploadDate === dateStr);
        
        const dayEl = document.createElement("div");
        dayEl.className = "day";
        dayEl.innerText = d;
        
        // 추천 노래가 있는 날 표시[cite: 4]
        if (todaysSongs.length > 0) {
            dayEl.classList.add('attended');
        }

        // 🔥 수정: 선택된 날짜(selectedDateStr)와 일치하는 칸을 활성화[cite: 4]
        if (selectedDateStr === dateStr) {
            dayEl.classList.add('active');
            showSongs(todaysSongs); // 해당 날짜의 노래 목록 표시
        } 
        // 만약 선택된 날짜가 현재 달력 범위 밖이고, 오늘이 이 달에 있다면 오늘을 하이라이트 (선택은 아님)
        else if (!selectedDateStr && year === now.getFullYear() && month === now.getMonth() && d === now.getDate()) {
            dayEl.classList.add('active');
        }

        // 날짜 클릭 이벤트[cite: 4]
        dayEl.onclick = () => {
            document.querySelectorAll('.day').forEach(el => el.classList.remove('active'));
            dayEl.classList.add('active');
            
            // 🔥 중요: 클릭한 날짜를 전역 변수에 저장하여 카테고리 변경 시에도 유지하게 함[cite: 4]
            selectedDateStr = dateStr; 
            showSongs(todaysSongs);
        };
        grid.appendChild(dayEl);
    }
}

// 선택된 날짜의 노래 카드 표시 함수
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
        
        // showSongs 함수 내부의 infoHtml 수정
        const infoHtml = `
            <div class="info-area">
                <span class="user-name" style="font-weight: bold;">${song.userName}</span>
                <span class="user-id" style="font-size: 11px; color: #666;">@${song.loginId}</span>
                <!-- 한마디 앞뒤에 따옴표 추가 및 클래스 지정 -->
                <span class="user-comment">"${song.comment}"</span>
                <span class="upload-time" style="font-size: 10px; color: #999;">${song.uploadTime}</span>
            </div>
        `;

        wrapper.innerHTML = `
            <div class="thumb-area" onclick="window.open('${song.url}', '_blank')">
                <img src="${song.thumb}" alt="thumbnail">
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
    const threshold = 60; // 60px 이상 밀었을 때만 넘어가도록 설정

    // 사용자가 손을 뗐을 때 즉시 실행하여 반응성 향상
    if (scrollLeft > threshold) {
        // 정보 영역(끝)으로 이동
        element.scrollTo({ 
            left: scrollWidth - clientWidth, 
            behavior: 'smooth' 
        });
    } else {
        // 원래 위치(썸네일)로 이동
        element.scrollTo({ 
            left: 0, 
            behavior: 'smooth' 
        });
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