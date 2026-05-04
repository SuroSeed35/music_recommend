<?php
// db_config.php를 포함하여 DB 연결을 재사용하는 것이 좋습니다.
include 'db_config.php';
session_start();

// 로그인되지 않은 사용자는 튕겨냅니다.
if (!isset($_SESSION['user_id'])) {
    echo "Unauthorized";
    exit;
}

$user_id = $_SESSION['user_id']; // 세션에서 안전하게 유저 ID를 가져옵니다.
$fcm_token = mysqli_real_escape_string($conn, $_POST['fcm_token']);

// DB 업데이트 (users 테이블의 fcm_token 컬럼 업데이트)
$sql = "UPDATE users SET fcm_token = '$fcm_token' WHERE user_id = '$user_id'";
$result = mysqli_query($conn, $sql);

if($result) {
    echo "Token updated successfully";
} else {
    echo "Error updating token: " . mysqli_error($conn);
}

mysqli_close($conn);
?>