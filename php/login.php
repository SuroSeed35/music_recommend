<?php
include 'db_config.php';
session_start();

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $login_id = mysqli_real_escape_string($conn, $_POST['login_id']);
    $password = $_POST['password'];

    $sql = "SELECT * FROM users WHERE login_id = '$login_id'";
    $result = mysqli_query($conn, $sql);
    $user = mysqli_fetch_assoc($result);

    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['login_id'] = $user['login_id'];
        $my_id = $user['user_id'];

        // 오늘 추천 여부 확인
        $check_sql = "SELECT song_id FROM songs WHERE user_id = $my_id AND DATE(created_at) = CURRENT_DATE";
        $check_res = mysqli_query($conn, $check_sql);
        
        // 목적지 설정
        $target_url = (mysqli_num_rows($check_res) > 0) ? '../html/music_list.html' : '../html/main.html';

        // 🔥 중앙 메시지 애니메이션 출력
        echo "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body {
                    margin: 0;
                    height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background-color: #fff;
                    font-family: 'Pretendard', sans-serif;
                }
                .toast-msg {
                    font-size: 60px;
                    font-weight: 600;
                    color: #333;
                    animation: fadeOut 1.5s forwards; /* 1.5초 동안 나타났다 사라짐 */
                }
                @keyframes fadeOut {
                    0% { opacity: 0; transform: translateY(10px); }
                    20% { opacity: 1; transform: translateY(0); }
                    80% { opacity: 1; }
                    100% { opacity: 0; }
                }
            </style>
        </head>
        <body>
            <div class='toast-msg'>로그인 되었습니다.</div>
            <script>
                // 애니메이션이 끝나는 시점에 맞춰 페이지 이동
                setTimeout(() => {
                    location.replace('$target_url');
                }, 1300); 
            </script>
        </body>
        </html>";
        exit;
    } else {
        echo "<script>alert('아이디 또는 비밀번호가 틀렸습니다.'); history.back();</script>";
    }
}
mysqli_close($conn);
?>