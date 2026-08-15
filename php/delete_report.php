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
$report_id = isset($data['id']) ? (int)$data['id'] : 0;

if ($report_id > 0) {
    // 본인 소유 확인
    $check_sql = "SELECT id FROM reports WHERE id = $report_id AND user_id = $my_id";
    $check_res = mysqli_query($conn, $check_sql);
    
    if (mysqli_num_rows($check_res) > 0) {
        $delete_sql = "DELETE FROM reports WHERE id = $report_id AND user_id = $my_id";
        if (mysqli_query($conn, $delete_sql)) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'DB 오류: ' . mysqli_error($conn)]);
        }
    } else {
        echo json_encode(['success' => false, 'message' => '권한이 없습니다.']);
    }
} else {
    echo json_encode(['success' => false, 'message' => '잘못된 요청입니다.']);
}

mysqli_close($conn);
?>