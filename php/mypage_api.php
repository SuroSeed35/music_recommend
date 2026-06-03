<?php
// mypage_api.php
session_start();

// 1. PHP 치명적 에러가 화면에 <br> 태그(HTML)로 튀어나오는 것을 막습니다.
ini_set('display_errors', 0);
error_reporting(0);

header('Content-Type: application/json; charset=utf-8');

include 'db_config.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

$my_id = (int)$_SESSION['user_id'];

// 2. 에러가 나더라도 JSON으로 안전하게 응답하도록 try-catch로 감쌉니다.
try {
    // 🔥 실제 DB에 daily_comment, is_private 컬럼이 있는지 확인이 필요합니다!
    $sql = "SELECT u.username, u.login_id, u.bio, u.is_private, 
                   DATEDIFF(CURRENT_DATE, u.created_at) + 1 AS dday_count,
                   s.title, s.youtube_url, s.thumbnail_img, s.daily_comment 
            FROM users u 
            LEFT JOIN songs s ON u.current_song_id = s.song_id 
            WHERE u.user_id = $my_id";

    $result = mysqli_query($conn, $sql);

    // 쿼리가 실패하면 JSON 형태로 예쁘게 에러를 보냅니다.
    if (!$result) {
        echo json_encode(["error" => "SQL 오류(DB 컬럼명 확인 필요): " . mysqli_error($conn)]);
        exit;
    }

    $user_data = mysqli_fetch_assoc($result);

    // 🔥 여기 log_date 도 실제 DB의 songs 테이블에 존재하는지 확인하세요!
    $date_sql = "SELECT DISTINCT log_date FROM songs WHERE user_id = $my_id";
    $date_result = mysqli_query($conn, $date_sql);
    $attendance_dates = [];
    
    if ($date_result) {
        while($row = mysqli_fetch_assoc($date_result)) {
            $attendance_dates[] = $row['log_date'];
        }
    }

    if ($user_data) {
        $user_data['dday'] = (int)$user_data['dday_count'];
        $user_data['attendance_list'] = $attendance_dates;
        
        // 프론트엔드(mypage.js)가 기대하는 형태로 그대로 응답
        echo json_encode($user_data);
    } else {
        echo json_encode(["error" => "User data not found"]);
    }

} catch (Exception $e) {
    // 치명적 예외가 터져도 <br> 대신 JSON으로 깔끔하게 에러 메시지 반환!
    echo json_encode(["error" => "DB 에러(존재하지 않는 컬럼 조회 의심): " . $e->getMessage()]);
}

mysqli_close($conn);
?>