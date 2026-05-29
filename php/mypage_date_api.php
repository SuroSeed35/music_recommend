<?php
// mypage_date_api.php
// session_start();

// JSON 응답 헤더 설정
header('Content-Type: application/json; charset=utf-8');

include 'db_config.php';

// 1. 로그인 세션 체크
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

$my_id = (int)$_SESSION['user_id'];

// 2. 클라이언트가 요청한 날짜 데이터 받기 (GET 방식 파라미터 '?date=YYYY-MM-DD' 가정)
$target_date = isset($_GET['date']) ? mysqli_real_escape_string($conn, $_GET['date']) : '';

if (empty($target_date)) {
    echo json_encode(["error" => "Date parameter is missing."]);
    exit;
}

// 3. 해당 유저가 특정 날짜에 등록한 노래 정보 조회 (중략되었던 쿼리문 구성)
$sql = "SELECT title, youtube_url, thumbnail_img, daily_comment 
        FROM songs 
        WHERE user_id = $my_id AND log_date = '$target_date'";

$result = mysqli_query($conn, $sql);

// 4. 결과 반환
if ($result) {
    $song_data = mysqli_fetch_assoc($result);
    
    if ($song_data) {
        // 데이터가 존재하면 노래 정보 반환
        echo json_encode($song_data);
    } else {
        // 해당 날짜에 등록된 노래가 없는 경우
        echo json_encode(["message" => "No song found for this date."]);
    }
} else {
    // DB 쿼리 자체에 실패한 경우
    echo json_encode(["error" => "Database query failed: " . mysqli_error($conn)]);
}

mysqli_close($conn);
?>