<?php
include 'db_config.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["success" => false, "message" => "로그인 필요"]);
    exit;
}

$my_id = $_SESSION['user_id'];

// 👇 main_group_id를 반드시 포함하여 쿼리합니다.
$sql = "SELECT user_id, username, login_id, main_group_id FROM users WHERE user_id = $my_id";
$result = mysqli_query($conn, $sql);

if ($row = mysqli_fetch_assoc($result)) {
    echo json_encode([
        "success" => true,
        "username" => $row['username'],
        "login_id" => $row['login_id'],
        "main_group_id" => (int)$row['main_group_id'] // 숫자로 확실히 변환해서 전달
    ]);
} else {
    echo json_encode(["success" => false]);
}

mysqli_close($conn);
?>