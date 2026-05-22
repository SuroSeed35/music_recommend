<?php
/**
 * 이메일 인증 코드 발송 (Resend API 버전)
 * 위치: php/send_verification.php
 *
 * 입력 (POST): email
 * 출력 (JSON): { success, message, cooldown_seconds?, expire_minutes? }
 */

header('Content-Type: application/json; charset=utf-8');

// --- CORS 설정 ---
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// --- OPTIONS 프리플라이트 ---
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// --- POST가 아닐 때 ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => '잘못된 요청 방식입니다. (현재 방식: ' . $_SERVER['REQUEST_METHOD'] . ')'
    ]);
    exit;
}

// ==================== 사전 설정 ====================
require_once __DIR__ . '/db_config.php';
$mailCfg = require __DIR__ . '/mail_config.php';

// mysqli 에러 모드 (PHP 8.1+ 호환)
mysqli_report(MYSQLI_REPORT_OFF);

// ==================== 1. 입력 검증 ====================
$email = trim($_POST['email'] ?? '');

if ($email === '') {
    echo json_encode(['success' => false, 'message' => '이메일을 입력해주세요.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => '올바른 이메일 형식이 아닙니다.']);
    exit;
}

if (mb_strlen($email) > 100) {
    echo json_encode(['success' => false, 'message' => '이메일이 너무 깁니다.']);
    exit;
}

// ==================== 2. 중복 가입 확인 ====================
$stmt = mysqli_prepare($conn, "SELECT user_id FROM users WHERE email = ? LIMIT 1");
mysqli_stmt_bind_param($stmt, 's', $email);
mysqli_stmt_execute($stmt);
mysqli_stmt_store_result($stmt);

if (mysqli_stmt_num_rows($stmt) > 0) {
    mysqli_stmt_close($stmt);
    mysqli_close($conn);
    echo json_encode(['success' => false, 'message' => '이미 가입된 이메일입니다.']);
    exit;
}
mysqli_stmt_close($stmt);

// ==================== 3. 재전송 쿨다운 확인 ====================
$cooldownSec = (int) $mailCfg['resend_cooldown_sec'];

$stmt = mysqli_prepare(
    $conn,
    "SELECT last_sent_at, TIMESTAMPDIFF(SECOND, last_sent_at, NOW()) AS elapsed
     FROM email_verifications
     WHERE email = ?
     ORDER BY id DESC LIMIT 1"
);
mysqli_stmt_bind_param($stmt, 's', $email);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
$last = mysqli_fetch_assoc($result);
mysqli_stmt_close($stmt);

if ($last && (int)$last['elapsed'] < $cooldownSec) {
    $remaining = $cooldownSec - (int)$last['elapsed'];
    mysqli_close($conn);
    echo json_encode([
        'success' => false,
        'message' => "재전송은 {$remaining}초 후 가능합니다.",
        'cooldown_seconds' => $remaining
    ]);
    exit;
}

// ==================== 4. 인증 코드 생성 ====================
$codeLength = (int) $mailCfg['code_length'];
$expireMin  = (int) $mailCfg['code_expire_minutes'];

$min = (int) str_pad('1', $codeLength, '0');                  // 100000
$max = (int) str_pad('', $codeLength, '9', STR_PAD_LEFT);     // 999999
$code = (string) random_int($min, $max);
$codeHash = hash('sha256', $code);
$expiresAt = date('Y-m-d H:i:s', time() + $expireMin * 60);

// ==================== 5. DB 저장 ====================
$stmt = mysqli_prepare($conn, "DELETE FROM email_verifications WHERE email = ? AND is_verified = 0");
mysqli_stmt_bind_param($stmt, 's', $email);
mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

$stmt = mysqli_prepare(
    $conn,
    "INSERT INTO email_verifications (email, code_hash, expires_at, last_sent_at) 
     VALUES (?, ?, ?, NOW())"
);
mysqli_stmt_bind_param($stmt, 'sss', $email, $codeHash, $expiresAt);
$insertOk = mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

if (!$insertOk) {
    mysqli_close($conn);
    echo json_encode(['success' => false, 'message' => '인증 정보 저장 실패']);
    exit;
}

// ==================== 6. Resend API로 메일 발송 ====================
$apiKey   = $mailCfg['api_key'];
$apiUrl   = $mailCfg['api_url'];
$fromEmail= $mailCfg['from_email'];
$fromName = $mailCfg['from_name'];

$payload = [
    'from'    => "{$fromName} <{$fromEmail}>",
    'to'      => [$email],
    'subject' => '[쉐어뮤직] 이메일 인증 코드',
    'html'    => buildMailHtml($code, $expireMin),
    'text'    => "쉐어뮤직 이메일 인증 코드: {$code}\n유효시간: {$expireMin}분\n\n본인이 요청하지 않았다면 이 메일을 무시해주세요."
];

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiKey,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE));
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);  // 닷홈 환경 호환
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);

$response  = curl_exec($ch);
$httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// 디버그 로그
if (!empty($mailCfg['debug_mode'])) {
    error_log("[Resend] HTTP {$httpCode} | Response: {$response} | cURL: {$curlError}");
}

// 발송 실패 처리
$isSuccess = ($httpCode === 200 && empty($curlError));
$resData   = json_decode($response, true);

if (!$isSuccess || !isset($resData['id'])) {
    // 방금 저장한 인증 레코드 삭제 (혼동 방지)
    $stmt = mysqli_prepare($conn, "DELETE FROM email_verifications WHERE email = ? AND is_verified = 0");
    mysqli_stmt_bind_param($stmt, 's', $email);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);
    mysqli_close($conn);

    $errMsg = '메일 발송에 실패했습니다.';
    if (isset($resData['message'])) {
        $errMsg .= ' (' . $resData['message'] . ')';
    } elseif (!empty($curlError)) {
        $errMsg .= ' (네트워크 오류: ' . $curlError . ')';
    }

    echo json_encode([
        'success'    => false,
        'message'    => $errMsg,
        'debug_http' => $httpCode,
        'debug_body' => !empty($mailCfg['debug_mode']) ? $response : null
    ]);
    exit;
}

mysqli_close($conn);

// ==================== 7. 성공 응답 ====================
echo json_encode([
    'success'          => true,
    'message'          => '인증 코드를 전송했습니다. 메일함을 확인해주세요.',
    'expire_minutes'   => $expireMin,
    'cooldown_seconds' => $cooldownSec
]);
exit;


// ==================== 헬퍼: 메일 HTML 본문 ====================
function buildMailHtml(string $code, int $expireMin): string {
    $safeCode = htmlspecialchars($code);
    return <<<HTML
<!DOCTYPE html>
<html lang="ko">
<body style="margin:0; padding:0; background:#f5f5f5; font-family:'Pretendard','맑은 고딕',sans-serif;">
  <div style="max-width:480px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.05);">
    <div style="background:#000; color:#fff; padding:30px 24px; text-align:center;">
      <h1 style="margin:0; font-size:24px; font-weight:600;">쉐어뮤직</h1>
      <p style="margin:8px 0 0; font-size:14px; opacity:0.8;">이메일 인증 코드</p>
    </div>
    <div style="padding:36px 24px; text-align:center;">
      <p style="font-size:15px; color:#555; margin:0 0 24px;">
        아래 인증 코드를 회원가입 화면에 입력해주세요.
      </p>
      <div style="display:inline-block; padding:18px 32px; background:#f5f5f5; border-radius:8px; letter-spacing:8px; font-size:32px; font-weight:700; color:#000;">
        {$safeCode}
      </div>
      <p style="font-size:13px; color:#888; margin:24px 0 0;">
        이 코드는 <b>{$expireMin}분간</b> 유효합니다.
      </p>
      <p style="font-size:12px; color:#aaa; margin:8px 0 0;">
        본인이 요청하지 않았다면 이 메일을 무시해주세요.
      </p>
    </div>
    <div style="background:#fafafa; padding:16px; text-align:center; font-size:11px; color:#bbb;">
      © 쉐어뮤직 · 자동 발송 메일
    </div>
  </div>
</body>
</html>
HTML;
}