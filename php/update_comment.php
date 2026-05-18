<?php
include 'db_config.php';
session_start();

header('Content-Type: application/json; charset=utf-8');

$response = ['success' => false, 'message' => '알 수 없는 오류가 발생했습니다.'];

try {
    // 세션 체크
    if (!isset($_SESSION['user_id'])) {
        throw new Exception('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
    }

    $user_id = intval($_SESSION['user_id']);

    // JSON 본문 파싱
    $input = json_decode(file_get_contents('php://input'), true);
    $comment = isset($input['daily_comment']) ? trim($input['daily_comment']) : '';

    // 길이 제한 (프론트 maxlength와 동일)
    if (mb_strlen($comment) > 50) {
        throw new Exception('한마디는 50자 이내로 입력해주세요.');
    }

    $comment_safe = mysqli_real_escape_string($conn, $comment);

    // 현재 설정된 노래(current_song_id)의 한마디를 수정
    $sql = "UPDATE songs s
            JOIN users u ON u.current_song_id = s.song_id
            SET s.daily_comment = '$comment_safe'
            WHERE u.user_id = $user_id";

    if (mysqli_query($conn, $sql)) {
        if (mysqli_affected_rows($conn) >= 0) {
            $response = ['success' => true];
        } else {
            throw new Exception('수정할 노래를 찾을 수 없습니다.');
        }
    } else {
        throw new Exception('DB 수정 오류: ' . mysqli_error($conn));
    }
} catch (Exception $e) {
    $response = ['success' => false, 'message' => $e->getMessage()];
}

echo json_encode($response);
mysqli_close($conn);
?>