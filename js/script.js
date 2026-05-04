// 1. 타이핑 애니메이션
const contents = ["Welcome", "(   ` ) ", "Welcome", " *)"];
let contentIndex = 0; 
let charIndex = 0;    

function typeWriter() {
    const target = document.getElementById("typing-text");
    if (!target) return;
    const currentText = contents[contentIndex];
    if (charIndex < currentText.length) {
        target.innerHTML += currentText.charAt(charIndex);
        charIndex++;
        setTimeout(typeWriter, 180);
    } else {
        setTimeout(() => {
            target.innerHTML = "";      
            charIndex = 0;              
            contentIndex++;             
            if (contentIndex >= contents.length) {
                contentIndex = 0;
            }
            typeWriter();
        }, 1200);
    }
}

// 2. 로그인 & 회원가입 폼 제출 제어
function setupForms() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    // 로그인 처리
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // 폼 기본 제출 막기
            const errorBox = document.getElementById('login-error');
            errorBox.style.display = 'none'; // 에러 박스 초기화

            const formData = new FormData(loginForm);
            
            try {
                const res = await fetch('../php/login.php', { method: 'POST', body: formData });
                const data = await res.json();

                if (data.success) {
                    // 성공 시 기존 PHP가 하던 환영 애니메이션을 JS로 그려줌
                    document.body.innerHTML = `
                    <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#fff; font-family:'Pretendard', sans-serif;">
                        <div style="font-size:40px; font-weight:600; color:#333; animation: fadeOut 1.5s forwards;">환영합니다.<br>좋은 하루 보내세요!</div>
                    </div>
                    <style>@keyframes fadeOut { 0%{opacity:0; transform:translateY(10px);} 20%{opacity:1; transform:translateY(0);} 80%{opacity:1;} 100%{opacity:0;} }</style>`;
                    setTimeout(() => { location.replace(data.redirect); }, 1300);
                } else {
                    // 실패 시 빨간 에러 메시지 표시
                    errorBox.innerText = data.message;
                    errorBox.style.display = 'block';
                }
            } catch (err) {
                errorBox.innerText = "서버 통신 오류가 발생했습니다.";
                errorBox.style.display = 'block';
            }
        });
    }

    // 회원가입 처리
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // 폼 기본 제출 막기
            const errorBox = document.getElementById('signup-error');
            errorBox.style.display = 'none'; // 에러 박스 초기화

            const formData = new FormData(signupForm);

            try {
                const res = await fetch('../php/signup.php', { method: 'POST', body: formData });
                const data = await res.json();

                if (data.success) {
                    // 성공 시 기존 PHP가 하던 환영 애니메이션을 JS로 그려줌
                    document.body.innerHTML = `
                    <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#fff; font-family:'Pretendard', sans-serif;">
                        <div style="font-size:40px; font-weight:600; color:#333; text-align:center; animation: fadeOut 1.5s forwards;">가입 완료!<br>환영합니다!</div>
                    </div>
                    <style>@keyframes fadeOut { 0%{opacity:0; transform:translateY(10px);} 20%{opacity:1; transform:translateY(0);} 80%{opacity:1;} 100%{opacity:0;} }</style>`;
                    setTimeout(() => { location.replace('../html/login.html'); }, 1300);
                } else {
                    // 실패 시 빨간 에러 메시지 표시 (중복 아이디 등)
                    errorBox.innerText = data.message;
                    errorBox.style.display = 'block';
                }
            } catch (err) {
                errorBox.innerText = "서버 통신 오류가 발생했습니다.";
                errorBox.style.display = 'block';
            }
        });
    }
}

// 3. 페이지 로드 시 실행
document.addEventListener("DOMContentLoaded", () => {
    typeWriter(); 
    setupForms(); // 폼 가로채기 활성화
});