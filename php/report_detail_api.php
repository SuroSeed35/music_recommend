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

// 6. 좋아요 누른 노래 리스트 (s.log_date 포함)
$liked_list_sql = "SELECT s.song_id, s.title, s.thumbnail_img, s.log_date
                   FROM song_likes sl
                   JOIN songs s ON sl.song_id = s.song_id
                   WHERE sl.user_id = $my_id AND DATE_FORMAT(sl.created_at, '%Y-%m') = '$target_month'
                   ORDER BY sl.created_at DESC";
$liked_list_res = mysqli_query($conn, $liked_list_sql);
$liked_songs = mysqli_fetch_all($liked_list_res, MYSQLI_ASSOC);

// 7. 이 달의 음악 무드 분석 (키워드 매칭 - 노래 제목 기준)
$mood_sql = "SELECT title FROM songs WHERE user_id = $my_id AND DATE_FORMAT(log_date, '%Y-%m') = '$target_month' AND title IS NOT NULL AND title != ''";
$mood_res = mysqli_query($conn, $mood_sql);

$mood_scores = ['energetic' => 0, 'sentimental' => 0, 'focus' => 0];

// 카테고리별 키워드 사전 (제목 기준)
$keywords = [
    'energetic' => ['신나', '행복', '최고', '좋아', '즐거', '드라이브', '텐션', '파이팅', '여름', '댄스', '달려', 'Dance', 'Pop', 'Party', 'Rock', 'EDM', 'Remix'],
    'sentimental' => ['슬픈', '우울', '잔잔', '새벽', '위로', '눈물', '감성', '밤', '비', '그리움', '가을', '겨울', 'Ballad', 'Sad', 'Acoustic', 'Love', 'Tears'],
    'focus' => ['운동', '출근', '퇴근', '노동', '힘내', '집중', '공부', '시작', '아침', '월요일', '헬스', '일', 'Lofi', 'Lo-fi', 'Chill', 'Workout', 'Study', 'Focus']
];

while($row = mysqli_fetch_assoc($mood_res)) {
    $title = $row['title'];
    foreach($keywords as $mood => $words) {
        foreach($words as $word) {
            // 영문 대소문자 구분 없이 매칭하기 위해 mb_stripos 사용
            if (mb_stripos($title, $word) !== false) {
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

// 무드별 이모지 풀
$emoji_pools = [
    'energetic' => ['🔥','🕺','🎸','⚡','💥','😎','🚀','🎉','✨','🤪','🤩','🔊','🎵','💪','🤘'],
    'sentimental' => ['🌙','🥺','☔','🍷','🌌','💧','🥀','🍂','❄','☕','🧸','💭','🎵','🎧','☁'],
    'focus' => ['💻','💪','✍','📚','⏰','☕','🎧','🏃','🏃‍♀️','🔥','🤓','💡','🧘','🔋','🎵'],
    'neutral' => ['🎧','🎶','🎵','🌤','🍃','✨','☕','😌','🌈','🎈','😎','🙌','📻','🌼','💫']
];

// 💡 [핵심] 리포트 ID를 '시드(Seed)'로 사용하여 이모지를 랜덤 추출하는 함수
// 이렇게 하면 무작위로 뽑히지만, 특정 리포트(ID)에서는 새로고침해도 항상 똑같은 5개의 이모지가 고정됩니다.
function getSeededRandomEmojis($pool, $seed, $count = 5) {
    mt_srand($seed); // 리포트 ID로 난수 발생기 초기화 (고정된 패턴 생성)
    
    $keys = array_keys($pool);
    $selected_keys = [];
    
    // 중복 없이 $count 개수만큼 뽑기
    while(count($selected_keys) < $count) {
        $rand_idx = mt_rand(0, count($keys) - 1);
        if(!in_array($rand_idx, $selected_keys)) {
            $selected_keys[] = $rand_idx;
        }
    }
    
    $result_emojis = '';
    foreach($selected_keys as $key) {
        $result_emojis .= $pool[$keys[$key]];
    }
    
    mt_srand(); // 다른 코드에 영향을 주지 않도록 시드 초기화
    return $result_emojis;
}

// 무드별 결과 텍스트 및 시드 기반 랜덤 이모지 매핑
$mood_info = [
    'energetic' => [
        'title' => '에너지 뿜뿜! 신나는 텐션', 
        'desc' => '이번 달은 기분 좋은 에너지가 가득했어요. 텐션을 올리는 활동과 함께 음악을 즐기셨네요!', 
        'emoji' => '🔥',
        'emojis_five' => getSeededRandomEmojis($emoji_pools['energetic'], $report_id)
    ],
    'sentimental' => [
        'title' => '잔잔한 새벽 감성', 
        'desc' => '감수성이 풍부했던 한 달이었어요. 음악과 함께 깊은 생각에 잠기고 위로를 받는 시간이 많았네요.', 
        'emoji' => '🌙',
        'emojis_five' => getSeededRandomEmojis($emoji_pools['sentimental'], $report_id)
    ],
    'focus' => [
        'title' => '갓생러의 노동요', 
        'desc' => '이동시간이나 무언가에 집중할 때 음악이 큰 힘이 되었어요. 열심히 달려온 당신에게 박수를!', 
        'emoji' => '💻',
        'emojis_five' => getSeededRandomEmojis($emoji_pools['focus'], $report_id)
    ],
    'neutral' => [
        'title' => '다채로운 일상 플레이리스트', 
        'desc' => '특정 분위기에 치우치지 않고 그날그날의 기분에 따라 다양한 분위기의 음악을 골고루 즐긴 한 달이었어요.', 
        'emoji' => '🎧',
        'emojis_five' => getSeededRandomEmojis($emoji_pools['neutral'], $report_id)
    ]
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