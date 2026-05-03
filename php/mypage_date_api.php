<?php
include 'db_config.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

$my_id = $_SESSION['user_id'];
// 날짜를 파라미터로 받습니다 (예: ?date=2024-05-01)
$target_date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');

header('Content-Type: application/json');

// 해당 유저가 특정 날짜(log_date)에 등록한 노래를 최신순으로 1개 가져옵니다.
$sql = "SELECT title, youtube_url, thumbnail_img, daily_comment 
        FROM songs 
        WHERE user_id = $my_id AND log_date = '$target_date'
        ORDER BY song_id DESC LIMIT 1";

$result = mysqli_query($conn, $sql);
$data = mysqli_fetch_assoc($result);

if ($data) {
    echo json_encode($data);
} else {
    // 해당 날짜에 추천한 노래가 없을 경우
    echo json_encode(["message" => "no_data"]);
}

mysqli_close($conn);
?>