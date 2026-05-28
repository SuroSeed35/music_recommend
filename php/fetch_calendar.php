<?php
include 'db_config.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode([]);
    exit;
}

$my_id = $_SESSION['user_id'];
$year = (int)(isset($_GET['year']) ? $_GET['year'] : date('Y'));
$month = (int)(isset($_GET['month']) ? $_GET['month'] : date('m'));
$group_id = (int)(isset($_GET['group_id']) ? $_GET['group_id'] : 0);

header('Content-Type: application/json');

// 그룹 ID에 따른 조건 설정
$user_cond = ($group_id === 0) 
    ? "s.user_id = $my_id" 
    : "s.user_id IN (SELECT user_id FROM group_members WHERE group_id = $group_id)";

// 1. SELECT 문에 s.song_id 추가
$sql = "SELECT s.song_id, u.username, u.login_id, s.daily_comment, s.title, s.thumbnail_img, s.youtube_url, s.log_date, s.created_at 
        FROM songs s 
        JOIN users u ON s.user_id = u.user_id 
        WHERE YEAR(s.log_date) = $year 
        AND MONTH(s.log_date) = $month
        AND $user_cond
        ORDER BY s.created_at DESC";

$result = $conn->query($sql);
$songs = [];

if ($result) {
    while($row = $result->fetch_assoc()) {
        // created_at 시간을 타임스탬프로 변환
        $timestamp = strtotime($row['created_at']); 

        // 오전/오후 판별 (date('A')는 AM 또는 PM을 반환함)
        $ampm = (date('A', $timestamp) === 'AM') ? '오전' : '오후'; 

        // 12시간 형식의 시:분 생성 (g는 0이 붙지 않는 12시간 형식)
        $time12 = date('g:i', $timestamp); 

        $songs[] = [
            // 2. songId를 배열에 추가 (모아듣기 플레이어 연동용)
            "songId" => $row['song_id'], 
            "uploadDate" => str_replace('-', '.', $row['log_date']),
            "userName" => $row['username'],
            "loginId" => $row['login_id'],
            "comment" => $row['daily_comment'],
            "videoTitle" => $row['title'],
            "thumb" => $row['thumbnail_img'],
            "url" => $row['youtube_url'],
            // 최종 결과: "오후 3:49" 형식으로 전달
            "uploadTime" => $ampm . " " . $time12 
        ];
    }
}

echo json_encode($songs);
$conn->close();
?>