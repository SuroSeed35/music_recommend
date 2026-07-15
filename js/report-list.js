let currentEditingItem = null;

document.addEventListener("DOMContentLoaded", () => {
    const backBtn = document.querySelector('.back-button');
    if (backBtn) {
        backBtn.addEventListener('click', () => { window.history.back(); });
    }

    // 초기 로드
    loadReportsFromDB();

    // ==========================================
    // 💡 검색어 표시 및 검색 실행 로직
    // ==========================================
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-icon');
    const displayDiv = document.getElementById('searchKeywordDisplay');
    const wordSpan = document.getElementById('currentSearchWord');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    function performSearch() {
        const keyword = searchInput ? searchInput.value.trim() : '';
        
        // 검색어가 있으면 UI에 텍스트를 띄우고, 없으면 숨깁니다.
        if (keyword) {
            if (displayDiv && wordSpan) {
                displayDiv.style.display = 'block';
                wordSpan.textContent = `'${keyword}'`;
            }
        } else {
            if (displayDiv) displayDiv.style.display = 'none';
        }
        
        // 검색어로 API 호출 (DB 필터링)
        loadReportsFromDB(keyword);
    }

    // 돋보기 클릭 시 검색
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }

    // 엔터키 입력 시 검색
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    // '초기화 ✕' 버튼 클릭 시 검색 초기화
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            performSearch(); // 빈 값으로 다시 조회 (전체 리스트 복구)
        });
    }
    // ==========================================

    const dateMenu = document.querySelector('.date-picker-menu');
    const dateText = document.querySelector('.date-text');
    const yearItems = document.querySelectorAll('.year-list li');
    const monthItems = document.querySelectorAll('.month-list li');
    let selectedYear = "2026";
    let selectedMonth = "07";

    function updateDateText() {
        dateText.textContent = `${selectedYear}-${selectedMonth}`;
        dateMenu.removeAttribute('open'); 
        const targetYearGroup = document.getElementById(`year-${selectedYear}`);
        if (targetYearGroup) targetYearGroup.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    yearItems.forEach(item => {
        item.addEventListener('click', (e) => {
            yearItems.forEach(i => i.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedYear = e.target.textContent;
            updateDateText();
        });
    });

    monthItems.forEach(item => {
        item.addEventListener('click', (e) => {
            monthItems.forEach(i => i.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedMonth = e.target.textContent;
            updateDateText();
        });
    });

    const reportGrid = document.getElementById('reportGrid');
    if (reportGrid) {
        reportGrid.addEventListener('click', (e) => {
            const gridItem = e.target.closest('.grid-item');
            if (!gridItem) return; 

            if (e.target.closest('.more-menu')) {
                if (e.target.tagName === 'LI') {
                    currentEditingItem = gridItem; 
                    if (e.target.classList.contains('menu-edit-title')) {
                        document.getElementById('titleInput').value = gridItem.querySelector('.report-title').textContent;
                        openModal('titleModal');
                    }
                    if (e.target.classList.contains('menu-edit-cover')) {
                        document.getElementById('coverFileInput').value = ''; 
                        openModal('coverModal');
                    }
                    if (e.target.classList.contains('menu-show-details')) {
                        document.getElementById('detailDate').textContent = gridItem.dataset.date || '-';
                        document.getElementById('detailSize').textContent = gridItem.dataset.size || '알 수 없음';
                        openModal('detailsModal');
                    }
                    e.target.closest('.more-menu').removeAttribute('open');
                }
                return; 
            }
            const reportId = gridItem.dataset.id;
            window.location.href = `report-detail.html?id=${reportId}`;
        });
    }

    // 제목 변경
    const saveTitleBtn = document.getElementById('saveTitleBtn');
    if (saveTitleBtn) {
        saveTitleBtn.addEventListener('click', () => {
            const newTitle = document.getElementById('titleInput').value;
            
            if (newTitle.trim() !== '' && currentEditingItem) {
                const reportId = currentEditingItem.dataset.id;
                
                currentEditingItem.querySelector('.report-title').textContent = newTitle;
                closeModal('titleModal');

                const formData = new FormData();
                formData.append('id', reportId);
                formData.append('title', newTitle);

                fetch('../php/update_report.php', {
                    method: 'POST',
                    body: formData 
                })
                .then(res => res.json())
                .then(result => {
                    if (result.success) {
                        showToast('제목이 변경되었습니다.');
                    } else {
                        showToast(result.message || '제목 변경 실패');
                    }
                })
                .catch(error => {
                    console.error('API 에러:', error);
                    showToast('통신 오류가 발생했습니다.');
                });
            } else {
                closeModal('titleModal');
            }
        });
    }

    // 표지 변경
    const saveCoverBtn = document.getElementById('saveCoverBtn');
    if (saveCoverBtn) {
        saveCoverBtn.addEventListener('click', () => {
            const fileInput = document.getElementById('coverFileInput');
            
            if (fileInput.files && fileInput.files[0] && currentEditingItem) {
                const reportId = currentEditingItem.dataset.id;
                const selectedFile = fileInput.files[0];
                
                const reader = new FileReader();
                reader.onload = function(event) {
                    currentEditingItem.style.backgroundImage = `url('${event.target.result}')`;
                    currentEditingItem.classList.add('has-image');
                }
                reader.readAsDataURL(selectedFile);
                
                closeModal('coverModal');

                const formData = new FormData();
                formData.append('id', reportId);
                formData.append('cover_image', selectedFile);

                fetch('../php/update_report.php', {
                    method: 'POST',
                    body: formData
                })
                .then(res => res.json())
                .then(result => {
                    if (result.success) {
                        showToast('표지가 변경되었습니다.');
                    } else {
                        showToast(result.message || '표지 변경 실패');
                    }
                })
                .catch(error => {
                    console.error('업로드 에러:', error);
                    showToast('이미지 업로드 중 오류가 발생했습니다.');
                });
            } else {
                closeModal('coverModal');
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (dateMenu && !dateMenu.contains(e.target)) dateMenu.removeAttribute('open');
        const moreMenus = document.querySelectorAll('.more-menu');
        moreMenus.forEach(menu => {
            if (!menu.contains(e.target)) menu.removeAttribute('open');
            else if (menu.contains(e.target) && e.target.tagName === 'SUMMARY') {
                moreMenus.forEach(other => { if (other !== menu) other.removeAttribute('open'); });
            }
        });
    });
});

// 토스트 알림
function showToast(message) {
    let toast = document.getElementById("toast-notification");
    
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast-notification";
        toast.style.position = "fixed";
        toast.style.bottom = "-60px"; 
        toast.style.left = "50%";
        toast.style.transform = "translateX(-50%)";
        toast.style.backgroundColor = "rgba(40, 40, 40, 0.9)";
        toast.style.color = "#ffffff";
        toast.style.padding = "12px 24px";
        toast.style.borderRadius = "30px";
        toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
        toast.style.fontSize = "14px";
        toast.style.fontWeight = "500";
        toast.style.zIndex = "10000";
        toast.style.transition = "all 0.15s ease-out"; 
        toast.style.opacity = "0";
        toast.style.pointerEvents = "none"; 
        toast.style.whiteSpace = "nowrap";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    
    if (toast.hideTimeout) clearTimeout(toast.hideTimeout);

    setTimeout(() => {
        toast.style.bottom = "40px";
        toast.style.opacity = "1";
    }, 10);

    toast.hideTimeout = setTimeout(() => {
        toast.style.bottom = "-60px";
        toast.style.opacity = "0";
    }, 2000);
}

function openModal(modalId) { 
    const modal = document.getElementById(modalId);
    if(modal) modal.classList.add('active'); 
}
function closeModal(modalId) { 
    const modal = document.getElementById(modalId);
    if(modal) modal.classList.remove('active'); 
}

// 💡 파라미터로 받은 검색어를 PHP로 전달
async function loadReportsFromDB(keyword = '') {
    try {
        const url = keyword 
            ? `../php/fetch_reports.php?search=${encodeURIComponent(keyword)}` 
            : '../php/fetch_reports.php';
            
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) renderReports(result.data, keyword);
        else console.error('보고서 목록 불러오기 실패:', result.message);
    } catch (error) {
        console.error('API 연결 에러:', error);
    }
}

// 💡 검색어가 있을 땐 맞춤형 "검색 결과 없음" 렌더링
function renderReports(reports, keyword = '') {
    const reportGrid = document.getElementById('reportGrid');
    reportGrid.innerHTML = ''; 

    if (!reports || reports.length === 0) {
        const emptyMsg = keyword ? `'${keyword}'에 대한 검색 결과가 없습니다.` : '보고서가 없습니다.';
        reportGrid.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding-top: 100px; color:#888;">
                <div style="font-size:48px; margin-bottom:15px;">📭</div>
                <p style="font-size:15px; font-weight:600; color:#555; text-align:center;">${emptyMsg}</p>
            </div>
        `;
        return;
    }

    const groupedByYear = {};
    reports.forEach(report => {
        let year = "2026";
        if (report.target_month && report.target_month.includes('-')) {
            year = report.target_month.split('-')[0];
        } else if (report.target_month) {
            year = report.target_month.substring(0, 4);
        }
        
        if (!groupedByYear[year]) groupedByYear[year] = [];
        groupedByYear[year].push(report);
    });

    const sortedYears = Object.keys(groupedByYear).sort((a, b) => b - a);

    sortedYears.forEach(year => {
        const yearGroup = document.createElement('div');
        yearGroup.className = 'year-group';
        yearGroup.id = `year-${year}`;
        yearGroup.innerHTML = `<h2 class="year-heading">${year}</h2>`;
        
        const gridContainer = document.createElement('div');
        gridContainer.className = 'grid-container';

        groupedByYear[year].forEach(report => {
            let displayMonth = 7;
            if (report.target_month && report.target_month.includes('-')) {
                displayMonth = parseInt(report.target_month.split('-')[1], 10);
            }

            const hasImageClass = report.cover_image ? 'has-image' : '';
            const bgStyle = report.cover_image ? `background-image: url('${report.cover_image}');` : '';

            const gridItem = document.createElement('div');
            gridItem.className = `grid-item ${hasImageClass}`;
            gridItem.style = bgStyle;
            
            gridItem.dataset.id = report.id;
            gridItem.dataset.date = (report.created_at && report.created_at.includes(' ')) ? report.created_at.split(' ')[0] : (report.created_at || '-'); 
            gridItem.dataset.size = report.file_size || '알 수 없음';
            gridItem.dataset.content = report.content || ''; 

            gridItem.innerHTML = `
                <div class="item-footer">
                    <div class="report-title">${report.title || '제목 없음'}</div>
                    <div class="report-subtitle">${displayMonth}월 보고서</div>
                    <details class="more-menu">
                        <summary>...</summary>
                        <ul class="dropdown">
                            <li class="menu-edit-title">제목 변경하기</li>
                            <li class="menu-edit-cover">표지 변경하기</li>
                            <li class="menu-show-details">세부사항</li>
                        </ul>
                    </details>
                </div>
            `;
            gridContainer.appendChild(gridItem);
        });
        yearGroup.appendChild(gridContainer);
        reportGrid.appendChild(yearGroup);
    });
}