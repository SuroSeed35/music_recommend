<?php
// php/update_report.php
include 'db_config.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["success" => false, "message" => "로그인이 필요합니다."]);
    exit;
}

$user_id = (int)$_SESSION['user_id'];

// FormData로 보낸 데이터 받기
$report_id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
$title = isset($_POST['title']) ? mysqli_real_escape_string($conn, $title_raw = $_POST['title']) : '';

if ($report_id <= 0) {
    echo json_encode(["success" => false, "message" => "잘못된 요청입니다."]);
    exit;
}

// 1) 이미지 파일 업로드 처리
$cover_image_path = null;
if (isset($_FILES['cover_image']) && $_FILES['cover_image']['error'] === UPLOAD_ERR_OK) {
    $file_tmp = $_FILES['cover_image']['tmp_name'];
    $file_name = $_FILES['cover_image']['name'];
    
    // 파일 확장자 추출 및 안전한 파일명 생성
    $ext = pathinfo($file_name, PATHINFO_EXTENSION);
    $new_file_name = "cover_" . $report_id . "_" . time() . "." . $ext;
    
    // 저장할 경로 (상위 폴더의 uploads 폴더 기준)
    $upload_dir = '../uploads/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }
    
    $dest_path = $upload_dir . $new_file_name;
    
    if (move_uploaded_file($file_tmp, $dest_path)) {
        $cover_image_path = $dest_path; // DB에 저장될 경로
    }
}

// 2) DB 업데이트 쿼리 빌드
mysqli_begin_transaction($conn);

try {
    if (!empty($title) && $cover_image_path !== null) {
        // 제목과 이미지 둘 다 수정할 때
        $sql = "UPDATE reports SET title = '$title', cover_image = '$cover_image_path' WHERE id = $report_id AND user_id = $user_id";
    } else if (!empty($title)) {
        // 제목만 수정할 때
        $sql = "UPDATE reports SET title = '$title' WHERE id = $report_id AND user_id = $user_id";
    } else if ($cover_image_path !== null) {
        // 이미지만 수정할 때
        $sql = "UPDATE reports SET cover_image = '$cover_image_path' WHERE id = $report_id AND user_id = $user_id";
    } else {
        echo json_encode(["success" => false, "message" => "수정할 내용이 없습니다."]);
        exit;
    }

    if (mysqli_query($conn, $sql)) {
        mysqli_commit($conn);
        echo json_encode([
            "success" => true, 
            "message" => "성공적으로 저장되었습니다.",
            "cover_image" => $cover_image_path // 프론트 반영용
        ]);
    } else {
        throw new Exception(mysqli_error($conn));
    }
} catch (Exception $e) {
    mysqli_rollback($conn);
    echo json_encode(["success" => false, "message" => "DB 저장 실패: " . $e->getMessage()]);
}

mysqli_close($conn);
?>