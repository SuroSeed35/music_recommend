<?php
include 'db_config.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => '로그인이 필요합니다.']);
    exit;
}

$my_id = (int)$_SESSION['user_id'];
$data = json_decode(file_get_contents('php://input'), true);
$target_month = isset($data['target_month']) ? mysqli_real_escape_string($conn, $data['target_month']) : '';

// 'YYYY-MM' 형식 검증
if (preg_match('/^\d{4}-\d{2}$/', $target_month)) {
    
    // 1. 이미 생성된 보고서가 있는지 확인
    $check_sql = "SELECT id FROM reports WHERE user_id = $my_id AND target_month = '$target_month'";
    $check_res = mysqli_query($conn, $check_sql);
    
    if (mysqli_num_rows($check_res) > 0) {
        echo json_encode(['success' => false, 'message' => '해당 달의 보고서가 이미 존재합니다.']);
    } else {
        
        // 2. 충분한 정보(해당 달의 음악 기록)가 있는지 확인
        $song_check_sql = "SELECT COUNT(*) as cnt FROM songs WHERE user_id = $my_id AND DATE_FORMAT(log_date, '%Y-%m') = '$target_month'";
        $song_check_res = mysqli_query($conn, $song_check_sql);
        $song_data = mysqli_fetch_assoc($song_check_res);
        
        if ((int)$song_data['cnt'] > 0) {
            // 기록이 존재하므로 보고서 생성
            $year = explode('-', $target_month)[0];
            $month = (int)explode('-', $target_month)[1];
            $default_title = "{$year}년 {$month}월 보고서";
            
            $insert_report = "INSERT INTO reports (user_id, title, target_month) VALUES ($my_id, '$default_title', '$target_month')";
            if (mysqli_query($conn, $insert_report)) {
                $new_report_id = mysqli_insert_id($conn);
                
                // 안내 텍스트 생성
                $content_msg = "{$month}월에 감상한 {$song_data['cnt']}곡의 기록입니다.";
                $insert_content = "INSERT INTO report_contents (report_id, content) VALUES ($new_report_id, '$content_msg')";
                mysqli_query($conn, $insert_content);
                
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'DB 오류로 보고서를 생성하지 못했습니다.']);
            }
        } else {
            // 기록이 0건인 경우
            echo json_encode(['success' => false, 'message' => '해당 달에는 기록된 음악이 없어 보고서를 생성할 수 없습니다.']);
        }
    }
} else {
    echo json_encode(['success' => false, 'message' => '잘못된 날짜 형식입니다 (예: 2026-07)']);
}

mysqli_close($conn);
?>