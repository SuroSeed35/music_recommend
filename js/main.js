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
 * 🟢 안드로이드 네이티브 코드에서 이 함수를 호출하여 토큰을 넘겨줍니다 🟢
 */
function receiveTokenFromAndroid(token) {
    const formData = new FormData();
    formData.append('fcm_token', token);

    fetch('../php/update_token.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.text())
    .then(result => console.log('안드로이드 토큰 업데이트 완료:', result))
    .catch(error => console.error('토큰 업데이트 실패:', error));
}

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
 * 추천 버튼 클릭 시 데이터를 서버에 저장합니다.
 */
actionBtn.onclick = async (e) => {
    e.preventDefault();
    
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
    formData.append('url', urlInput.value.trim());
    formData.append('comment', comment);
    formData.append('title', info.title);
    formData.append('thumb', `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);

    fetch('../php/save_song.php', {
        method: 'POST',
        body: formData
    })
    .then(async response => {
        const text = await response.text(); 
        try {
            return JSON.parse(text); 
        } catch (e) {
            throw new Error("서버 응답이 올바르지 않습니다: " + text); 
        }
    })
    .then(result => {
        if (result.success) {
            window.location.href = "music_list.html"; 
        } else {
            alert(result.message);
            actionBtn.innerText = "이 노래로 추천하기";
            actionBtn.disabled = false;
        }
    })
    .catch(error => {
        console.error('상세 에러:', error);
        alert("오류 발생: " + error.message);
        actionBtn.innerText = "이 노래로 추천하기";
        actionBtn.disabled = false;
    });
};

// --- 글자 수 실시간 카운팅 기능 ---
// --- 글자 수 실시간 카운팅 및 강제 제한 기능 ---
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