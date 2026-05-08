<?php
session_start();

// 모든 세션 변수 해제
session_unset();

// 세션 파기
session_destroy();

// 성공 메시지를 JSON 형태로 반환
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['status' => 'success', 'message' => '로그아웃 되었습니다.']);
?>