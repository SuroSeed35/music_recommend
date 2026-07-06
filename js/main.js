const API_KEY = 'AIzaSyCt0IU7JkAU4STwlj8o13l0XCmQmWKqwV4'; 
const actionBtn = document.getElementById("action-btn");
const urlInput = document.getElementById("url-input");
const commentInput = document.getElementById("comment-input");
const mainImage = document.getElementById("main-image");

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('../php/api.php?action=check_today_recommend');
        const data = await res.json();

        // 👇 서버에서 권한 없음(Unauthorized)을 뱉으면 로그인으로 튕겨냄
        if (data.error === "Unauthorized") {
            window.location.replace("login.html");
            return;
        }

        // 오늘 이미 등록했다면 리스트 페이지로 즉시 이동
        if (data.already_done) {
            window.location.replace("music_list.html");
        }
    } catch (e) {
        console.error("체크 실패:", e);
    }
});

/**
 * 유튜브 URL에서 비디오 ID를 추출합니다.
 */
function getYouTubeID(url) {
    const reg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(reg);
    return (match && match[1].length === 11) ? match[1] : null;
}

/**
 * URL 입력 시 썸네일을 업데이트합니다.
 */
urlInput.addEventListener("input", () => {
    const videoId = getYouTubeID(urlInput.value.trim());
    
    if (videoId) {
        // 1. 기본적으로 최고화질(maxresdefault) 이미지를 호출합니다.
        mainImage.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        
        // 2. 이미지가 로드되었을 때 크기를 검사합니다.
        mainImage.onload = () => {
            if (mainImage.naturalWidth === 120 && mainImage.src.includes('maxresdefault')) {
                mainImage.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            } else {
                mainImage.classList.add('loaded');
            }
        };

        // 3. (혹시 모를 대비) 아예 로드 에러(404)가 나는 경우
        mainImage.onerror = () => {
            if (mainImage.src.includes('maxresdefault.jpg')) {
                mainImage.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            } else {
                mainImage.src = `https://img.youtube.com/vi/${videoId}/0.jpg`;
            }
        };
    } else {
        mainImage.src = "";
        mainImage.classList.remove('loaded');
    }
});


/**
 * 유튜브 API를 통해 영상 제목을 가져옵니다.
 */
async function getYouTubeDetails(videoId) {
    try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.items && data.items.length > 0) return { title: data.items[0].snippet.title };
        return null;
    } catch (e) { 
        return null; 
    }
}

/**
 * 데이터를 서버에 저장하는 함수 (forceSave 플래그 추가)
 */
async function submitSong(forceSave = false) {
    const videoId = getYouTubeID(urlInput.value.trim());
    const comment = commentInput.value.trim();

    if (!videoId || !comment) return alert("내용을 입력하세요.");

    actionBtn.innerText = "저장 중...";
    actionBtn.disabled = true;

    const info = await getYouTubeDetails(videoId);
    if (!info) {
        alert("영상 정보를 가져올 수 없습니다.");
        actionBtn.innerText = "이 노래로 추천하기";
        actionBtn.disabled = false;
        return;
    }

    const formData = new FormData();
    // 💡 URL을 표준 형태로 통일해서 저장
    const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;
    formData.append('url', standardUrl);
    formData.append('comment', comment);
    formData.append('title', info.title);
    formData.append('thumb', mainImage.src);
    
    // 💡 백엔드에 강제 저장 여부를 알려줌 (true면 1, false면 0)
    formData.append('force_save', forceSave ? '1' : '0');

    // ⏱️ 4초 안에 응답이 없으면 요청을 중단시키는 장치
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    fetch('../php/save_song.php', {
        method: 'POST',
        body: formData,
        signal: controller.signal
    })
    .then(async response => {
        clearTimeout(timeoutId);
        const text = await response.text(); 
        try {
            return JSON.parse(text); 
        } catch (e) {
            throw new Error("서버 응답이 올바르지 않습니다: " + text); 
        }
    })
    .then(result => {
        if (result.success) {
            // ✅ 성공
            showFullScreenGreetingAndRedirect("music_list.html"); 
        } else if (result.is_duplicate) {
            // 💡 중복 알림이 온 경우: 브라우저 경고창(confirm) 대신 모달 띄우기
            showDuplicateModal(result.duplicates);
        } else {
            alert(result.message);
            actionBtn.innerText = "이 노래로 추천하기";
            actionBtn.disabled = false;
        }
    })
    .catch(error => {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            // ✅ 타임아웃 방어 시에도 랜덤 덕담 띄우기 함수 호출
            showFullScreenGreetingAndRedirect("music_list.html"); 
            return;
        }
        console.error('상세 에러:', error);
        alert("오류 발생: " + error.message);
        actionBtn.innerText = "이 노래로 추천하기";
        actionBtn.disabled = false;
    });
}

/**
 * 추천 버튼 클릭 시 이벤트
 */
actionBtn.onclick = (e) => {
    e.preventDefault();
    // 처음 클릭할 때는 강제 저장이 아니므로 false로 함수 호출
    submitSong(false); 
};

// --- 글자 수 실시간 카운팅 기능 ---
const charCountDisplay = document.getElementById("char-count");

if (commentInput && charCountDisplay) {
    commentInput.addEventListener("input", () => {
        
        // 🚨 핵심 방어 로직: 50자가 넘으면 50번째 글자까지만 남기고 강제로 잘라버립니다!
        if (commentInput.value.length > 50) {
            commentInput.value = commentInput.value.substring(0, 50);
        }

        // 현재 입력된 글자 수 계산
        const currentLength = commentInput.value.length;
        charCountDisplay.innerText = `${currentLength} / 50자`;

        // 50자가 꽉 차면 숫자를 빨간색으로 변경
        if (currentLength >= 50) {
            charCountDisplay.style.color = "#ff4d4f";
            charCountDisplay.style.fontWeight = "bold";
        } else {
            charCountDisplay.style.color = "#888";
            charCountDisplay.style.fontWeight = "normal";
        }
    });
}

/**
 * 🍞 랜덤 덕담 풀스크린 애니메이션 후 이동하는 함수
 */
function showFullScreenGreetingAndRedirect(url) {
    const greetings = [
        "오늘도 멋진 하루가 될 거예요!",
        "당신의 하루를 진심으로 응원합니다!",
        "행복이 가득한 하루 보내세요!",
        "수고했어요, 오늘도!",
        "좋은 음악과 함께 활기찬 하루!",
        "오늘 하루도 반짝반짝 빛날 거예요!",
        "기분 좋은 일만 가득하길 바라요!",
        "당신의 추천이 누군가에겐 큰 기쁨이 됩니다 🎧",
        "오늘도 무사히, 그리고 행복하게!",
        "당신의 음악 취향, 정말 멋져요!"
    ];

    const randomMsg = greetings[Math.floor(Math.random() * greetings.length)];

    document.body.innerHTML = `
    <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#fff; font-family:'Pretendard', sans-serif;">
        <div style="font-size:35px; font-weight:600; color:#333; animation: fadeOut 1.5s forwards; text-align: center; line-height: 1.5; word-break: keep-all;">
            ${randomMsg}
        </div>
    </div>
    <style>@keyframes fadeOut { 0%{opacity:0; transform:translateY(10px);} 20%{opacity:1; transform:translateY(0);} 80%{opacity:1;} 100%{opacity:0;} }</style>`;
    
    setTimeout(() => { 
        window.location.replace(url); 
    }, 1300);
}

/**
 * 💡 중복 노래 확인 모달을 띄우는 함수
 */
function showDuplicateModal(duplicates) {
    const modal = document.getElementById('duplicateModal');
    const listContainer = document.getElementById('duplicateList');
    
    // 리스트 영역 초기화
    listContainer.innerHTML = '';

    // 서버에서 받은 중복 노래 리스트를 HTML로 만들어 넣기
    duplicates.forEach(dup => {
        const item = document.createElement('div');
        item.style.marginBottom = '8px';
        item.style.paddingBottom = '8px';
        item.style.borderBottom = '1px solid #ddd';
        
        item.innerHTML = `
            <div style="font-weight: 600; color: #222; margin-bottom: 2px;">${dup.title}</div>
            <div style="font-size: 11px; color: #888;">추천일: ${dup.log_date}</div>
        `;
        listContainer.appendChild(item);
    });

    // 모달 보여주기
    modal.style.display = 'flex';

    // [그대로 추천하기] 버튼 클릭 시
    document.getElementById('dupConfirmBtn').onclick = () => {
        modal.style.display = 'none'; // 모달 닫기
        submitSong(true); // 플래그를 true로 주고 '강제 저장' 다시 실행!
    };

    // [취소] 버튼 클릭 시
    document.getElementById('dupCancelBtn').onclick = () => {
        modal.style.display = 'none'; // 모달 닫기
        actionBtn.innerText = "이 노래로 추천하기";
        actionBtn.disabled = false; // 메인 버튼 원상복구
    };
}