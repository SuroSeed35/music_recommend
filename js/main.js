const API_KEY = 'AIzaSyCt0IU7JkAU4STwlj8o13l0XCmQmWKqwV4'; 
const actionBtn = document.getElementById("action-btn");
const urlInput = document.getElementById("url-input");
const commentInput = document.getElementById("comment-input");
const mainImage = document.getElementById("main-image");

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('../php/api.php?action=check_today_recommend');
        const data = await res.json();

        // 오늘 이미 등록했다면 리스트 페이지로 즉시 이동
        if (data.already_done) {
            window.location.href = "music_list.html";
        }
    } catch (e) {
        console.error("체크 실패:", e);
    }
});

/**
 * 유튜브 URL에서 비디오 ID를 추출합니다.
 */
function getYouTubeID(url) {
    const reg = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(reg);
    return (match && match[7].length === 11) ? match[7] : null;
}

/**
 * URL 입력 시 썸네일을 업데이트합니다.
 * 로드 전에는 회색 배경이 유지되도록 처리합니다.
 */
urlInput.addEventListener("input", () => {
    const videoId = getYouTubeID(urlInput.value.trim());
    
    if (videoId) {
        const thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        mainImage.src = thumbUrl;
        
        // 이미지 로딩 완료 시 'loaded' 클래스 추가하여 화면에 표시
        mainImage.onload = () => {
            mainImage.classList.add('loaded');
        };
    } else {
        // ID가 없거나 잘못된 경우 이미지 초기화 및 숨김[cite: 2]
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
 * 추천 버튼 클릭 시 데이터를 서버에 저장합니다.
 */
actionBtn.onclick = async (e) => {
    e.preventDefault();
    
    const videoId = getYouTubeID(urlInput.value.trim());
    const comment = commentInput.value.trim();

    if (!videoId || !comment) return alert("내용을 입력하세요.");

    // 버튼 상태 업데이트
    actionBtn.innerText = "저장 중...";
    actionBtn.disabled = true;

    // 영상 정보 가져오기
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

    // 서버로 데이터 전송
    fetch('../php/save_song.php', {
        method: 'POST',
        body: formData
    })
    .then(async response => {
        const text = await response.text(); 
        try {
            return JSON.parse(text); // JSON 변환 시도
        } catch (e) {
            throw new Error("서버 응답이 올바르지 않습니다: " + text); 
        }
    })
    .then(result => {
        if (result.success) {
            // 성공 시 리스트 페이지로 이동
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