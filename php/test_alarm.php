<?php
// 화면에 모든 에러를 강제로 출력하게 만듭니다.
ini_set('display_errors', 1);
error_reporting(E_ALL);

include 'db_config.php';
include_once 'fcm_v1_send.php';

// 본인 토큰 문자열을 다시 넣어주세요
$my_device_token = "여기에_본인_스마트폰의_FCM_토큰_문자열을_넣으세요";

echo "알림 전송을 시작합니다...<br>";

try {
    $result = sendFCMV1($my_device_token, "테스트 알림", "이 알림이 보이면 성공입니다!");

    echo "구글 서버 응답 결과:<br>";
    echo "<pre>";
    var_dump($result); // 빈칸 대신 bool(false) 등의 형태로 결과를 보여줍니다.
    echo "</pre>";
} catch (Exception $e) {
    echo "코드 실행 중 에러 발생: " . $e->getMessage();
}
?>