document.addEventListener("DOMContentLoaded", () => {
    
    // 뒤로가기 버튼 기능
    const backBtn = document.querySelector('.back-button');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // 브라우저 뒤로가기 기록이 있으면 뒤로 이동
            if (window.history.length > 1) {
                window.history.back();
            } else {
                // 이전 기록이 없다면 (링크를 직접 타고 들어온 경우) 목록 페이지로 강제 이동
                window.location.href = 'report-list.html';
            }
        });
    }

});