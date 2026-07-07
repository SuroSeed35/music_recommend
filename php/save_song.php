<?php
// 1. 예기치 않은 출력 방지
ob_start();

// 2. 에러 보고 설정
ini_set('display_errors', 0); 
error_reporting(E_ALL);

include 'db_config.php';
session_start();

// 응답 헤더 설정
header('Content-Type: application/json; charset=utf-8');

$response = ['success' => false, 'message' => '알 수 없는 오류가 발생했습니다.'];

try {
    // 세션 체크
    if (!isset($_SESSION['user_id'])) {
        throw new Exception('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
    }

    if ($_SERVER["REQUEST_METHOD"] === "POST") {
        $user_id = $_SESSION['user_id'];
        $url = mysqli_real_escape_string($conn, $_POST['url'] ?? '');
        $comment = mysqli_real_escape_string($conn, $_POST['comment'] ?? '');
        $title = mysqli_real_escape_string($conn, $_POST['title'] ?? '');
        $thumb = mysqli_real_escape_string($conn, $_POST['thumb'] ?? '');
        
        $current_date = date('Y-m-d');
        $current_time = date('H:i:s');

        if (empty($url) || empty($title)) {
            throw new Exception('필수 데이터가 누락되었습니다.');
        }

        // --- 중복 검사 로직 시작 ---
        $force_save = $_POST['force_save'] ?? '0';

        if ($force_save !== '1') {
            
            // 💡 1. 텍스트 정제 및 단어 분리 함수
            if (!function_exists('get_clean_words')) {
                function get_clean_words($str) {
                    // 모두 소문자로 변환
                    $str = mb_strtolower($str, 'UTF-8');
                    
                    // 🚨 [필터링 강화] 유튜브 제목에 단골로 등장하는 방해 단어들을 빈칸으로 날려버립니다.
                    $str = preg_replace('/(?:official|music video|mv|lyric|lyrics|audio|teaser|가사|뮤비|교차편집|해석|발음|한국어|자막|cover|커버|live|clip|라이브|클립|performance|퍼포먼스|special|스페셜|video|비디오|영상|stage|스테이지)/i', ' ', $str);
                    
                    // 한글, 알파벳, 숫자, 일본어, 한자(\p{L}) 및 숫자(\p{N})를 제외한 "모든 특수문자"를 공백으로 치환
                    $str = preg_replace('/[^\p{L}\p{N}]/u', ' ', $str);
                    
                    // 공백 기준으로 단어를 쪼개고 빈 값은 제거하여 배열로 반환
                    $words = array_filter(explode(' ', $str));
                    return array_values($words);
                }
            }

            // 본인이 추천했던 노래들 DB에서 호출
            $check_sql = "SELECT title, log_date, thumbnail_img, youtube_url FROM songs WHERE user_id = '$user_id'";
            $check_res = mysqli_query($conn, $check_sql);

            $duplicates = [];

            if ($check_res) {
                // 새로 입력된 제목을 분석
                $new_words = get_clean_words($title);
                $new_nospace = implode('', $new_words); // 공백을 모두 없앤 완전체

                while($row = mysqli_fetch_assoc($check_res)) {
                    $existing_title = $row['title'];
                    $existing_url = $row['youtube_url'];
                    
                    // 0. URL이 같으면 무조건 중복
                    if ($existing_url === $url) {
                        $duplicates[] = [
                            'title' => $existing_title,
                            'log_date' => $row['log_date'],
                            'thumbnail_img' => $row['thumbnail_img'] 
                        ];
                        continue;
                    }

                    // 기존 제목 분석
                    $old_words = get_clean_words($existing_title);
                    $old_nospace = implode('', $old_words);

                    if (empty($new_nospace) || empty($old_nospace)) {
                        continue;
                    }

                    $is_duplicate = false;

                    // 1. 핵심 알맹이가 완벽히 똑같은 경우
                    if ($new_nospace === $old_nospace) {
                        $is_duplicate = true;
                    }

                    // 2. 한쪽 제목이 상대방 제목에 완전히 포함되는 경우 (단, 2글자 이상일 때)
                    if (!$is_duplicate) {
                        $min_len = min(mb_strlen($new_nospace, 'UTF-8'), mb_strlen($old_nospace, 'UTF-8'));
                        if ($min_len >= 2) {
                            if (mb_strpos($old_nospace, $new_nospace) !== false || mb_strpos($new_nospace, $old_nospace) !== false) {
                                $is_duplicate = true;
                            }
                        }
                    }

                    // 3. 공통 단어가 존재하는 경우
                    if (!$is_duplicate) {
                        $common_words = array_intersect($new_words, $old_words);
                        foreach ($common_words as $word) {
                            if (mb_strlen($word, 'UTF-8') >= 2) {
                                $is_duplicate = true;
                                break;
                            }
                        }
                    }

                    // 4. 띄어쓰기 뭉개짐 교차 검사
                    if (!$is_duplicate) {
                        foreach ($new_words as $word) {
                            if (mb_strlen($word, 'UTF-8') >= 3 && mb_strpos($old_nospace, $word) !== false) { 
                                $is_duplicate = true; break; 
                            }
                        }
                        if (!$is_duplicate) {
                            foreach ($old_words as $word) {
                                if (mb_strlen($word, 'UTF-8') >= 3 && mb_strpos($new_nospace, $word) !== false) { 
                                    $is_duplicate = true; break; 
                                }
                            }
                        }
                    }

                    // 중복 판정이 나면 배열에 담기
                    if ($is_duplicate) {
                        $duplicates[] = [
                            'title' => $existing_title,
                            'log_date' => $row['log_date'],
                            'thumbnail_img' => $row['thumbnail_img'] 
                        ];
                    }
                }
            }

            // 중복된 곡이 하나라도 있다면 응답
            if (count($duplicates) > 0) {
                ob_end_clean();
                echo json_encode([
                    'success' => false, 
                    'is_duplicate' => true, 
                    'duplicates' => $duplicates 
                ]);
                exit;
            }
        }
        // --- 중복 검사 로직 끝 ---

        // 3. 노래 정보를 DB에 저장
        $sql = "INSERT INTO songs (user_id, youtube_url, title, daily_comment, thumbnail_img, log_date, log_time) 
                VALUES ('$user_id', '$url', '$title', '$comment', '$thumb', '$current_date', '$current_time')";
        
        if (mysqli_query($conn, $sql)) {
            $last_id = mysqli_insert_id($conn);
            mysqli_query($conn, "UPDATE users SET current_song_id = '$last_id' WHERE user_id = '$user_id'");

            $response = ['success' => true];
        } else {
            throw new Exception('DB 저장 오류: ' . mysqli_error($conn));
        }
    }
} catch (Exception $e) {
    $response = ['success' => false, 'message' => $e->getMessage()];
}

ob_end_clean();
echo json_encode($response);
mysqli_close($conn);
?>