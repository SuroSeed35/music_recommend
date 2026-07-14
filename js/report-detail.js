document.addEventListener('DOMContentLoaded', () => {
  
  const container = document.querySelector('.phone-container');
  const header = document.getElementById('stickyHeader');

  // 1. 스크롤 방향 감지 및 헤더 온/오프 토글 기능
  let lastScrollTop = 0;
  if (container && header) {
    container.addEventListener('scroll', () => {
      let scrollTop = container.scrollTop;
      if (scrollTop > lastScrollTop && scrollTop > 50) {
        header.classList.add('hide');
      } else {
        header.classList.remove('hide');
      }
      lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    });
  }

  // 2. 요소 진입 시 애니메이션 (왼쪽/오른쪽 동시 적용)
  const observerOptions = { 
    threshold: 0.1,
    root: container
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        
        const chartContainer = entry.target.querySelector('.bar-chart-container');
        if (chartContainer) {
          const bars = chartContainer.querySelectorAll('.bar');
          bars.forEach((bar, index) => {
            setTimeout(() => {
              bar.style.transform = 'scaleY(1)';
            }, index * 25);
          });
        }
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  const animatableElements = document.querySelectorAll('.animate-from-left, .animate-from-right');
  animatableElements.forEach(el => observer.observe(el));


  // 3. 노래 리스트 펼치기(아코디언 토글)
  const toggleBtn = document.getElementById('toggleListBtn');
  const expandableList = document.getElementById('expandableList');

  if (toggleBtn && expandableList) {
    toggleBtn.addEventListener('click', () => {
      toggleBtn.classList.toggle('active');
      expandableList.classList.toggle('show');
    });
  }


  // 4. 더보기 버튼 드롭다운 기능
  const moreBtn = document.getElementById('moreBtn');
  const moreDropdown = document.getElementById('moreDropdown');
  
  if (moreBtn && moreDropdown) {
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      moreDropdown.classList.toggle('show');
    });
  }

  document.addEventListener('click', () => {
    if (moreDropdown && moreDropdown.classList.contains('show')) {
      moreDropdown.classList.remove('show');
    }
  });


  // 5. 제목 변경 모달창 기능
  const editTitleBtn = document.getElementById('editTitleBtn');
  const editTitleModal = document.getElementById('editTitleModal');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const saveTitleBtn = document.getElementById('saveTitleBtn');
  const newTitleInput = document.getElementById('newTitleInput');
  const mainTitleText = document.getElementById('mainTitleText');

  if (editTitleBtn && editTitleModal) {
    editTitleBtn.addEventListener('click', () => {
      newTitleInput.value = mainTitleText.innerText;
      editTitleModal.classList.add('show');
    });
  }

  if (cancelEditBtn && editTitleModal) {
    cancelEditBtn.addEventListener('click', () => {
      editTitleModal.classList.remove('show');
    });
  }

  if (editTitleModal) {
    editTitleModal.addEventListener('click', (e) => {
      if (e.target === editTitleModal) {
        editTitleModal.classList.remove('show');
      }
    });
  }

  if (saveTitleBtn && editTitleModal && mainTitleText) {
    saveTitleBtn.addEventListener('click', () => {
      const newTitle = newTitleInput.value.trim();
      if (newTitle !== "") {
        mainTitleText.innerText = newTitle; 
      }
      editTitleModal.classList.remove('show'); 
    });
  }


  // 6. 💡 배경 변경 모달창 & 미리보기 기능
  const changeBgBtn = document.getElementById('changeBgBtn');
  const changeBgModal = document.getElementById('changeBgModal');
  const bgFileInput = document.getElementById('bgFileInput');
  const phoneContainer = document.getElementById('phoneContainer');
  
  const selectBgFileBtn = document.getElementById('selectBgFileBtn');
  const cancelBgBtn = document.getElementById('cancelBgBtn');
  const saveBgBtn = document.getElementById('saveBgBtn');
  
  const bgPreviewArea = document.getElementById('bgPreviewArea');
  const bgPreviewText = document.getElementById('bgPreviewText');

  let tempBgDataUrl = null; // 모달 내에서 임시로 이미지를 들고 있을 변수

  // 메뉴에서 '배경 변경하기' 클릭 시 모달 열기
  if (changeBgBtn && changeBgModal) {
    changeBgBtn.addEventListener('click', () => {
      // 열 때마다 임시 데이터 및 미리보기 박스 초기화
      tempBgDataUrl = null;
      bgPreviewArea.style.backgroundImage = 'none';
      bgPreviewText.style.display = 'block'; 
      changeBgModal.classList.add('show');
    });
  }

  // 모달 닫기 로직
  if (cancelBgBtn && changeBgModal) {
    cancelBgBtn.addEventListener('click', () => {
      changeBgModal.classList.remove('show');
    });
  }
  if (changeBgModal) {
    changeBgModal.addEventListener('click', (e) => {
      if (e.target === changeBgModal) {
        changeBgModal.classList.remove('show');
      }
    });
  }

  // '이미지 찾기' 버튼을 누르면 숨겨진 input[type="file"] 클릭 연동
  if (selectBgFileBtn && bgFileInput) {
    selectBgFileBtn.addEventListener('click', () => {
      bgFileInput.click();
    });
  }

  // 파일 선택 시 FileReader로 미리보기에 적용
  if (bgFileInput) {
    bgFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          tempBgDataUrl = event.target.result;
          bgPreviewArea.style.backgroundImage = `url('${tempBgDataUrl}')`;
          bgPreviewText.style.display = 'none'; // '이미지를 선택해주세요' 텍스트 숨김
        };
        reader.readAsDataURL(file);
      }
      e.target.value = ''; // 초기화하여 같은 파일 재선택 가능하게 처리
    });
  }

  // '적용' 버튼 클릭 시 실제 뷰에 배경 적용
  if (saveBgBtn && phoneContainer) {
    saveBgBtn.addEventListener('click', () => {
      if (tempBgDataUrl) {
        phoneContainer.style.backgroundImage = `url('${tempBgDataUrl}')`;
      }
      changeBgModal.classList.remove('show');
    });
  }

});