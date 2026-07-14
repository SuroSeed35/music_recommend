let currentEditingItem = null;

document.addEventListener("DOMContentLoaded", () => {
    const backBtn = document.querySelector('.back-button');
    if (backBtn) {
        backBtn.addEventListener('click', () => { window.history.back(); });
    }

    loadReportsFromDB();

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

    // ★ 제목 변경 (체감 속도 개선 - 화면 먼저 닫고 서버 전송)
    const saveTitleBtn = document.getElementById('saveTitleBtn');
    if (saveTitleBtn) {
        saveTitleBtn.addEventListener('click', () => {
            const newTitle = document.getElementById('titleInput').value;
            
            if (newTitle.trim() !== '' && currentEditingItem) {
                const reportId = currentEditingItem.dataset.id;
                
                // 1. 화면 즉시 변경 및 모달 닫기 (기다림 없이 바로!)
                currentEditingItem.querySelector('.report-title').textContent = newTitle;
                closeModal('titleModal');

                // 2. 백그라운드 서버 전송
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

    // ★ 표지 변경 (체감 속도 개선 - 파일 선택 즉시 화면 덮고, 모달 닫고 업로드)
    const saveCoverBtn = document.getElementById('saveCoverBtn');
    if (saveCoverBtn) {
        saveCoverBtn.addEventListener('click', () => {
            const fileInput = document.getElementById('coverFileInput');
            
            if (fileInput.files && fileInput.files[0] && currentEditingItem) {
                const reportId = currentEditingItem.dataset.id;
                const selectedFile = fileInput.files[0];
                
                // 1. 화면에 로컬 이미지를 즉시 미리보기 형태로 적용
                const reader = new FileReader();
                reader.onload = function(event) {
                    currentEditingItem.style.backgroundImage = `url('${event.target.result}')`;
                    currentEditingItem.classList.add('has-image');
                }
                reader.readAsDataURL(selectedFile);
                
                // 2. 모달을 딜레이 없이 즉시 닫기
                closeModal('coverModal');

                // 3. 백그라운드 서버 업로드
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

// ★ 토스트 알림 속도 및 로직 개선
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
        // 진입/퇴장 애니메이션 속도를 0.3초에서 0.15초로 더 빠르고 스무스하게 변경
        toast.style.transition = "all 0.15s ease-out"; 
        toast.style.opacity = "0";
        toast.style.pointerEvents = "none"; 
        toast.style.whiteSpace = "nowrap";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    
    // 알림이 이미 떠 있을 때 또 누르면 타이머 초기화 (깜빡임 방지)
    if (toast.hideTimeout) clearTimeout(toast.hideTimeout);

    // 알림 즉시 나타나기
    setTimeout(() => {
        toast.style.bottom = "40px";
        toast.style.opacity = "1";
    }, 10);

    // 알림 머무는 시간 2.5초 -> 2초로 단축
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

async function loadReportsFromDB() {
    try {
        const response = await fetch('../php/fetch_reports.php');
        const result = await response.json();
        if (result.success) renderReports(result.data);
        else console.error('보고서 목록 불러오기 실패:', result.message);
    } catch (error) {
        console.error('API 연결 에러:', error);
    }
}

function renderReports(reports) {
    const reportGrid = document.getElementById('reportGrid');
    reportGrid.innerHTML = ''; 

    if (!reports || reports.length === 0) {
        reportGrid.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding-top: 100px; color:#888;">
                <div style="font-size:48px; margin-bottom:15px;">📭</div>
                <p style="font-size:15px; font-weight:600; color:#555;">아직 보고서가 없습니다.</p>
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