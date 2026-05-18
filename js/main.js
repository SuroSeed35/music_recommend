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

    // ⏱️ 4초 안에 응답이 없으면 요청을 중단시키는 장치
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    fetch('../php/save_song.php', {
        method: 'POST',
        body: formData,
        signal: controller.signal   // 타임아웃 연결
    })
    .then(async response => {
        clearTimeout(timeoutId);     // 응답 왔으면 타이머 해제
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
        clearTimeout(timeoutId);
        // ⏱️ 타임아웃(abort)으로 끊긴 경우: 저장 자체는 이미 됐으므로 그냥 이동
        if (error.name === 'AbortError') {
            window.location.href = "music_list.html";
            return;
        }
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

// ==========================================
// [1단계] 웹 브라우저 푸시 알림 권한 및 토큰 발급
// ==========================================

// 1. 파이어베이스 환경 설정 (콘솔 -> 프로젝트 설정 -> 일반 탭 하단 내 앱에서 확인 가능)
const firebaseConfig = {
    apiKey: "AIzaSyBD61ToNb3GEgNKRw_-IUN97Z4fCoDiYK8",
    authDomain: "musicrecommend-c0498.firebaseapp.com",
    projectId: "musicrecommend-c0498",
    storageBucket: "musicrecommend-c0498.appspot.com",
    messagingSenderId: "20112939467",
    appId: "1:20112939467:web:dc417a49069b1c402e7e4e"
};

// 파이어베이스 초기화 (이미 초기화되지 않았을 때만)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const messaging = firebase.messaging();

// 2. 알림 권한 요청 및 토큰 발급 함수
function requestWebNotificationPermission() {
    console.log("알림 권한을 요청합니다...");

    Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
            console.log("알림 권한이 허용되었습니다!");
            
            // ⭐️ 여기에 아까 발급받은 VAPID KEY를 넣으세요 ⭐️
            const vapidKey = "BLCD3S1nUVHykSOT-RWV0gbfJlb4JphfTfMWSH5Qa-zHtoKVdxZ5a6hF-qQfT8wdkm-Pi3AjZt-2OuoFEA1MgG4"; 

            messaging.getToken({ vapidKey: vapidKey })
                .then((currentToken) => {
                    if (currentToken) {
                        console.log("웹 FCM 토큰 발급 성공:", currentToken);
                        
                        // 서버 DB에 토큰 저장 (기존에 만들어두신 API 활용)
                        saveTokenToServer(currentToken);
                    } else {
                        console.log("토큰을 가져올 수 없습니다. 등록을 확인하세요.");
                    }
                }).catch((err) => {
                    console.log("토큰 가져오기 에러:", err);
                });
        } else {
            console.log("사용자가 알림 권한을 거부했습니다.");
        }
    });
}

// 3. 서버로 토큰을 전송하는 함수 (기존 receiveTokenFromAndroid와 거의 동일)
function saveTokenToServer(token) {
    const formData = new FormData();
    formData.append('fcm_token', token);

    fetch('../php/update_token.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.text())
    .then(result => console.log('웹 토큰 DB 저장 완료:', result))
    .catch(error => console.error('웹 토큰 저장 실패:', error));
}

// 4. 페이지가 로드될 때 알림 권한을 한 번 물어보도록 실행
document.addEventListener('DOMContentLoaded', () => {
    // 브라우저가 알림을 지원하는지 확인 후 실행
    if ('Notification' in window) {
        requestWebNotificationPermission();
    }
});