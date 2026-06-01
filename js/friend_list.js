document.addEventListener('DOMContentLoaded', () => {
    // 🔥 [중요 핵심 픽스] 
    // 모달이 스크롤 영역이나 애니메이션 영역 내부에 있으면 화면 밖(저 아래)으로 튕겨나가는 CSS 버그를 원천 차단합니다.
    // 모든 모달창을 HTML 최상단(body)으로 강제로 끌어올려 항상 화면 중앙에 뜨도록 만듭니다.
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        document.body.appendChild(modal);
    });

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
            location.href = "../html/music_list.html"; 
        };
    }

    if (typeof PlayAll !== 'undefined') PlayAll.init();
    
    let currentMode = 'LIST';
    let selectedGroupMembers = []; 
    let currentTarget = null;
    let isFloating = false;
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

        selectedGroupMembers = []; 
        groupFloatContainer.style.display = 'none';

        document.querySelectorAll('.group-selectable').forEach(item => {
            item.classList.remove('selected');
            const uncheck = item.querySelector('.uncheck-icon');
            const check = item.querySelector('.check-icon');
            if (uncheck) uncheck.style.display = 'block';
            if (check) check.style.display = 'none';
        });

        if(mainToggleBtn) {
            mainToggleBtn.classList.remove('active-btn');
            mainToggleBtn.querySelector('.btn-text').innerText = (mode === 'ADD_FRIEND') ? '목록으로 돌아가기' : '친구 추가 하기';
            if (mode === 'ADD_FRIEND') mainToggleBtn.classList.add('active-btn');
        }

        if(groupToggleBtn) {
            groupToggleBtn.classList.remove('active-btn');
            groupToggleBtn.querySelector('.group-btn-text').innerText = (mode === 'ADD_GROUP') ? '목록으로 돌아가기' : '그룹 추가 하기';
            if (mode === 'ADD_GROUP') groupToggleBtn.classList.add('active-btn');
        }

        if (mode === 'ADD_FRIEND') {
            fetchAndDisplayUsers(''); 
        } else if (mode === 'LIST') {
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
            if(reqList) {
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
                        div.addEventListener('click', () => openAcceptConfirmModal(div));
                        reqList.appendChild(div);
                    });
                }
            }

            // 1-2. 그룹 초대 목록
            const groupInviteList = document.getElementById('groupInviteListContainer');
            if (groupInviteList) {
                groupInviteList.innerHTML = '';
                if (!data.group_invites || data.group_invites.length === 0) {
                    groupInviteList.innerHTML = '<div class="empty-msg">그룹 초대가 없습니다.</div>';
                } else {
                    data.group_invites.forEach(inv => {
                        const div = document.createElement('div');
                        div.className = 'friend-item group-item request-item';
                        div.style.background = 'linear-gradient(135deg, #ffe5ec, #ffb6c1)';
                        div.style.border = 'none'; 
                        div.style.color = '#333';
                        div.dataset.groupId = inv.group_id;
                        
                        div.innerHTML = `
                            <div class="group-name-clickable" style="flex: 1; cursor: pointer; display: flex; align-items: center;">
                                <span class="group-name-label" style="font-weight: bold;">${inv.group_name} (초대)</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="group-member-info" style="display: flex; align-items: center; gap: 8px;">
                                    <img src="../img/group.png" alt="group" class="action-icon">
                                    <span class="group-count">${inv.member_count || 0}</span>
                                </div>
                            </div>`;
                        
                        attachSwipeToAcceptGroup(div);
                        div.addEventListener('click', () => openAcceptGroupModal(div, inv.group_name));
                        groupInviteList.appendChild(div);
                    });
                }
            }

            // 2. 그룹 목록 렌더링 
            const groupList = document.getElementById('groupListContainer');
            if(groupList) {
                groupList.innerHTML = '';
                if (!data.groups || data.groups.length === 0) {
                    groupList.innerHTML = '<div class="empty-msg" style="padding: 15px 0; text-align: center; color: #999; font-size: 14px;">아직 그룹이 존재하지 않습니다.</div>';
                } else {
                    data.groups.forEach(g => {
                        const div = document.createElement('div');
                        div.className = 'friend-item group-item';
                        div.dataset.groupId = g.group_id;
                        div.dataset.groupName = g.group_name;

                        // 대기 멤버 존재 시 핑크 배경
                        if (g.pending_count && parseInt(g.pending_count) > 0) {
                            div.style.background = 'linear-gradient(135deg, #ffe5ec, #ffb6c1)';
                            div.style.border = 'none';
                        }

                        div.innerHTML = `
                            <div class="group-name-clickable" style="flex: 1; cursor: pointer; display: flex; align-items: center;">
                                <span class="group-name-label">${g.group_name}${g.role === 'admin' ? ' 👑' : ''}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i class="fa-solid fa-gear manage-group-icon" style="cursor: pointer; color: #666;" title="그룹 관리"></i>
                                <div class="group-member-info" style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                                    <img src="../img/group.png" alt="group" class="action-icon">
                                    <span class="group-count">${g.member_count}</span>
                                </div>
                            </div>`;

                        div.querySelector('.group-name-clickable').addEventListener('click', () => openGroupMainModal(div));
                        div.querySelector('.group-member-info').addEventListener('click', (e) => {
                            e.stopPropagation();
                            showGroupMembers(g.group_id, g.group_name);
                        });
                        
                        // 🔥 그룹 관리 모달 오픈
                        div.querySelector('.manage-group-icon').addEventListener('click', (e) => {
                            e.stopPropagation();
                            openGroupManageModal(g.group_id, g.group_name, g.role, g.member_count);
                        });
                        groupList.appendChild(div);
                    });
                }
            }

            // 3. 친구 목록
            const friendList = document.getElementById('friendMainList');
            const groupSelList = document.getElementById('groupSelectionList');
            if(friendList) friendList.innerHTML = '';
            if(groupSelList) groupSelList.innerHTML = '';

            if (data.friends) {
                data.friends.forEach(f => {
                    const friendName = f.username || '알 수 없는 친구';
                    const fDiv = document.createElement('div');
                    fDiv.className = 'friend-item highlight-white profile-trigger';
                    Object.assign(fDiv.dataset, {
                        name: friendName, bio: f.bio || '', dday: f.dday || '1',
                        song: f.song_title || '', link: f.youtube_url || '#', thumb: f.thumbnail_img || ''
                    });
                    const lockIcon = f.is_private == 1 ? '<img src="../img/lock.png" alt="비공개" style="width:14px; height:14px; margin-right:5px; vertical-align:middle;">' : '';
                    fDiv.innerHTML = `<span>${lockIcon}${friendName}</span>`;
                    fDiv.addEventListener('click', () => showProfile(fDiv.dataset));
                    if(friendList) friendList.appendChild(fDiv);

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
                    if(groupSelList) groupSelList.appendChild(gDiv);
                });
            }

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

    async function showGroupMembers(groupId, groupName) {
        try {
            const res = await fetch(`../php/api.php?action=get_group_members&group_id=${groupId}`);
            const members = await res.json();
            document.getElementById('modalTitle').innerText = `${groupName} 멤버 목록`;
            
            const content = members.length > 0 
                ? members.map(m => {
                    const statusText = m.status === 'pending' ? ' <span style="color:#ff4d4f; font-size:12px;">(대기 중)</span>' : '';
                    return `<div style="padding: 5px 0;">• ${m.username}${statusText}</div>`;
                }).join('') 
                : "소속된 멤버가 없습니다.";
                
            document.getElementById('modalMessage').innerHTML = content;
            modalAction = "VIEW_MEMBERS"; 
            document.getElementById('addConfirmBtn').style.display = 'none'; 
            document.getElementById('confirmModal').style.display = 'flex';
        } catch (err) { console.error("멤버 로드 실패:", err); }
    }

    async function fetchAndDisplayUsers(keyword = '') {
        try {
            const res = await fetch(`../php/api.php?action=search_users&keyword=${keyword}`);
            const data = await res.json(); 
            const resultList = document.getElementById('searchResultList');
            if(!resultList) return;
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
            } else {
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
        } catch (err) { console.error("데이터 검색 실패:", err); }
    }

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

    function attachSwipeToAcceptGroup(item) {
        let startX = 0;
        item.addEventListener('touchstart', e => { startX = e.touches[0].clientX; });
        item.addEventListener('touchmove', e => {
            let diff = e.touches[0].clientX - startX;
            if (diff > 0) item.style.transform = `translateX(${diff}px)`;
        });
        item.addEventListener('touchend', e => {
            let diff = e.changedTouches[0].clientX - startX;
            if (diff > 80) openAcceptGroupModal(item, item.innerText);
            else item.style.transform = 'translateX(0px)';
        });
    }

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

    // 🔥 방장(admin)인 경우에만 편집/초대 영역 표시
    function openGroupManageModal(groupId, groupName, role, count) {
        const modal = document.getElementById('groupManageModal');
        if(!modal) return; // 모달이 없으면 동작 안함 (에러 방지)

        const idInput = document.getElementById('manageGroupId');
        const nameInput = document.getElementById('manageGroupName');
        const roleInput = document.getElementById('manageGroupRole');
        const countInput = document.getElementById('manageGroupCount');
        
        if(idInput) idInput.value = groupId;
        if(nameInput) nameInput.value = groupName;
        if(roleInput) roleInput.value = role || 'member';
        if(countInput) countInput.value = count || 1;

        const inviteInput = document.getElementById('inviteMemberName');
        if(inviteInput) inviteInput.value = '';
        
        const resultContainer = document.getElementById('inviteSearchResult');
        if(resultContainer) resultContainer.innerHTML = ''; 
        
        // 방장(admin)일 때만 수정/초대 영역 표시
        const adminSection = document.getElementById('adminOnlySection');
        if (adminSection) {
            adminSection.style.display = (role === 'admin') ? 'block' : 'none';
        }

        modal.style.display = 'flex';
    }

    function openAcceptGroupModal(item, groupName) {
        currentTarget = item; 
        modalAction = "ACCEPT_GROUP";
        document.getElementById('modalTitle').innerText = "그룹 초대 수락";
        document.getElementById('modalMessage').innerHTML = `<strong>${groupName}</strong> 초대를 수락하시겠습니까?`;
        document.getElementById('addConfirmBtn').style.display = 'block';
        document.getElementById('confirmModal').style.display = 'flex';
    }

    document.getElementById('addConfirmBtn')?.addEventListener('click', async () => {
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
            } else if (modalAction === "ACCEPT_GROUP") { 
                const groupId = currentTarget.dataset.groupId;
                const response = await fetch('../php/api.php?action=accept_group_invite', { 
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ group_id: groupId }) 
                });
                const result = await response.json();
                if (result.success) { currentTarget.remove(); loadData(); } 
                else { alert("수락 실패: " + result.message); }
            }
        } catch (err) { console.error("작업 실패:", err); }
        document.getElementById('confirmModal').style.display = 'none';
    });

    document.getElementById('friendSearchInput')?.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter') fetchAndDisplayUsers(e.target.value.trim()); 
    });
    
    document.getElementById('submitGroupFinal')?.addEventListener('click', async () => {
        const gNameInput = document.getElementById('groupNameInput');
        if(!gNameInput) return;
        const gName = gNameInput.value;
        if (!gName) return alert("이름을 입력하세요!");
        const memberIds = selectedGroupMembers.map(m => m.id);

        try {
            const response = await fetch('../php/api.php?action=create_group', { 
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_name: gName, members: memberIds }) 
            });
            const text = await response.text();
            const result = JSON.parse(text);

            if (result.success) {
                document.getElementById('groupNameModal').style.display = 'none';
                switchMode('LIST'); 
            } else { alert("그룹 생성 실패: " + (result.message || result.error || "원인을 알 수 없습니다.")); }
        } catch (err) { alert("서버와 통신 중 문제가 발생했습니다."); }
    });

    document.getElementById('updateGroupBtn')?.addEventListener('click', async () => {
        const groupId = document.getElementById('manageGroupId').value;
        const newName = document.getElementById('manageGroupName').value.trim();
        if (!newName) return alert("변경할 이름을 입력하세요.");

        try {
            const res = await fetch('../php/api.php?action=update_group', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_id: groupId, group_name: newName })
            });
            const result = await res.json();
            if(result.success) {
                alert("수정되었습니다.");
                document.getElementById('groupManageModal').style.display = 'none';
                loadData(); 
            } else { alert("수정 실패: " + result.message); }
        } catch(err) { console.error(err); }
    });

    // 🔥 권한 및 인원에 따라 방장 위임 로직 실행
    document.getElementById('deleteGroupBtn')?.addEventListener('click', async () => {
        const groupId = document.getElementById('manageGroupId').value;
        const role = document.getElementById('manageGroupRole').value;
        const count = parseInt(document.getElementById('manageGroupCount').value);

        if (role === 'admin' && count > 1) {
            try {
                const res = await fetch(`../php/api.php?action=get_group_members_for_delegate&group_id=${groupId}`);
                const members = await res.json();
                
                if (members.length > 0) {
                    const select = document.getElementById('newAdminSelect');
                    if(select) {
                        select.innerHTML = members.map(m => `<option value="${m.user_id}">${m.username}</option>`).join('');
                    }
                    document.getElementById('groupManageModal').style.display = 'none';
                    document.getElementById('delegateAdminModal').style.display = 'flex';
                    return; 
                }
            } catch(err) { console.error(err); }
        }

        if (!confirm("정말 이 그룹에서 나가시겠습니까?\n(나 혼자 남은 그룹일 경우 완전히 삭제됩니다.)")) return;
        processLeaveGroup(groupId, 0);
    });

    // 방장 위임 확인 버튼
    document.getElementById('confirmDelegateAndLeaveBtn')?.addEventListener('click', () => {
        const groupId = document.getElementById('manageGroupId').value;
        const newAdminId = document.getElementById('newAdminSelect').value;
        if (!newAdminId) return alert("위임할 멤버를 선택해주세요.");
        processLeaveGroup(groupId, newAdminId);
    });

    async function processLeaveGroup(groupId, newAdminId) {
        try {
            const res = await fetch('../php/api.php?action=leave_group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_id: groupId, new_admin_id: newAdminId })
            });
            const result = await res.json();
            
            if(result.success) {
                alert(result.message);
                document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
                loadData(); 
            } else {
                alert("처리 실패: " + result.message);
            }
        } catch(err) { 
            console.error(err); 
            alert("서버와 통신 중 문제가 발생했습니다.");
        }
    }

    document.getElementById('searchInviteMemberBtn')?.addEventListener('click', async () => {
        const groupId = document.getElementById('manageGroupId').value;
        const keyword = document.getElementById('inviteMemberName').value.trim();
        const resultContainer = document.getElementById('inviteSearchResult');
        
        if (!keyword) {
            resultContainer.innerHTML = '<div style="font-size: 12px; color: #999; text-align: center; padding: 10px;">검색어를 입력하세요.</div>';
            return;
        }

        try {
            const res = await fetch(`../php/api.php?action=search_for_invite&group_id=${groupId}&keyword=${keyword}`);
            const data = await res.json();
            
            resultContainer.innerHTML = '';
            const searchResults = data.search_results || [];
            
            if (searchResults.length === 0) {
                resultContainer.innerHTML = '<div style="font-size: 12px; color: #999; text-align: center; padding: 10px;">초대 가능한 유저가 없습니다.</div>';
                return;
            }
            
            searchResults.forEach(u => {
                const div = document.createElement('div');
                div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee; font-size: 14px;';
                div.innerHTML = `<span>${u.username}</span>`;
                
                const inviteBtn = document.createElement('button');
                inviteBtn.innerText = '초대';
                inviteBtn.style.cssText = 'padding: 6px 14px; font-size: 12px; background-color: #333; color: white; border: none; border-radius: 4px; cursor: pointer; box-shadow: none;';
                
                inviteBtn.onclick = () => sendGroupInvite(u.username, inviteBtn);
                div.appendChild(inviteBtn);
                resultContainer.appendChild(div);
            });
        } catch(err) { console.error(err); }
    });

    async function sendGroupInvite(targetName, btnElement) {
        const groupId = document.getElementById('manageGroupId').value;
        try {
            const res = await fetch('../php/api.php?action=invite_group_member', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_id: groupId, username: targetName })
            });
            const result = await res.json();
            if(result.success) {
                btnElement.innerText = '초대완료';
                btnElement.style.background = '#aaa';
                btnElement.disabled = true;
            } else { alert("초대 실패: " + (result.message || "유저를 찾을 수 없습니다.")); }
        } catch(err) { console.error(err); }
    }

    document.querySelectorAll('.close-x-btn, .modal-btn.cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
            const confirmBtn = document.getElementById('addConfirmBtn');
            if (confirmBtn) confirmBtn.style.display = 'block'; 
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

    mainToggleBtn?.addEventListener('click', () => switchMode(currentMode === 'ADD_FRIEND' ? 'LIST' : 'ADD_FRIEND'));
    groupToggleBtn?.addEventListener('click', () => switchMode(currentMode === 'ADD_GROUP' ? 'LIST' : 'ADD_GROUP'));
    
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
        if(groupFloatContainer) {
            groupFloatContainer.style.display = selectedGroupMembers.length > 0 ? 'block' : 'none';
        }
    }

    function showProfile(data) {
        document.getElementById('profileName').innerText = data.name;
        document.getElementById('profileBio').innerText = data.bio;
        document.getElementById('profileDday').innerText = `D+${data.dday}`;
        document.getElementById('songName').innerText = data.song || '설정된 곡 없음';
        document.getElementById('songLink').href = data.link;
        document.getElementById('songThumbImg').src = data.thumb || '../img/default-music.png';
        const modal = document.getElementById('userProfileModal');
        if(modal) modal.style.display = 'flex';
    }

    document.getElementById('openGroupNameModal')?.addEventListener('click', () => {
        const countText = document.getElementById('selectedCountText');
        if(countText) countText.innerText = `선택된 멤버: ${selectedGroupMembers.length}명 (나 포함)`;
        const nameInput = document.getElementById('groupNameInput');
        if(nameInput) nameInput.value = ''; 
        const modal = document.getElementById('groupNameModal');
        if(modal) modal.style.display = 'flex';
    });
});