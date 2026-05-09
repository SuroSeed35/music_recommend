<?php
include 'db_config.php';
include_once 'fcm_v1_send.php';

// 토큰이 존재하는 모든 유저 조회
$sql = "SELECT fcm_token FROM users WHERE fcm_token IS NOT NULL AND fcm_token != ''";
$result = mysqli_query($conn, $sql);

$success_count = 0;
while ($row = mysqli_fetch_assoc($result)) {
    $token = $row['fcm_token'];
    
    // 알림 발송
    sendFCMV1($token, "수로시드 알림", "오늘의 노래를 추천할 시간이 되었습니다!");
    $success_count++;
}

echo "총 {$success_count}대의 기기에 전체 공지 알림을 발송했습니다.";
?>