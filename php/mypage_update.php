<?php
// 1. 에러 보고 설정 조정 (JSON 응답을 방해하는 HTML 에러 출력 방지)
mysqli_report(MYSQLI_REPORT_OFF); 
error_reporting(0); 

include 'db_config.php';
session_start();

// 2. 응답 헤더 설정
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["success" => false, "message" => "로그인이 필요합니다."]);
    exit;
}

$user_id = $_SESSION['user_id'];
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(["success" => false, "message" => "데이터가 올바르지 않습니다."]);
    exit;
}

$new_username = mysqli_real_escape_string($conn, $data['username']);
$new_login_id = mysqli_real_escape_string($conn, $data['login_id']);
$new_bio = mysqli_real_escape_string($conn, $data['bio']);

// 3. 업데이트 실행
$sql = "UPDATE users 
        SET username = '$new_username', 
            login_id = '$new_login_id', 
            bio = '$new_bio' 
        WHERE user_id = $user_id";

if (mysqli_query($conn, $sql)) {
    echo json_encode(["success" => true]);
} else {
    $error_no = mysqli_errno($conn);
    // 1062번은 중복 키 에러 (Duplicate entry)
    if ($error_no === 1062) {
        echo json_encode(["success" => false, "message" => "이미 사용 중인 아이디입니다."]);
    } else {
        echo json_encode(["success" => false, "message" => "DB 에러: " . mysqli_error($conn)]);
    }
}

mysqli_close($conn);
?>