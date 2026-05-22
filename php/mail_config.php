<?php
/**
 * Resend API 메일 발송 설정
 *
 * ⚠️ 보안 주의사항
 * 1. 이 파일은 Git에 절대 커밋하지 말 것 (.gitignore 추가 필수)
 * 2. 닷홈 업로드 후 권한을 600 또는 644로 설정
 * 3. 같은 폴더에 .htaccess로 직접 접근 차단 필수 (이미 설정됨)
 * 4. API Key가 노출되면 즉시 Resend 대시보드에서 폐기 후 재발급
 */

return [
    // ========== Resend API 설정 ==========
    'driver'      => 'resend',                    // 메일 전송 방식 식별자
    'api_key'     => 're_eHd6Qu38_CF1gci5z4buXC4uNE6uDijEA',  // ← Resend API Key (재발급 후 교체)
    'api_url'     => 'https://api.resend.com/emails',

    // ========== 발신자 정보 ==========
    // [현재] 도메인 인증 전 - Resend 기본 도메인 사용 (본인 가입 이메일로만 수신 가능)
    'from_email'  => 'onboarding@resend.dev',     // 도메인 인증 후 'noreply@yourdomain.com'으로 교체
    'from_name'   => '쉐어뮤직',                   // 수신자 메일함에 표시될 발신자명

    // ========== 인증 코드 정책 ==========
    'code_length'        => 6,                    // 인증코드 자릿수
    'code_expire_minutes'=> 5,                    // 만료 시간 (분)
    'resend_cooldown_sec'=> 60,                   // 재전송 쿨다운 (초)
    'max_attempts'       => 5,                    // 최대 시도 횟수

    // ========== 디버그 ==========
    'debug_mode'  => false,                       // true로 변경 시 API 응답 로그 출력 (개발 시에만)

    // ========== 레거시 SMTP 설정 (사용 안 함, 보존용) ==========
    // 추후 다른 호스팅으로 이전 시 사용 가능
    // 'host'        => 'smtp.gmail.com',
    // 'port'        => 587,
    // 'encryption'  => 'tls',
    // 'username'    => 'blank3pace00@gmail.com',
    // 'app_password'=> '',
];