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
// 2. 이메일 인증 상태 관리
// =========================================================
const verifyState = {
    sentEmail: null,       // 인증 메일이 발송된 이메일 주소
    verified: false,       // 인증 완료 여부
    expireTimerId: null,   // 만료 카운트다운 setInterval ID
    resendTimerId: null,   // 재전송 쿨다운 setInterval ID
    expireEndAt: 0,        // 만료 시각 (ms timestamp)
    resendEndAt: 0,        // 재전송 가능 시각 (ms timestamp)
};

function setupEmailVerification() {
    const emailInput   = document.getElementById('emailInput');
    const sendBtn      = document.getElementById('sendCodeBtn');
    const codeSection  = document.getElementById('codeSection');
    const codeInput    = document.getElementById('codeInput');
    const verifyBtn    = document.getElementById('verifyCodeBtn');
    const resendBtn    = document.getElementById('resendBtn');
    const timerText    = document.getElementById('timerText');
    const emailStatus  = document.getElementById('emailStatus');
    const codeStatus   = document.getElementById('codeStatus');
    const submitBtn    = document.getElementById('submitBtn');

    if (!emailInput || !sendBtn) return; // signup.html 외 페이지에선 실행 안 함

    // -------------------- 헬퍼 --------------------
    function setStatus(el, msg, type) {
        // type: 'success' | 'error' | 'info' | ''
        el.textContent = msg || '';
        el.className = 'status-msg' + (type ? ' status-' + type : '');
    }

    function formatTime(ms) {
        if (ms < 0) ms = 0;
        const totalSec = Math.ceil(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function clearExpireTimer() {
        if (verifyState.expireTimerId) {
            clearInterval(verifyState.expireTimerId);
            verifyState.expireTimerId = null;
        }
    }

    function clearResendTimer() {
        if (verifyState.resendTimerId) {
            clearInterval(verifyState.resendTimerId);
            verifyState.resendTimerId = null;
        }
    }

    function startExpireTimer(minutes) {
        clearExpireTimer();
        verifyState.expireEndAt = Date.now() + minutes * 60 * 1000;
        timerText.classList.remove('timer-urgent');

        const tick = () => {
            const remain = verifyState.expireEndAt - Date.now();
            if (remain <= 0) {
                timerText.textContent = '만료됨';
                timerText.classList.add('timer-urgent');
                clearExpireTimer();
                verifyBtn.disabled = true;
                codeInput.disabled = true;
                setStatus(codeStatus, '인증 코드가 만료되었습니다. 재전송을 눌러주세요.', 'error');
                return;
            }
            timerText.textContent = '남은 시간 ' + formatTime(remain);
            if (remain <= 60_000) timerText.classList.add('timer-urgent');
        };
        tick();
        verifyState.expireTimerId = setInterval(tick, 1000);
    }

    function startResendCooldown(seconds) {
        clearResendTimer();
        verifyState.resendEndAt = Date.now() + seconds * 1000;
        resendBtn.disabled = true;

        const tick = () => {
            const remain = verifyState.resendEndAt - Date.now();
            if (remain <= 0) {
                resendBtn.disabled = false;
                resendBtn.textContent = '재전송';
                clearResendTimer();
                return;
            }
            resendBtn.textContent = `재전송 (${Math.ceil(remain / 1000)}s)`;
        };
        tick();
        verifyState.resendTimerId = setInterval(tick, 1000);
    }

    function updateSubmitState() {
        if (verifyState.verified) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }

    // -------------------- 인증 메일 발송 --------------------
    async function sendVerificationCode() {
        const email = emailInput.value.trim();

        if (!email) {
            setStatus(emailStatus, '이메일을 입력해주세요.', 'error');
            return;
        }
        // 간단한 클라이언트측 검증 (서버에서도 재검증함)
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setStatus(emailStatus, '올바른 이메일 형식이 아닙니다.', 'error');
            return;
        }

        sendBtn.disabled = true;
        sendBtn.textContent = '발송 중...';
        setStatus(emailStatus, '', '');

        try {
            const fd = new FormData();
            fd.append('email', email);
            const res = await fetch('../php/send_verification.php', { 
                method: 'POST', 
                body: fd,
                redirect: 'error' // 👈 이 줄을 추가하세요!
            });
            const data = await res.json();

            if (data.success) {
                verifyState.sentEmail = email;
                verifyState.verified = false;
                updateSubmitState();

                codeSection.hidden = false;
                codeInput.disabled = false;
                codeInput.value = '';
                verifyBtn.disabled = false;
                emailInput.readOnly = true;     // 이메일 변경 방지 (재전송 위해선 새로고침)

                sendBtn.textContent = '재발송';
                sendBtn.disabled = true;        // 인증 버튼은 잠그고, 재전송은 codeSection의 버튼으로

                setStatus(emailStatus, data.message, 'success');
                setStatus(codeStatus, '', '');

                startExpireTimer(data.expire_minutes || 5);
                startResendCooldown(data.cooldown_seconds || 60);
                codeInput.focus();
            } else {
                sendBtn.disabled = false;
                sendBtn.textContent = '인증';
                setStatus(emailStatus, data.message || '발송 실패', 'error');
                // 쿨다운 응답이 온 경우 재시도 차단
                if (data.cooldown_seconds) {
                    sendBtn.disabled = true;
                    let remain = data.cooldown_seconds;
                    const tid = setInterval(() => {
                        remain--;
                        sendBtn.textContent = `인증 (${remain}s)`;
                        if (remain <= 0) {
                            clearInterval(tid);
                            sendBtn.disabled = false;
                            sendBtn.textContent = '인증';
                        }
                    }, 1000);
                }
            }
        } catch (err) {
            sendBtn.disabled = false;
            sendBtn.textContent = '인증';
            setStatus(emailStatus, '서버 통신 오류가 발생했습니다.', 'error');
        }
    }

    // -------------------- 재전송 --------------------
    async function resendVerificationCode() {
        if (!verifyState.sentEmail) return;

        resendBtn.disabled = true;
        resendBtn.textContent = '발송 중...';

        try {
            const fd = new FormData();
            fd.append('email', verifyState.sentEmail);
            const res = await fetch('../php/send_verification.php', { 
                method: 'POST', 
                body: fd,
                redirect: 'error' // 👈 이 줄을 추가하세요!
            });
            const data = await res.json();

            if (data.success) {
                verifyState.verified = false;
                updateSubmitState();
                codeInput.value = '';
                codeInput.disabled = false;
                verifyBtn.disabled = false;
                setStatus(codeStatus, '인증 코드를 다시 보냈습니다.', 'success');
                startExpireTimer(data.expire_minutes || 5);
                startResendCooldown(data.cooldown_seconds || 60);
            } else {
                setStatus(codeStatus, data.message || '재전송 실패', 'error');
                if (data.cooldown_seconds) {
                    startResendCooldown(data.cooldown_seconds);
                } else {
                    resendBtn.disabled = false;
                    resendBtn.textContent = '재전송';
                }
            }
        } catch (err) {
            resendBtn.disabled = false;
            resendBtn.textContent = '재전송';
            setStatus(codeStatus, '서버 통신 오류가 발생했습니다.', 'error');
        }
    }

    // -------------------- 코드 검증 --------------------
    async function verifyCode() {
        const code = codeInput.value.trim();
        if (!/^\d{6}$/.test(code)) {
            setStatus(codeStatus, '6자리 숫자를 입력해주세요.', 'error');
            return;
        }
        if (!verifyState.sentEmail) {
            setStatus(codeStatus, '먼저 인증 메일을 받아주세요.', 'error');
            return;
        }

        verifyBtn.disabled = true;
        verifyBtn.textContent = '확인 중';

        try {
            const fd = new FormData();
            fd.append('email', verifyState.sentEmail);
            fd.append('code', code);
            const res = await fetch('../php/verify_code.php', { 
                method: 'POST', 
                body: fd,
                redirect: 'error' // 👈 이 줄을 추가하세요!
            });
            const data = await res.json();

            if (data.success) {
                // 인증 성공 처리
                verifyState.verified = true;
                clearExpireTimer();
                clearResendTimer();

                codeInput.disabled = true;
                verifyBtn.disabled = true;
                verifyBtn.textContent = '완료';
                resendBtn.disabled = true;
                timerText.textContent = '✓ 인증 완료';
                timerText.classList.remove('timer-urgent');
                timerText.classList.add('timer-done');

                emailInput.classList.add('input-verified');
                setStatus(emailStatus, '✓ 이메일 인증이 완료되었습니다.', 'success');
                setStatus(codeStatus, '', '');

                updateSubmitState();
            } else {
                verifyBtn.disabled = false;
                verifyBtn.textContent = '확인';

                let msg = data.message || '인증 실패';
                if (typeof data.attempts_left === 'number') {
                    msg += ` (남은 시도: ${data.attempts_left}회)`;
                }
                setStatus(codeStatus, msg, 'error');

                if (data.expired || data.exceeded) {
                    codeInput.disabled = true;
                    verifyBtn.disabled = true;
                }
            }
        } catch (err) {
            verifyBtn.disabled = false;
            verifyBtn.textContent = '확인';
            setStatus(codeStatus, '서버 통신 오류가 발생했습니다.', 'error');
        }
    }

    // -------------------- 이벤트 바인딩 --------------------
    sendBtn.addEventListener('click', sendVerificationCode);
    verifyBtn.addEventListener('click', verifyCode);
    resendBtn.addEventListener('click', resendVerificationCode);

    // 코드 입력란: 숫자만 허용
    codeInput.addEventListener('input', () => {
        codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6);
    });
    // Enter로 확인 가능
    codeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            verifyCode();
        }
    });

    // 이메일 input 변경 시 → 인증 상태 초기화 (보안)
    emailInput.addEventListener('input', () => {
        if (verifyState.sentEmail && emailInput.value.trim() !== verifyState.sentEmail) {
            // 이메일이 바뀌면 모든 인증 상태 초기화
            verifyState.sentEmail = null;
            verifyState.verified = false;
            clearExpireTimer();
            clearResendTimer();
            codeSection.hidden = true;
            codeInput.value = '';
            emailInput.readOnly = false;
            emailInput.classList.remove('input-verified');
            sendBtn.disabled = false;
            sendBtn.textContent = '인증';
            setStatus(emailStatus, '', '');
            setStatus(codeStatus, '', '');
            updateSubmitState();
        }
    });

    updateSubmitState();
}

// =========================================================
// 3. 로그인 & 회원가입 폼 제출 제어
// =========================================================
function setupForms() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    // 로그인 처리 (기존 그대로)
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
                    document.body.innerHTML = `
                    <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#fff; font-family:'Pretendard', sans-serif;">
                        <div style="font-size:40px; font-weight:600; color:#333; animation: fadeOut 1.5s forwards;">환영합니다.<br>좋은 하루 보내세요!</div>
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

    // 회원가입 처리 (인증 가드 추가)
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const errorBox = document.getElementById('signup-error');
            errorBox.style.display = 'none';

            // ⭐ 가드: 이메일 인증이 안 됐으면 차단
            if (!verifyState.verified) {
                errorBox.innerText = '이메일 인증을 먼저 완료해주세요.';
                errorBox.style.display = 'block';
                return;
            }

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

// 4. 페이지 로드 시 실행
document.addEventListener("DOMContentLoaded", () => {
    typeWriter(); 
    setupForms();
    setupEmailVerification();
});