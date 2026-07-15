<?php
include 'db_config.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => '로그인이 필요합니다.']);
    exit;
}

$my_id = (int)$_SESSION['user_id'];
$report_id = isset($_POST['id']) ? (int)$_POST['id'] : 0;

if ($report_id <= 0) {
    echo json_encode(['success' => false, 'message' => '잘못된 접근입니다.']);
    exit;
}

// 1. 제목 변경 처리
if (isset($_POST['title'])) {
    $new_title = mysqli_real_escape_string($conn, $_POST['title']);
    $sql = "UPDATE reports SET title = '$new_title' WHERE id = $report_id AND user_id = $my_id";
    if (mysqli_query($conn, $sql)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'DB 오류가 발생했습니다.']);
    }
    exit;
}

// 2. 속 배경 이미지(inner_image) 변경 처리
if (isset($_FILES['inner_image'])) {
    $upload_dir = '../uploads/reports/';
    if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);
    
    $file = $_FILES['inner_image'];
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'bg_inner_' . $report_id . '_' . time() . '.' . $ext;
    $filepath = $upload_dir . $filename;

    if (move_uploaded_file($file['tmp_name'], $filepath)) {
        $db_filepath = mysqli_real_escape_string($conn, $filepath);
        $sql = "UPDATE reports SET inner_image = '$db_filepath' WHERE id = $report_id AND user_id = $my_id";
        mysqli_query($conn, $sql);
        echo json_encode(['success' => true, 'inner_image' => $filepath]);
    } else {
        echo json_encode(['success' => false, 'message' => '파일 업로드에 실패했습니다.']);
    }
    exit;
}

echo json_encode(['success' => false, 'message' => '요청이 올바르지 않습니다.']);
?>