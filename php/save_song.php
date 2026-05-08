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
        $sql = "INSERT INTO songs (user_id, youtube_url, title, daily_comment, thumbnail_img, log_date, log_time) 
                VALUES ('$user_id', '$url', '$title', '$comment', '$thumb', '$current_date', '$current_time')";
        
        if (mysqli_query($conn, $sql)) {
            $last_id = mysqli_insert_id($conn);
            mysqli_query($conn, "UPDATE users SET current_song_id = '$last_id' WHERE user_id = '$user_id'");

            // ⭐️ 4. 저장이 성공했으니 이제 친구들에게 알림을 쏩니다!
            include_once 'fcm_send.php';

            // 내 친구들 중 FCM 토큰이 있는 사람 목록 가져오기
            $friend_sql = "SELECT u.fcm_token FROM friends f 
                           JOIN users u ON (f.friend_id = u.user_id OR f.user_id = u.user_id)
                           WHERE (f.user_id = '$user_id' OR f.friend_id = '$user_id') 
                           AND f.status = 'accepted' AND u.user_id != '$user_id' AND u.fcm_token IS NOT NULL";
            $friend_res = mysqli_query($conn, $friend_sql);

            // 내 이름 가져오기
            $me_res = mysqli_query($conn, "SELECT username FROM users WHERE user_id = '$user_id'");
            $me_row = mysqli_fetch_assoc($me_res);
            $my_name = $me_row['username'] ?? '친구';

            // 친구들에게 한 명씩 발송
            while($friend = mysqli_fetch_assoc($friend_res)) {
                sendFCM($friend['fcm_token'], "새로운 노래 추천! 🎵", "{$my_name}님이 오늘의 노래를 추천했습니다: {$title}");
            }

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
