<?php
// php/fetch_reports.php
include 'db_config.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => '로그인이 필요합니다.']);
    exit;
}

$user_id = (int)$_SESSION['user_id'];

// LEFT JOIN을 사용하여 두 테이블의 데이터를 한 번에 가져옵니다.
$sql = "SELECT r.id, r.title, r.cover_image, r.target_month, r.created_at, rc.content 
        FROM reports r
        LEFT JOIN report_contents rc ON r.id = rc.report_id
        WHERE r.user_id = $user_id 
        ORDER BY r.target_month DESC, r.created_at DESC";

$result = mysqli_query($conn, $sql);

if ($result) {
    $reports = mysqli_fetch_all($result, MYSQLI_ASSOC);
    echo json_encode(['success' => true, 'data' => $reports]);
} else {
    echo json_encode(['success' => false, 'message' => 'DB 조회 실패: ' . mysqli_error($conn)]);
}
mysqli_close($conn);
?>