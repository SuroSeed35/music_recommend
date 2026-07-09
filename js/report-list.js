let currentEditingItem = null;

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. 뒤로가기 버튼
    const backBtn = document.querySelector('.back-button');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.history.back();
        });
    }

    // 2. 연도 및 월 선택 (선택 시 해당 연도로 부드럽게 스크롤 이동)
    const dateMenu = document.querySelector('.date-picker-menu');
    const dateText = document.querySelector('.date-text');
    const yearItems = document.querySelectorAll('.year-list li');
    const monthItems = document.querySelectorAll('.month-list li');
    
    let selectedYear = "2026";
    let selectedMonth = "07";

    function updateDateText() {
        dateText.textContent = `${selectedYear}-${selectedMonth}`;
        dateMenu.removeAttribute('open'); // 메뉴 닫기

        // 선택한 연도의 그룹 ID 찾아서 부드럽게 스크롤 (스크롤 컨테이너 내부에서 이동함)
        const targetYearGroup = document.getElementById(`year-${selectedYear}`);
        if (targetYearGroup) {
            targetYearGroup.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
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

    // 3. 모달 열기 (제목변경, 표지변경, 세부사항)
    const reportGrid = document.getElementById('reportGrid');
    if (reportGrid) {
        reportGrid.addEventListener('click', (e) => {
            if (e.target.tagName === 'LI') {
                const gridItem = e.target.closest('.grid-item');
                currentEditingItem = gridItem; 

                if (e.target.classList.contains('menu-edit-title')) {
                    const currentTitle = gridItem.querySelector('.report-title').textContent;
                    document.getElementById('titleInput').value = currentTitle;
                    openModal('titleModal');
                }
                if (e.target.classList.contains('menu-edit-cover')) {
                    document.getElementById('coverFileInput').value = ''; 
                    openModal('coverModal');
                }
                if (e.target.classList.contains('menu-show-details')) {
                    openModal('detailsModal');
                }
                // 드롭다운 닫기
                e.target.closest('.more-menu').removeAttribute('open');
            }
        });
    }

    // 모달 저장 버튼 액션 (제목)
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

    // 모달 저장 버튼 액션 (표지)
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

    // 외부 영역 클릭 시 열려있는 메뉴 닫기
    document.addEventListener('click', (e) => {
        if (dateMenu && !dateMenu.contains(e.target)) {
            dateMenu.removeAttribute('open');
        }
        const moreMenus = document.querySelectorAll('.more-menu');
        moreMenus.forEach(menu => {
            if (!menu.contains(e.target)) {
                menu.removeAttribute('open');
            } else if (menu.contains(e.target) && e.target.tagName === 'SUMMARY') {
                moreMenus.forEach(other => {
                    if (other !== menu) other.removeAttribute('open');
                });
            }
        });
    });
});

// 전역 모달 함수
function openModal(modalId) { 
    const modal = document.getElementById(modalId);
    if(modal) modal.classList.add('active'); 
}
function closeModal(modalId) { 
    const modal = document.getElementById(modalId);
    if(modal) modal.classList.remove('active'); 
}