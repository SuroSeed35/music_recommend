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

// 7. [신규] 이 달의 음악 무드 분석 (키워드 매칭)
$mood_sql = "SELECT daily_comment FROM songs WHERE user_id = $my_id AND DATE_FORMAT(log_date, '%Y-%m') = '$target_month' AND daily_comment IS NOT NULL AND daily_comment != ''";
$mood_res = mysqli_query($conn, $mood_sql);

$mood_scores = ['energetic' => 0, 'sentimental' => 0, 'focus' => 0];

// 카테고리별 키워드 사전
$keywords = [
    'energetic' => ['신나', '행복', '최고', '좋아', '즐거', '기분', '드라이브', '텐션', '파이팅', '화이팅', '여름', '댄스', '달려'],
    'sentimental' => ['슬픈', '우울', '잔잔', '새벽', '위로', '눈물', '감성', '밤', '비', '생각', '그리움', '가을', '겨울'],
    'focus' => ['운동', '출근', '퇴근', '노동', '힘내', '집중', '공부', '시작', '아침', '월요일', '헬스', '일']
];

while($row = mysqli_fetch_assoc($mood_res)) {
    $comment = $row['daily_comment'];
    foreach($keywords as $mood => $words) {
        foreach($words as $word) {
            if (mb_strpos($comment, $word) !== false) {
                $mood_scores[$mood]++;
            }
        }
    }
}

$dominant_mood = 'neutral';
$max_score = 0;
foreach($mood_scores as $mood => $score) {
    if ($score > $max_score) {
        $max_score = $score;
        $dominant_mood = $mood;
    }
}

// 무드별 결과 텍스트 및 이모지 매핑
$mood_info = [
    'energetic' => ['title' => '에너지 뿜뿜! 신나는 텐션', 'desc' => '이번 달은 기분 좋은 에너지가 가득했어요. 텐션을 올리는 활동과 함께 음악을 즐기셨네요!', 'emoji' => '🔥'],
    'sentimental' => ['title' => '잔잔한 새벽 감성', 'desc' => '감수성이 풍부했던 한 달이었어요. 음악과 함께 깊은 생각에 잠기고 위로를 받는 시간이 많았네요.', 'emoji' => '🌙'],
    'focus' => ['title' => '갓생러의 노동요', 'desc' => '이동시간이나 무언가에 집중할 때 음악이 큰 힘이 되었어요. 열심히 달려온 당신에게 박수를!', 'emoji' => '💻'],
    'neutral' => ['title' => '다채로운 일상 플레이리스트', 'desc' => '특정 분위기에 치우치지 않고 그날그날의 기분에 따라 다양한 분위기의 음악을 골고루 즐긴 한 달이었어요.', 'emoji' => '🎧']
];

$user_mood = $mood_info[$dominant_mood];

echo json_encode([
    'success' => true,
    'report' => $report,
    'favorite_artist' => $fav_artist,
    'most_played' => $most_played,
    'time_data' => $time_data,
    'max_time_cnt' => $max_time_cnt,
    'total_likes' => $total_likes,
    'liked_songs' => $liked_songs,
    'user_mood' => $user_mood
]);
mysqli_close($conn);
?>