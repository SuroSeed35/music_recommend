<?php
include 'db_config.php';
session_start();

// 로그인 체크
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

$my_id = $_SESSION['user_id'];
$action = $_GET['action'] ?? '';

header('Content-Type: application/json');

switch ($action) {
    case 'get_my_info':
        $sql = "SELECT username, login_id FROM users WHERE user_id = $my_id";
        $res = mysqli_query($conn, $sql);
        echo json_encode(mysqli_fetch_assoc($res));
        break;

    case 'get_my_groups':
        $sql = "SELECT g.group_id, g.group_name 
                FROM club_groups g 
                JOIN group_members gm ON g.group_id = gm.group_id 
                WHERE gm.user_id = $my_id";
        $res = mysqli_query($conn, $sql);
        $groups = mysqli_fetch_all($res, MYSQLI_ASSOC);
        echo json_encode(["success" => true, "groups" => $groups]);
        break;

    case 'get_data':
        $target_date = isset($_GET['date']) ? mysqli_real_escape_string($conn, $_GET['date']) : date('Y-m-d');
        $req_sql = "SELECT f.friendship_id, u.username FROM friends f JOIN users u ON f.user_id = u.user_id WHERE f.friend_id = $my_id AND f.status = 'pending'";
        $req_res = mysqli_query($conn, $req_sql);
        $requests = mysqli_fetch_all($req_res, MYSQLI_ASSOC);

        $group_sql = "SELECT g.group_id, g.group_name, COUNT(gm.user_id) as member_count FROM club_groups g JOIN group_members gm ON g.group_id = gm.group_id WHERE g.group_id IN (SELECT group_id FROM group_members WHERE user_id = $my_id) GROUP BY g.group_id";
        $group_res = mysqli_query($conn, $group_sql);
        $groups = mysqli_fetch_all($group_res, MYSQLI_ASSOC);

        $friend_sql = "SELECT u.user_id, u.username, u.bio, u.is_private, DATEDIFF(CURRENT_DATE, u.created_at) + 1 AS dday, s.title as song_title, s.youtube_url, s.thumbnail_img FROM friends f JOIN users u ON (f.friend_id = u.user_id OR f.user_id = u.user_id) LEFT JOIN songs s ON u.current_song_id = s.song_id WHERE (f.user_id = $my_id OR f.friend_id = $my_id) AND f.status = 'accepted' AND u.user_id != $my_id";
        $friend_res = mysqli_query($conn, $friend_sql);
        $friends = mysqli_fetch_all($friend_res, MYSQLI_ASSOC);

        $user_info_res = mysqli_query($conn, "SELECT main_group_id FROM users WHERE user_id = $my_id");
        $user_info = mysqli_fetch_assoc($user_info_res);
        $main_group_id = $user_info['main_group_id'] ? (int)$user_info['main_group_id'] : 0;

        if ($main_group_id == 0) { $target_users_sql = "SELECT user_id, username, login_id FROM users WHERE user_id = $my_id"; }
        else { $target_users_sql = "SELECT u.user_id, u.username, u.login_id FROM group_members gm JOIN users u ON gm.user_id = u.user_id WHERE gm.group_id = $main_group_id"; }

        $feed_sql = "SELECT t.user_id, t.username, t.login_id, s.song_id, s.youtube_url, s.title, s.daily_comment, s.thumbnail_img, s.created_at, s.log_date, s.log_time, IF(t.user_id = $my_id, 1, 0) as is_me FROM ($target_users_sql) t LEFT JOIN songs s ON t.user_id = s.user_id AND DATE(s.created_at) = '$target_date' ORDER BY is_me DESC, s.created_at DESC, t.username ASC";
        $feed_res = mysqli_query($conn, $feed_sql);
        $feed_songs = mysqli_fetch_all($feed_res, MYSQLI_ASSOC);

        echo json_encode(["requests" => $requests, "groups" => $groups, "friends" => $friends, "feed_songs" => $feed_songs]);
        break;

    case 'search_users':
        $keyword = isset($_GET['keyword']) ? mysqli_real_escape_string($conn, $_GET['keyword']) : '';
        $sent_res = mysqli_query($conn, "SELECT f.friend_id as user_id, u.username FROM friends f JOIN users u ON f.friend_id = u.user_id WHERE f.user_id = $my_id AND f.status = 'pending' AND u.is_private = 0");
        $sent_requests = mysqli_fetch_all($sent_res, MYSQLI_ASSOC);
        $sql = "SELECT user_id, username, is_private FROM users WHERE user_id != $my_id AND (username LIKE '%$keyword%' OR login_id LIKE '%$keyword%') AND user_id NOT IN (SELECT friend_id FROM friends WHERE user_id = $my_id UNION SELECT user_id FROM friends WHERE friend_id = $my_id)";
        $res = mysqli_query($conn, $sql);
        echo json_encode(["sent_requests" => $sent_requests, "search_results" => mysqli_fetch_all($res, MYSQLI_ASSOC)]);
        break;

    case 'request_friend':
        $data = json_decode(file_get_contents('php://input'), true);
        $target_id = (int)$data['target_id'];
        $check_res = mysqli_query($conn, "SELECT friendship_id FROM friends WHERE user_id = $my_id AND friend_id = $target_id");
        if (mysqli_num_rows($check_res) == 0) {
            $sql = "INSERT INTO friends (user_id, friend_id, status) VALUES ($my_id, $target_id, 'pending')";
            if (mysqli_query($conn, $sql)) {
                include_once 'fcm_v1_send.php';
                $target = mysqli_fetch_assoc(mysqli_query($conn, "SELECT fcm_token FROM users WHERE user_id = $target_id"));
                $me = mysqli_fetch_assoc(mysqli_query($conn, "SELECT username FROM users WHERE user_id = $my_id"));
                if (!empty($target['fcm_token'])) {
                    sendFCMV1($target['fcm_token'], "친구 요청", "{$me['username']}님이 친구 신청을 보냈어요!");
                }
                echo json_encode(["success" => true]);
            }
        } else { echo json_encode(["success" => true, "message" => "이미 신청함"]); }
        break;

    case 'accept_friend':
        $data = json_decode(file_get_contents('php://input'), true);
        $f_id = (int)($data['friendship_id'] ?? 0);
        if ($f_id === 0) { echo json_encode(["success" => false, "message" => "ID 없음"]); break; }
        
        $find_res = mysqli_query($conn, "SELECT f.user_id as sender_id, u.fcm_token FROM friends f JOIN users u ON f.user_id = u.user_id WHERE f.friendship_id = $f_id");
        $target_data = mysqli_fetch_assoc($find_res);
        
        if (mysqli_query($conn, "UPDATE friends SET status = 'accepted' WHERE friendship_id = $f_id")) {
            include_once 'fcm_v1_send.php';
            $me = mysqli_fetch_assoc(mysqli_query($conn, "SELECT username FROM users WHERE user_id = $my_id"));
            if ($target_data && !empty($target_data['fcm_token'])) {
                sendFCMV1($target_data['fcm_token'], "친구 수락", "{$me['username']}님이 친구 요청을 수락했어요.");
            }
            echo json_encode(["success" => true]);
        } else { echo json_encode(["success" => false]); }
        break;

    case 'create_group':
        ob_start();
        $data = json_decode(file_get_contents('php://input'), true);
        $g_name = mysqli_real_escape_string($conn, $data['group_name']);
        $members = isset($data['members']) ? $data['members'] : [];
        if (!in_array($my_id, $members)) { $members[] = $my_id; }
        $members = array_unique($members);

        if (mysqli_query($conn, "INSERT INTO club_groups (group_name) VALUES ('$g_name')")) {
            $new_group_id = mysqli_insert_id($conn);
            include_once 'fcm_v1_send.php';
            $me = mysqli_fetch_assoc(mysqli_query($conn, "SELECT username, fcm_token FROM users WHERE user_id = $my_id"));

            // 방장(본인)에게 그룹 생성 완료 알림
            if (!empty($me['fcm_token'])) {
                sendFCMV1($me['fcm_token'], "그룹 생성", "[{$g_name}] 그룹이 생성되었습니다!");
            }

            foreach ($members as $m_id) {
                $role = ((int)$m_id == $my_id) ? 'admin' : 'member';
                mysqli_query($conn, "INSERT INTO group_members (group_id, user_id, role) VALUES ($new_group_id, $m_id, '$role')");
                
                // 초대받은 멤버들에게 알림 발송
                if ((int)$m_id != $my_id) {
                    $target = mysqli_fetch_assoc(mysqli_query($conn, "SELECT fcm_token FROM users WHERE user_id = $m_id"));
                    if (!empty($target['fcm_token'])) {
                        sendFCMV1($target['fcm_token'], "그룹 초대", "'[{$g_name}]' 그룹에 초대되었습니다!");
                    }
                }
            }
            ob_clean();
            echo json_encode(["success" => true]);
        } else {
            ob_clean();
            echo json_encode(["success" => false, "message" => "DB 저장 실패"]);
        }
        exit;
        break;

    case 'set_main_group':
        $data = json_decode(file_get_contents('php://input'), true);
        $group_id = (int)$data['group_id'];
        mysqli_query($conn, "UPDATE users SET main_group_id = $group_id WHERE user_id = $my_id");
        echo json_encode(["success" => true]);
        break;

    case 'get_group_members':
        $group_id = (int)$_GET['group_id'];
        $res = mysqli_query($conn, "SELECT u.username FROM group_members gm JOIN users u ON gm.user_id = u.user_id WHERE gm.group_id = $group_id");
        echo json_encode(mysqli_fetch_all($res, MYSQLI_ASSOC));
        break;

    case 'check_today_recommend':
        $res = mysqli_query($conn, "SELECT song_id FROM songs WHERE user_id = $my_id AND DATE(created_at) = CURRENT_DATE");
        echo json_encode(["already_done" => mysqli_num_rows($res) > 0]);
        break;

    case 'get_comments':
        $song_id = (int)($_GET['song_id'] ?? 0);
        if ($song_id <= 0) { 
            echo json_encode(["success" => false, "message" => "잘못된 요청"]); 
            break; 
        }

        // 곡 주인 확인
        $owner_res = mysqli_query($conn, "SELECT user_id FROM songs WHERE song_id = $song_id");
        $owner_row = mysqli_fetch_assoc($owner_res);
        if (!$owner_row) { 
            echo json_encode(["success" => false, "message" => "곡을 찾을 수 없음"]); 
            break; 
        }
        $owner_id = (int)$owner_row['user_id'];

        // 권한 체크: 본인 곡이거나, 같은 그룹에 소속된 적이 있어야 함
        $can_view = ($owner_id === $my_id);
        if (!$can_view) {
            $perm_sql = "SELECT 1 FROM group_members gm1 
                         JOIN group_members gm2 ON gm1.group_id = gm2.group_id
                         WHERE gm1.user_id = $owner_id AND gm2.user_id = $my_id LIMIT 1";
            $perm_res = mysqli_query($conn, $perm_sql);
            $can_view = (mysqli_num_rows($perm_res) > 0);
        }
        if (!$can_view) { 
            echo json_encode(["success" => false, "message" => "권한 없음"]); 
            break; 
        }

        // 댓글 목록 조회
        $sql = "SELECT c.comment_id, c.user_id, c.content, c.created_at, 
                       u.username, u.login_id,
                       IF(c.user_id = $my_id, 1, 0) AS is_mine
                FROM song_comments c
                JOIN users u ON c.user_id = u.user_id
                WHERE c.song_id = $song_id AND c.is_deleted = 0
                ORDER BY c.created_at ASC";
        $res = mysqli_query($conn, $sql);
        $comments = mysqli_fetch_all($res, MYSQLI_ASSOC);
        echo json_encode(["success" => true, "comments" => $comments]);
        break;

    case 'add_comment':
        $data = json_decode(file_get_contents('php://input'), true);
        $song_id = (int)($data['song_id'] ?? 0);
        $content = trim($data['content'] ?? '');

        // 입력 검증
        if ($song_id <= 0 || $content === '') { 
            echo json_encode(["success" => false, "message" => "내용을 입력하세요"]); 
            break; 
        }
        if (mb_strlen($content) > 300) { 
            echo json_encode(["success" => false, "message" => "300자 이내로 입력하세요"]); 
            break; 
        }

        // 곡 주인 확인
        $owner_res = mysqli_query($conn, "SELECT user_id FROM songs WHERE song_id = $song_id");
        $owner_row = mysqli_fetch_assoc($owner_res);
        if (!$owner_row) { 
            echo json_encode(["success" => false, "message" => "곡을 찾을 수 없음"]); 
            break; 
        }
        $owner_id = (int)$owner_row['user_id'];

        // 권한 체크: 본인 곡이거나, 같은 그룹 멤버
        $can_write = ($owner_id === $my_id);
        if (!$can_write) {
            $perm_sql = "SELECT 1 FROM group_members gm1 
                         JOIN group_members gm2 ON gm1.group_id = gm2.group_id
                         WHERE gm1.user_id = $owner_id AND gm2.user_id = $my_id LIMIT 1";
            $perm_res = mysqli_query($conn, $perm_sql);
            $can_write = (mysqli_num_rows($perm_res) > 0);
        }
        if (!$can_write) { 
            echo json_encode(["success" => false, "message" => "같은 그룹 멤버만 댓글을 달 수 있습니다"]); 
            break; 
        }

        $safe_content = mysqli_real_escape_string($conn, $content);
        $sql = "INSERT INTO song_comments (song_id, user_id, content) VALUES ($song_id, $my_id, '$safe_content')";
        if (mysqli_query($conn, $sql)) {
            echo json_encode(["success" => true, "comment_id" => mysqli_insert_id($conn)]);
        } else {
            echo json_encode(["success" => false, "message" => "저장 실패"]);
        }
        break;

    case 'delete_comment':
        $data = json_decode(file_get_contents('php://input'), true);
        $comment_id = (int)($data['comment_id'] ?? 0);
        if ($comment_id <= 0) { 
            echo json_encode(["success" => false, "message" => "잘못된 요청"]); 
            break; 
        }

        // 본인 댓글인지 확인
        $check_res = mysqli_query($conn, "SELECT user_id FROM song_comments WHERE comment_id = $comment_id AND is_deleted = 0");
        $check_row = mysqli_fetch_assoc($check_res);
        if (!$check_row) { 
            echo json_encode(["success" => false, "message" => "댓글을 찾을 수 없음"]); 
            break; 
        }
        if ((int)$check_row['user_id'] !== $my_id) { 
            echo json_encode(["success" => false, "message" => "본인 댓글만 삭제 가능"]); 
            break; 
        }

        if (mysqli_query($conn, "UPDATE song_comments SET is_deleted = 1 WHERE comment_id = $comment_id")) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["success" => false, "message" => "삭제 실패"]);
        }
        break;
}

mysqli_close($conn);
?>