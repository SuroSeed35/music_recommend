<?php
include 'db_config.php';
header('Content-Type: application/json'); // JSON 응답

// mysqli 에러 모드 (PHP 8.1+ 호환)
mysqli_report(MYSQLI_REPORT_OFF);

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $raw_email = trim($_POST['email'] ?? '');
    $raw_login_id = trim($_POST['login_id'] ?? '');
    $raw_username = trim($_POST['username'] ?? '');
    $raw_password = $_POST['password'] ?? '';

    // 1. 이메일 형식 검증
    if ($raw_email === '' || !filter_var($raw_email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => '올바른 이메일 형식이 아닙니다.']);
        mysqli_close($conn);
        exit;
    }

    if (mb_strlen($raw_email) > 100) {
        echo json_encode(['success' => false, 'message' => '이메일이 너무 깁니다.']);
        mysqli_close($conn);
        exit;
    }

    // 2. 닉네임 검증
    if ($raw_username === '') {
        echo json_encode(['success' => false, 'message' => '닉네임을 입력해주세요.']);
        mysqli_close($conn);
        exit;
    }

    // 3. 아이디 형식 검증
    if (!preg_match('/^[a-zA-Z0-9_.]+$/', $raw_login_id)) {
        echo json_encode(['success' => false, 'message' => '아이디는 영문, 숫자, 밑줄(_), 마침표(.)만 가능합니다.']);
        mysqli_close($conn);
        exit;
    }

    // 4. 비밀번호 형식 검증
    if (!preg_match('/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/', $raw_password)) {
        echo json_encode(['success' => false, 'message' => '비밀번호는 영문, 숫자, 특수문자를 포함해 8자 이상이어야 합니다.']);
        mysqli_close($conn);
        exit;
    }

    // 5. 데이터 정제
    $email = mysqli_real_escape_string($conn, $raw_email);
    $login_id = mysqli_real_escape_string($conn, $raw_login_id);
    $username = mysqli_real_escape_string($conn, $raw_username);
    $hashed_password = password_hash($raw_password, PASSWORD_DEFAULT);

    // 6. 중복 검사 (아이디 / 이메일)
    $check_sql = "SELECT login_id, email FROM users WHERE login_id = '$login_id' OR email = '$email'";
    $result = mysqli_query($conn, $check_sql);

    if (mysqli_num_rows($result) > 0) {
        $row = mysqli_fetch_assoc($result);
        if ($row['login_id'] === $login_id) {
            echo json_encode(['success' => false, 'message' => '이미 사용 중인 아이디입니다.']);
        } else {
            echo json_encode(['success' => false, 'message' => '이미 가입된 이메일입니다.']);
        }
        mysqli_close($conn);
        exit;
    }

    // 7. 회원가입 실행
    $sql = "INSERT INTO users (login_id, email, password, username) VALUES ('$login_id', '$email', '$hashed_password', '$username')";
    if (mysqli_query($conn, $sql)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => '회원가입 처리 중 오류가 발생했습니다.']);
    }
}
mysqli_close($conn);
?>