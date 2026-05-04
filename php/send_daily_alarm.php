<?php
include 'db_config.php';
include 'fcm_send.php';

// 1. 모든 유저의 토큰 가져오기
$sql = "SELECT fcm_token FROM users WHERE fcm_token IS NOT NULL";
$result = mysqli_query($conn, $sql);

// 2. 알림 메시지 설정
$title = "오늘의 노래 추천 🎵";
$body = "오늘 하루는 어떤 노래와 함께인가요? 지금 추천해주세요!";

// 3. 루프를 돌며 발송
while($row = mysqli_fetch_assoc($result)) {
    sendFCM($row['fcm_token'], $title, $body);
}
echo "알림 발송 완료";
?>