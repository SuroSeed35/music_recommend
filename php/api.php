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

    // 추가: 내가 가입한 그룹 목록 가져오기 (드롭다운 용도)
    case 'get_my_groups':
        $sql = "SELECT g.group_id, g.group_name 
                FROM club_groups g 
                JOIN group_members gm ON g.group_id = gm.group_id 
                WHERE gm.user_id = $my_id";
        $res = mysqli_query($conn, $sql);
        $groups = mysqli_fetch_all($res, MYSQLI_ASSOC);
        echo json_encode(["success" => true, "groups" => $groups]);
        break;
    // 1. 초기 데이터 로드
    case 'get_data':
        $target_date = isset($_GET['date']) ? mysqli_real_escape_string($conn, $_GET['date']) : date('Y-m-d');

        // 친구 신청 목록
        $req_sql = "SELECT f.friendship_id, u.username 
                    FROM friends f 
                    JOIN users u ON f.user_id = u.user_id 
                    WHERE f.friend_id = $my_id AND f.status = 'pending'";
        $req_res = mysqli_query($conn, $req_sql);
        $requests = mysqli_fetch_all($req_res, MYSQLI_ASSOC);

        // 그룹 목록
        $group_sql = "SELECT g.group_id, g.group_name, COUNT(gm.user_id) as member_count 
                      FROM club_groups g 
                      JOIN group_members gm ON g.group_id = gm.group_id 
                      WHERE g.group_id IN (SELECT group_id FROM group_members WHERE user_id = $my_id)
                      GROUP BY g.group_id";
        $group_res = mysqli_query($conn, $group_sql);
        $groups = mysqli_fetch_all($group_res, MYSQLI_ASSOC);

        // 확정된 친구 목록
        $friend_sql = "SELECT u.user_id, u.username, u.bio, DATEDIFF(CURRENT_DATE, u.created_at) + 1 AS dday, 
                              s.title as song_title, s.youtube_url, s.thumbnail_img 
                       FROM friends f 
                       JOIN users u ON (f.friend_id = u.user_id OR f.user_id = u.user_id)
                       LEFT JOIN songs s ON u.current_song_id = s.song_id
                       WHERE (f.user_id = $my_id OR f.friend_id = $my_id) 
                       AND f.status = 'accepted' AND u.user_id != $my_id";
        $friend_res = mysqli_query($conn, $friend_sql);
        $friends = mysqli_fetch_all($friend_res, MYSQLI_ASSOC);

        // 메인 그룹 확인
        $user_info_sql = "SELECT main_group_id FROM users WHERE user_id = $my_id";
        $user_info_res = mysqli_query($conn, $user_info_sql);
        $user_info = mysqli_fetch_assoc($user_info_res);
        $main_group_id = $user_info['main_group_id'] ? (int)$user_info['main_group_id'] : 0;

        if ($main_group_id == 0) {
            $target_users_sql = "SELECT user_id, username, login_id FROM users WHERE user_id = $my_id";
        } else {
            $target_users_sql = "SELECT u.user_id, u.username, u.login_id 
                                 FROM group_members gm
                                 JOIN users u ON gm.user_id = u.user_id
                                 WHERE gm.group_id = $main_group_id";
        }

        // 🔥 타겟 유저 목록에 노래를 붙이고, 내가 작성한 글(is_me = 1)을 최우선으로 정렬(ORDER BY is_me DESC)합니다.
        $feed_sql = "SELECT t.user_id, t.username, t.login_id, 
                            s.song_id, s.youtube_url, s.title, s.daily_comment, s.thumbnail_img, s.created_at, s.log_date, s.log_time,
                            IF(t.user_id = $my_id, 1, 0) as is_me
                     FROM ($target_users_sql) t
                     LEFT JOIN songs s ON t.user_id = s.user_id AND DATE(s.created_at) = '$target_date'
                     ORDER BY is_me DESC, s.created_at DESC, t.username ASC";
        $feed_res = mysqli_query($conn, $feed_sql);
        $feed_songs = mysqli_fetch_all($feed_res, MYSQLI_ASSOC);

        echo json_encode([
            "requests" => $requests,
            "groups" => $groups,
            "friends" => $friends,
            "feed_songs" => $feed_songs 
        ]);
        break;

    // 2. 유저 검색
    case 'search_users':
        $keyword = isset($_GET['keyword']) ? mysqli_real_escape_string($conn, $_GET['keyword']) : '';

        $sent_sql = "SELECT f.friend_id as user_id, u.username 
                     FROM friends f 
                     JOIN users u ON f.friend_id = u.user_id 
                     WHERE f.user_id = $my_id AND f.status = 'pending'";
        $sent_res = mysqli_query($conn, $sent_sql);
        $sent_requests = mysqli_fetch_all($sent_res, MYSQLI_ASSOC);

        $sql = "SELECT user_id, username FROM users 
                WHERE user_id != $my_id 
                AND user_id NOT IN (
                    SELECT friend_id FROM friends WHERE user_id = $my_id AND status = 'accepted'
                    UNION
                    SELECT user_id FROM friends WHERE friend_id = $my_id AND status = 'accepted'
                )";

        if (!empty($keyword)) {
            $sql .= " AND (username LIKE '%$keyword%' OR login_id LIKE '%$keyword%')";
        }

        $res = mysqli_query($conn, $sql);
        $search_results = mysqli_fetch_all($res, MYSQLI_ASSOC);

        echo json_encode([
            "sent_requests" => $sent_requests,
            "search_results" => $search_results
        ]);
        break;

    // 3. 친구 요청 보내기
    case 'request_friend':
        $data = json_decode(file_get_contents('php://input'), true);
        $target_id = (int)$data['target_id'];
        $sql = "INSERT INTO friends (user_id, friend_id, status) VALUES ($my_id, $target_id, 'pending')";
        mysqli_query($conn, $sql);
        echo json_encode(["success" => true]);
        break;

    // 4. 친구 요청 수락
    case 'accept_friend':
        $data = json_decode(file_get_contents('php://input'), true);
        $f_id = (int)$data['friendship_id'];
        $sql = "UPDATE friends SET status = 'accepted' WHERE friendship_id = $f_id";
        mysqli_query($conn, $sql);
        echo json_encode(["success" => true]);
        break;

    // 5. 그룹 생성
    case 'create_group':
        $data = json_decode(file_get_contents('php://input'), true);
        $g_name = mysqli_real_escape_string($conn, $data['group_name']);
        $members = $data['members']; 

        mysqli_query($conn, "INSERT INTO club_groups (group_name) VALUES ('$g_name')");
        $new_group_id = mysqli_insert_id($conn);

        array_push($members, $my_id);
        foreach ($members as $m_id) {
            $m_id = (int)$m_id;
            $role = ($m_id == $my_id) ? 'admin' : 'member';
            mysqli_query($conn, "INSERT INTO group_members (group_id, user_id, role) 
                                 VALUES ($new_group_id, $m_id, '$role')");
        }
        echo json_encode(["success" => true]);
        break;

    // 6. 메인 그룹으로 설정하기
    case 'set_main_group':
        $data = json_decode(file_get_contents('php://input'), true);
        $group_id = (int)$data['group_id'];

        $sql = "UPDATE users SET main_group_id = $group_id WHERE user_id = $my_id";
        mysqli_query($conn, $sql);
        echo json_encode(["success" => true]);
        break;

    // 7. 특정 그룹의 멤버 목록 가져오기
    case 'get_group_members':
        $group_id = (int)$_GET['group_id'];
        $sql = "SELECT u.username 
                FROM group_members gm 
                JOIN users u ON gm.user_id = u.user_id 
                WHERE gm.group_id = $group_id";
        
        $res = mysqli_query($conn, $sql);
        $members = mysqli_fetch_all($res, MYSQLI_ASSOC);

        echo json_encode($members);
        break;

    // 8. 오늘 이미 노래를 추천했는지 확인
    case 'check_today_recommend':
        $sql = "SELECT song_id FROM songs 
                WHERE user_id = $my_id 
                AND DATE(created_at) = CURRENT_DATE";
        $res = mysqli_query($conn, $sql);
        $already_done = mysqli_num_rows($res) > 0;

        echo json_encode(["already_done" => $already_done]);
        break;
}

mysqli_close($conn);
?>