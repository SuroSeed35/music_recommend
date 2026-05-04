<?php
include 'db_config.php';
session_start();
header('Content-Type: application/json'); // JSON 응답으로 변경

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $login_id = mysqli_real_escape_string($conn, $_POST['login_id'] ?? '');
    $password = $_POST['password'] ?? '';

    $sql = "SELECT * FROM users WHERE login_id = '$login_id'";
    $result = mysqli_query($conn, $sql);
    $user = mysqli_fetch_assoc($result);

    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['login_id'] = $user['login_id'];
        $my_id = $user['user_id'];
        
        $check_sql = "SELECT song_id FROM songs WHERE user_id = $my_id AND DATE(created_at) = CURRENT_DATE";
        $check_res = mysqli_query($conn, $check_sql);
        
        $target_url = (mysqli_num_rows($check_res) > 0) ? '../html/music_list.html' : '../html/main.html';
        
        // 성공 응답 전송
        echo json_encode(['success' => true, 'redirect' => $target_url]);
    } else {
        // 실패 응답 전송
        echo json_encode(['success' => false, 'message' => '아이디 또는 비밀번호가 올바르지 않습니다.']);
    }
}
mysqli_close($conn);
?>