<?php
/**
 * send_verification.php 단계별 진단 스크립트
 * 위치: php/ 폴더에 업로드
 * 접속: http://blabackspace.dothome.co.kr/php/diagnose.php
 * 확인 후 반드시 삭제
 */

header('Content-Type: text/html; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html><html><head><meta charset='utf-8'><title>진단</title>";
echo "<style>
    body { font-family: monospace; max-width: 800px; margin: 30px auto; padding: 20px; line-height: 1.7; }
    h1 { border-bottom: 2px solid #000; padding-bottom: 10px; }
    .step { padding: 12px 16px; margin: 8px 0; border-radius: 6px; }
    .ok { background: #d1fae5; color: #065f46; }
    .ng { background: #fee2e2; color: #991b1b; font-weight: bold; }
    .info { background: #f3f4f6; color: #374151; }
    pre { background: #fff; padding: 10px; border: 1px solid #ddd; white-space: pre-wrap; word-break: break-all; font-size: 12px; }
</style></head><body>";

echo "<h1>📋 send_verification.php 단계별 진단</h1>";

// ==================== Helper Functions ====================
function maskEmail($email) {
    if (!is_string($email)) return '(invalid)';
    $parts = explode('@', $email);
    if (count($parts) !== 2) return $email;
    $local = $parts[0];
    if (mb_strlen($local) <= 2) return $local . '@' . $parts[1];
    return mb_substr($local, 0, 2) . str_repeat('*', mb_strlen($local) - 2) . '@' . $parts[1];
}
function maskPassword($pw) {
    if (!is_string($pw)) return '(invalid)';
    $cleaned = str_replace(' ', '', $pw);
    $len = strlen($cleaned);
    if ($len <= 4) return str_repeat('*', $len);
    return substr($cleaned, 0, 2) . str_repeat('*', $len - 4) . substr($cleaned, -2) . " (길이: $len)";
}

// ==================== Step 1: db_config.php ====================
echo "<div class='step info'><b>Step 1: db_config.php 로드</b></div>";
try {
    require_once __DIR__ . '/db_config.php';
    if (isset($conn) && $conn instanceof mysqli) {
        echo "<div class='step ok'>✅ db_config.php 로드 성공, DB 연결 객체 존재</div>";
    } else {
        echo "<div class='step ng'>❌ db_config.php는 로드됐지만 \$conn이 mysqli 객체가 아님</div>";
    }
} catch (Throwable $e) {
    echo "<div class='step ng'>❌ db_config.php 로드 실패: " . htmlspecialchars($e->getMessage()) . "</div>";
    exit;
}

// ==================== Step 2: mail_config.php ====================
echo "<div class='step info'><b>Step 2: mail_config.php 로드</b></div>";
$mailCfgPath = __DIR__ . '/mail_config.php';
if (!file_exists($mailCfgPath)) {
    echo "<div class='step ng'>❌ mail_config.php 파일이 존재하지 않음!</div>";
    echo "<div class='step info'>찾으려던 경로: $mailCfgPath</div>";
    exit;
}
try {
    $mailCfg = require $mailCfgPath;
    if (is_array($mailCfg)) {
        echo "<div class='step ok'>✅ mail_config.php 로드 성공</div>";
        echo "<div class='step info'>설정 키: " . implode(', ', array_keys($mailCfg)) . "</div>";
        $masked = [
            'host'        => $mailCfg['host'] ?? '(missing)',
            'port'        => $mailCfg['port'] ?? '(missing)',
            'username'    => isset($mailCfg['username']) ? maskEmail($mailCfg['username']) : '(missing)',
            'app_password'=> isset($mailCfg['app_password']) ? maskPassword($mailCfg['app_password']) : '(missing)',
            'from_email'  => isset($mailCfg['from_email']) ? maskEmail($mailCfg['from_email']) : '(missing)',
        ];
        echo "<pre>" . htmlspecialchars(print_r($masked, true)) . "</pre>";

        if (isset($mailCfg['username']) && strpos($mailCfg['username'], 'YOUR_GMAIL') !== false) {
            echo "<div class='step ng'>❌ username이 기본값 'YOUR_GMAIL@gmail.com' 그대로! Gmail 주소로 수정 필요</div>";
        }
        if (isset($mailCfg['app_password']) && strpos($mailCfg['app_password'], 'XXXX') !== false) {
            echo "<div class='step ng'>❌ app_password가 기본값 'XXXX XXXX XXXX XXXX' 그대로! 앱 비밀번호로 수정 필요</div>";
        }
    } else {
        echo "<div class='step ng'>❌ mail_config.php가 배열을 반환하지 않음</div>";
        exit;
    }
} catch (Throwable $e) {
    echo "<div class='step ng'>❌ mail_config.php 로드 실패: " . htmlspecialchars($e->getMessage()) . "</div>";
    exit;
}

// ==================== Step 3: PHPMailer 클래스 ====================
echo "<div class='step info'><b>Step 3: PHPMailer 클래스 로드</b></div>";
$files = [
    'libs/PHPMailer/Exception.php',
    'libs/PHPMailer/PHPMailer.php',
    'libs/PHPMailer/SMTP.php',
];
foreach ($files as $f) {
    $p = __DIR__ . '/' . $f;
    if (file_exists($p)) {
        echo "<div class='step ok'>✅ $f 존재</div>";
    } else {
        echo "<div class='step ng'>❌ $f 없음</div>";
    }
}
try {
    require_once __DIR__ . '/libs/PHPMailer/Exception.php';
    require_once __DIR__ . '/libs/PHPMailer/PHPMailer.php';
    require_once __DIR__ . '/libs/PHPMailer/SMTP.php';
    $m = new \PHPMailer\PHPMailer\PHPMailer(true);
    echo "<div class='step ok'>✅ PHPMailer 클래스 인스턴스 생성 성공 (버전 " . $m::VERSION . ")</div>";
} catch (Throwable $e) {
    echo "<div class='step ng'>❌ PHPMailer 인스턴스 생성 실패: " . htmlspecialchars($e->getMessage()) . "</div>";
    exit;
}

// ==================== Step 4: DB 테이블 ====================
echo "<div class='step info'><b>Step 4: email_verifications 테이블 존재 여부</b></div>";
$result = @mysqli_query($conn, "SHOW TABLES LIKE 'email_verifications'");
if ($result && mysqli_num_rows($result) > 0) {
    echo "<div class='step ok'>✅ email_verifications 테이블 존재</div>";
    $colResult = mysqli_query($conn, "SHOW COLUMNS FROM email_verifications");
    $cols = [];
    while ($r = mysqli_fetch_assoc($colResult)) {
        $cols[] = $r['Field'];
    }
    echo "<div class='step info'>컬럼: " . implode(', ', $cols) . "</div>";
} else {
    echo "<div class='step ng'>❌ email_verifications 테이블이 없음! 마이그레이션 SQL 실행 필요</div>";
}

// ==================== Step 5: SMTP 연결 + 인증 ====================
echo "<div class='step info'><b>Step 5: 실제 Gmail SMTP 연결 및 인증 테스트</b></div>";
$debugLog = '';
try {
    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host       = $mailCfg['host'];
    $mail->SMTPAuth   = true;
    $mail->Username   = $mailCfg['username'];
    $mail->Password   = str_replace(' ', '', $mailCfg['app_password']);
    $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = (int) $mailCfg['port'];
    $mail->CharSet    = 'UTF-8';
    $mail->Timeout    = 10;

    $mail->SMTPDebug = \PHPMailer\PHPMailer\SMTP::DEBUG_CONNECTION;
    $mail->Debugoutput = function($str, $level) use (&$debugLog) {
        $debugLog .= htmlspecialchars($str) . "\n";
    };

    if ($mail->smtpConnect()) {
        echo "<div class='step ok'>✅ SMTP 연결 + 인증 성공!</div>";
        $mail->smtpClose();
    } else {
        echo "<div class='step ng'>❌ SMTP 연결 실패</div>";
    }

    if ($debugLog) {
        echo "<div class='step info'><b>SMTP 통신 로그:</b></div>";
        echo "<pre>" . $debugLog . "</pre>";
    }
} catch (Throwable $e) {
    echo "<div class='step ng'>❌ SMTP 연결 중 예외 발생:<br>" . htmlspecialchars($e->getMessage()) . "</div>";
    if (!empty($debugLog)) {
        echo "<div class='step info'><b>SMTP 통신 로그:</b></div>";
        echo "<pre>" . $debugLog . "</pre>";
    }
}

mysqli_close($conn);

echo "<hr>";
echo "<p style='color:#888; font-size:13px;'>⚠️ 진단 완료 후 이 파일은 반드시 삭제하세요.</p>";
echo "</body></html>";
?>