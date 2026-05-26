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

// =========================================================
// 2. 로그인 & 회원가입 폼 제출 제어
// =========================================================
function setupForms() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    // 로그인 처리
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const errorBox = document.getElementById('login-error');
            errorBox.style.display = 'none';

            const formData = new FormData(loginForm);
            
            try {
                const res = await fetch('../php/login.php', { method: 'POST', body: formData });
                const data = await res.json();

                if (data.success) {
                    // 로그인 전용 랜덤 덕담 배열
                    const loginGreetings = [
                        "환영합니다.<br>오늘도 멋진 하루가 될 거예요!",
                        "환영합니다.<br>당신의 하루를 응원합니다!",
                        "반가워요!<br>행복이 가득한 하루 보내세요!",
                        "보고 싶었어요.<br>수고했어요, 오늘도!",
                        "환영합니다.<br>좋은 음악과 함께 활기찬 하루!",
                        "반가워요!<br>오늘 하루도 빛날 거예요!",
                        "환영합니다.<br>기분 좋은 일만 가득하길 바라요!"
                    ];
                    
                    const randomMsg = loginGreetings[Math.floor(Math.random() * loginGreetings.length)];

                    document.body.innerHTML = `
                    <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#fff; font-family:'Pretendard', sans-serif;">
                        <div style="font-size:35px; font-weight:600; color:#333; text-align:center; line-height: 1.5; animation: fadeOut 1.5s forwards;">${randomMsg}</div>
                    </div>
                    <style>@keyframes fadeOut { 0%{opacity:0; transform:translateY(10px);} 20%{opacity:1; transform:translateY(0);} 80%{opacity:1;} 100%{opacity:0;} }</style>`;
                    
                    setTimeout(() => { location.replace(data.redirect); }, 1300);
                } else {
                    errorBox.innerText = data.message;
                    errorBox.style.display = 'block';
                }
            } catch (err) {
                errorBox.innerText = "서버 통신 오류가 발생했습니다.";
                errorBox.style.display = 'block';
            }
        });
    }

    // 회원가입 처리 (이메일 인증 가드 제거됨)
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const errorBox = document.getElementById('signup-error');
            errorBox.style.display = 'none';

            const formData = new FormData(signupForm);

            try {
                const res = await fetch('../php/signup.php', { method: 'POST', body: formData });
                const data = await res.json();

                if (data.success) {
                    document.body.innerHTML = `
                    <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#fff; font-family:'Pretendard', sans-serif;">
                        <div style="font-size:40px; font-weight:600; color:#333; text-align:center; animation: fadeOut 1.5s forwards;">가입 완료!<br>환영합니다!</div>
                    </div>
                    <style>@keyframes fadeOut { 0%{opacity:0; transform:translateY(10px);} 20%{opacity:1; transform:translateY(0);} 80%{opacity:1;} 100%{opacity:0;} }</style>`;
                    setTimeout(() => { location.replace('../html/login.html'); }, 1300);
                } else {
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
    setupForms();
});