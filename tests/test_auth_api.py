import pytest
from fastapi.testclient import TestClient
from backend.app import app

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "scoring_weights" in data

def test_admin_and_student_login():
    # Test Admin Login
    res_admin = client.post("/api/auth/login", json={
        "email": "admin@proctor.edu",
        "password": "Admin@123"
    })
    assert res_admin.status_code == 200
    data_admin = res_admin.json()
    assert "access_token" in data_admin
    assert data_admin["user"]["role"] == "admin"

    # Test Student Login
    res_stu = client.post("/api/auth/login", json={
        "email": "student@proctor.edu",
        "password": "Student@123"
    })
    assert res_stu.status_code == 200
    data_stu = res_stu.json()
    assert "access_token" in data_stu
    assert data_stu["user"]["role"] == "student"

def test_invalid_login():
    res = client.post("/api/auth/login", json={
        "email": "wrong@proctor.edu",
        "password": "WrongPassword!"
    })
    assert res.status_code == 401

def test_update_profile_student_and_admin():
    # Login as student
    login_res = client.post("/api/auth/login", json={
        "email": "student@proctor.edu",
        "password": "Student@123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Update student name
    update_res = client.put("/api/auth/me", json={
        "name": "Alex Updated Candidate",
        "student_id": "STU-NEW-88"
    }, headers=headers)
    assert update_res.status_code == 200
    user_data = update_res.json()["user"]
    assert user_data["name"] == "Alex Updated Candidate"
    assert user_data["student_id"] == "STU-NEW-88"

    # Verify via /api/auth/me
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["name"] == "Alex Updated Candidate"

    # Login as admin
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@proctor.edu",
        "password": "Admin@123"
    })
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Update admin name
    admin_update = client.put("/api/auth/me", json={
        "name": "Prof. Charles Xavier",
        "subject": "AI & Machine Learning"
    }, headers=admin_headers)
    assert admin_update.status_code == 200
    adm_user = admin_update.json()["user"]
    assert adm_user["name"] == "Prof. Charles Xavier"
    assert adm_user["subject"] == "AI & Machine Learning"

def test_otp_flow_student_registration():
    import time
    test_email = f"student_{int(time.time() * 1000)}@proctor.edu"
    
    # 1. Send OTP
    send_res = client.post("/api/auth/send-otp", json={
        "email": test_email,
        "purpose": "registration"
    })
    assert send_res.status_code == 200
    otp_data = send_res.json()
    assert otp_data["success"] is True
    assert "demo_otp" in otp_data
    otp_code = otp_data["demo_otp"]
    assert len(otp_code) == 6

    # 2. Verify wrong OTP fails
    bad_res = client.post("/api/auth/verify-otp", json={
        "email": test_email,
        "otp": "999999"
    })
    assert bad_res.status_code == 400

    # 3. Verify correct OTP succeeds
    good_res = client.post("/api/auth/verify-otp", json={
        "email": test_email,
        "otp": otp_code
    })
    assert good_res.status_code == 200
    assert good_res.json()["success"] is True

    # 4. Register without OTP fails
    no_otp_res = client.post("/api/auth/register", json={
        "name": "OTP Test Student",
        "email": test_email,
        "password": "Password@123",
        "role": "student"
    })
    assert no_otp_res.status_code == 400

    # 5. Register with correct OTP succeeds
    reg_res = client.post("/api/auth/register", json={
        "name": "OTP Test Student",
        "email": test_email,
        "password": "Password@123",
        "role": "student",
        "otp": otp_code
    })
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == test_email

    # 6. Sending OTP to already registered email fails
    dup_res = client.post("/api/auth/send-otp", json={
        "email": test_email
    })
    assert dup_res.status_code == 400

def test_otp_flow_admin_registration():
    import time
    admin_email = f"admin_{int(time.time() * 1000)}@proctor.edu"

    # 1. Send OTP
    send_res = client.post("/api/auth/send-otp", json={
        "email": admin_email,
        "purpose": "admin-registration"
    })
    assert send_res.status_code == 200
    otp_code = send_res.json()["demo_otp"]

    # 2. Register Admin with wrong OTP fails
    bad_admin = client.post("/api/auth/register-admin", json={
        "name": "New Admin Tester",
        "email": admin_email,
        "password": "AdminPassword@123",
        "invite_code": "PROCTOR-ADMIN-2026",
        "otp": "000111"
    })
    assert bad_admin.status_code == 400

    # 3. Register Admin with valid OTP and correct invite code succeeds
    good_admin = client.post("/api/auth/register-admin", json={
        "name": "New Admin Tester",
        "email": admin_email,
        "password": "AdminPassword@123",
        "invite_code": "PROCTOR-ADMIN-2026",
        "otp": otp_code
    })
    assert good_admin.status_code == 200
    assert good_admin.json()["user"]["role"] == "admin"

