<?php
// 이 함수는 어느 파일에서든 불러와서 알림을 쏠 때 사용합니다.
function sendFCMV1($token, $title, $body) {
    $projectId = 'musicrecommend-c0498'; // 소은님 프로젝트 ID
    $keyFile = __DIR__ . '/firebase_key.json'; // 아까 올린 열쇠 파일
    
    // 1. JSON 키 읽기
    $keyData = json_decode(file_get_contents($keyFile), true);
    
    // 💡 참고: 실제 v1 방식은 '액세스 토큰' 생성 과정이 필요합니다.
    // 여기서는 개념을 먼저 잡기 위해 구조를 보여드리며, 
    // 소은님이 바로 테스트하실 수 있게 '친구 요청' 로직에 바로 합쳐볼게요!
}
?>