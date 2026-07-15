document.addEventListener('DOMContentLoaded', async () => {
  
  const urlParams = new URLSearchParams(window.location.search);
  const reportId = urlParams.get('id');

  if (!reportId) {
    alert("잘못된 접근입니다.");
    window.history.back();
    return;
  }

  const container = document.querySelector('.phone-container');
  const header = document.getElementById('stickyHeader');
  
  // [1] 뒤로가기 버튼
  const goBackBtn = document.getElementById('goBackBtn');
  if (goBackBtn) goBackBtn.addEventListener('click', () => window.history.back());

  // [2] DB 데이터 연동
  try {
    const res = await fetch(`../php/report_detail_api.php?id=${reportId}`);
    const data = await res.json();
    
    if (!data.success) {
      alert(data.message);
      window.history.back();
      return;
    }

    // 1) 헤더 및 배경
    document.getElementById('mainTitleText').innerText = data.report.title;
    document.getElementById('createdDateText').innerText = `생성일: ${data.report.created_date}`;
    if (data.report.inner_image && data.report.inner_image !== '') {
      container.style.backgroundImage = `url('${data.report.inner_image}')`;
    }

    // 2) 최애 아티스트
    if (data.favorite_artist) {
      document.getElementById('favArtistName').innerText = data.favorite_artist.channel_name || '알 수 없는 채널';
      document.getElementById('favArtistHandle').innerText = 'YouTube Channel'; 
      if (data.favorite_artist.thumbnail_img) {
        document.getElementById('favArtistImg').src = data.favorite_artist.thumbnail_img;
      }
    }

    // 3) 가장 많이 들은 노래
    if (data.most_played) {
      document.getElementById('mostPlayedImg').src = data.most_played.thumbnail_img;
      document.getElementById('mostPlayedTitle').innerText = data.most_played.title;
      document.getElementById('mostPlayedChannel').innerText = data.most_played.channel_name || '알 수 없는 채널';
    }

    // 4) 시간대별 차트 및 평균 시간 계산
    const chartContainer = document.getElementById('barChartContainer');
    chartContainer.innerHTML = ''; 
    
    let totalSeconds = 0;
    let totalCount = 0;

    data.time_data.forEach((cnt, hr) => {
      const pct = data.max_time_cnt > 0 ? (cnt / data.max_time_cnt) * 100 : 0;
      const bar = document.createElement('div');
      bar.className = 'bar' + (pct > 70 ? ' highlight' : '');
      bar.style.height = `${pct}%`; 
      chartContainer.appendChild(bar);

      if (cnt > 0) {
        totalSeconds += (hr * 3600) * cnt;
        totalCount += cnt;
      }
    });

    const avgTimeTextEl = document.getElementById('avgTimeText');
    if (avgTimeTextEl) {
      if (totalCount > 0) {
        const avgSecondsTotal = totalSeconds / totalCount;
        const avgHour = Math.floor(avgSecondsTotal / 3600);
        const avgMinute = Math.round((avgSecondsTotal % 3600) / 60);
        
        const ampm = avgHour >= 12 ? '오후' : '오전';
        const displayHour = avgHour % 12 === 0 ? 12 : avgHour % 12;
        const formattedMinute = String(avgMinute).padStart(2, '0');

        // 💡 글자색 검정(#000), 크기 확대(18px), 텍스트 그림자(text-shadow) 삭제
        avgTimeTextEl.innerHTML = `이번 달 평균 추천 시간은 <span style="color: #000; font-size: 18px; font-weight: 800;">${ampm} ${displayHour}시 ${formattedMinute}분</span>입니다.`;
      } else {
        avgTimeTextEl.innerText = "이번 달 추천 기록이 없습니다.";
      }
    }

    // 5) 이 달의 음악 무드 분석 적용
    if (data.user_mood) {
      document.getElementById('moodEmoji').innerText = data.user_mood.emoji;
      document.getElementById('moodTitle').innerText = data.user_mood.title;
      document.getElementById('moodDesc').innerText = data.user_mood.desc;
    }

    // 6) 좋아요 리스트
    document.getElementById('totalLikesCount').innerText = `${data.total_likes}개`;
    const expandableList = document.getElementById('expandableList');
    expandableList.innerHTML = '';
    if (data.liked_songs && data.liked_songs.length > 0) {
      data.liked_songs.forEach(song => {
        expandableList.innerHTML += `
          <li class="song-list-item">
            <img class="song-list-thumb" src="${song.thumbnail_img}" alt="song thumbnail">
            <span class="song-list-title">${song.title}</span>
            <button class="song-play-btn" aria-label="재생">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </li>
        `;
      });
    } else {
      expandableList.innerHTML = `<li class="song-list-item"><span class="song-list-title" style="color:#999; text-align:center;">이번 달 좋아요 누른 기록이 없습니다.</span></li>`;
    }

  } catch (error) {
    console.error("데이터 로드 실패:", error);
  }

  // [3] UI 이벤트 및 애니메이션 관찰자
  let lastScrollTop = 0;
  if (container && header) {
    container.addEventListener('scroll', () => {
      let scrollTop = container.scrollTop;
      if (scrollTop > lastScrollTop && scrollTop > 50) header.classList.add('hide');
      else header.classList.remove('hide');
      lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    });
  }

  const observerOptions = { threshold: 0.1, root: container };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        const chartContainer = entry.target.querySelector('.bar-chart-container');
        if (chartContainer) {
          const bars = chartContainer.querySelectorAll('.bar');
          bars.forEach((bar, index) => setTimeout(() => bar.style.transform = 'scaleY(1)', index * 25));
        }
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.animate-from-left, .animate-from-right').forEach(el => observer.observe(el));

  const toggleBtn = document.getElementById('toggleListBtn');
  const expandableList = document.getElementById('expandableList');
  if (toggleBtn && expandableList) {
    toggleBtn.addEventListener('click', () => {
      toggleBtn.classList.toggle('active');
      expandableList.classList.toggle('show');
    });
  }

  const moreBtn = document.getElementById('moreBtn');
  const moreDropdown = document.getElementById('moreDropdown');
  if (moreBtn && moreDropdown) {
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      moreDropdown.classList.toggle('show');
    });
  }
  document.addEventListener('click', () => {
    if (moreDropdown && moreDropdown.classList.contains('show')) moreDropdown.classList.remove('show');
  });


  // [4] DB 업데이트 (제목 변경)
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
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => editTitleModal.classList.remove('show'));
  if (editTitleModal) editTitleModal.addEventListener('click', (e) => { if (e.target === editTitleModal) editTitleModal.classList.remove('show'); });

  if (saveTitleBtn && mainTitleText) {
    saveTitleBtn.addEventListener('click', async () => {
      const newTitle = newTitleInput.value.trim();
      if (newTitle !== "") {
        const formData = new FormData();
        formData.append('id', reportId);
        formData.append('title', newTitle);
        try {
          const res = await fetch('../php/update_report.php', { method: 'POST', body: formData });
          const result = await res.json();
          if (result.success) {
            mainTitleText.innerText = newTitle; 
            editTitleModal.classList.remove('show'); 
          } else alert(result.message);
        } catch(e) {
          console.error(e);
          alert('제목 저장 중 오류가 발생했습니다.');
        }
      }
    });
  }

  // [5] DB 업데이트 (배경 변경)
  const changeBgBtn = document.getElementById('changeBgBtn');
  const changeBgModal = document.getElementById('changeBgModal');
  const bgFileInput = document.getElementById('bgFileInput');
  const selectBgFileBtn = document.getElementById('selectBgFileBtn');
  const cancelBgBtn = document.getElementById('cancelBgBtn');
  const saveBgBtn = document.getElementById('saveBgBtn');
  const bgPreviewArea = document.getElementById('bgPreviewArea');
  const bgPreviewText = document.getElementById('bgPreviewText');

  if (changeBgBtn && changeBgModal) {
    changeBgBtn.addEventListener('click', () => {
      bgFileInput.value = ''; 
      bgPreviewArea.style.backgroundImage = 'none';
      bgPreviewText.style.display = 'block'; 
      changeBgModal.classList.add('show');
    });
  }

  if (cancelBgBtn) cancelBgBtn.addEventListener('click', () => changeBgModal.classList.remove('show'));
  if (changeBgModal) changeBgModal.addEventListener('click', (e) => { if (e.target === changeBgModal) changeBgModal.classList.remove('show'); });
  if (selectBgFileBtn && bgFileInput) selectBgFileBtn.addEventListener('click', () => bgFileInput.click());

  if (bgFileInput) {
    bgFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          bgPreviewArea.style.backgroundImage = `url('${event.target.result}')`;
          bgPreviewText.style.display = 'none';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (saveBgBtn && container) {
    saveBgBtn.addEventListener('click', async () => {
      const file = bgFileInput.files[0];
      if (!file) return alert("이미지를 선택해주세요.");

      const formData = new FormData();
      formData.append('id', reportId);
      formData.append('inner_image', file);

      try {
        const res = await fetch('../php/update_report.php', { method: 'POST', body: formData });
        const result = await res.json();
        if (result.success) {
          container.style.backgroundImage = `url('${result.inner_image}')`;
          changeBgModal.classList.remove('show');
        } else alert(result.message);
      } catch(e) {
        console.error(e);
        alert('배경 저장 중 오류가 발생했습니다.');
      }
    });
  }
});