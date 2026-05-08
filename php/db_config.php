<?php
$host = "localhost";
$user = "blabackspace";      
$pass = "wlthd4637@#";        
$dbName = "blabackspace";

$conn = mysqli_connect($host, $user, $pass, $dbName);

if (!$conn) {
    die("DB 연결 실패: " . mysqli_connect_error());
}

// 1. 서버 세션 유지 시간을 1년으로 대폭 늘립니다.
ini_set('session.gc_maxlifetime', 86400 * 365);
if (session_status() == PHP_SESSION_NONE) {
    session_set_cookie_params(86400 * 365);
    session_start();
}

// 2. ⚡ 핵심: 세션은 끊어졌는데 폰에 자동 로그인 쿠키가 있다면? -> 로그인 자동 복구!
if (!isset($_SESSION['user_id']) && isset($_COOKIE['auto_user_id'])) {
    $_SESSION['user_id'] = $_COOKIE['auto_user_id'];
}
?>
