<?php
session_start();
require 'db_config.php'; // 기존에 쓰시던 DB 연결 파일

header('Content-Type: application/json; charset=utf-8');

// 로그인 확인 (세션에 user_id가 있다고 가정)
if (!isset($_SESSION['user_id'])) {
    // 테스트 시 세션이 안 잡혀있다면 아래 1을 자신의 테스트 user_id로 임시 변경하세요.
    $user_id = 1; 
    // echo json_encode(['success' => false, 'message' => '로그인이 필요합니다.']);
    // exit;
} else {
    $user_id = $_SESSION['user_id'];
}

try {
    // 해당 유저의 보고서를 연도/월 내림차순으로 가져오기
    $stmt = $pdo->prepare("SELECT id, title, cover_image, target_month, created_at, file_size 
                           FROM reports 
                           WHERE user_id = ? 
                           ORDER BY target_month DESC, created_at DESC");
    $stmt->execute([$user_id]);
    $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'data' => $reports]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'DB 오류: ' . $e->getMessage()]);
}
?>