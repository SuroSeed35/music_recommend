<?php
/**
 * 이메일 인증 코드 검증
 * 위치: php/verify_code.php
 *
 * 입력 (POST): email, code
 * 출력 (JSON): { success, message, attempts_left? }
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db_config.php';
$mailCfg = require __DIR__ . '/mail_config.php';

mysqli_report(MYSQLI_REPORT_OFF);

// ==================== 1. 입력 검증 ====================
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => '잘못된 요청 방식입니다.']);
    exit;
}

$email = trim($_POST['email'] ?? '');
$code  = trim($_POST['code']  ?? '');

if ($email === '' || $code === '') {
    echo json_encode(['success' => false, 'message' => '이메일과 인증 코드를 모두 입력해주세요.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => '올바른 이메일 형식이 아닙니다.']);
    exit;
}

$codeLength = (int) $mailCfg['code_length'];
// 코드는 정확히 N자리 숫자만 허용
if (!preg_match('/^\d{' . $codeLength . '}$/', $code)) {
    echo json_encode(['success' => false, 'message' => "인증 코드는 {$codeLength}자리 숫자여야 합니다."]);
    exit;
}

// ==================== 2. 최신 인증 레코드 조회 ====================
$stmt = mysqli_prepare(
    $conn,
    "SELECT id, code_hash, expires_at, is_verified, attempts,
            (expires_at < NOW()) AS is_expired
     FROM email_verifications
     WHERE email = ?
     ORDER BY id DESC LIMIT 1"
);
mysqli_stmt_bind_param($stmt, 's', $email);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);
$row = mysqli_fetch_assoc($result);
mysqli_stmt_close($stmt);

if (!$row) {
    mysqli_close($conn);
    echo json_encode([
        'success' => false,
        'message' => '인증 요청 기록이 없습니다. 먼저 인증 메일을 받아주세요.'
    ]);
    exit;
}

$verificationId = (int) $row['id'];
$maxAttempts    = (int) $mailCfg['max_attempts'];

// ==================== 3. 이미 인증된 경우 ====================
if ((int)$row['is_verified'] === 1) {
    mysqli_close($conn);
    echo json_encode([
        'success' => true,
        'message' => '이미 인증이 완료되었습니다.',
        'already_verified' => true
    ]);
    exit;
}

// ==================== 4. 시도 횟수 초과 ====================
if ((int)$row['attempts'] >= $maxAttempts) {
    mysqli_close($conn);
    echo json_encode([
        'success' => false,
        'message' => "시도 횟수({$maxAttempts}회)를 초과했습니다. 인증 메일을 다시 요청해주세요.",
        'exceeded' => true
    ]);
    exit;
}

// ==================== 5. 만료 시간 확인 ====================
if ((int)$row['is_expired'] === 1) {
    mysqli_close($conn);
    echo json_encode([
        'success' => false,
        'message' => '인증 코드가 만료되었습니다. 다시 요청해주세요.',
        'expired' => true
    ]);
    exit;
}

// ==================== 6. 코드 비교 (타이밍 공격 방지) ====================
$inputHash  = hash('sha256', $code);
$storedHash = $row['code_hash'];

if (!hash_equals($storedHash, $inputHash)) {
    // 실패 → attempts 증가
    $stmt = mysqli_prepare(
        $conn,
        "UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?"
    );
    mysqli_stmt_bind_param($stmt, 'i', $verificationId);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_close($stmt);

    $attemptsLeft = $maxAttempts - ((int)$row['attempts'] + 1);
    mysqli_close($conn);

    echo json_encode([
        'success' => false,
        'message' => "인증 코드가 일치하지 않습니다.",
        'attempts_left' => max(0, $attemptsLeft)
    ]);
    exit;
}

// ==================== 7. 인증 성공 ====================
$stmt = mysqli_prepare(
    $conn,
    "UPDATE email_verifications SET is_verified = 1 WHERE id = ?"
);
mysqli_stmt_bind_param($stmt, 'i', $verificationId);
$updateOk = mysqli_stmt_execute($stmt);
mysqli_stmt_close($stmt);

mysqli_close($conn);

if (!$updateOk) {
    echo json_encode(['success' => false, 'message' => '인증 상태 저장에 실패했습니다.']);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => '이메일 인증이 완료되었습니다.'
]);
exit;