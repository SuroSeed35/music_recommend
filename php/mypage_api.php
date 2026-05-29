<?php
// mypage_api.php
session_start();

// JSON 응답 헤더 최상단 선언
header('Content-Type: application/json; charset=utf-8');

include 'db_config.php';

// 1. 로그인 체크
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

// 보안을 위해 세션 값을 정수로 명시적 변환 (SQL 인젝션 방지)
$my_id = (int)$_SESSION['user_id'];

/**
 * 2. 유저 정보 및 현재 설정된 노래 정보 가져오기
 * SQL문에 u.login_id를 추가하여 마이페이지에서 @아이디가 표시되도록 합니다.
 * D-day 트래킹 시스템에 맞춰 dday_count를 계산합니다.
 */
$sql = "SELECT u.username, u.login_id, u.bio, u.is_private, 
               DATEDIFF(CURRENT_DATE, u.created_at) + 1 AS dday_count,
               s.title, s.youtube_url, s.thumbnail_img, s.daily_comment 
        FROM users u 
        LEFT JOIN songs s ON u.current_song_id = s.song_id 
        WHERE u.user_id = $my_id";

$result = mysqli_query($conn, $sql);

// 쿼리 실행 실패 시 예외 처리
if (!$result) {
    echo json_encode(["error" => "Database query failed: " . mysqli_error($conn)]);
    mysqli_close($conn);
    exit;
}

$user_data = mysqli_fetch_assoc($result);

/**
 * 3. 해당 유저가 노래를 등록한 모든 '날짜 목록' 가져오기
 * 뮤직 캘린더의 잔디 그리드(기여도 그래프)에 출석 표시를 하기 위한 데이터입니다.
 */
$date_sql = "SELECT DISTINCT log_date FROM songs WHERE user_id = $my_id";
$date_result = mysqli_query($conn, $date_sql);
$attendance_dates = [];

if ($date_result) {
    while($row = mysqli_fetch_assoc($date_result)) {
        $attendance_dates[] = $row['log_date'];
    }
}

// 4. 최종 데이터 조립 및 반환
if ($user_data) {
    // 프론트엔드 변수명에 맞춰 dday와 attendance_list를 추가합니다.
    $user_data['dday'] = (int)$user_data['dday_count'];
    $user_data['attendance_list'] = $attendance_dates;
    
    echo json_encode($user_data);
} else {
    echo json_encode(["error" => "User data not found"]);
}

mysqli_close($conn);
?>