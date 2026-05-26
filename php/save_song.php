<?php
// 1. 예기치 않은 출력 방지
ob_start();

// 2. 에러 보고 설정
ini_set('display_errors', 0); 
error_reporting(E_ALL);

include 'db_config.php';
session_start();

// 응답 헤더 설정
header('Content-Type: application/json; charset=utf-8');

$response = ['success' => false, 'message' => '알 수 없는 오류가 발생했습니다.'];

try {
    // 세션 체크
    if (!isset($_SESSION['user_id'])) {
        throw new Exception('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
    }

    if ($_SERVER["REQUEST_METHOD"] === "POST") {
        $user_id = $_SESSION['user_id'];
        $url = mysqli_real_escape_string($conn, $_POST['url'] ?? '');
        $comment = mysqli_real_escape_string($conn, $_POST['comment'] ?? '');
        $title = mysqli_real_escape_string($conn, $_POST['title'] ?? '');
        $thumb = mysqli_real_escape_string($conn, $_POST['thumb'] ?? '');
        
        $current_date = date('Y-m-d');
        $current_time = date('H:i:s');

        if (empty($url) || empty($title)) {
            throw new Exception('필수 데이터가 누락되었습니다.');
        }

        // 3. 노래 정보를 DB에 먼저 저장
        // 3. 노래 정보를 DB에 먼저 저장
        $sql = "INSERT INTO songs (user_id, youtube_url, title, daily_comment, thumbnail_img, log_date, log_time) 
                VALUES ('$user_id', '$url', '$title', '$comment', '$thumb', '$current_date', '$current_time')";
        
        if (mysqli_query($conn, $sql)) {
            $last_id = mysqli_insert_id($conn);
            mysqli_query($conn, "UPDATE users SET current_song_id = '$last_id' WHERE user_id = '$user_id'");

            // 알림 로직 제거, DB 저장만 완료되면 바로 성공 처리
            $response = ['success' => true];
        } else {
            throw new Exception('DB 저장 오류: ' . mysqli_error($conn));
        }
    }
} catch (Exception $e) {
    $response = ['success' => false, 'message' => $e->getMessage()];
}

ob_end_clean();
echo json_encode($response);
mysqli_close($conn);
?>