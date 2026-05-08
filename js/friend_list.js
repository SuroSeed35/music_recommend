document.addEventListener('DOMContentLoaded', () => {
    // --- [1] 전역 변수 및 초기 설정 ---
    const mainToggleBtn = document.getElementById('mainToggleBtn');
    const groupToggleBtn = document.getElementById('groupToggleBtn');
    const listView = document.getElementById('listView');
    const addView = document.getElementById('addView');
    const groupAddView = document.getElementById('groupAddView');
    const groupFloatContainer = document.getElementById('groupFloatContainer');
    const backBtn = document.getElementById("backToMain");
    if (backBtn) {
        backBtn.onclick = () => {
            location.href = "../html/music_list.html"; // 실제 메인 파일 경로에 맞춰 수정하세요
        };
    }
    
    let currentMode = 'LIST';
    let selectedGroupMembers = []; 
    let currentTarget = null;
    let modalAction = "";

    loadData();

    // --- [2] 화면 전환 로직 ---
    function switchMode(mode) {
        currentMode = mode;
        const sections = [listView, addView, groupAddView];
        sections.forEach(s => {
            s.classList.remove('active-view');
            s.style.display = 'none';
        });

        let target;
        if (mode === 'LIST') target = listView;
        else if (mode === 'ADD_FRIEND') target = addView;
        else if (mode === 'ADD_GROUP') target = groupAddView;

        if (target) {
            target.style.display = 'block';
            void target.offsetWidth; 
            target.classList.add('active-view');
        }

        // 탭 이동 시 선택 데이터 및 UI 초기화
        selectedGroupMembers = []; 
        groupFloatContainer.style.display = 'none';

        document.querySelectorAll('.group-selectable').forEach(item => {
            item.classList.remove('selected');
            const uncheck = item.querySelector('.uncheck-icon');
            const check = item.querySelector('.check-icon');
            if (uncheck) uncheck.style.display = 'block';
            if (check) check.style.display = 'none';
        });

        mainToggleBtn.classList.remove('active-btn');
        groupToggleBtn.classList.remove('active-btn');
        mainToggleBtn.querySelector('.btn-text').innerText = '친구 추가 하기';
        groupToggleBtn.querySelector('.group-btn-text').innerText = '그룹 추가 하기';

        if (mode === 'ADD_FRIEND') {
            mainToggleBtn.querySelector('.btn-text').innerText = '목록으로 돌아가기';
            mainToggleBtn.classList.add('active-btn');
            fetchAndDisplayUsers(''); 
        } else if (mode === 'ADD_GROUP') {
            groupToggleBtn.querySelector('.group-btn-text').innerText = '목록으로 돌아가기';
            groupToggleBtn.classList.add('active-btn');
        } else {
            loadData();
        }
    }

    // --- [3] 데이터 로드 및 렌더링 ---
    async function loadData() {
        try {
            const res = await fetch('../php/api.php?action=get_data');
            const data = await res.json();

            // 1. 친구 요청 목록
            const reqList = document.getElementById('requestListContainer');
            reqList.innerHTML = '';
            if (!data.requests || data.requests.length === 0) {
                reqList.innerHTML = '<div class="empty-msg">친구요청이 없습니다.</div>';
            } else {
                data.requests.forEach(req => {
                    const div = document.createElement('div');
                    div.className = 'friend-item highlight-yellow request-item';
                    div.dataset.fid = req.friendship_id;
                    const senderName = req.username || '알 수 없는 유저';
                    div.dataset.name = senderName;
                    div.innerHTML = `<span>${senderName}님의 친구 요청</span>`;
                    attachSwipeToAccept(div);
                    div.addEventListener('click', () => openAcceptConfirmModal(div)); // 👈 클릭 이벤트 추가
                    reqList.appendChild(div);
                });
            }

            // 2. 그룹 목록 (클릭 영역 분리 수정 부분)[cite: 1]
            const groupList = document.getElementById('groupListContainer');
            groupList.innerHTML = '';
            data.groups.forEach(g => {
                const div = document.createElement('div');
                div.className = 'friend-item group-item';
                div.dataset.groupId = g.group_id;
                div.dataset.groupName = g.group_name;

                // 클릭 영역을 구분하기 위해 내부 구조를 나누어 삽입합니다.
                div.innerHTML = `
                    <div class="group-name-clickable" style="flex: 1; cursor: pointer; display: flex; align-items: center;">
                        <span class="group-name-label">${g.group_name}</span>
                    </div>
                    <div class="group-member-info" style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <img src="../img/group.png" alt="group" class="action-icon">
                        <span class="group-count">${g.member_count}</span>
                    </div>`;

                // 🔥 수정: 인원수 영역을 제외한 '이름 영역' 클릭 시 메인 설정 모달 오픈[cite: 1]
                div.querySelector('.group-name-clickable').addEventListener('click', () => {
                    openGroupMainModal(div);
                });

                // 🔥 수정: 인원수/아이콘 영역 클릭 시 멤버 목록 표시 및 이벤트 전파 차단[cite: 1]
                div.querySelector('.group-member-info').addEventListener('click', (e) => {
                    e.stopPropagation(); // 부모 요소인 div의 클릭 이벤트가 발생하지 않도록 차단합니다.
                    showGroupMembers(g.group_id, g.group_name);
                });

                groupList.appendChild(div);
            });

            // 3. 친구 목록
            const friendList = document.getElementById('friendMainList');
            const groupSelList = document.getElementById('groupSelectionList');
            friendList.innerHTML = '';
            groupSelList.innerHTML = '';

            data.friends.forEach(f => {
                const friendName = f.username || '알 수 없는 친구';
                
                const fDiv = document.createElement('div');
                fDiv.className = 'friend-item highlight-white profile-trigger';
                Object.assign(fDiv.dataset, {
                    name: friendName, bio: f.bio || '', dday: f.dday || '1',
                    song: f.song_title || '', link: f.youtube_url || '#', thumb: f.thumbnail_img || ''
                });
                const lockIcon = f.is_private == 1 ? `<img src="../img/lock.png" alt="비공개" style="width:14px; height:14px; margin-right:5px; vertical-align:middle;">` : '';
                fDiv.innerHTML = `<span>${lockIcon}${friendName}</span>`;
                fDiv.addEventListener('click', () => showProfile(fDiv.dataset));
                friendList.appendChild(fDiv);

                const gDiv = document.createElement('div');
                gDiv.className = 'friend-item highlight-white group-selectable';
                gDiv.dataset.id = f.user_id;
                gDiv.dataset.name = friendName;
                gDiv.innerHTML = `
                    <span>${friendName}</span>
                    <div class="check-icon-wrapper">
                        <img src="../img/add-group.png" alt="uncheck" class="uncheck-icon">
                        <img src="../img/high-five.png" alt="check" class="check-icon" style="display: none;">
                    </div>`;
                gDiv.addEventListener('click', () => toggleGroupMember(gDiv));
                groupSelList.appendChild(gDiv);
            });

            // 접힘 상태 복원
            document.querySelectorAll('.collapsible-content').forEach((list, index) => {
                const isCollapsed = localStorage.getItem(`section_collapsed_${index}`) === 'true';
                if (isCollapsed) {
                    list.classList.add('collapsed');
                    const btn = list.previousElementSibling;
                    if (btn && btn.querySelector('.arrow')) btn.querySelector('.arrow').classList.add('rotated');
                }
            });
        } catch (err) { console.error("데이터 로드 실패:", err); }
    }

    // --- 그룹 멤버 표시 함수[cite: 1] ---
    async function showGroupMembers(groupId, groupName) {
        try {
            const res = await fetch(`../php/api.php?action=get_group_members&group_id=${groupId}`);
            const members = await res.json();
            document.getElementById('modalTitle').innerText = `${groupName} 멤버 목록`;
            const content = members.length > 0 
                ? members.map(m => `<div>• ${m.username}</div>`).join('') 
                : "소속된 멤버가 없습니다.";
            document.getElementById('modalMessage').innerHTML = content;
            modalAction = "VIEW_MEMBERS"; 
            document.getElementById('addConfirmBtn').style.display = 'none'; // 멤버 보기 시에는 '예' 버튼을 숨깁니다.
            document.getElementById('confirmModal').style.display = 'flex';
        } catch (err) { console.error("멤버 로드 실패:", err); }
    }

    // --- [4] 친구 추가/검색 로직 ---
    async function fetchAndDisplayUsers(keyword = '') {
        try {
            const res = await fetch(`../php/api.php?action=search_users&keyword=${keyword}`);
            const data = await res.json(); 
            const resultList = document.getElementById('searchResultList');
            resultList.innerHTML = ''; 

            const sentSection = document.createElement('div');
            sentSection.id = 'sentRequestsContainer';
            sentSection.innerHTML = `<div class="sent-request-title">보낸 요청 대기 중</div>`;
            resultList.appendChild(sentSection);

            if (data.sent_requests && data.sent_requests.length > 0) {
                data.sent_requests.forEach(req => {
                    const div = document.createElement('div');
                    div.className = 'friend-item request-sent'; 
                    div.innerHTML = `<span>${req.username}님께 요청됨</span><img src="../img/right-arrow.png" class="sent-icon-animated">`;
                    sentSection.appendChild(div);
                });
            } else { sentSection.innerHTML += `<div id="sentEmptyMsg">대기 중인 요청이 없습니다.</div>`; }

            resultList.appendChild(document.createElement('hr')).className = "divider";

            const searchResults = data.search_results || [];
            if (searchResults.length === 0) { 
                resultList.innerHTML += '<div class="empty-msg">일치하는 유저가 없습니다.</div>'; 
            }
            else {
                searchResults.forEach(u => {
                    const div = document.createElement('div');
                    div.className = 'friend-item add-view-item'; 
                    div.dataset.userId = u.user_id;
                    div.dataset.userName = u.username;
                    const searchLockIcon = u.is_private == 1 ? `<img src="../img/lock.png" alt="비공개" style="width:14px; height:14px; margin-right:5px; vertical-align:middle;">` : '';
                    div.innerHTML = `<span>${searchLockIcon}${u.username}</span><img src="../img/add-user.png" class="action-icon add-btn">`;
                    div.addEventListener('click', () => { if (!div.classList.contains('request-sent')) openAddConfirmModal(div); });
                    attachSwipeToAdd(div);
                    resultList.appendChild(div);
                });
            }
        } catch (err) { console.error("데이터 로드 실패:", err); }
    }

    // --- [5] 스와이프 로직 ---
    function attachSwipeToAdd(item) {
        let startX = 0;
        item.addEventListener('touchstart', e => { if (item.classList.contains('request-sent')) return; startX = e.touches[0].clientX; });
        item.addEventListener('touchmove', e => {
            if (item.classList.contains('request-sent')) return;
            let diff = e.touches[0].clientX - startX;
            if (diff > 0) item.style.transform = `translateX(${diff}px)`;
        });
        item.addEventListener('touchend', e => {
            if (item.classList.contains('request-sent')) return;
            let diff = e.changedTouches[0].clientX - startX;
            if (diff > 80) openAddConfirmModal(item); 
            item.style.transform = 'translateX(0px)';
        });
    }

    // --- [6] 모달 오픈 함수들 ---
    function openAddConfirmModal(item) {
        currentTarget = item; modalAction = "REQUEST_ADD";
        document.getElementById('modalTitle').innerText = "친구 추가 요청";
        document.getElementById('modalMessage').innerHTML = `<strong>${item.dataset.userName}</strong>님께 친구 추가 요청을 보낼까요?`;
        document.getElementById('addConfirmBtn').style.display = 'block';
        document.getElementById('confirmModal').style.display = 'flex';
    }

    function openAcceptConfirmModal(item) {
        currentTarget = item; modalAction = "ACCEPT";
        document.getElementById('modalTitle').innerText = "친구 수락";
        document.getElementById('modalMessage').innerHTML = `<strong>${item.dataset.name}</strong>님의 신청을 수락하시겠습니까?`;
        document.getElementById('addConfirmBtn').style.display = 'block';
        document.getElementById('confirmModal').style.display = 'flex';
    }

    function openGroupMainModal(item) {
        currentTarget = item; modalAction = "SET_MAIN_GROUP"; 
        document.getElementById('modalTitle').innerText = "메인 그룹 설정";
        document.getElementById('modalMessage').innerHTML = `<strong>${item.dataset.groupName}</strong> 그룹을 메인으로 설정하시겠습니까?`;
        document.getElementById('addConfirmBtn').style.display = 'block';
        document.getElementById('confirmModal').style.display = 'flex';
    }

    // --- [7] 모달 '예(Confirm)' 통합 리스너 ---
    document.getElementById('addConfirmBtn').addEventListener('click', async () => {
        if (!currentTarget) return;
        try {
            if (modalAction === "REQUEST_ADD") {
                const targetId = currentTarget.dataset.userId;
                const response = await fetch('../php/api.php?action=request_friend', { 
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ target_id: targetId }) 
                });
                const result = await response.json();
                if (result.success) {
                    // DOM을 강제로 옮기지 않고, 현재 입력된 검색어로 검색 결과를 아예 새로고침 합니다.
                    const currentKeyword = document.getElementById('friendSearchInput').value.trim();
                    fetchAndDisplayUsers(currentKeyword); 
                }
            } else if (modalAction === "ACCEPT") {
                const friendshipId = currentTarget.dataset.fid;
                await fetch('../php/api.php?action=accept_friend', { method: 'POST', body: JSON.stringify({ friendship_id: friendshipId }) });
                currentTarget.remove(); loadData();
            } else if (modalAction === "SET_MAIN_GROUP") { 
                const groupId = currentTarget.dataset.groupId;
                await fetch('../php/api.php?action=set_main_group', { method: 'POST', body: JSON.stringify({ group_id: groupId }) });
                window.location.href = 'music_list.html'; 
            }
        } catch (err) { console.error("작업 실패:", err); }
        document.getElementById('confirmModal').style.display = 'none';
    });

    // --- [8] 기타 리스너 ---
    document.getElementById('friendSearchInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') fetchAndDisplayUsers(e.target.value.trim()); });
    
    // ▼▼▼ 이 부분을 찾아 아래 코드로 통째로 교체하세요 ▼▼▼
    document.getElementById('submitGroupFinal').addEventListener('click', async () => {
        const gName = document.getElementById('groupNameInput').value;
        if (!gName) return alert("이름을 입력하세요!");
        
        const memberIds = selectedGroupMembers.map(m => m.id);

        try {
            // 서버로 요청 전송
            const response = await fetch('../php/api.php?action=create_group', { 
                method: 'POST', 
                headers: { 
                    'Content-Type': 'application/json' // 🔥 필수: 서버에 JSON 형태라고 알려줌 
                },
                body: JSON.stringify({ group_name: gName, members: memberIds }) 
            });

            // 1. 서버의 응답을 먼저 글자(text)로 받아서 확인합니다 (디버깅용)
            const text = await response.text();
            console.log("서버 원본 응답:", text);

            // 2. 받은 응답을 JSON으로 변환
            const result = JSON.parse(text);

            // 3. 서버에서 성공(success: true)했다고 하면 화면 전환
            if (result.success) {
                document.getElementById('groupNameModal').style.display = 'none';
                switchMode('LIST'); // 이 함수가 실행되면서 loadData()를 호출해 목록을 새로고침합니다.
            } else {
                // 실패 시 서버가 보낸 에러 메시지 알림
                alert("그룹 생성 실패: " + (result.message || result.error || "원인을 알 수 없습니다."));
            }
        } catch (err) {
            console.error("통신 에러 상세:", err);
            alert("서버와 통신 중 문제가 발생했습니다. F12 콘솔 창을 확인해주세요.");
        }
    });

    document.querySelectorAll('.close-x-btn, .modal-btn.cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
            document.getElementById('addConfirmBtn').style.display = 'block'; // 모달 닫을 시 '예' 버튼을 다시 활성화합니다.
        });
    });

    document.querySelectorAll('.toggle-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            const list = btn.nextElementSibling;
            if (list) {
                const isCollapsed = list.classList.toggle('collapsed');
                if (btn.querySelector('.arrow')) btn.querySelector('.arrow').classList.toggle('rotated');
                localStorage.setItem(`section_collapsed_${index}`, isCollapsed);
            }
        });
    });

    mainToggleBtn.addEventListener('click', () => switchMode(currentMode === 'ADD_FRIEND' ? 'LIST' : 'ADD_FRIEND'));
    groupToggleBtn.addEventListener('click', () => switchMode(currentMode === 'ADD_GROUP' ? 'LIST' : 'ADD_GROUP'));
    
    function toggleGroupMember(item) {
        item.classList.toggle('selected');
        const userObj = { id: item.dataset.id, name: item.dataset.name };
        const uncheck = item.querySelector('.uncheck-icon');
        const check = item.querySelector('.check-icon');

        if (item.classList.contains('selected')) {
            selectedGroupMembers.push(userObj);
            if (uncheck) uncheck.style.display = 'none';
            if (check) check.style.display = 'block';
        } else {
            selectedGroupMembers = selectedGroupMembers.filter(m => m.id !== userObj.id);
            if (uncheck) uncheck.style.display = 'block';
            if (check) check.style.display = 'none';
        }
        groupFloatContainer.style.display = selectedGroupMembers.length > 0 ? 'block' : 'none';
    }

    function showProfile(data) {
        document.getElementById('profileName').innerText = data.name;
        document.getElementById('profileBio').innerText = data.bio;
        document.getElementById('profileDday').innerText = `D+${data.dday}`;
        document.getElementById('songName').innerText = data.song || '설정된 곡 없음';
        document.getElementById('songLink').href = data.link;
        document.getElementById('songThumbImg').src = data.thumb || '../img/default-music.png';
        document.getElementById('userProfileModal').style.display = 'flex';
    }

    function attachSwipeToAccept(item) {
        let startX = 0;
        item.addEventListener('touchstart', e => { startX = e.touches[0].clientX; });
        item.addEventListener('touchmove', e => {
            let diff = e.touches[0].clientX - startX;
            if (diff > 0) item.style.transform = `translateX(${diff}px)`;
        });
        item.addEventListener('touchend', e => {
            let diff = e.changedTouches[0].clientX - startX;
            if (diff > 80) openAcceptConfirmModal(item);
            else item.style.transform = 'translateX(0px)';
        });
    }
        document.getElementById('openGroupNameModal').addEventListener('click', () => {
        // 선택된 인원 수를 모달에 표시
        document.getElementById('selectedCountText').innerText = `선택된 멤버: ${selectedGroupMembers.length}명 (나 포함)`;
        // 그룹 이름 입력창 초기화
        document.getElementById('groupNameInput').value = ''; 
        document.getElementById('groupNameModal').style.display = 'flex';
    });
});
