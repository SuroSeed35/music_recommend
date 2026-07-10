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
                        document.getElementById('detailSize').textContent = gridItem.dataset.size || '2.4 MB';
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

    const saveTitleBtn = document.getElementById('saveTitleBtn');
    if (saveTitleBtn) {
        saveTitleBtn.addEventListener('click', () => {
            const newTitle = document.getElementById('titleInput').value;
            if (newTitle.trim() !== '' && currentEditingItem) {
                currentEditingItem.querySelector('.report-title').textContent = newTitle;
            }
            closeModal('titleModal');
        });
    }

    const saveCoverBtn = document.getElementById('saveCoverBtn');
    if (saveCoverBtn) {
        saveCoverBtn.addEventListener('click', () => {
            const fileInput = document.getElementById('coverFileInput');
            if (fileInput.files && fileInput.files[0] && currentEditingItem) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    currentEditingItem.style.backgroundImage = `url('${event.target.result}')`;
                    currentEditingItem.classList.add('has-image');
                }
                reader.readAsDataURL(fileInput.files[0]);
            }
            closeModal('coverModal');
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

    // ★ 데이터가 없을 경우 '아직 보고서가 없습니다' 표시
    if (reports.length === 0) {
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
        const year = report.target_month.split('-')[0];
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
            const monthStr = report.target_month.split('-')[1];
            const displayMonth = parseInt(monthStr, 10); 
            const hasImageClass = report.cover_image ? 'has-image' : '';
            const bgStyle = report.cover_image ? `background-image: url('${report.cover_image}');` : '';

            const gridItem = document.createElement('div');
            gridItem.className = `grid-item ${hasImageClass}`;
            gridItem.style = bgStyle;
            gridItem.dataset.id = report.id;
            gridItem.dataset.date = report.created_at.split(' ')[0]; 
            gridItem.dataset.size = report.file_size;

            gridItem.innerHTML = `
                <div class="item-footer">
                    <div class="report-title">${report.title}</div>
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