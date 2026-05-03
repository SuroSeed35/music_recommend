<?php
include 'db_config.php';
session_start();

// JSON 응답 설정
header('Content-Type: application/json');

// 1. 로그인 체크 및 세션 ID 정수화 (보안 강화)
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["error" => "로그인이 필요합니다."]);
    exit;
}

$my_id = intval($_SESSION['user_id']); //
$date = mysqli_real_escape_string($conn, $_GET['date'] ?? date('Y-m-d')); //[cite: 7]

// 2. 유저의 메인 그룹 ID 확인
$user_info_res = mysqli_query($conn, "SELECT main_group_id FROM users WHERE user_id = $my_id");
$user_info = mysqli_fetch_assoc($user_info_res);
$main_group_id = intval($user_info['main_group_id']); //[cite: 7]

// 3. 쿼리 구성 (log_date와 log_time을 합쳐 created_at으로 생성)
if (!empty($main_group_id)) {
    // [그룹 모드] 메인 그룹 멤버들의 노래만 가져오기
    $sql = "SELECT s.*, u.username, 
                   CONCAT(s.log_date, ' ', s.log_time) AS created_at 
            FROM songs s
            JOIN users u ON s.user_id = u.user_id
            WHERE s.log_date = '$date'
            AND s.user_id IN (
                SELECT user_id FROM group_members WHERE group_id = $main_group_id
            )
            ORDER BY s.log_time DESC";
} else {
    // [전체 모드] 메인 그룹이 없을 때
    $sql = "SELECT s.*, u.username, 
                   CONCAT(s.log_date, ' ', s.log_time) AS created_at 
            FROM songs s
            JOIN users u ON s.user_id = u.user_id
            WHERE s.log_date = '$date'
            ORDER BY s.log_time DESC";
}

$result = mysqli_query($conn, $sql);

if ($result) {
    $songs = mysqli_fetch_all($result, MYSQLI_ASSOC);
    echo json_encode($songs);
} else {
    echo json_encode(["error" => "데이터 조회 실패: " . mysqli_error($conn)]);
}

mysqli_close($conn);
?>