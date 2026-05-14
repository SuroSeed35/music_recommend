<?php
/**
 * SMTP 포트 차단 여부 테스트
 * 사용법: 닷홈에 업로드 후 브라우저에서 접속
 * 예: http://본인아이디.dothome.co.kr/smtp_test.php
 *
 * 테스트 후 보안상 반드시 삭제할 것
 */

header('Content-Type: text/html; charset=utf-8');

// PHP 에러 표시 (디버깅용)
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html><html><head><meta charset='utf-8'><title>SMTP 차단 테스트</title>";
echo "<style>
    body { font-family: 'Pretendard', sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #000; padding-bottom: 10px; }
    .test-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ccc; }
    .success { border-left-color: #22c55e; background: #f0fdf4; }
    .fail { border-left-color: #ef4444; background: #fef2f2; }
    .label { font-weight: bold; font-size: 18px; margin-bottom: 8px; }
    .detail { font-size: 14px; color: #666; font-family: monospace; background: #fff; padding: 8px; border-radius: 4px; margin-top: 8px; }
    .conclusion { background: #fef3c7; border-left-color: #f59e0b; font-size: 16px; padding: 25px; }
    .conclusion-success { background: #d1fae5; border-left-color: #10b981; }
    .conclusion-fail { background: #fee2e2; border-left-color: #ef4444; }
</style></head><body>";

echo "<h1>🔍 SMTP 포트 차단 여부 테스트</h1>";
echo "<p>닷홈 호스팅에서 외부 SMTP 서버 접근 가능 여부를 확인합니다.</p>";

$host = 'smtp.gmail.com';
$results = [];

// ==================== 테스트 1: 포트 587 (TLS) ====================
echo "<div class='test-box'>";
echo "<div class='label'>📡 Test 1: $host:587 (TLS)</div>";

$start = microtime(true);
$conn587 = @fsockopen($host, 587, $errno, $errstr, 10);
$elapsed = round((microtime(true) - $start) * 1000, 2);

if ($conn587) {
    $banner = fgets($conn587, 1024);
    echo "<div class='detail' style='color:#22c55e;'>✅ 연결 성공 ({$elapsed}ms)</div>";
    echo "<div class='detail'>서버 응답: " . htmlspecialchars(trim($banner)) . "</div>";
    fclose($conn587);
    $results['587'] = true;
} else {
    echo "<div class='detail' style='color:#ef4444;'>❌ 연결 실패 ({$elapsed}ms)</div>";
    echo "<div class='detail'>에러 코드: $errno</div>";
    echo "<div class='detail'>에러 메시지: " . htmlspecialchars($errstr) . "</div>";
    $results['587'] = false;
}
echo "</div>";

// ==================== 테스트 2: 포트 465 (SSL) ====================
echo "<div class='test-box'>";
echo "<div class='label'>📡 Test 2: $host:465 (SSL)</div>";

$start = microtime(true);
$conn465 = @fsockopen($host, 465, $errno, $errstr, 10);
$elapsed = round((microtime(true) - $start) * 1000, 2);

if ($conn465) {
    echo "<div class='detail' style='color:#22c55e;'>✅ 연결 성공 ({$elapsed}ms)</div>";
    echo "<div class='detail'>(SSL은 핸드셰이크 필요해서 배너 수신 불가, 연결 자체는 성공)</div>";
    fclose($conn465);
    $results['465'] = true;
} else {
    echo "<div class='detail' style='color:#ef4444;'>❌ 연결 실패 ({$elapsed}ms)</div>";
    echo "<div class='detail'>에러 코드: $errno</div>";
    echo "<div class='detail'>에러 메시지: " . htmlspecialchars($errstr) . "</div>";
    $results['465'] = false;
}
echo "</div>";

// ==================== 테스트 3: HTTPS 443 포트 (Resend API용 사전 점검) ====================
echo "<div class='test-box'>";
echo "<div class='label'>🌐 Test 3: api.resend.com:443 (HTTPS, 차선책 점검)</div>";

$start = microtime(true);
$conn443 = @fsockopen('api.resend.com', 443, $errno, $errstr, 10);
$elapsed = round((microtime(true) - $start) * 1000, 2);

if ($conn443) {
    echo "<div class='detail' style='color:#22c55e;'>✅ HTTPS 연결 가능 ({$elapsed}ms)</div>";
    fclose($conn443);
    $results['443'] = true;
} else {
    echo "<div class='detail' style='color:#ef4444;'>❌ HTTPS 차단됨 ({$elapsed}ms) — 이건 매우 이례적</div>";
    $results['443'] = false;
}
echo "</div>";

// ==================== 환경 정보 ====================
echo "<div class='test-box'>";
echo "<div class='label'>ℹ️ 서버 환경 정보</div>";
echo "<div class='detail'>PHP 버전: " . phpversion() . "</div>";
echo "<div class='detail'>OpenSSL: " . (extension_loaded('openssl') ? '✅ 사용 가능' : '❌ 없음') . "</div>";
echo "<div class='detail'>cURL: " . (extension_loaded('curl') ? '✅ 사용 가능' : '❌ 없음') . "</div>";
echo "<div class='detail'>allow_url_fopen: " . (ini_get('allow_url_fopen') ? '✅ 활성' : '❌ 비활성') . "</div>";
echo "</div>";

// ==================== 최종 결론 ====================
$smtpOk = $results['587'] || $results['465'];

if ($smtpOk) {
    echo "<div class='test-box conclusion conclusion-success'>";
    echo "<div class='label'>🎉 결론: Gmail SMTP 사용 가능</div>";
    echo "<p>외부 SMTP 포트가 열려있습니다. <b>원래 계획대로 PHPMailer + Gmail SMTP</b>로 진행하면 됩니다.</p>";
    echo "<p><b>다음 단계:</b> Gmail 앱 비밀번호 발급 → mail_config.php 생성 → 인증 메일 발송 구현</p>";
    echo "</div>";
} else {
    echo "<div class='test-box conclusion conclusion-fail'>";
    echo "<div class='label'>⚠️ 결론: SMTP 차단됨</div>";
    echo "<p>587, 465 포트가 모두 차단되어 Gmail SMTP는 사용 불가입니다.</p>";
    if ($results['443']) {
        echo "<p><b>다행히 HTTPS(443)는 열려있으므로 → Resend API 방식으로 전환 가능</b></p>";
    } else {
        echo "<p><b>HTTPS까지 막혀있어 외부 메일 발송 자체가 어렵습니다.</b> 닷홈 자체 mail() 함수만 사용 가능.</p>";
    }
    echo "</div>";
}

echo "<p style='margin-top:30px; color:#888; font-size:13px;'>";
echo "⚠️ 테스트 완료 후 이 파일은 <b>반드시 삭제</b>하세요. (서버 정보가 노출되어 있습니다)";
echo "</p>";

echo "</body></html>";
?>