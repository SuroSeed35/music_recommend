<?php
// mypage_api.php
include 'db_config.php';
session_start();

// 로그인 체크
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

$my_id = $_SESSION['user_id'];
header('Content-Type: application/json');

/**
 * 1. 유저 정보 및 현재 설정된 노래 정보 가져오기
 * SQL문에 u.login_id를 추가하여 마이페이지에서 @아이디가 표시되도록 합니다.
 */
// mypage_api.php 수정 부분
$sql = "SELECT u.username, u.login_id, u.bio, 
               DATEDIFF(CURRENT_DATE, u.created_at) + 1 AS dday_count, 
               s.title, s.youtube_url, s.thumbnail_img, s.daily_comment 
        FROM users u 
        LEFT JOIN songs s ON u.current_song_id = s.song_id 
        WHERE u.user_id = $my_id";

$result = mysqli_query($conn, $sql);
$user_data = mysqli_fetch_assoc($result);
/**
 * 2. 해당 유저가 노래를 등록한 모든 '날짜 목록' 가져오기
 * 잔디 그리드(기여도 그래프)에 출석 표시를 하기 위한 데이터입니다.
 */
$date_sql = "SELECT DISTINCT log_date FROM songs WHERE user_id = $my_id";
$date_result = mysqli_query($conn, $date_sql);
$attendance_dates = [];

while($row = mysqli_fetch_assoc($date_result)) {
    $attendance_dates[] = $row['log_date'];
}

// 3. 최종 데이터 조립 및 반환
if ($user_data) {
    // 프론트엔드 변수명에 맞춰 dday와 attendance_list를 추가합니다.
    $user_data['dday'] = $user_data['dday_count'];
    $user_data['attendance_list'] = $attendance_dates;
    echo json_encode($user_data);
} else {
    echo json_encode(["error" => "User data not found"]);
}

mysqli_close($conn);
?>