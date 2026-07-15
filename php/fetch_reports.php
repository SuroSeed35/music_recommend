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
$search = isset($_GET['search']) ? trim($_GET['search']) : '';

// =========================================================
// 💡 [보고서 자동 생성 로직] 
// 이번 달 마지막 날이거나, 이미 지나간 달인데 보고서가 없다면 자동 생성합니다.
// =========================================================
$today = new DateTime();
$is_last_day = ((int)$today->format('d') === (int)$today->format('t')); // 오늘이 이 달의 마지막 날인지 체크
$current_month = $today->format('Y-m');

// 사용자가 노래를 1곡이라도 등록했던 모든 '년-월'과 그 달의 노래 개수를 조회합니다.
$activity_sql = "SELECT DATE_FORMAT(log_date, '%Y-%m') as activity_month, COUNT(*) as song_count 
                 FROM songs 
                 WHERE user_id = $user_id 
                 GROUP BY activity_month";
$activity_res = mysqli_query($conn, $activity_sql);

if ($activity_res) {
    while ($row = mysqli_fetch_assoc($activity_res)) {
        $target_month = $row['activity_month'];
        $song_count = (int)$row['song_count'];

        // 🌟 자동 생성 조건: 
        // 1. 이미 지나간 과거의 달인 경우
        // 2. 이번 달인데, 오늘이 그 달의 마지막 날인 경우
        if ($target_month < $current_month || ($target_month === $current_month && $is_last_day)) {
            
            // 해당 달에 생성된 보고서가 이미 존재하는지 검사
            $check_sql = "SELECT id FROM reports WHERE user_id = $user_id AND target_month = '$target_month'";
            $check_res = mysqli_query($conn, $check_sql);
            
            // 보고서가 없다면 새로 인서트(생성)
            if (mysqli_num_rows($check_res) == 0) {
                $year = explode('-', $target_month)[0];
                $month = (int)explode('-', $target_month)[1];
                $default_title = "{$year}년 {$month}월 음악 감상 리포트";
                
                // 1) reports 테이블에 껍데기(제목, 날짜) 생성
                $insert_report = "INSERT INTO reports (user_id, title, target_month) VALUES ($user_id, '$default_title', '$target_month')";
                
                if (mysqli_query($conn, $insert_report)) {
                    $new_report_id = mysqli_insert_id($conn);
                    
                    // 2) report_contents 테이블에 기본 요약 텍스트 추가
                    $content_msg = "{$month}월 한 달 동안 총 {$song_count}곡의 음악을 남기셨네요! 이번 달의 음악 취향과 무드를 확인해보세요.";
                    $insert_content = "INSERT INTO report_contents (report_id, content) VALUES ($new_report_id, '$content_msg')";
                    mysqli_query($conn, $insert_content);
                }
            }
        }
    }
}
// =========================================================

// 검색어 필터링 로직
$search_condition = "";
if ($search !== '') {
    $safe_search = mysqli_real_escape_string($conn, $search);
    $search_condition = " AND (r.title LIKE '%$safe_search%' OR rc.content LIKE '%$safe_search%')";
}

// 최종적으로 보고서 리스트 불러오기 (자동 생성된 것 포함)
$sql = "SELECT r.id, r.title, r.cover_image, r.target_month, r.created_at, rc.content 
        FROM reports r
        LEFT JOIN report_contents rc ON r.id = rc.report_id
        WHERE r.user_id = $user_id $search_condition
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