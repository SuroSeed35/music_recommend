<?php
include 'db_config.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => '로그인이 필요합니다.']);
    exit;
}

$my_id = (int)$_SESSION['user_id'];
$report_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($report_id <= 0) {
    echo json_encode(['success' => false, 'message' => '잘못된 접근입니다.']);
    exit;
}

// 1. 리포트 기본 정보 (속 배경 이미지 추가)
$report_sql = "SELECT id, title, cover_image, inner_image, target_month, DATE(created_at) as created_date FROM reports WHERE id = $report_id AND user_id = $my_id";
$report_res = mysqli_query($conn, $report_sql);
$report = mysqli_fetch_assoc($report_res);

if (!$report) {
    echo json_encode(['success' => false, 'message' => '리포트를 찾을 수 없습니다.']);
    exit;
}

$target_month = $report['target_month'];

// 2. 이 달의 최애 아티스트 (유튜브 채널 기준)
$fav_sql = "SELECT s.channel_name, MAX(s.thumbnail_img) as thumbnail_img, COUNT(*) as cnt
            FROM song_likes sl
            JOIN songs s ON sl.song_id = s.song_id
            WHERE sl.user_id = $my_id AND DATE_FORMAT(sl.created_at, '%Y-%m') = '$target_month'
            GROUP BY s.channel_name
            ORDER BY cnt DESC LIMIT 1";
$fav_res = mysqli_query($conn, $fav_sql);
$fav_artist = mysqli_fetch_assoc($fav_res);

// 3. 이번 달 가장 많이 들은 노래 (유튜브 채널 포함)
$most_played_sql = "SELECT s.title, s.thumbnail_img, s.channel_name, COUNT(ph.id) as play_count
                    FROM played_history ph
                    JOIN songs s ON ph.song_id = s.song_id
                    WHERE ph.user_id = '$my_id' AND DATE_FORMAT(ph.played_at, '%Y-%m') = '$target_month'
                    GROUP BY ph.song_id
                    ORDER BY play_count DESC LIMIT 1";
$most_played_res = mysqli_query($conn, $most_played_sql);
$most_played = mysqli_fetch_assoc($most_played_res);

// 4. 내가 가장 많이 추천한 시간대
$time_sql = "SELECT HOUR(log_time) as hr, COUNT(*) as cnt
             FROM songs
             WHERE user_id = $my_id AND DATE_FORMAT(log_date, '%Y-%m') = '$target_month'
             GROUP BY HOUR(log_time)";
$time_res = mysqli_query($conn, $time_sql);
$time_data = array_fill(0, 24, 0);
$max_time_cnt = 0;
while ($r = mysqli_fetch_assoc($time_res)) {
    $time_data[(int)$r['hr']] = (int)$r['cnt'];
    if ((int)$r['cnt'] > $max_time_cnt) {
        $max_time_cnt = (int)$r['cnt'];
    }
}

// 5. 이번 달 좋아요 누른 총 개수
$likes_sql = "SELECT COUNT(*) as cnt FROM song_likes WHERE user_id = $my_id AND DATE_FORMAT(created_at, '%Y-%m') = '$target_month'";
$likes_res = mysqli_query($conn, $likes_sql);
$total_likes = mysqli_fetch_assoc($likes_res)['cnt'];

// 6. 좋아요 누른 노래 리스트
$liked_list_sql = "SELECT s.song_id, s.title, s.thumbnail_img
                   FROM song_likes sl
                   JOIN songs s ON sl.song_id = s.song_id
                   WHERE sl.user_id = $my_id AND DATE_FORMAT(sl.created_at, '%Y-%m') = '$target_month'
                   ORDER BY sl.created_at DESC";
$liked_list_res = mysqli_query($conn, $liked_list_sql);
$liked_songs = mysqli_fetch_all($liked_list_res, MYSQLI_ASSOC);

echo json_encode([
    'success' => true,
    'report' => $report,
    'favorite_artist' => $fav_artist,
    'most_played' => $most_played,
    'time_data' => $time_data,
    'max_time_cnt' => $max_time_cnt,
    'total_likes' => $total_likes,
    'liked_songs' => $liked_songs
]);
mysqli_close($conn);
?>