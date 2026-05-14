<?php
/**
 * Gmail SMTP 메일 발송 설정
 *
 * ⚠️ 보안 주의사항
 * 1. 이 파일은 Git에 절대 커밋하지 말 것 (.gitignore 추가 필수)
 * 2. 닷홈 업로드 후 권한을 600 또는 644로 설정
 * 3. 같은 폴더에 .htaccess로 직접 접근 차단 권장 (아래 코드 별도 제공)
 */

return [
    // ========== SMTP 서버 설정 ==========
    'host'        => 'smtp.gmail.com',
    'port'        => 587,                   // TLS 포트 (465는 SSL)
    'encryption'  => 'tls',                 // 'tls' 또는 'ssl'

    // ========== 인증 정보 (반드시 수정) ==========
    'username'    => 'blank3pace00@gmail.com',    // ← 본인 Gmail 주소로 변경
    'app_password'=> 'ncnv apub ipny gfua',     // ← 발급받은 16자리 앱 비밀번호 (공백 포함 그대로)

    // ========== 발신자 정보 ==========
    'from_email'  => 'blank3pace00@gmail.com',    // ← username과 동일하게
    'from_name'   => '쉐어뮤직',                  // 수신자 메일함에 표시될 발신자명

    // ========== 인증 코드 정책 ==========
    'code_length'        => 6,              // 인증코드 자릿수
    'code_expire_minutes'=> 5,              // 만료 시간 (분)
    'resend_cooldown_sec'=> 60,             // 재전송 쿨다운 (초)
    'max_attempts'       => 5,              // 최대 시도 횟수

    // ========== 디버그 ==========
    'debug_mode'  => false,                 // true로 변경 시 SMTP 통신 로그 출력 (개발 시에만)
];