<?php
include 'db_config.php';
session_start();

// 로그인 확인
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["success" => false, "message" => "로그인이 필요합니다."]);
    exit;
}

$user_id = $_SESSION['user_id'];
header('Content-Type: application/json');

// 내 user_id가 포함된 그룹을 club_groups와 group_members 조인으로 가져옵니다.
$sql = "SELECT cg.group_id, cg.group_name, cg.group_profile_img 
        FROM club_groups cg
        JOIN group_members gm ON cg.group_id = gm.group_id
        WHERE gm.user_id = $user_id
        ORDER BY gm.joined_at ASC";

$result = mysqli_query($conn, $sql);
$groups = [];

if ($result) {
    while($row = mysqli_fetch_assoc($result)) {
        $groups[] = $row;
    }
}

echo json_encode(["success" => true, "groups" => $groups]);
mysqli_close($conn);
?>