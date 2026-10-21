import pytest
from app.utils.ssrf_protection import validate_and_resolve_url, is_ip_blocked
import ipaddress

def test_reject_localhost_and_internal_hostnames():
    is_safe, msg, _ = validate_and_resolve_url("http://localhost:3000")
    assert is_safe is False
    assert "allowed public website" in msg

    is_safe, msg, _ = validate_and_resolve_url("http://localhost")
    assert is_safe is False

    is_safe, msg, _ = validate_and_resolve_url("http://127.0.0.1:8000")
    assert is_safe is False

    is_safe, msg, _ = validate_and_resolve_url("http://0.0.0.0")
    assert is_safe is False

def test_reject_private_ip_networks():
    # 10.x.x.x
    is_safe, msg, _ = validate_and_resolve_url("http://10.0.0.1")
    assert is_safe is False

    # 172.16.x.x
    is_safe, msg, _ = validate_and_resolve_url("http://172.16.0.5")
    assert is_safe is False

    # 192.168.x.x
    is_safe, msg, _ = validate_and_resolve_url("http://192.168.1.1")
    assert is_safe is False

    # AWS metadata IP (169.254.169.254)
    is_safe, msg, _ = validate_and_resolve_url("http://169.254.169.254/latest/meta-data")
    assert is_safe is False

def test_reject_ipv6_loopback_and_unique_local():
    # [::1]
    is_safe, msg, _ = validate_and_resolve_url("http://[::1]")
    assert is_safe is False

    # [fc00::1]
    is_safe, msg, _ = validate_and_resolve_url("http://[fc00::1]")
    assert is_safe is False

def test_reject_disallowed_protocols():
    is_safe, msg, _ = validate_and_resolve_url("ftp://example.com/file.txt")
    assert is_safe is False
    assert "scheme" in msg

    is_safe, msg, _ = validate_and_resolve_url("file:///etc/passwd")
    assert is_safe is False

    is_safe, msg, _ = validate_and_resolve_url("gopher://example.com")
    assert is_safe is False

def test_reject_disallowed_ports():
    is_safe, msg, _ = validate_and_resolve_url("https://example.com:22")
    assert is_safe is False
    assert "Port 22" in msg

    is_safe, msg, _ = validate_and_resolve_url("https://example.com:27017")
    assert is_safe is False

def test_allow_valid_public_domain():
    is_safe, msg, url = validate_and_resolve_url("https://example.com")
    assert is_safe is True
    assert msg is None
    assert url == "https://example.com"

def test_is_ip_blocked_helper():
    assert is_ip_blocked(ipaddress.ip_address("127.0.0.1")) is True
    assert is_ip_blocked(ipaddress.ip_address("10.10.10.10")) is True
    assert is_ip_blocked(ipaddress.ip_address("169.254.169.254")) is True
    assert is_ip_blocked(ipaddress.ip_address("::1")) is True
    assert is_ip_blocked(ipaddress.ip_address("8.8.8.8")) is False
    assert is_ip_blocked(ipaddress.ip_address("1.1.1.1")) is False

def test_live_check_api_endpoint_rejects_ssrf():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    response = client.post("/check-live-link", json={"url": "http://127.0.0.1:8000"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert data["reachable"] is False
    assert data["errorCode"] == "BLOCKED_DESTINATION"

