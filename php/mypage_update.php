<?php
// mypage_update.php
session_start();

// JSON 응답 헤더 설정
header('Content-Type: application/json; charset=utf-8');

include 'db_config.php';

// 1. 로그인 세션 체크
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["success" => false, "message" => "Unauthorized."]);
    exit;
}

$user_id = (int)$_SESSION['user_id'];

// 2. 프론트엔드에서 보낸 JSON 데이터 받기
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(["success" => false, "message" => "Invalid data received."]);
    exit;
}

// 3. 입력 데이터 보호 (SQL 인젝션 방지)
// DB 컬럼에 맞게 username, bio(소개글), is_private(공개여부) 등을 받는다고 가정합니다.
$new_username = isset($data['username']) ? mysqli_real_escape_string($conn, $data['username']) : '';
$new_bio = isset($data['bio']) ? mysqli_real_escape_string($conn, $data['bio']) : '';
$is_private = isset($data['is_private']) ? (int)$data['is_private'] : 0;

// 4. DB 정보 업데이트 (중략되었던 쿼리문 구성)
$sql = "UPDATE users 
        SET username = '$new_username', 
            bio = '$new_bio', 
            is_private = $is_private 
        WHERE user_id = $user_id";

// 5. 쿼리 실행 및 에러 처리
if (mysqli_query($conn, $sql)) {
    echo json_encode(["success" => true, "message" => "Profile updated successfully."]);
} else {
    $error_no = mysqli_errno($conn);
    // 1062 에러: UNIQUE 제약 조건 위배 (예: 이미 누군가 사용 중인 닉네임)
    if ($error_no === 1062) {
        echo json_encode(["success" => false, "message" => "Username already exists."]);
    } else {
        echo json_encode(["success" => false, "message" => "DB Error : " . mysqli_error($conn)]);
    }
}

mysqli_close($conn);
?>