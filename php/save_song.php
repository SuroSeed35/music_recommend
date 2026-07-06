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

        // --- 중복 검사 로직 시작 ---
        // 프론트엔드에서 보낸 '강제 저장(중복 무시)' 플래그 확인
        $force_save = $_POST['force_save'] ?? '0';

        // 강제 저장 상태가 아닐 때만 중복 검사 실행
        if ($force_save !== '1') {
            // URL이 완전히 같거나, 제목이 완전히 같은 노래가 있는지 확인
            $check_sql = "SELECT title, log_date FROM songs WHERE youtube_url = '$url' OR title = '$title'";
            $check_res = mysqli_query($conn, $check_sql);

            if (mysqli_num_rows($check_res) > 0) {
                // 중복된 곡들의 리스트를 배열로 모음
                $duplicates = [];
                while($row = mysqli_fetch_assoc($check_res)) {
                    $duplicates[] = [
                        'title' => $row['title'],
                        'log_date' => $row['log_date']
                    ];
                }

                // 에러를 던지지 않고 중복 리스트 데이터를 반환하여 모달창을 띄우게 함
                ob_end_clean();
                echo json_encode([
                    'success' => false, 
                    'is_duplicate' => true, 
                    'duplicates' => $duplicates 
                ]);
                exit;
            }
        }
        // --- 중복 검사 로직 끝 ---

        // 3. 노래 정보를 DB에 저장
        $sql = "INSERT INTO songs (user_id, youtube_url, title, daily_comment, thumbnail_img, log_date, log_time) 
                VALUES ('$user_id', '$url', '$title', '$comment', '$thumb', '$current_date', '$current_time')";
        
        if (mysqli_query($conn, $sql)) {
            $last_id = mysqli_insert_id($conn);
            // 유저 테이블에 현재 추천한 곡 ID 업데이트
            mysqli_query($conn, "UPDATE users SET current_song_id = '$last_id' WHERE user_id = '$user_id'");

            // DB 저장 완료 시 성공 처리
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