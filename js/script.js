// 1. 타이핑 효과 설정
const contents = ["Welcome", "( ´ ▽ ` )ﾉ", "Welcome", "ꉂꉂ(ᵔᗜᵔ*)"];
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

// 2. 로그인 유효성 검사 로직
function handleLogin() {
    const loginForm = document.querySelector('.login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', function(e) {
        // 아이디와 비밀번호 입력 필드 가져오기
        const idInput = document.querySelector('input[name="login_id"]');
        const pwInput = document.querySelector('input[name="password"]');

        // 값이 비어있을 때만 제출을 막고 경고창을 띄움
        if (idInput.value.trim() === "" || pwInput.value.trim() === "") {
            e.preventDefault(); 
            alert("아이디와 비밀번호를 모두 입력해주세요.");
        }
        // 성공 시 main.html로 보내는 window.location.href 로직을 삭제했습니다.
        // 이제 폼은 정상적으로 ../php/login.php로 전송됩니다.
    });
}

// 3. 페이지 로드 시 실행
document.addEventListener("DOMContentLoaded", () => {
    typeWriter(); 
    handleLogin(); 
});

function showModal(message, redirectUrl = null) {
    const modal = document.getElementById('customModal');
    const msgTag = document.getElementById('modalMessage');
    
    if(!modal || !msgTag) return;

    msgTag.innerText = message;
    modal.style.display = 'flex';

    window.closeModal = function() {
        modal.style.display = 'none';
        if (redirectUrl) {
            location.href = redirectUrl;
        }
    }
}