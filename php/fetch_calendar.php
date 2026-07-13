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

// 🌟 수정됨: song_likes 테이블을 조인하여 is_liked 상태 추가
$sql = "SELECT s.song_id, u.username, u.login_id, s.daily_comment, s.title, s.thumbnail_img, s.youtube_url, s.log_date, s.created_at,
               IF(sl.like_id IS NOT NULL, 1, 0) as is_liked 
        FROM songs s 
        JOIN users u ON s.user_id = u.user_id 
        LEFT JOIN song_likes sl ON s.song_id = sl.song_id AND sl.user_id = $my_id
        WHERE YEAR(s.log_date) = $year 
        AND MONTH(s.log_date) = $month
        AND $user_cond
        ORDER BY s.created_at DESC";

$result = $conn->query($sql);
$songs = [];

if ($result) {
    while($row = $result->fetch_assoc()) {
        $timestamp = strtotime($row['created_at']); 
        $ampm = (date('A', $timestamp) === 'AM') ? '오전' : '오후'; 
        $time12 = date('g:i', $timestamp); 

        $songs[] = [
            "songId" => $row['song_id'], 
            "uploadDate" => str_replace('-', '.', $row['log_date']),
            "userName" => $row['username'],
            "loginId" => $row['login_id'],
            "comment" => $row['daily_comment'],
            "videoTitle" => $row['title'],
            "thumb" => $row['thumbnail_img'],
            "url" => $row['youtube_url'],
            "isLiked" => (int)$row['is_liked'], // 🌟 하트 활성화 여부
            "uploadTime" => $ampm . " " . $time12 
        ];
    }
}

echo json_encode($songs);
$conn->close();
?>