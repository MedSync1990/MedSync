from app.dependencies import CurrentUser, get_effective_branch_id, get_branch_scope


def test_branch_manager_cannot_escape_own_branch():
    user = CurrentUser(user_id=12, role="Branch Manager", branch_id=5, username="manager")

    assert get_branch_scope(user) == 5
    assert get_effective_branch_id(user, 8) == 5
    assert get_effective_branch_id(user, None) == 5


def test_administrator_keeps_requested_branch_filter():
    user = CurrentUser(user_id=1, role="Administrator", branch_id=None, username="admin")

    assert get_branch_scope(user) is None
    assert get_effective_branch_id(user, 9) == 9
    assert get_effective_branch_id(user, None) is None


def test_other_roles_keep_client_branch_when_present():
    user = CurrentUser(user_id=7, role="Receptionist", branch_id=3, username="receptionist")

    assert get_effective_branch_id(user, 8) == 8
    assert get_effective_branch_id(user, None) == 3
