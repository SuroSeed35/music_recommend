<?php
include 'db_config.php';
session_start();

// 로그인 체크
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

// (int)를 붙여서 숫자형으로 확실하게 변환해 줍니다.
$my_id = (int)$_SESSION['user_id'];
$action = $_GET['action'] ?? '';

header('Content-Type: application/json');

switch ($action) {
    case 'get_my_info':
        $sql = "SELECT username, login_id FROM users WHERE user_id = $my_id";
        $res = mysqli_query($conn, $sql);
        echo json_encode(mysqli_fetch_assoc($res));
        break;

    case 'get_my_groups':
        // status = 'accepted' 조건 추가
        $sql = "SELECT g.group_id, g.group_name 
                FROM club_groups g 
                JOIN group_members gm ON g.group_id = gm.group_id 
                WHERE gm.user_id = $my_id AND gm.status = 'accepted'";
        $res = mysqli_query($conn, $sql);
        $groups = mysqli_fetch_all($res, MYSQLI_ASSOC);
        echo json_encode(["success" => true, "groups" => $groups]);
        break;

    case 'get_data':
        $target_date = isset($_GET['date']) ? mysqli_real_escape_string($conn, $_GET['date']) : date('Y-m-d');
        
        // 1. 친구 요청 목록
        $req_sql = "SELECT f.friendship_id, u.username FROM friends f JOIN users u ON f.user_id = u.user_id WHERE f.friend_id = $my_id AND f.status = 'pending'";
        $req_res = mysqli_query($conn, $req_sql);
        $requests = mysqli_fetch_all($req_res, MYSQLI_ASSOC);

        // 2. 내가 속한 그룹 목록 (나의 권한, 인원수 포함)
        $group_sql = "SELECT g.group_id, g.group_name, gm_me.role, 
                             (SELECT COUNT(*) FROM group_members WHERE group_id = g.group_id AND status = 'accepted') as member_count,
                             (SELECT COUNT(*) FROM group_members WHERE group_id = g.group_id AND status = 'pending') as pending_count
                      FROM club_groups g 
                      JOIN group_members gm_me ON g.group_id = gm_me.group_id 
                      WHERE gm_me.user_id = $my_id AND gm_me.status = 'accepted'";
        $group_res = mysqli_query($conn, $group_sql);
        $groups = mysqli_fetch_all($group_res, MYSQLI_ASSOC);

        // 3. 나에게 온 그룹 초대 목록 
        $invite_sql = "SELECT gm.group_id, g.group_name, 
                              (SELECT COUNT(*) FROM group_members WHERE group_id = g.group_id AND status = 'accepted') as member_count
                       FROM group_members gm 
                       JOIN club_groups g ON gm.group_id = g.group_id 
                       WHERE gm.user_id = $my_id AND gm.status = 'pending'";
        $invite_res = mysqli_query($conn, $invite_sql);
        $group_invites = mysqli_fetch_all($invite_res, MYSQLI_ASSOC);

        // 4. 친구 목록
        $friend_sql = "SELECT u.user_id, u.username, u.bio, u.is_private, DATEDIFF(CURRENT_DATE, u.created_at) + 1 AS dday, s.title as song_title, s.youtube_url, s.thumbnail_img FROM friends f JOIN users u ON (f.friend_id = u.user_id OR f.user_id = u.user_id) LEFT JOIN songs s ON u.current_song_id = s.song_id WHERE (f.user_id = $my_id OR f.friend_id = $my_id) AND f.status = 'accepted' AND u.user_id != $my_id";
        $friend_res = mysqli_query($conn, $friend_sql);
        $friends = mysqli_fetch_all($friend_res, MYSQLI_ASSOC);

        // 5. 피드 정보
        $user_info_res = mysqli_query($conn, "SELECT main_group_id FROM users WHERE user_id = $my_id");
        $user_info = mysqli_fetch_assoc($user_info_res);
        $main_group_id = $user_info['main_group_id'] ? (int)$user_info['main_group_id'] : 0;

        if ($main_group_id == 0) { $target_users_sql = "SELECT user_id, username, login_id FROM users WHERE user_id = $my_id"; }
        else { $target_users_sql = "SELECT u.user_id, u.username, u.login_id FROM group_members gm JOIN users u ON gm.user_id = u.user_id WHERE gm.group_id = $main_group_id AND gm.status = 'accepted'"; }

        $feed_sql = "SELECT t.user_id, t.username, t.login_id, s.song_id, s.youtube_url, s.title, s.daily_comment, s.thumbnail_img, s.created_at, s.log_date, s.log_time, IF(t.user_id = $my_id, 1, 0) as is_me FROM ($target_users_sql) t LEFT JOIN songs s ON t.user_id = s.user_id AND DATE(s.created_at) = '$target_date' ORDER BY is_me DESC, s.created_at DESC, t.username ASC";
        $feed_res = mysqli_query($conn, $feed_sql);
        $feed_songs = mysqli_fetch_all($feed_res, MYSQLI_ASSOC);

        echo json_encode(["requests" => $requests, "groups" => $groups, "group_invites" => $group_invites, "friends" => $friends, "feed_songs" => $feed_songs]);
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
                echo json_encode(["success" => true]);
            }
        } else { echo json_encode(["success" => true, "message" => "이미 신청함"]); }
        break;

    case 'accept_friend':
        $data = json_decode(file_get_contents('php://input'), true);
        $f_id = (int)($data['friendship_id'] ?? 0);
        if ($f_id === 0) { echo json_encode(["success" => false, "message" => "ID 없음"]); break; }
        
        $find_res = mysqli_query($conn, "SELECT f.user_id as sender_id FROM friends f JOIN users u ON f.user_id = u.user_id WHERE f.friendship_id = $f_id");
        $target_data = mysqli_fetch_assoc($find_res);
        
        if (mysqli_query($conn, "UPDATE friends SET status = 'accepted' WHERE friendship_id = $f_id")) {
            echo json_encode(["success" => true]);
        } else { echo json_encode(["success" => false]); }
        break;

    case 'update_group':
        $data = json_decode(file_get_contents('php://input'), true);
        $group_id = (int)($data['group_id'] ?? 0);
        $group_name = mysqli_real_escape_string($conn, $data['group_name'] ?? '');

        if ($group_id > 0 && $group_name !== '') {
            // 🔥 수정됨: status='accepted' 뿐만 아니라 role='admin' 인지 검사
            $check_sql = "SELECT 1 FROM group_members WHERE group_id = $group_id AND user_id = $my_id AND status = 'accepted' AND role = 'admin'";
            $check_res = mysqli_query($conn, $check_sql);
            if (mysqli_num_rows($check_res) > 0) {
                $update_sql = "UPDATE club_groups SET group_name = '$group_name' WHERE group_id = $group_id";
                if (mysqli_query($conn, $update_sql)) {
                    echo json_encode(["success" => true]);
                } else {
                    echo json_encode(["success" => false, "message" => "DB 수정 실패"]);
                }
            } else {
                echo json_encode(["success" => false, "message" => "방장만 그룹 이름을 수정할 수 있습니다."]);
            }
        } else {
            echo json_encode(["success" => false, "message" => "잘못된 입력값"]);
        }
        break;

    case 'get_group_members_for_delegate':
        $group_id = (int)($_GET['group_id'] ?? 0);
        // 나를 제외한 현재 그룹의 정식 멤버(accepted)만 불러옵니다.
        $sql = "SELECT gm.user_id, u.username FROM group_members gm JOIN users u ON gm.user_id = u.user_id WHERE gm.group_id = $group_id AND gm.status = 'accepted' AND gm.user_id != $my_id";
        $res = mysqli_query($conn, $sql);
        echo json_encode(mysqli_fetch_all($res, MYSQLI_ASSOC));
        break;

    case 'leave_group':
        $data = json_decode(file_get_contents('php://input'), true);
        $group_id = (int)($data['group_id'] ?? 0);
        $new_admin_id = (int)($data['new_admin_id'] ?? 0);

        if ($group_id > 0) {
            // 내 권한(role) 조회
            $check_sql = "SELECT role FROM group_members WHERE group_id = $group_id AND user_id = $my_id";
            $check_res = mysqli_query($conn, $check_sql);
            
            if (mysqli_num_rows($check_res) > 0) {
                $my_role = mysqli_fetch_assoc($check_res)['role'];
                
                // 그룹 내 '정식 수락된' 멤버 수 파악
                $accepted_sql = "SELECT COUNT(*) as cnt FROM group_members WHERE group_id = $group_id AND status = 'accepted'";
                $accepted_count = (int)mysqli_fetch_assoc(mysqli_query($conn, $accepted_sql))['cnt'];

                mysqli_query($conn, "UPDATE users SET main_group_id = 0 WHERE user_id = $my_id AND main_group_id = $group_id");

                // 정식 멤버가 나 혼자라면 그룹 완전 삭제 (대기 중인 사람만 있어도 삭제됨)
                if ($accepted_count <= 1) {
                    mysqli_query($conn, "DELETE FROM club_groups WHERE group_id = $group_id");
                    echo json_encode(["success" => true, "message" => "그룹에 남은 멤버가 없어 그룹이 완전히 삭제되었습니다."]);
                } else {
                    // 방장인데 다른 사람이 남아있을 때 방장을 넘겨야 함
                    if ($my_role === 'admin') {
                        if ($new_admin_id > 0) {
                            mysqli_query($conn, "UPDATE group_members SET role = 'admin' WHERE group_id = $group_id AND user_id = $new_admin_id");
                        } else {
                            echo json_encode(["success" => false, "message" => "새로운 방장을 지정해야 합니다."]);
                            exit;
                        }
                    }
                    // 일반 멤버거나, 방장을 무사히 넘겨줬다면 나만 나가기
                    mysqli_query($conn, "DELETE FROM group_members WHERE group_id = $group_id AND user_id = $my_id");
                    echo json_encode(["success" => true, "message" => "그룹에서 나갔습니다."]);
                }
            } else {
                echo json_encode(["success" => false, "message" => "이 그룹의 멤버가 아닙니다."]);
            }
        } else {
            echo json_encode(["success" => false, "message" => "잘못된 그룹 ID"]);
        }
        break;
        
    case 'search_for_invite':
        $keyword = isset($_GET['keyword']) ? mysqli_real_escape_string($conn, $_GET['keyword']) : '';
        $group_id = isset($_GET['group_id']) ? (int)$_GET['group_id'] : 0;
        
        if ($group_id > 0 && $keyword !== '') {
            // 이 그룹에 이미 소속되어 있거나 초대 대기 중인 유저는 검색 결과에서 제외
            $sql = "SELECT user_id, username FROM users 
                    WHERE user_id != $my_id 
                    AND (username LIKE '%$keyword%' OR login_id LIKE '%$keyword%')
                    AND user_id NOT IN (SELECT user_id FROM group_members WHERE group_id = $group_id)";
            $res = mysqli_query($conn, $sql);
            echo json_encode(["success" => true, "search_results" => mysqli_fetch_all($res, MYSQLI_ASSOC)]);
        } else {
            echo json_encode(["success" => false, "search_results" => []]);
        }
        break;
    
    case 'invite_group_member':
        $data = json_decode(file_get_contents('php://input'), true);
        $group_id = (int)($data['group_id'] ?? 0);
        $target_username = mysqli_real_escape_string($conn, $data['username'] ?? '');

        if ($group_id > 0 && $target_username !== '') {
            $find_sql = "SELECT user_id FROM users WHERE username = '$target_username'";
            $find_res = mysqli_query($conn, $find_sql);
            $target_user = mysqli_fetch_assoc($find_res);
            
            if ($target_user) {
                $target_id = (int)$target_user['user_id'];
                
                // 🔥 수정됨: 초대하는 사람이 방장(admin)인지 검사
                $auth_check = mysqli_query($conn, "SELECT 1 FROM group_members WHERE group_id = $group_id AND user_id = $my_id AND status = 'accepted' AND role = 'admin'");
                
                if (mysqli_num_rows($auth_check) > 0) {
                    $check_sql = "SELECT status FROM group_members WHERE group_id = $group_id AND user_id = $target_id";
                    $check_res = mysqli_query($conn, $check_sql);
                    
                    if (mysqli_num_rows($check_res) == 0) {
                        $ins_sql = "INSERT INTO group_members (group_id, user_id, role, status) VALUES ($group_id, $target_id, 'member', 'pending')";
                        if (mysqli_query($conn, $ins_sql)) {
                            echo json_encode(["success" => true]);
                        } else {
                            echo json_encode(["success" => false, "message" => "초대 실패"]);
                        }
                    } else {
                        echo json_encode(["success" => false, "message" => "이미 그룹에 소속되어 있거나 초대 대기 중인 유저입니다."]);
                    }
                } else {
                    echo json_encode(["success" => false, "message" => "방장만 멤버를 초대할 수 있습니다."]);
                }
            } else {
                echo json_encode(["success" => false, "message" => "해당 이름의 유저를 찾을 수 없습니다."]);
            }
        } else {
            echo json_encode(["success" => false, "message" => "잘못된 입력값"]);
        }
        break;

    case 'accept_group_invite':
        $data = json_decode(file_get_contents('php://input'), true);
        $group_id = (int)($data['group_id'] ?? 0);

        if ($group_id > 0) {
            $up_sql = "UPDATE group_members SET status = 'accepted' WHERE group_id = $group_id AND user_id = $my_id AND status = 'pending'";
            if (mysqli_query($conn, $up_sql)) {
                echo json_encode(["success" => true]);
            } else {
                echo json_encode(["success" => false, "message" => "수락 실패 또는 이미 처리된 초대입니다."]);
            }
        } else {
            echo json_encode(["success" => false, "message" => "잘못된 요청입니다."]);
        }
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

            foreach ($members as $m_id) {
                if ((int)$m_id === $my_id) {
                    // 방장(나)은 바로 수락 상태로 관리자 권한 부여
                    mysqli_query($conn, "INSERT INTO group_members (group_id, user_id, role, status) VALUES ($new_group_id, $m_id, 'admin', 'accepted')");
                } else {
                    // 함께 선택한 친구들은 대기(pending) 상태로 초대만 발송
                    mysqli_query($conn, "INSERT INTO group_members (group_id, user_id, role, status) VALUES ($new_group_id, $m_id, 'member', 'pending')");
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
        // status(수락 여부)도 함께 가져오도록 쿼리 수정
        $res = mysqli_query($conn, "SELECT u.username, gm.status FROM group_members gm JOIN users u ON gm.user_id = u.user_id WHERE gm.group_id = $group_id");
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

        // 현재 유저가 보고 있는 그룹 ID 가져오기
        $user_info_res = mysqli_query($conn, "SELECT main_group_id FROM users WHERE user_id = $my_id");
        $user_info = mysqli_fetch_assoc($user_info_res);
        $current_group_id = $user_info['main_group_id'] ? (int)$user_info['main_group_id'] : 0;

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

        $group_filter = "";
        $group_name_select = "IFNULL(cg.group_name, '내 방')";

        if ($current_group_id > 0) {
            $group_filter = " AND c.group_id = $current_group_id ";
            $group_name_select = "NULL"; 
        }

        $sql = "SELECT c.comment_id, c.user_id, c.content, c.created_at, c.group_id, 
                       u.username, u.login_id,
                       $group_name_select AS group_name,
                       IF(c.user_id = $my_id, 1, 0) AS is_mine
                FROM song_comments c
                JOIN users u ON c.user_id = u.user_id
                LEFT JOIN club_groups cg ON c.group_id = cg.group_id
                WHERE c.song_id = $song_id AND c.is_deleted = 0 $group_filter
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

        $user_info_res = mysqli_query($conn, "SELECT main_group_id FROM users WHERE user_id = $my_id");
        $user_info = mysqli_fetch_assoc($user_info_res);
        $current_group_id = $user_info['main_group_id'] ? (int)$user_info['main_group_id'] : 0;

        $owner_res = mysqli_query($conn, "SELECT user_id FROM songs WHERE song_id = $song_id");
        $owner_row = mysqli_fetch_assoc($owner_res);
        if (!$owner_row) { 
            echo json_encode(["success" => false, "message" => "곡을 찾을 수 없음"]); 
            break; 
        }
        $owner_id = (int)$owner_row['user_id'];

        // 권한 체크
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
        
        $sql = "INSERT INTO song_comments (song_id, user_id, group_id, content) 
                VALUES ($song_id, $my_id, $current_group_id, '$safe_content')";
                
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

    case 'get_played_history':
        if (!isset($_SESSION['user_id'])) {
            echo json_encode(['playedSongs' => []]);
            break;
        }

        $playedSongs = [];
        $sql = "SELECT song_id FROM played_history WHERE user_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $_SESSION['user_id']);
        $stmt->execute();
        $result = $stmt->get_result();

        while ($row = $result->fetch_assoc()) {
            $playedSongs[] = $row['song_id'];
        }

        echo json_encode(['playedSongs' => $playedSongs]);
        break;

    case 'save_played_history':
        $data = json_decode(file_get_contents('php://input'), true);
        $song_id = $data['song_id'] ?? '';
        $user_id = $_SESSION['user_id'] ?? null;

        if ($user_id && $song_id) {
            $sql = "INSERT IGNORE INTO played_history (user_id, song_id) VALUES (?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ss", $user_id, $song_id);
            if ($stmt->execute()) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'DB 저장 실패']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => '유효하지 않은 데이터']);
        }
        break;

} // switch 종료 괄호

mysqli_close($conn);
?>