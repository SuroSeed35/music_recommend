<?php
include 'db_config.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // 보안을 위해 escape 처리
    $email = mysqli_real_escape_string($conn, $_POST['email']);
    $login_id = mysqli_real_escape_string($conn, $_POST['login_id']);
    
    // 추가된 username(닉네임) 필드 받기
    $username = mysqli_real_escape_string($conn, $_POST['username']); 
    
    $password = $_POST['password'];

    // 비밀번호 암호화
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    // 중복 확인 (아이디 또는 이메일)
    $check_sql = "SELECT * FROM users WHERE login_id = '$login_id' OR email = '$email'";
    $result = mysqli_query($conn, $check_sql);

    if (mysqli_num_rows($result) > 0) {
        echo "<script>alert('이미 사용 중인 아이디 혹은 이메일입니다.'); history.back();</script>";
    } else {
        // 데이터 삽입 (username 추가)
        $sql = "INSERT INTO users (login_id, email, password, username) VALUES ('$login_id', '$email', '$hashed_password', '$username')";
        
        if (mysqli_query($conn, $sql)) {
            echo "<script>alert('회원가입이 완료되었습니다!'); location.href='../html/login.html';</script>";
        } else {
            echo "오류 발생: " . mysqli_error($conn);
        }
    }
}

mysqli_close($conn);
?>